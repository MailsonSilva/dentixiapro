"use client";

import React, { useEffect, useState } from "react";
import { getUserNotificationsAction, NotificationHistoryItem } from "@/lib/admin/actions";
import { Bell, Info, AlertTriangle, Rocket, Gift, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function UserNotificationsBanner() {
  const [activeNotification, setActiveNotification] = useState<NotificationHistoryItem | null>(null);

  useEffect(() => {
    async function checkNotifications() {
      try {
        const res = await getUserNotificationsAction();
        if (res.notifications && res.notifications.length > 0) {
          const dismissedRaw = localStorage.getItem("dentixia_dismissed_notifs");
          const dismissedIds: string[] = dismissedRaw ? JSON.parse(dismissedRaw) : [];

          // Encontrar a notificação mais recente que o usuário ainda não fechou
          const unread = res.notifications.find((n) => !dismissedIds.includes(n.id));
          if (unread) {
            setActiveNotification(unread);
          }
        }
      } catch (err) {
        console.error("Erro ao carregar notificações do usuário:", err);
      }
    }

    checkNotifications();
  }, []);

  const handleDismiss = () => {
    if (!activeNotification) return;

    try {
      const dismissedRaw = localStorage.getItem("dentixia_dismissed_notifs");
      const dismissedIds: string[] = dismissedRaw ? JSON.parse(dismissedRaw) : [];
      if (!dismissedIds.includes(activeNotification.id)) {
        dismissedIds.push(activeNotification.id);
        localStorage.setItem("dentixia_dismissed_notifs", JSON.stringify(dismissedIds));
      }
    } catch (err) {
      console.error("Erro ao salvar notificação dispensada:", err);
    }

    setActiveNotification(null);
  };

  if (!activeNotification) return null;

  const categoryIcons: Record<string, any> = {
    comum: Info,
    aviso: AlertTriangle,
    atualizacao: Rocket,
    promocao: Gift,
  };

  const IconComponent = categoryIcons[activeNotification.category] || Bell;

  return (
    <AnimatePresence>
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[99999] w-[92vw] max-w-lg">
        <motion.div
          initial={{ opacity: 0, y: -25, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -25, scale: 0.95 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="bg-white/95 backdrop-blur-xl border border-primary/20 shadow-2xl rounded-2xl p-4 flex items-start gap-3.5 ring-1 ring-black/5"
        >
          <div className="p-2.5 bg-primary/10 text-primary rounded-xl flex-shrink-0 mt-0.5">
            <IconComponent className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {activeNotification.category}
              </span>
            </div>

            <h4 className="text-xs font-bold text-slate-900 leading-tight">
              {activeNotification.title}
            </h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed whitespace-pre-line">
              {activeNotification.message}
            </p>
          </div>

          <button
            onClick={handleDismiss}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
            title="Fechar Notificação"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
