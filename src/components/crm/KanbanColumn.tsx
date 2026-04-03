"use client";

import { AnimatePresence } from "framer-motion";
import { Smile, Inbox, MessageSquare, Clock, TrendingUp, CheckCircle2, Stethoscope, Heart, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { KanbanCard } from "./KanbanCard";
import { Stage, Contact } from "@/lib/crm/queries";

export const STAGE_ICONS: Record<string, React.ElementType> = {
  "Novo Lead": Inbox,
  "Em Atendimento": MessageSquare,
  "Avaliação Agendada": Clock,
  "Em Orçamento": TrendingUp,
  "Tratamento Aprovado": CheckCircle2,
  "Em Tratamento": Stethoscope,
  "Finalizado": Heart,
  "Perdido": ThumbsDown,
};

export function KanbanColumn({
  stage,
  contacts,
  onDelete,
  deletingId,
  onDrop,
  onDragOver,
  onDragLeave,
  isDragOver,
  onEdit,
}: {
  stage: Stage;
  contacts: Contact[];
  onDelete: (id: string) => void;
  deletingId: string | null;
  onDrop: (e: React.DragEvent, stageId: string) => void;
  onDragOver: (e: React.DragEvent, stageId: string) => void;
  onDragLeave: () => void;
  isDragOver: boolean;
  onEdit: (contact: Contact) => void;
}) {
  const StageIcon = STAGE_ICONS[stage.name] || Smile;

  const handleDragStart = (e: React.DragEvent, contact: Contact) => {
    e.dataTransfer.setData("contactId", contact.id);
    e.dataTransfer.setData("fromStageId", contact.stage_id || "null");
  };

  return (
    <div
      className={cn(
        "flex-shrink-0 w-64 flex flex-col rounded-2xl transition-all duration-200",
        isDragOver ? "ring-2 ring-offset-1" : ""
      )}
      style={{ "--tw-ring-color": isDragOver ? stage.color : "transparent" } as React.CSSProperties}
      onDrop={(e) => onDrop(e, stage.id)}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(e, stage.id);
      }}
      onDragLeave={onDragLeave}
    >
      <div
        className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-3"
        style={{ backgroundColor: stage.color + "15" }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: stage.color + "25" }}
        >
          <StageIcon size={14} style={{ color: stage.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate" style={{ color: stage.color }}>
            {stage.name}
          </p>
        </div>
        <span
          className="text-xs font-semibold text-white rounded-full px-1.5 py-0.5"
          style={{ backgroundColor: stage.color }}
        >
          {contacts.length}
        </span>
      </div>

      <div
        className={cn(
          "flex-1 space-y-2 rounded-xl p-2 min-h-[120px] transition-all duration-200",
          isDragOver ? "bg-gray-50 border-2 border-dashed" : "border-2 border-transparent"
        )}
        style={{ borderColor: isDragOver ? stage.color + "60" : "transparent" }}
      >
        <AnimatePresence>
          {contacts.map((c) => (
            <KanbanCard
              key={c.id}
              contact={c}
              onDelete={onDelete}
              onDragStart={handleDragStart}
              deleting={deletingId === c.id}
              onClick={() => onEdit(c)}
            />
          ))}
        </AnimatePresence>
        {contacts.length === 0 && (
          <div className="h-16 flex items-center justify-center rounded-xl text-gray-300 text-xs text-center px-4">
            Arraste um contato aqui
          </div>
        )}
      </div>
    </div>
  );
}
