"use client";

import React, { createContext, useContext, useCallback } from 'react';
import { toast, Toaster } from 'sonner';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface NotificationContextType {
  notify: (title: string, message?: string, type?: ToastType, duration?: number) => void;
  remove: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const remove = useCallback((id: string) => {
    toast.dismiss(id);
  }, []);

  const notify = useCallback((title: string, message?: string, type: ToastType = 'info', duration = 5000) => {
    const options = { duration, description: message };
    
    switch (type) {
      case 'success':
        toast.success(title, options);
        break;
      case 'error':
        toast.error(title, options);
        break;
      case 'warning':
        toast.warning(title, options);
        break;
      default:
        toast.info(title, options);
        break;
    }
  }, []);

  return (
    <NotificationContext.Provider value={{ notify, remove }}>
      {children}
      <Toaster position="top-right" richColors closeButton />
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}

