"use client";

import {
  format,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  startOfWeek,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  endOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Check, SlidersHorizontal } from "lucide-react";
import { ProcedureCatalogItem } from "@/lib/agenda/queries";

interface AgendaSidebarProps {
  currentDate: Date;
  setCurrentDate: (d: Date) => void;
  selectedFilters: string[];
  onToggleFilter: (name: string) => void;
  onDayClick: (day: Date) => void;
  businessHours?: any[];
  procedures?: ProcedureCatalogItem[];
}

export function AgendaSidebar({
  currentDate,
  setCurrentDate,
  selectedFilters,
  onToggleFilter,
  onDayClick,
  businessHours,
  procedures,
}: AgendaSidebarProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const allSelected = procedures?.length
    ? procedures.every((p) => selectedFilters.includes(p.name))
    : false;

  const handleToggleAll = () => {
    if (!procedures?.length) return;
    if (allSelected) {
      // Deselect all
      procedures.forEach((p) => {
        if (selectedFilters.includes(p.name)) onToggleFilter(p.name);
      });
    } else {
      // Select all
      procedures.forEach((p) => {
        if (!selectedFilters.includes(p.name)) onToggleFilter(p.name);
      });
    }
  };

  return (
    <aside className="w-60 bg-slate-50 hidden lg:flex flex-col border-r border-slate-200 shrink-0 overflow-y-auto">
      {/* ── Procedure Filter ────────────────────────────────────── */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={14} className="text-slate-400" />
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Filtros</h3>
          </div>
          {procedures && procedures.length > 0 && (
            <button
              onClick={handleToggleAll}
              className="text-[10px] font-bold text-primary hover:text-primary/70 transition-colors cursor-pointer"
            >
              {allSelected ? "Limpar" : "Todos"}
            </button>
          )}
        </div>

        {!procedures || procedures.length === 0 ? (
          <div className="py-4 text-center">
            <p className="text-xs text-slate-400">Nenhum procedimento cadastrado.</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {procedures.map((proc) => {
              const isSelected = selectedFilters.includes(proc.name);
              return (
                <label
                  key={proc.id}
                  className={`flex items-center gap-2.5 cursor-pointer px-2 py-2 rounded-md transition-colors duration-150 ${
                    isSelected ? "bg-primary/8 text-primary" : "hover:bg-slate-100 text-slate-600"
                  }`}
                >
                  {/* Custom checkbox */}
                  <div
                    onClick={(e) => {
                      e.preventDefault();
                      onToggleFilter(proc.name);
                    }}
                    className={`w-4 h-4 shrink-0 rounded flex items-center justify-center border transition-all duration-150 ${
                      isSelected
                        ? "bg-primary border-primary"
                        : "bg-white border-slate-300 hover:border-slate-400"
                    }`}
                  >
                    {isSelected && <Check size={10} className="text-white" strokeWidth={3} />}
                  </div>
                  <span className={`text-[12.5px] font-semibold truncate leading-tight ${
                    isSelected ? "text-primary" : "text-slate-600"
                  }`}>
                    {proc.name}
                  </span>
                  {proc.duration_min && (
                    <span className="ml-auto text-[10px] text-slate-400 shrink-0 font-medium">
                      {proc.duration_min}m
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Mini Calendar ───────────────────────────────────────── */}
      <div className="p-4 flex-1">
        {/* Month navigation */}
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xs font-bold text-slate-700 capitalize">
            {format(currentDate, "MMMM yyyy", { locale: ptBR })}
          </h3>
          <div className="flex gap-0.5">
            <button
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              className="text-slate-400 hover:text-slate-700 hover:bg-slate-200 p-1 rounded transition-colors"
              title="Mês anterior"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              className="text-slate-400 hover:text-slate-700 hover:bg-slate-200 p-1 rounded transition-colors"
              title="Próximo mês"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
          {["S", "T", "Q", "Q", "S", "S", "D"].map((n, i) => (
            <div key={i} className="text-[9px] font-bold text-slate-400 py-0.5">
              {n}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-0.5 text-center">
          {calendarDays.map((calDay, i) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const isCurrMonth = isSameMonth(calDay, monthStart);
            const isToday = isSameDay(calDay, new Date());
            const isPast = calDay < today && !isToday;
            const dayOfWeek = calDay.getDay();
            const bh = businessHours?.find((b: any) => b.day_of_week === dayOfWeek);
            // Default to open if no business hours configured yet
            const isBusinessDay = bh ? bh.is_open : true;
            const isClickable = isBusinessDay && isCurrMonth && !isPast;

            return (
              <button
                key={i}
                type="button"
                onClick={isClickable ? () => onDayClick(calDay) : undefined}
                disabled={!isClickable}
                title={
                  !isCurrMonth ? undefined
                  : isPast ? "Data passada"
                  : !isBusinessDay ? "Fechado"
                  : format(calDay, "dd/MM/yyyy")
                }
                className={`
                  text-[11px] w-7 h-7 mx-auto flex items-center justify-center rounded font-medium
                  transition-colors duration-100 relative
                  ${!isCurrMonth
                    ? "text-slate-300 cursor-default"
                    : isToday
                    ? "bg-primary text-white font-bold shadow-sm"
                    : isPast
                    ? "text-slate-300 cursor-not-allowed line-through"
                    : isBusinessDay
                    ? "text-slate-700 hover:bg-primary/10 hover:text-primary cursor-pointer"
                    : "text-slate-300 cursor-not-allowed"
                  }
                `}
                style={
                  !isBusinessDay && isCurrMonth && !isPast
                    ? {
                        background:
                          "repeating-linear-gradient(45deg, transparent, transparent 2px, #f1f5f9 2px, #f1f5f9 5px)",
                      }
                    : undefined
                }
              >
                {format(calDay, "d")}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        {businessHours && businessHours.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-200">
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <div
                className="w-4 h-3 rounded-sm shrink-0"
                style={{
                  background:
                    "repeating-linear-gradient(45deg, transparent, transparent 2px, #e2e8f0 2px, #e2e8f0 5px)",
                  border: "1px solid #e2e8f0",
                }}
              />
              <span>Dia fechado</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
