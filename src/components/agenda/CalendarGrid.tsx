"use client";

import { format, isSameMonth, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Appointment } from "@/lib/agenda/queries";
import { PROCEDURE_FILTERS } from "./AgendaSidebar";
import { AppointmentCard } from "./AppointmentCard";

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
}: {
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
}) {
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

  const getDayAppointments = (day: Date) => {
    return appointments.filter((app) => {
      const appDate = parseISO(app.start_time);
      return (
        isSameDay(appDate, day) &&
        selectedFilters.includes(app.procedure_name || "Avaliação")
      );
    });
  };

  const getStyle = (name: string) => {
    const f = PROCEDURE_FILTERS.find((filter) => filter.name === name);
    return f ? f.color : "bg-slate-100 border-slate-200 text-slate-700";
  };

  // ── Drag handlers na célula (drop zone) ──────────────────
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.add("bg-primary/8", "ring-2", "ring-primary/30");
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove("bg-primary/8", "ring-2", "ring-primary/30");
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, day: Date) => {
    e.preventDefault();
    e.currentTarget.classList.remove("bg-primary/8", "ring-2", "ring-primary/30");
    const appointmentId = e.dataTransfer.getData("appointmentId");
    if (appointmentId) {
      const newDate = format(day, "yyyy-MM-dd");
      onDropOnDay(appointmentId, newDate);
    }
  };

  return (
    <div className="flex-1 bg-white flex flex-col overflow-hidden relative">
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between z-10 bg-white border-b border-slate-100">
        <h2 className="text-xl font-bold text-slate-800 capitalize">
          {format(currentDate, "MMMM yyyy", { locale: ptBR })}
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={onPrevMonth} className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50">
            <ChevronLeft size={18} />
          </button>
          <button onClick={onToday} className="px-4 py-1.5 text-sm font-bold border border-slate-200 rounded-lg hover:bg-slate-50 mx-1">
            Hoje
          </button>
          <button onClick={onNextMonth} className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="flex-1 flex flex-col overflow-auto h-full min-w-[700px]">
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50 shrink-0">
          {["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"].map((n) => (
            <div
              key={n}
              className="py-3 px-2 text-center text-xs font-bold text-slate-500 capitalize tracking-wide border-r border-slate-100 last:border-0 truncate"
            >
              {n}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 flex-1 bg-white">
          {calendarDays.map((day, i) => {
            const apps = getDayAppointments(day);
            const isCurrMonth = isSameMonth(day, monthStart);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={i}
                onClick={() => onDayClick(day)}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, day)}
                className={`
                  min-h-[140px] border-r border-b border-slate-100 p-2 
                  transition-colors hover:bg-slate-50 cursor-pointer
                  ${!isCurrMonth ? "bg-slate-50 opacity-60" : "bg-white"}
                `}
              >
                <div className="flex justify-between items-center mb-1.5 px-1 py-1">
                  <span
                    className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${
                      isToday ? "bg-primary text-white shadow-sm" : "text-slate-700"
                    }`}
                  >
                    {format(day, "d")}
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {apps.slice(0, 4).map((app) => (
                    <AppointmentCard
                      key={app.id}
                      app={app}
                      style={getStyle(app.procedure_name)}
                      onOpen={onAppointmentOpen}
                    />
                  ))}
                  {apps.length > 4 && (
                    <div className="text-[10px] text-slate-500 font-bold px-1.5 mt-1">
                      + {apps.length - 4} mais
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
