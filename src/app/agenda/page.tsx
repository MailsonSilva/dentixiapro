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
  getCompanyBusinessHours,
  getProcedureCatalog,
  Appointment,
  ProcedureCatalogItem,
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
import { AgendaSidebar } from "@/components/agenda/AgendaSidebar";
import { CalendarGrid } from "@/components/agenda/CalendarGrid";
import { AppointmentModal } from "@/components/agenda/AppointmentModal";
import { AppointmentDetailModal } from "@/components/agenda/AppointmentDetailModal";

export default function AgendaPage() {
  const { notify } = useNotification();
  const searchParams = useSearchParams();

  // Core State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [businessHours, setBusinessHours] = useState<any[]>([]);
  const [procedures, setProcedures] = useState<ProcedureCatalogItem[]>([]);

  // Modal: Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSavingApp, setIsSavingApp] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [defaultDate, setDefaultDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // Modal: Details
  const [detailApp, setDetailApp] = useState<Appointment | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  /**
   * Fetch all required data for the current month view.
   * NOTE: companyId is included in deps to ensure data refetches after auth init.
   */
  const fetchData = useCallback(async () => {
    if (!companyId) return;
    try {
      const mStart = startOfMonth(currentDate);
      const mEnd = endOfMonth(mStart);
      const start = startOfWeek(mStart, { weekStartsOn: 1 });
      const end = endOfWeek(mEnd, { weekStartsOn: 1 });

      const [apptData, contactData, currBusinessHours, procData] = await Promise.all([
        getAppointments(start.toISOString(), end.toISOString()),
        getCalendarContacts(),
        getCompanyBusinessHours(companyId),
        getProcedureCatalog(companyId),
      ]);

      setAppointments(apptData);
      setContacts(contactData);
      if (currBusinessHours && currBusinessHours.length > 0) {
        setBusinessHours(currBusinessHours);
      }

      setProcedures(procData);

      // Auto-select all procedures on first load
      setSelectedFilters((prev) => {
        if (prev.length === 0 && procData.length > 0) {
          return procData.map((p) => p.name);
        }
        return prev;
      });
    } catch (err: unknown) {
      const error = err as Error;
      notify("Erro ao carregar agenda", error.message, "error");
    }
  }, [currentDate, companyId, notify]);

  // Init: identify current company
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

  // Fetch data whenever company or month changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle URL params (coming from /clientes)
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

  /** Save appointment (create or update) */
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
        await updateAppointmentAction(editingAppointment.id, { ...payload, companyId });
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
   * Drag-and-Drop: drop card on a new day.
   * On conflict: opens edit modal with new date pre-filled.
   */
  const handleDropOnDay = async (appointmentId: string, newDate: string) => {
    if (!companyId) return;
    try {
      const result: DropResult = await updateAppointmentDateAction(appointmentId, newDate, companyId);

      if (result.status === "success") {
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

  const handleAppointmentOpen = (app: Appointment) => {
    setDetailApp(app);
    setIsDetailOpen(true);
  };

  const handleEditFromDetail = (app: Appointment) => {
    setEditingAppointment(app);
    setConflictError(null);
    setIsModalOpen(true);
  };

  const handleDeleteAppointment = async (id: string) => {
    await deleteAppointmentAction(id);
    notify("Excluído", "Agendamento cancelado.", "success");
    fetchData();
  };

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
      <div className="p-5 md:p-7 flex-1 flex flex-col max-w-7xl mx-auto w-full gap-5">

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
              <CalendarIcon size={18} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Agenda</h1>
              <p className="text-xs font-medium text-slate-500">Gerencie atendimentos e retornos.</p>
            </div>
          </div>

          <button
            onClick={() => {
              setDefaultDate(format(new Date(), "yyyy-MM-dd"));
              setEditingAppointment(null);
              setConflictError(null);
              setIsModalOpen(true);
            }}
            className="bg-primary hover:bg-primary/90 active:scale-95 text-white font-bold py-2.5 px-5 rounded-lg shadow-sm text-sm flex items-center gap-2 transition-all duration-150"
          >
            <Plus size={16} /> Novo Agendamento
          </button>
        </div>

        {/* Main Calendar Area */}
        <div className="flex-1 flex overflow-hidden bg-white border border-slate-200 rounded-xl shadow-sm">
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
            businessHours={businessHours}
            procedures={procedures}
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
            businessHours={businessHours}
          />
        </div>
      </div>

      {/* Create / Edit Modal */}
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
        companyId={companyId}
      />

      {/* Detail Modal */}
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
