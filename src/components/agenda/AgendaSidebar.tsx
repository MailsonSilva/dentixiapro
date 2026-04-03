"use client";

import { format, addMonths, subMonths, isSameMonth, isSameDay, startOfWeek, addDays, eachDayOfInterval, startOfMonth, endOfMonth, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";

export const PROCEDURE_FILTERS = [
  { name: "Avaliação", color: "bg-blue-100/80 border-blue-200 text-blue-700" },
  { name: "Limpeza", color: "bg-emerald-100/80 border-emerald-200 text-emerald-700" },
  { name: "Cirurgia", color: "bg-red-100/80 border-red-200 text-red-700" },
  { name: "Retorno", color: "bg-amber-100/80 border-amber-200 text-amber-700" },
  { name: "Ortodontia", color: "bg-purple-100/80 border-purple-200 text-purple-700" },
];

export function AgendaSidebar({ 
  currentDate, 
  setCurrentDate, 
  selectedFilters, 
  onToggleFilter,
  onDayClick
}: {
  currentDate: Date;
  setCurrentDate: (d: Date) => void;
  selectedFilters: string[];
  onToggleFilter: (name: string) => void;
  onDayClick: (day: Date) => void;
}) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  return (
    <div className="w-64 bg-slate-50/50 hidden lg:flex flex-col border-r border-slate-200 p-6 shrink-0 overflow-y-auto">
      <div className="mb-8">
        <h3 className="font-bold text-slate-800 mb-4 capitalize">Procedimentos</h3>
        <div className="space-y-3">
          {PROCEDURE_FILTERS.map((f) => {
            const isSelected = selectedFilters.includes(f.name);
            return (
              <label key={f.name} className="flex items-center gap-3 cursor-pointer group">
                <div 
                  onClick={() => onToggleFilter(f.name)}
                  className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                  isSelected ? 'bg-primary border-primary' : 'bg-white border-slate-300'
                }`}>
                  {isSelected && <Check size={12} className="text-white" />}
                </div>
                <span className="text-sm font-medium text-slate-700">{f.name}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="w-full h-px bg-slate-200 mb-8" />

      {/* Mini Calendar */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-slate-800 text-sm capitalize">{format(currentDate, "MMMM yyyy", { locale: ptBR })}</h3>
          <div className="flex gap-1">
            <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="text-slate-400 hover:text-slate-700 p-1"><ChevronLeft size={16} /></button>
            <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="text-slate-400 hover:text-slate-700 p-1"><ChevronRight size={16} /></button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {['D','S','T','Q','Q','S','S'].map((n, i) => <div key={i} className="text-[10px] font-bold text-slate-400">{n}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {calendarDays.map((calDay, i) => {
            const isCurrMonth = isSameMonth(calDay, monthStart);
            const isToday = isSameDay(calDay, new Date());
            return (
              <div 
                key={i} 
                onClick={() => onDayClick(calDay)}
                className={`text-xs py-1 cursor-pointer rounded-full aspect-square flex items-center justify-center font-medium transition-colors
                  ${!isCurrMonth ? 'text-slate-300' : 'text-slate-700 hover:bg-slate-200'}
                  ${isToday ? 'bg-primary text-white font-bold shadow-sm' : ''}`}
              >
                {format(calDay, 'd')}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
