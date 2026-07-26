"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, Circle } from "lucide-react";
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
      toast.success("Marcado como assistido. O vídeo não será exibido novamente.");
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-md">
        {/* Card Modal em proporção 1080x1920 (9:16 vertical), ocupando ~80% da altura da tela */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative flex flex-col items-center justify-between h-[80vh] max-h-[860px] aspect-[9/16] max-w-[92vw] bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/15 ring-1 ring-black/80"
        >
          {/* Botão Fechar no Canto Superior Direito (Glassmorphism redondo) */}
          <button
            onClick={handleClose}
            className="absolute top-3.5 right-3.5 z-30 flex items-center justify-center w-9 h-9 rounded-full bg-black/70 hover:bg-black text-white/90 hover:text-white border border-white/20 transition-all active:scale-95 backdrop-blur-md shadow-lg"
            title="Fechar vídeo"
          >
            <X size={18} />
          </button>

          {/* Área do Vídeo Iframe YouTube (Proporção Vertical 1080x1920) */}
          <div className="relative w-full flex-1 bg-black overflow-hidden">
            <iframe
              src={embedUrl}
              title="Vídeo de Apresentação DentixiaPro"
              className="w-full h-full object-cover border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          {/* Painel de Ações e Botões do Card */}
          <div className="w-full bg-gradient-to-b from-slate-900/90 to-slate-950/95 border-t border-white/10 p-4 flex flex-col gap-3 backdrop-blur-xl z-20">
            {/* Botão de Formato Checkbox Personalizado: "Já assisti a este vídeo" */}
            <button
              type="button"
              onClick={handleToggleCheck}
              disabled={saving}
              className={`w-full flex items-center justify-center gap-2.5 py-2.5 px-3.5 rounded-2xl text-xs font-semibold transition-all border cursor-pointer active:scale-[0.99] select-none ${
                isChecked
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-sm"
                  : "bg-slate-800/70 hover:bg-slate-800 border-white/10 text-slate-300"
              }`}
            >
              {isChecked ? (
                <CheckCircle2 size={17} className="text-emerald-400 flex-shrink-0" />
              ) : (
                <Circle size={17} className="text-slate-400 flex-shrink-0" />
              )}
              <span className={isChecked ? "text-emerald-300 font-bold" : "text-slate-300"}>
                Já assisti a este vídeo (Não mostrar novamente)
              </span>
            </button>

            {/* Botão de Ação Principal: Entrar no DentixiaPro */}
            <button
              onClick={handleClose}
              className="w-full py-3 px-5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-emerald-950/50 transition-all active:scale-[0.98] uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <span>Entrar no DentixiaPro</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
