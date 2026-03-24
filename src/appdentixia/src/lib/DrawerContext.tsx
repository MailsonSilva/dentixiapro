"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";

interface DrawerContextType {
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const DrawerContext = createContext<DrawerContextType | undefined>(undefined);

export function DrawerProvider({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const value = useMemo(() => ({
    drawerOpen,
    openDrawer,
    closeDrawer,
  }), [drawerOpen, openDrawer, closeDrawer]);

  return (
    <DrawerContext.Provider value={value}>
      {children}
    </DrawerContext.Provider>
  );
}

export function useDrawer() {
  const context = useContext(DrawerContext);
  if (context === undefined) {
    throw new Error("useDrawer must be used within a DrawerProvider");
  }
  return context;
}
