"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Sparkles, MessageSquare, LayoutDashboard, Gift, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useDrawer } from "@/lib/DrawerContext";

interface NavbarProps {
  type?: 'comum' | 'parceiro';
}

export function Navbar({ type = 'comum' }: NavbarProps) {
  const pathname = usePathname();
  const { openDrawer } = useDrawer();

  if (pathname.includes("/login") || pathname.includes("/register") || pathname.includes("/forgot")) return null;

  const navItems = type === 'parceiro' ? [
    { name: 'Dashboard', href: '/parceiros', icon: LayoutDashboard },
    { name: 'Indique e Ganhe', href: '/indique-e-ganhe', icon: Gift },
  ] : [
    { name: 'Início', href: '/', icon: Home },
    { name: 'Simulações', href: '/simulacoes/resultados', icon: Sparkles },
    { name: 'CRM', href: '/crm', icon: MessageSquare },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[60] bg-white/90 backdrop-blur-xl border-t border-blue-50 px-2 pb-safe-area-inset-bottom md:hidden h-16">
      <div className="max-w-screen-xl mx-auto flex justify-around items-center h-full">
        {/* Navigation Items (Início, Simulações, CRM) */}
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center gap-0.5 px-3 group transition-all duration-300",
                isActive ? "text-primary" : "text-gray-400 hover:text-primary-light"
              )}
            >
              <div className={cn(
                "p-2 rounded-xl transition-all duration-300",
                isActive ? "bg-primary/10" : "group-hover:bg-primary/5"
              )}>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={cn(
                "text-[10px] capitalize tracking-wide font-bold transition-all",
                isActive ? "text-primary" : "text-gray-400"
              )}>
                {item.name}
              </span>
              {isActive && (
                <motion.div
                  layoutId="active-pill"
                  className="absolute -top-1 w-1 h-1 bg-primary rounded-full"
                />
              )}
            </Link>
          );
        })}

        {/* Menu hamburguer (último item) */}
        <button
          onClick={openDrawer}
          className="relative flex flex-col items-center gap-0.5 px-3 text-gray-400 hover:text-primary transition-all duration-300"
          aria-label="Abrir menu"
        >
          <div className="p-2 rounded-xl hover:bg-primary/5 transition-all">
            <Menu size={22} strokeWidth={2} />
          </div>
          <span className="text-[10px] capitalize tracking-wide font-bold text-gray-400">Menu</span>
        </button>
      </div>
    </nav>
  );
}
