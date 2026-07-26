"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckSquare, Square } from "lucide-react";
import { getYouTubeEmbedUrl } from "@/components/admin/AdminDashboardTab";
import { setCheckVideoAction } from "@/lib/auth/actions";
import { toast } from "sonner";

interface WelcomeVideoModalProps {
  isOpen: boolean;
  videoUrl: string;
  onClose: () => void;
}

export function WelcomeVideoModal({ isOpen, videoUrl, onClose }: WelcomeVideoModalProps) {
  const [isChecked, setIsChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  const embedUrl = getYouTubeEmbedUrl(videoUrl);

  if (!isOpen || !embedUrl) return null;

  const handleToggleCheck = async () => {
    const nextVal = !isChecked;
    setIsChecked(nextVal);
    setSaving(true);
    const res = await setCheckVideoAction(nextVal);
    if (res?.error) {
      toast.error(`Erro ao salvar preferência: ${res.error}`);
    } else if (nextVal) {
      toast.success("Marcado como assistido. O vídeo não aparecerá novamente.");
    }
    setSaving(false);
  };

  const handleClose = async () => {
    if (isChecked) {
      await setCheckVideoAction(true);
    }
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="relative flex flex-col items-center justify-between h-[80vh] max-h-[850px] aspect-[9/16] bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10 ring-1 ring-black/50"
        >
          {/* Botão Fechar no Canto Superior Direito */}
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 z-30 flex items-center justify-center w-9 h-9 rounded-full bg-black/70 hover:bg-black text-white/90 hover:text-white border border-white/20 transition-all active:scale-95 backdrop-blur-sm"
            title="Fechar vídeo"
          >
            <X size={20} />
          </button>

          {/* Player Iframe do YouTube em Formato Vertical (1080x1920 / 9:16) */}
          <div className="relative w-full flex-1 bg-black">
            <iframe
              src={embedUrl}
              title="Vídeo de Apresentação DentixiaPro"
              className="w-full h-full object-cover border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          {/* Card Inferior com Checkbox e Botão */}
          <div className="w-full bg-slate-900/95 border-t border-white/10 p-3.5 flex flex-col gap-2.5 backdrop-blur-md z-20">
            {/* Checkbox "Já assisti a este vídeo" */}
            <button
              type="button"
              onClick={handleToggleCheck}
              disabled={saving}
              className="flex items-center gap-2.5 text-left text-xs font-semibold text-slate-200 hover:text-white transition-colors cursor-pointer select-none px-1"
            >
              {isChecked ? (
                <CheckSquare size={18} className="text-emerald-400 flex-shrink-0" />
              ) : (
                <Square size={18} className="text-slate-400 flex-shrink-0" />
              )}
              <span className={isChecked ? "text-emerald-400 font-bold" : "text-slate-300"}>
                Já assisti a este vídeo (Não mostrar novamente)
              </span>
            </button>

            {/* Botão de Fechar / Entrar */}
            <button
              onClick={handleClose}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-[0.98] uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <span>Entrar no DentixiaPro</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
