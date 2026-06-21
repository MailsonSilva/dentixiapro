"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, User, Loader2, AlertTriangle, CalendarDays } from "lucide-react";
import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { Contact } from "@/lib/clientes/types";
import { getProcedureCatalog, ProcedureCatalogItem, Appointment } from "@/lib/agenda/queries";
import { ProcedureGrid } from "@/components/procedimentos/ProcedureGrid";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  // Para edição, passa o appointment; para criação, null
  editingAppointment?: Appointment | null;
  defaultDate?: string;
  contacts: Contact[];
  onSave: (payload: {
    date: string;
    time: string;
    procedure: string;
    catalogId: string | null;
    durationMin: number;
    contactId: string;
  }) => Promise<void>;
  isSaving: boolean;
  conflictError?: string | null;
  companyId?: string;
}

export function AppointmentModal({
  isOpen,
  onClose,
  editingAppointment,
  defaultDate,
  contacts,
  onSave,
  isSaving,
  conflictError,
  companyId,
}: Props) {
  const [catalog, setCatalog] = useState<ProcedureCatalogItem[]>([]);
  const [searchContact, setSearchContact] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const [date, setDate] = useState(defaultDate || format(new Date(), "yyyy-MM-dd"));
  const [time, setTime] = useState("09:00");
  const [selectedCatalogId, setSelectedCatalogId] = useState("");
  const [durationMin, setDurationMin] = useState(60);

  const isEditing = !!editingAppointment;

  // Carregar catálogo de procedimentos
  useEffect(() => {
    getProcedureCatalog(companyId)
      .then(setCatalog)
      .catch(console.error);
  }, [companyId]);

  // Pré-preencher ao editar/abrir — calculado no render, sem setState em efeito encadeado
  useEffect(() => {
    if (!isOpen) return;

    if (editingAppointment) {
      const start = parseISO(editingAppointment.start_time);
      const end = parseISO(editingAppointment.end_time);
      const dur = Math.round((end.getTime() - start.getTime()) / 60000);

      // Agrupa todos os setStates numa única execução para evitar cascading renders
      const newContact = editingAppointment.contacts
        ? {
            id: editingAppointment.contacts.id,
            name: editingAppointment.contacts.name,
            phone: editingAppointment.contacts.phone ?? null,
            email: editingAppointment.contacts.email ?? null,
            metadata: null,
            stage_id: null,
            created_at: "",
            company_id: "",
          }
        : null;

      setDate(format(start, "yyyy-MM-dd"));
      setTime(format(start, "HH:mm"));
      setDurationMin(dur > 0 ? dur : 60);
      setSelectedCatalogId(editingAppointment.catalog_id || "");
      setSelectedContact(newContact);
      setSearchContact(editingAppointment.contacts?.name || "");
    } else {
      setDate(defaultDate || format(new Date(), "yyyy-MM-dd"));
      setTime("09:00");
      setSelectedCatalogId("");
      setDurationMin(60);
      setSelectedContact(null);
      setSearchContact("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingAppointment?.id, isOpen]);

  // Mudança do Procedimento pela Grid
  const handleSelectProcedure = (proc: ProcedureCatalogItem) => {
    setSelectedCatalogId(proc.id);
    setDurationMin(proc.duration_min);
  };

  const filteredContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(searchContact.toLowerCase())
  );

  const selectedCatalogItem = catalog.find((c) => c.id === selectedCatalogId);
  const procedureName = selectedCatalogItem?.name || "";

  const handleSubmit = async () => {
    if (!selectedContact || !procedureName) return;

    // Guard: prevent past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(date + "T00:00:00");
    if (selectedDate < today) {
      return; // input[min] already prevents this, guard as safety net
    }

    await onSave({
      date,
      time,
      procedure: procedureName,
      catalogId: selectedCatalogId || null,
      durationMin,
      contactId: selectedContact.id,
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <CalendarDays size={18} className="text-primary" />
                {isEditing ? "Editar Agendamento" : "Novo Agendamento"}
              </h2>
              <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {/* Data + Horário */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 capitalize mb-2 block">
                    Data Inicial *
                  </label>
                  <input
                    required
                    type="date"
                    value={date}
                    min={format(new Date(), "yyyy-MM-dd")}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full text-base px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 capitalize mb-2 block">
                    Horário
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full text-base px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              {/* Alerta de conflito */}
              <AnimatePresence>
                {conflictError && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 font-medium"
                  >
                    <AlertTriangle size={16} className="shrink-0" />
                    {conflictError}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Paciente */}
              <div className="relative">
                <label className="text-xs font-bold text-slate-500 capitalize mb-2 block">
                  Paciente *
                </label>
                {!selectedContact ? (
                  <div className="relative">
                    <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Nome do paciente..."
                      value={searchContact}
                      onChange={(e) => { setSearchContact(e.target.value); setIsDropdownOpen(true); }}
                      onFocus={() => setIsDropdownOpen(true)}
                      className="w-full text-base pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    {isDropdownOpen && searchContact && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 shadow-xl rounded-lg max-h-40 overflow-y-auto">
                        {filteredContacts.length === 0 ? (
                          <div className="p-3 text-sm text-slate-400 text-center">Nenhum paciente encontrado</div>
                        ) : (
                          filteredContacts.map((c) => (
                            <div
                              key={c.id}
                              onClick={() => { setSelectedContact(c); setIsDropdownOpen(false); }}
                              className="p-3 hover:bg-slate-50 cursor-pointer text-sm font-bold border-b border-slate-50 last:border-0"
                            >
                              {c.name}
                              {c.phone && <span className="font-normal text-slate-400 ml-2">{c.phone}</span>}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 border border-primary/50 bg-primary/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                        {selectedContact.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-primary">{selectedContact.name}</p>
                        {selectedContact.phone && (
                          <p className="text-xs text-slate-500">{selectedContact.phone}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => { setSelectedContact(null); setSearchContact(""); }}
                      className="p-1.5 bg-white rounded-md text-red-500 font-bold text-xs hover:bg-red-50 border border-red-100 transition-colors"
                    >
                      Trocar
                    </button>
                  </div>
                )}
              </div>

              {/* Procedimento (dinâmico do catálogo) via Grid */}
              <div>
                <label className="text-xs font-bold text-slate-500 capitalize mb-2 block">
                  Procedimento *
                </label>
                <div className="max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  <ProcedureGrid
                    procedures={catalog}
                    onSelect={handleSelectProcedure}
                    selectedId={selectedCatalogId}
                    readonly={true}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
              <button onClick={onClose} className="px-5 py-2.5 font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSaving || !selectedContact || !selectedCatalogId}
                className="px-6 py-2.5 rounded-lg font-bold bg-primary text-white flex items-center gap-2 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : null}
                {isSaving ? "Salvando..." : isEditing ? "Salvar Alterações" : "Confirmar Agendamento"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
