"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Sparkles, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function BottomNavigation() {
  const pathname = usePathname();

  const navItems = [
    {
      name: "Home",
      href: "/",
      icon: Home,
      isActive: pathname === "/",
    },
    {
      name: "Simulações",
      href: "/simulacoes/resultados",
      icon: Sparkles,
      isActive: pathname.startsWith("/simulacoes"),
    },
    {
      name: "Perfil",
      href: "/perfil",
      icon: User,
      isActive: pathname.startsWith("/perfil"),
    },
  ];

  return (
    <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4 md:hidden pointer-events-none">
      <nav className="flex items-center justify-between gap-1.5 bg-white/80 backdrop-blur-xl border border-slate-100/80 px-3 py-2 rounded-[28px] shadow-[0_8px_32px_rgba(15,80,166,0.08)] max-w-sm w-full pointer-events-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 flex flex-col items-center justify-center py-2 relative min-h-[48px] rounded-2xl cursor-pointer select-none transition-transform duration-200 active:scale-95 touch-manipulation"
            >
              <div
                className={cn(
                  "flex flex-col items-center justify-center gap-1 transition-all duration-200 z-10",
                  item.isActive ? "text-primary scale-105" : "text-slate-400 hover:text-slate-600"
                )}
              >
                <Icon size={20} strokeWidth={item.isActive ? 2.5 : 2} className="transition-transform duration-200" />
                <span className="text-[10px] font-bold tracking-tight">
                  {item.name}
                </span>
              </div>

              {item.isActive && (
                <motion.div
                  layoutId="active-bottom-nav"
                  className="absolute inset-0 bg-primary/5 rounded-2xl -z-0"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
