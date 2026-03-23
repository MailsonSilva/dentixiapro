"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface NotificationContextType {
  notify: (title: string, message?: string, type?: ToastType, duration?: number) => void;
  remove: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback((title: string, message?: string, type: ToastType = 'info', duration = 5000) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, title, message, type, duration }]);

    if (duration !== Infinity) {
      setTimeout(() => remove(id), duration);
    }
  }, [remove]);

  return (
    <NotificationContext.Provider value={{ notify, remove }}>
      {children}
      <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-4 w-full max-w-sm pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <ToastCard key={toast.id} toast={toast} onRemove={remove} />
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
}

function ToastCard({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const icons = {
    success: <CheckCircle2 className="text-emerald-500" size={24} />,
    error: <AlertCircle className="text-rose-500" size={24} />,
    info: <Info className="text-blue-500" size={24} />,
    warning: <AlertTriangle className="text-amber-500" size={24} />,
  };

  const bgStyles = {
    success: "bg-emerald-50/90 border-emerald-100",
    error: "bg-rose-50/90 border-rose-100",
    info: "bg-blue-50/90 border-blue-100",
    warning: "bg-amber-50/90 border-amber-100",
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 50, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 50, scale: 0.95 }}
      className={cn(
        "pointer-events-auto flex items-start gap-4 p-4 rounded-3xl border shadow-xl backdrop-blur-md overflow-hidden relative",
        bgStyles[toast.type]
      )}
    >
      <div className="flex-shrink-0 mt-1">
        {icons[toast.type]}
      </div>
      
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-black text-gray-800 leading-tight">
          {toast.title}
        </h4>
        {toast.message && (
          <p className="text-xs text-gray-500 mt-1 font-medium leading-relaxed">
            {toast.message}
          </p>
        )}
      </div>

      <button
        onClick={() => onRemove(toast.id)}
        className="flex-shrink-0 p-1 rounded-full hover:bg-black/5 transition-colors text-gray-400"
      >
        <X size={18} />
      </button>

      {/* Progress bar visual */}
      {toast.duration !== undefined && toast.duration !== Infinity && (
        <motion.div
          initial={{ width: "100%" }}
          animate={{ width: "0%" }}
          transition={{ duration: toast.duration / 1000, ease: "linear" }}
          className={cn(
            "absolute bottom-0 left-0 h-1",
            toast.type === 'success' ? "bg-emerald-500/20" :
            toast.type === 'error' ? "bg-rose-500/20" :
            toast.type === 'info' ? "bg-blue-500/20" : "bg-amber-500/20"
          )}
        />
      )}
    </motion.div>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
