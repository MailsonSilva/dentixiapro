"use client";

import { format, isSameMonth, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, BanIcon } from "lucide-react";
import { useNotification } from "@/lib/NotificationContext";
import { Appointment } from "@/lib/agenda/queries";
import { AppointmentCard } from "./AppointmentCard";

// Stable palette for known procedure types (extend as needed)
const PROCEDURE_COLORS: Record<string, string> = {
  "Avaliação": "bg-blue-50 border-blue-200 text-blue-700",
  "Limpeza": "bg-emerald-50 border-emerald-200 text-emerald-700",
  "Cirurgia": "bg-red-50 border-red-200 text-red-700",
  "Retorno": "bg-amber-50 border-amber-200 text-amber-700",
  "Ortodontia": "bg-indigo-50 border-indigo-200 text-indigo-700",
  "Extração": "bg-rose-50 border-rose-200 text-rose-700",
  "Clareamento": "bg-cyan-50 border-cyan-200 text-cyan-700",
};

const FALLBACK_PALETTE = [
  "bg-violet-50 border-violet-200 text-violet-700",
  "bg-teal-50 border-teal-200 text-teal-700",
  "bg-orange-50 border-orange-200 text-orange-700",
  "bg-pink-50 border-pink-200 text-pink-700",
  "bg-sky-50 border-sky-200 text-sky-700",
];

function getProcedureStyle(name: string): string {
  if (PROCEDURE_COLORS[name]) return PROCEDURE_COLORS[name];
  // Deterministic color from name hash
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i)) % FALLBACK_PALETTE.length;
  return FALLBACK_PALETTE[hash];
}

interface CalendarGridProps {
  currentDate: Date;
  calendarDays: Date[];
  appointments: Appointment[];
  selectedFilters: string[];
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onDayClick: (day: Date) => void;
  onAppointmentOpen: (app: Appointment) => void;
  onDropOnDay: (appointmentId: string, newDate: string) => void;
  businessHours?: any[];
}

export function CalendarGrid({
  currentDate,
  calendarDays,
  appointments,
  selectedFilters,
  onPrevMonth,
  onNextMonth,
  onToday,
  onDayClick,
  onAppointmentOpen,
  onDropOnDay,
  businessHours,
}: CalendarGridProps) {
  const { notify } = useNotification();
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

  const getDayAppointments = (day: Date) =>
    appointments.filter((app) => {
      const appDate = parseISO(app.start_time);
      // Show all if no filters selected, otherwise respect filter
      const name = app.procedure_name || "Avaliação";
      return isSameDay(appDate, day) && (selectedFilters.length === 0 || selectedFilters.includes(name));
    });

  // ── Drag & Drop helpers ─────────────────────────────────────
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.dataset.dragging = "true";
    e.currentTarget.classList.add("!bg-primary/5", "ring-2", "ring-primary/20", "ring-inset");
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    delete e.currentTarget.dataset.dragging;
    e.currentTarget.classList.remove("!bg-primary/5", "ring-2", "ring-primary/20", "ring-inset");
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, day: Date) => {
    e.preventDefault();
    e.currentTarget.classList.remove("!bg-primary/5", "ring-2", "ring-primary/20", "ring-inset");
    const appointmentId = e.dataTransfer.getData("appointmentId");
    if (appointmentId) {
      onDropOnDay(appointmentId, format(day, "yyyy-MM-dd"));
    }
  };

  return (
    <div className="flex-1 bg-white flex flex-col overflow-hidden">
      {/* ── Calendar Header ──────────────────────────────────── */}
      <div className="px-5 py-3.5 flex items-center justify-between border-b border-slate-100 bg-white shrink-0">
        <h2 className="text-base font-bold text-slate-800 capitalize">
          {format(currentDate, "MMMM yyyy", { locale: ptBR })}
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={onPrevMonth}
            className="p-1.5 border border-slate-200 rounded-md hover:bg-slate-50 hover:border-slate-300 transition-colors"
            title="Mês anterior"
          >
            <ChevronLeft size={16} className="text-slate-600" />
          </button>
          <button
            onClick={onToday}
            className="px-3.5 py-1.5 text-xs font-bold border border-slate-200 rounded-md hover:bg-slate-50 hover:border-slate-300 mx-0.5 text-slate-700 transition-colors"
          >
            Hoje
          </button>
          <button
            onClick={onNextMonth}
            className="p-1.5 border border-slate-200 rounded-md hover:bg-slate-50 hover:border-slate-300 transition-colors"
            title="Próximo mês"
          >
            <ChevronRight size={16} className="text-slate-600" />
          </button>
        </div>
      </div>

      {/* ── Grid ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-auto min-w-[700px]">
        {/* Weekday labels */}
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/70 shrink-0">
          {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((n) => (
            <div
              key={n}
              className="py-2.5 px-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest border-r border-slate-100 last:border-0"
            >
              {n}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 flex-1">
          {calendarDays.map((day, i) => {
            const apps = getDayAppointments(day);
            const isCurrMonth = isSameMonth(day, monthStart);
            const isToday = isSameDay(day, new Date());

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const isPast = day < today && !isToday;

            const dayOfWeek = day.getDay();
            const bh = businessHours?.find((b: any) => b.day_of_week === dayOfWeek);
            const isBusinessDay = bh ? bh.is_open : true;
            const isInteractive = isBusinessDay && !isPast;

            return (
              <div
                key={i}
                onClick={isInteractive ? () => onDayClick(day) : undefined}
                onDragOver={isInteractive ? handleDragOver : undefined}
                onDragEnter={isInteractive ? handleDragEnter : undefined}
                onDragLeave={isInteractive ? handleDragLeave : undefined}
                onDrop={isInteractive ? (e) => handleDrop(e, day) : undefined}
                title={
                  isPast ? "Data passada — não é possível agendar"
                  : !isBusinessDay ? "Fechado — sem expediente"
                  : undefined
                }
                className={`
                  min-h-[130px] border-r border-b border-slate-100 p-1.5 transition-colors relative
                  ${!isCurrMonth ? "bg-slate-50/60" : "bg-white"}
                  ${isInteractive
                    ? "hover:bg-blue-50/30 cursor-pointer"
                    : "cursor-not-allowed"
                  }
                `}
                style={
                  !isBusinessDay && !isPast
                    ? {
                        background:
                          "repeating-linear-gradient(45deg, #f8fafc, #f8fafc 4px, #f1f5f9 4px, #f1f5f9 10px)",
                      }
                    : isPast
                    ? { opacity: 0.45 }
                    : undefined
                }
              >
                {/* Day number */}
                <div className="flex justify-between items-start px-0.5 mb-1">
                  <span
                    className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                      isToday
                        ? "bg-primary text-white shadow-sm"
                        : !isCurrMonth
                        ? "text-slate-300"
                        : "text-slate-700"
                    }`}
                  >
                    {format(day, "d")}
                  </span>
                  {!isBusinessDay && isCurrMonth && (
                    <BanIcon size={11} className="text-slate-300 mt-0.5 mr-0.5 shrink-0" />
                  )}
                </div>

                {/* Appointments */}
                <div className="flex flex-col gap-1">
                  {apps.slice(0, 4).map((app) => (
                    <AppointmentCard
                      key={app.id}
                      app={app}
                      style={getProcedureStyle(app.procedure_name)}
                      onOpen={onAppointmentOpen}
                    />
                  ))}
                  {apps.length > 4 && (
                    <div className="text-[10px] text-slate-500 font-bold px-1.5 mt-0.5">
                      +{apps.length - 4} mais
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
