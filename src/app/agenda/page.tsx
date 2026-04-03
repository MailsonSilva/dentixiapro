"use client";

import { useState, useEffect, useCallback } from "react";
import {
  format,
  startOfWeek,
  addMonths,
  subMonths,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  endOfWeek,
} from "date-fns";
import { Calendar as CalendarIcon, Plus } from "lucide-react";
import { useNotification } from "@/lib/NotificationContext";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

// Data Layers
import {
  getAppointments,
  getCalendarContacts,
  Appointment,
} from "@/lib/agenda/queries";
import { Contact } from "@/lib/crm/queries";
import {
  createAppointmentAction,
  updateAppointmentAction,
  updateAppointmentDateAction,
  updateAppointmentStatusAction,
  deleteAppointmentAction,
  type DropResult,
} from "@/lib/agenda/actions";

// UI Components
import { AgendaSidebar, PROCEDURE_FILTERS } from "@/components/agenda/AgendaSidebar";
import { CalendarGrid } from "@/components/agenda/CalendarGrid";
import { AppointmentModal } from "@/components/agenda/AppointmentModal";
import { AppointmentDetailModal } from "@/components/agenda/AppointmentDetailModal";

export default function AgendaPage() {
  const { notify } = useNotification();
  const searchParams = useSearchParams();

  // State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<string[]>(
    PROCEDURE_FILTERS.map((f) => f.name)
  );

  // Modal State — Criação/Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSavingApp, setIsSavingApp] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [defaultDate, setDefaultDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // Modal State — Detalhes
  const [detailApp, setDetailApp] = useState<Appointment | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  /**
   * Fetch Data
   */
  const fetchData = useCallback(async () => {
    try {
      const mStart = startOfMonth(currentDate);
      const mEnd = endOfMonth(mStart);
      const start = startOfWeek(mStart, { weekStartsOn: 1 });
      const end = endOfWeek(mEnd, { weekStartsOn: 1 });

      const [apptData, contactData] = await Promise.all([
        getAppointments(start.toISOString(), end.toISOString()),
        getCalendarContacts(),
      ]);

      setAppointments(apptData);
      setContacts(contactData);
    } catch (err: unknown) {
      const error = err as Error;
      notify("Erro", error.message, "error");
    }
  }, [currentDate, notify]);

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: uc } = await supabase
        .from("user_company")
        .select("company_id")
        .eq("user_id", user.id)
        .single();
      if (uc) setCompanyId(uc.company_id);
    };
    init();
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle URL params (vindo de /clientes)
  useEffect(() => {
    const contactId = searchParams.get("contact_id");
    if (contactId && contacts.length > 0) {
      const c = contacts.find((contact) => contact.id === contactId);
      if (c) {
        setDefaultDate(format(new Date(), "yyyy-MM-dd"));
        setEditingAppointment(null);
        setIsModalOpen(true);
      }
    }
  }, [searchParams, contacts]);

  /**
   * Salvar agendamento (criar ou editar)
   */
  const handleSave = async (payload: {
    date: string;
    time: string;
    procedure: string;
    catalogId: string | null;
    durationMin: number;
    contactId: string;
  }) => {
    if (!companyId) return;
    setIsSavingApp(true);
    setConflictError(null);
    try {
      if (editingAppointment) {
        await updateAppointmentAction(editingAppointment.id, {
          ...payload,
          companyId,
        });
        notify("Sucesso", "Agendamento atualizado!", "success");
      } else {
        await createAppointmentAction({ ...payload, companyId });
        notify("Sucesso", "Agendamento realizado!", "success");
      }
      setIsModalOpen(false);
      setEditingAppointment(null);
      fetchData();
    } catch (err: unknown) {
      const error = err as Error;
      if (error.message.includes("horário")) {
        setConflictError(error.message);
      } else {
        notify("Erro", error.message, "error");
      }
    } finally {
      setIsSavingApp(false);
    }
  };

  /**
   * Drag-and-Drop: soltar card em novo dia
   * - SEM conflito: move o card e confirma
   * - COM conflito: abre modal de edição pré-preenchido para o usuário ajustar
   */
  const handleDropOnDay = async (appointmentId: string, newDate: string) => {
    if (!companyId) return;

    try {
      const result: DropResult = await updateAppointmentDateAction(appointmentId, newDate, companyId);

      if (result.status === "success") {
        // Optimistic update só após confirmar sem conflito
        setAppointments((prev) =>
          prev.map((app) => {
            if (app.id !== appointmentId) return app;
            const oldStart = new Date(app.start_time);
            const oldEnd = new Date(app.end_time);
            const duration = oldEnd.getTime() - oldStart.getTime();
            const hhmm = format(oldStart, "HH:mm");
            const newStart = new Date(`${newDate}T${hhmm}:00`);
            const newEnd = new Date(newStart.getTime() + duration);
            return { ...app, start_time: newStart.toISOString(), end_time: newEnd.toISOString() };
          })
        );
        notify("Agendamento movido", `Para ${newDate}`, "success");
        fetchData();
      } else {
        // Conflito: abre modal de edição com nova data pré-preenchida
        const app = appointments.find((a) => a.id === appointmentId) ?? null;
        setEditingAppointment(app);
        setDefaultDate(newDate);
        setConflictError("Horário ocupado no dia selecionado. Ajuste o horário abaixo.");
        setIsModalOpen(true);
      }
    } catch (err: unknown) {
      notify("Erro", (err as Error).message, "error");
      fetchData();
    }
  };

  /**
   * Abrir modal de detalhes ao clicar no card
   */
  const handleAppointmentOpen = (app: Appointment) => {
    setDetailApp(app);
    setIsDetailOpen(true);
  };

  /**
   * Editar a partir do modal de detalhes
   */
  const handleEditFromDetail = (app: Appointment) => {
    setEditingAppointment(app);
    setConflictError(null);
    setIsModalOpen(true);
  };

  /**
   * Excluir agendamento (soft-cancel)
   */
  const handleDeleteAppointment = async (id: string) => {
    await deleteAppointmentAction(id);
    notify("Excluído", "Agendamento cancelado.", "success");
    fetchData();
  };

  /**
   * Marcar como concluído
   */
  const handleCompleteAppointment = async (id: string) => {
    await updateAppointmentStatusAction(id, "completed");
    notify("Concluído", "Agendamento marcado como concluído.", "success");
    fetchData();
  };

  const calendarDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 }),
  });

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-slate-50/50">
      <div className="p-6 md:p-8 flex-1 flex flex-col max-w-7xl mx-auto w-full gap-6">

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 z-10 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
              <CalendarIcon size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-800">Agenda Mensal</h1>
              <p className="text-sm font-medium text-slate-500">Gerencie atendimentos e retornos.</p>
            </div>
          </div>

          <button
            onClick={() => {
              setDefaultDate(format(new Date(), "yyyy-MM-dd"));
              setEditingAppointment(null);
              setConflictError(null);
              setIsModalOpen(true);
            }}
            className="bg-primary hover:bg-primary/90 text-white font-bold py-2.5 px-5 rounded-xl shadow-sm text-sm flex items-center gap-2"
          >
            <Plus size={16} /> Novo Agendamento
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden bg-white border border-slate-200 rounded-3xl shadow-sm">
          <AgendaSidebar
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            selectedFilters={selectedFilters}
            onToggleFilter={(name) =>
              setSelectedFilters((prev) =>
                prev.includes(name) ? prev.filter((f) => f !== name) : [...prev, name]
              )
            }
            onDayClick={(day) => {
              setDefaultDate(format(day, "yyyy-MM-dd"));
              setEditingAppointment(null);
              setConflictError(null);
              setIsModalOpen(true);
            }}
          />

          <CalendarGrid
            currentDate={currentDate}
            calendarDays={calendarDays}
            appointments={appointments}
            selectedFilters={selectedFilters}
            onPrevMonth={() => setCurrentDate(subMonths(currentDate, 1))}
            onNextMonth={() => setCurrentDate(addMonths(currentDate, 1))}
            onToday={() => setCurrentDate(new Date())}
            onDayClick={(day) => {
              setDefaultDate(format(day, "yyyy-MM-dd"));
              setEditingAppointment(null);
              setConflictError(null);
              setIsModalOpen(true);
            }}
            onAppointmentOpen={handleAppointmentOpen}
            onDropOnDay={handleDropOnDay}
          />
        </div>
      </div>

      {/* Modal de Criação/Edição */}
      <AppointmentModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingAppointment(null);
          setConflictError(null);
        }}
        editingAppointment={editingAppointment}
        defaultDate={defaultDate}
        contacts={contacts}
        onSave={handleSave}
        isSaving={isSavingApp}
        conflictError={conflictError}
      />

      {/* Modal de Detalhes */}
      <AppointmentDetailModal
        appointment={detailApp}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onEdit={handleEditFromDetail}
        onDelete={handleDeleteAppointment}
        onComplete={handleCompleteAppointment}
      />
    </div>
  );
}
