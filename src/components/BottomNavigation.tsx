"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Sparkles, User, BookOpen, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface BottomNavigationProps {
  type?: "comum" | "parceiro";
}

export function BottomNavigation({ type = "comum" }: BottomNavigationProps) {
  const pathname = usePathname();

  const path = pathname ?? "";

  const navItems = [
    { name: "Início",     href: "/",                      icon: Home,     isActive: path === "/",                      locked: false },
    { name: "Simulações", href: "/simulacoes/resultados", icon: Sparkles, isActive: path.startsWith("/simulacoes"),    locked: false },
    { name: "Aulas",      href: "/aulas",                 icon: BookOpen, isActive: path.startsWith("/aulas"),         locked: true  },
    { name: "Perfil",     href: "/perfil",                icon: User,     isActive: path.startsWith("/perfil"),        locked: false },
  ];

  return (
    <div className="fixed bottom-5 left-0 right-0 z-50 flex justify-center px-4 md:hidden pointer-events-none">
      <nav className="flex items-center justify-between gap-1 bg-white/85 backdrop-blur-xl border border-slate-100/80 px-2.5 py-1.5 rounded-[28px] shadow-[0_8px_32px_rgba(15,80,166,0.1)] max-w-sm w-full pointer-events-auto">
        {navItems.map((item) => {
          const Icon = item.icon;

          const itemInner = (
            <div
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 transition-all duration-200 z-10 relative",
                item.locked
                  ? "text-slate-300"
                  : item.isActive
                    ? "text-primary scale-105"
                    : "text-primary/60 hover:text-primary"
              )}
            >
              <div className="relative">
                <Icon
                  size={18}
                  strokeWidth={item.isActive ? 2.5 : 2}
                  className="transition-transform duration-200"
                />
                {item.locked && (
                  <Lock
                    size={10}
                    strokeWidth={2.5}
                    className="absolute -top-1 -right-1.5 text-red-500"
                  />
                )}
              </div>
              <span className="text-xs font-semibold tracking-tight leading-none">
                {item.name}
              </span>
            </div>
          );

          if (item.locked) {
            return (
              <div
                key={item.href}
                title="Conteúdo bloqueado"
                className="flex-1 flex flex-col items-center justify-center py-1.5 relative min-h-[44px] rounded-2xl cursor-not-allowed select-none touch-manipulation"
              >
                {itemInner}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 flex flex-col items-center justify-center py-1.5 relative min-h-[44px] rounded-2xl cursor-pointer select-none transition-transform duration-200 active:scale-95 touch-manipulation"
            >
              {itemInner}

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
