"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, User, Calendar, Clock, Stethoscope, CheckCircle, Edit2, Trash2, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Appointment } from "@/lib/agenda/queries";
import { useState } from "react";

interface Props {
  appointment: Appointment | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (app: Appointment) => void;
  onDelete: (id: string) => Promise<void>;
  onComplete: (id: string) => Promise<void>;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  scheduled: { label: "Agendado", color: "bg-blue-50 text-blue-700 border-blue-200" },
  completed: { label: "Concluído", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelled: { label: "Cancelado", color: "bg-red-50 text-red-600 border-red-200" },
};

export function AppointmentDetailModal({ appointment, isOpen, onClose, onEdit, onDelete, onComplete }: Props) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!appointment) return null;

  const status = STATUS_LABELS[appointment.status] ?? STATUS_LABELS.scheduled;

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setIsDeleting(true);
    try {
      await onDelete(appointment.id);
      onClose();
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      await onComplete(appointment.id);
      onClose();
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-xl w-full max-w-sm shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Calendar size={18} className="text-primary" />
                Detalhes do Agendamento
              </h2>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Paciente */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                  {(appointment.contacts?.name || "?").charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-slate-800">{appointment.contacts?.name || "Paciente"}</p>
                  {appointment.contacts?.phone && (
                    <p className="text-xs text-slate-500">{appointment.contacts.phone}</p>
                  )}
                </div>
              </div>

              {/* Detalhes */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 flex items-center gap-2"><Calendar size={14} /> Data</span>
                  <span className="font-semibold text-slate-700">
                    {format(parseISO(appointment.start_time), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 flex items-center gap-2"><Clock size={14} /> Horário</span>
                  <span className="font-semibold text-slate-700">
                    {format(parseISO(appointment.start_time), "HH:mm")}
                    {" – "}
                    {format(parseISO(appointment.end_time), "HH:mm")}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 flex items-center gap-2"><Stethoscope size={14} /> Procedimento</span>
                  <span className="font-semibold text-slate-700">{appointment.procedure_name}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 flex items-center gap-2"><User size={14} /> Status</span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${status.color}`}>
                    {status.label}
                  </span>
                </div>
              </div>

              {/* Confirm delete inline */}
              <AnimatePresence>
                {confirmDelete && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 font-medium text-center"
                  >
                    Confirmar exclusão? Este agendamento será cancelado.
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 pt-2 grid grid-cols-3 gap-2">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg font-bold text-xs transition-all
                  ${confirmDelete
                    ? "bg-red-500 text-white hover:bg-red-600"
                    : "bg-red-50 text-red-500 hover:bg-red-100 border border-red-200"
                  } disabled:opacity-60`}
              >
                {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {confirmDelete ? "Confirmar" : "Excluir"}
              </button>

              <button
                onClick={() => { onEdit(appointment); onClose(); }}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg font-bold text-xs bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200 transition-all"
              >
                <Edit2 size={14} />
                Editar
              </button>

              <button
                onClick={handleComplete}
                disabled={isCompleting || appointment.status === "completed"}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg font-bold text-xs bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 transition-all disabled:opacity-50"
              >
                {isCompleting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                Concluído
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
