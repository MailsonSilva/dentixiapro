"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Sparkles, MessageSquare, User, LayoutDashboard, Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface NavbarProps {
  type?: 'comum' | 'parceiro';
}

export function Navbar({ type = 'comum' }: NavbarProps) {
  const pathname = usePathname();

  // Se estiver em páginas de auth, não mostrar navbar
  if (pathname.includes("/login") || pathname.includes("/register") || pathname.includes("/forgot")) return null;

  const navItems = type === 'parceiro' ? [
    { name: 'Dashboard', href: '/parceiros', icon: LayoutDashboard },
    { name: 'Indique e Ganhe', href: '/indique-e-ganhe', icon: Gift },
    { name: 'Perfil', href: '/perfil', icon: User },
  ] : [
    { name: 'Página Inicial', href: '/', icon: Home },
    { name: 'Simulações', href: '/simulacoes/resultados', icon: Sparkles },
    { name: 'CRM', href: '/chat', icon: MessageSquare },
    { name: 'Perfil', href: '/perfil', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[60] bg-white/80 backdrop-blur-xl border-t border-blue-50 px-4 pb-safe-area-inset-bottom md:hidden h-16">
      <div className="max-w-screen-xl mx-auto flex justify-between items-center h-full">
        {/* Navigation Items (Logo Removed) */}
        <div className="flex w-full justify-around md:w-auto md:gap-10">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex flex-col items-center gap-1 group transition-all duration-300",
                  isActive ? "text-primary" : "text-gray-400 hover:text-primary-light"
                )}
              >
                <div className={cn(
                  "p-2 rounded-2xl transition-all duration-300",
                  isActive ? "bg-primary/10" : "group-hover:bg-primary/5"
                )}>
                  <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={cn(
                  "text-[10px] uppercase tracking-wider font-bold md:text-[11px]",
                  isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100 transition-opacity"
                )}>
                  {item.name}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute -top-1 w-1 h-1 bg-primary rounded-full md:hidden"
                  />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
