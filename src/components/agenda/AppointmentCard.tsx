"use client";

import { format, parseISO } from "date-fns";
import { Appointment } from "@/lib/agenda/queries";

interface Props {
  app: Appointment;
  style: string;
  onOpen: (app: Appointment) => void;
}

export function AppointmentCard({ app, style, onOpen }: Props) {
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData("appointmentId", app.id);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={(e) => {
        e.stopPropagation();
        onOpen(app);
      }}
      className={`
        text-[11px] truncate px-2 py-1.5 rounded-md border font-bold 
        cursor-grab active:cursor-grabbing select-none
        transition-all duration-150
        hover:shadow-md hover:-translate-y-px
        active:opacity-60 active:scale-95
        ${style}
      `}
      title={`${app.contacts?.name || "---"} · ${app.procedure_name}`}
    >
      <span className="opacity-60 mr-1.5">
        {format(parseISO(app.start_time), "HH:mm")}
      </span>
      {app.contacts?.name || "---"}
    </div>
  );
}
