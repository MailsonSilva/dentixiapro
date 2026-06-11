"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, MessageSquare, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function BottomNavigation() {
  const pathname = usePathname();

  const navItems = [
    {
      name: "Início",
      href: "/",
      icon: Home,
      isActive: pathname === "/",
    },
    {
      name: "Agenda",
      href: "/agenda",
      icon: Calendar,
      isActive: pathname.startsWith("/agenda"),
    },
    {
      name: "Mensagens",
      href: "/mensagens",
      icon: MessageSquare,
      isActive: pathname.startsWith("/mensagens"),
    },
    {
      name: "Simulações",
      href: "/simulacoes",
      icon: Sparkles,
      isActive: pathname.startsWith("/simulacoes"),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-slate-100 md:hidden flex items-center justify-around px-2 py-2 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex-1 flex flex-col items-center justify-center py-2 relative min-w-[64px] min-h-[48px] rounded-2xl active:scale-95 transition-transform"
          >
            <div
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-all duration-200",
                item.isActive ? "text-primary scale-105" : "text-slate-400"
              )}
            >
              <Icon size={22} strokeWidth={item.isActive ? 2.5 : 2} />
              <span className="text-[10px] font-bold tracking-tight">
                {item.name}
              </span>
            </div>

            {item.isActive && (
              <motion.div
                layoutId="active-bottom-nav"
                className="absolute top-0 w-8 h-1 bg-primary rounded-full"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
