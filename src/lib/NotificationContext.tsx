"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, AlertTriangle, Info, X } from "lucide-react";

type NotificationType = "success" | "error" | "info" | "warning";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
}

interface NotificationContextType {
  notify: (title: string, message: string, type?: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const notify = useCallback((title: string, message: string, type: NotificationType = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications((prev) => [...prev, { id, title, message, type }]);

    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 4000);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
        <AnimatePresence>
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className="bg-white/95 backdrop-blur-md border border-gray-100 shadow-2xl p-4 rounded-2xl flex gap-3 pointer-events-auto items-start"
            >
              <div className="flex-shrink-0 mt-0.5">
                {n.type === "success" && <CheckCircle className="text-emerald-500" size={20} />}
                {n.type === "error" && <AlertTriangle className="text-red-500" size={20} />}
                {n.type === "warning" && <AlertTriangle className="text-amber-500" size={20} />}
                {n.type === "info" && <Info className="text-blue-500" size={20} />}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-gray-800">{n.title}</h4>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{n.message}</p>
              </div>
              <button
                onClick={() => removeNotification(n.id)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-0.5 rounded-lg"
              >
                <X size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotification must be used within a NotificationProvider");
  }
  return context;
}
