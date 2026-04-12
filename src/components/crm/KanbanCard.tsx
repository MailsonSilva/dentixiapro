"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Phone, Trash2, GripVertical, Loader2, AlertTriangle } from "lucide-react";
import { Avatar } from "./ContactModals";
import { Contact } from "@/lib/crm/queries";
import { useState, useEffect, useRef } from "react";

const CONFIRM_TIMEOUT = 4000; // ms

export function KanbanCard({
  contact,
  onDelete,
  onDragStart,
  deleting,
  onClick,
}: {
  contact: Contact;
  onDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, contact: Contact) => void;
  deleting: boolean;
  onClick: () => void;
}) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cancelConfirm = () => {
    setIsConfirming(false);
    setProgress(0);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const startConfirm = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isConfirming) {
      cancelConfirm();
      onDelete(contact.id);
      return;
    }
    setIsConfirming(true);
    setProgress(0);
    const start = Date.now();

    intervalRef.current = setInterval(() => {
      const pct = Math.min(((Date.now() - start) / CONFIRM_TIMEOUT) * 100, 100);
      setProgress(pct);
    }, 40);

    timerRef.current = setTimeout(() => {
      cancelConfirm();
    }, CONFIRM_TIMEOUT);
  };

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      draggable
      onDragStart={(e: any) => onDragStart(e, contact)}
      onClick={onClick}
      onMouseLeave={() => isConfirming && cancelConfirm()}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md p-3 cursor-pointer group transition-all hover:-translate-y-0.5 active:scale-[0.98] relative overflow-hidden"
    >
      {/* Barra de progresso da confirmação */}
      <AnimatePresence>
        {isConfirming && (
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: progress / 100 }}
            className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-400 origin-left"
            style={{ transform: `scaleX(${progress / 100})` }}
          />
        )}
      </AnimatePresence>

      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <GripVertical
            size={14}
            className="text-gray-300 flex-shrink-0 cursor-grab active:cursor-grabbing"
          />
          <Avatar name={contact.name} size="sm" />
          <div className="min-w-0">
            <p className="font-bold text-sm text-gray-800 truncate leading-tight">{contact.name}</p>
            {contact.phone && (
              <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                <Phone size={9} />
                {contact.phone}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={startConfirm}
          disabled={deleting}
          title={isConfirming ? "Clique para confirmar exclusão" : "Excluir lead"}
          className={`
            p-1.5 rounded-lg transition-all flex-shrink-0
            ${isConfirming
              ? "bg-red-500 text-white opacity-100 scale-110"
              : "text-gray-300 hover:text-red-400 hover:bg-red-50 opacity-0 group-hover:opacity-100"
            }
          `}
        >
          {deleting ? (
            <Loader2 size={12} className="animate-spin" />
          ) : isConfirming ? (
            <AlertTriangle size={12} />
          ) : (
            <Trash2 size={12} />
          )}
        </button>
      </div>

      {/* Label de confirmação */}
      <AnimatePresence>
        {isConfirming && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="text-[10px] text-red-500 font-bold mt-1.5 pl-1"
          >
            Clique novamente para confirmar
          </motion.p>
        )}
      </AnimatePresence>

      {contact.metadata?.observacao && (
        <p className="text-[11px] text-gray-400 mt-2 pl-1 line-clamp-2 leading-relaxed">
          {contact.metadata.observacao}
        </p>
      )}
      <div className="flex items-center gap-2 mt-2 pl-1">
        <p className="text-[10px] text-gray-300">
          {new Date(contact.created_at).toLocaleDateString("pt-BR")}
        </p>
      </div>
    </motion.div>
  );
}
