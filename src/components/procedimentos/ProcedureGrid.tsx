import React from "react";
import { ProcedureCatalogItem } from "@/lib/agenda/queries";
import { Trash2, Edit2, Clock, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProcedureGridProps {
  procedures: ProcedureCatalogItem[];
  onDelete?: (id: string) => void;
  onEdit?: (proc: ProcedureCatalogItem) => void;
  onSelect?: (proc: ProcedureCatalogItem) => void;
  selectedId?: string;
  selectedIds?: string[];
  readonly?: boolean;
  layout?: "grid" | "list";
}

export function ProcedureGrid({
  procedures,
  onDelete,
  onEdit,
  onSelect,
  selectedId,
  selectedIds,
  readonly = false,
  layout = "list",
}: ProcedureGridProps) {
  if (procedures.length === 0) {
    return (
      <div className="p-6 text-center bg-slate-50 border border-dashed border-slate-200 rounded-lg">
        <p className="text-slate-400 text-sm font-medium">Nenhum procedimento disponível.</p>
      </div>
    );
  }

  return (
    <div className={cn("grid gap-2 w-full", layout === "grid" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1")}>
      {procedures.map((proc) => {
        const isSelected =
          proc.id === selectedId ||
          (selectedIds && (selectedIds.includes(proc.id) || selectedIds.includes(proc.name)));
        const isSystem = proc.is_system;

        return (
          <div
            key={proc.id}
            onClick={() => onSelect?.(proc)}
            className={cn(
              "relative flex items-center gap-3 px-3 py-2.5 bg-white border rounded-lg transition-all duration-150 overflow-hidden group",
              onSelect ? "cursor-pointer hover:border-primary/40 hover:bg-blue-50/30" : "",
              isSelected
                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                : "border-slate-200"
            )}
          >
            {/* Active indicator */}
            {isSelected && (
              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary" />
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className={cn("font-semibold text-sm truncate", isSelected ? "text-primary" : "text-slate-800")}>
                  {proc.name}
                </span>
                {isSystem && (
                  <span
                    className="inline-flex items-center gap-0.5 text-[9px] font-bold tracking-wider text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-100"
                    title="Procedimento padrão do sistema"
                  >
                    <ShieldCheck size={9} />
                    SISTEMA
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                <Clock size={11} className="shrink-0" />
                <span>{proc.duration_min} min</span>
              </div>
            </div>

            {/* Action buttons — visible on hover (non-readonly, non-system) */}
            {!readonly && !isSystem && (
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0">
                {onEdit && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit(proc); }}
                    className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                    title="Editar"
                  >
                    <Edit2 size={14} />
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(proc.id); }}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="Excluir"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
