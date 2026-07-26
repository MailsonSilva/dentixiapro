"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play } from "lucide-react";
import { getYouTubeEmbedUrl } from "@/components/admin/AdminDashboardTab";

interface WelcomeVideoModalProps {
  isOpen: boolean;
  videoUrl: string;
  onClose: () => void;
}

export function WelcomeVideoModal({ isOpen, videoUrl, onClose }: WelcomeVideoModalProps) {
  const embedUrl = getYouTubeEmbedUrl(videoUrl);

  if (!isOpen || !embedUrl) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="relative flex flex-col items-center justify-center h-[80vh] max-h-[850px] aspect-[9/16] bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10 ring-1 ring-black/50"
        >
          {/* Botão Fechar no Canto Superior Direito */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-30 flex items-center justify-center w-9 h-9 rounded-full bg-black/70 hover:bg-black text-white/90 hover:text-white border border-white/20 transition-all active:scale-95 backdrop-blur-sm"
            title="Fechar vídeo"
          >
            <X size={20} />
          </button>

          {/* Player Iframe do YouTube em Formato Vertical (1080x1920 / 9:16) */}
          <iframe
            src={embedUrl}
            title="Vídeo de Apresentação DentixiaPro"
            className="w-full h-full object-cover border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />

          {/* Barra de Ação Flutuante no Rodapé */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 w-[90%] flex justify-center">
            <button
              onClick={onClose}
              className="w-full py-2.5 px-4 bg-white/90 hover:bg-white text-slate-900 font-bold text-xs rounded-xl shadow-lg transition-all active:scale-[0.98] backdrop-blur-md uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <span>Entrar no DentixiaPro</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
