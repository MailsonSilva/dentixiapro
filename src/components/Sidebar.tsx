"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LogOut,
  LayoutDashboard,
  Sparkles,
  User,
  Home,
  ChevronRight,
  Menu,
  ChevronLeft,
  BookOpen,
  ShieldCheck,
  LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { signOutAction } from "@/lib/auth/actions";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import { useSidebar } from "@/lib/SidebarContext";
import { useNotification } from "@/lib/NotificationContext";
import { Button } from "./ui/Button";

interface SidebarProps {
  type: "comum" | "parceiro";
  userRole?: string | null;
}

type MenuItemShape = {
  name: string;
  href: string;
  icon: LucideIcon;
};

export function Sidebar({ type, userRole }: SidebarProps) {
  const pathname = usePathname();
  const path = pathname ?? "";
  const router = useRouter();
  const { isOpen, toggle } = useSidebar();
  const { notify } = useNotification();

  const handleLogout = async () => {
    await signOutAction();
    notify("Sessão encerrada", "Você saiu da sua conta.", "info");
    router.push("/login");
  };

  const baseItems: MenuItemShape[] =
    type === "parceiro"
      ? [
          { name: "Dashboard", href: "/parceiros", icon: LayoutDashboard },
          { name: "Perfil", href: "/perfil", icon: User },
        ]
      : [
          { name: "Início", href: "/", icon: Home },
          { name: "Simulações", href: "/simulacoes/resultados", icon: Sparkles },
          { name: "Aulas", href: "/aulas", icon: BookOpen },
          { name: "Perfil", href: "/perfil", icon: User },
        ];

  const menuItems: MenuItemShape[] =
    (userRole === 'admin' || userRole === 'super_admin')
      ? [...baseItems, { name: "Admin", href: "/admin", icon: ShieldCheck }]
      : baseItems;

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col bg-white/95 backdrop-blur-2xl border-r border-blue-50/50 h-full z-40 transition-all duration-300 ease-in-out flex-shrink-0 overflow-hidden",
        isOpen ? "w-64" : "w-20"
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "p-5 flex items-center justify-between min-h-[80px]",
          isOpen ? "flex-row" : "flex-col gap-4"
        )}
      >
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1"
          >
            <Image
              src="/logo.png"
              alt="DentixIA"
              width={140}
              height={32}
              className="h-8 w-auto object-contain"
              priority
            />
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center p-1.5"
          >
            <Image
              src="/logo-icon.png"
              alt="DentixIA"
              width={40}
              height={40}
              className="w-full h-full object-contain"
              priority
            />
          </motion.div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggle}
          className="p-2 h-10 w-10 rounded-xl hover:bg-primary/5 text-primary transition-transform active:scale-90"
        >
          {isOpen ? <ChevronLeft size={24} /> : <Menu size={24} />}
        </Button>
      </div>

      {/* Navegação */}
      <nav className="flex-1 px-4 space-y-1.5 mt-6 overflow-y-auto scrollbar-hide pb-20">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = path === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center px-4 py-3 rounded-xl text-sm font-bold transition-all duration-300",
                isActive
                  ? "bg-primary text-white shadow-lg shadow-primary/20"
                  : "text-gray-400 hover:bg-primary/5 hover:text-primary",
                isOpen ? "justify-between" : "justify-center"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                {isOpen && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    {item.name}
                  </motion.span>
                )}
              </div>

              {isOpen && (
                <ChevronRight
                  size={16}
                  className={cn(
                    "transition-all duration-300",
                    isActive
                      ? "opacity-100 translate-x-0"
                      : "opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0"
                  )}
                />
              )}

              {isActive && (
                <motion.div
                  layoutId="active-nav-indicator"
                  className={cn(
                    "absolute bg-accent rounded-full",
                    isOpen ? "left-0 w-1.5 h-8" : "bottom-0 w-8 h-1"
                  )}
                />
              )}

              {!isOpen && (
                <div className="absolute left-full ml-4 px-3 py-2 bg-gray-900 text-white text-[11px] font-semibold capitalize tracking-wider rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50 shadow-2xl whitespace-nowrap translate-x-2 group-hover:translate-x-0">
                  {item.name}
                  <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 border-y-[6px] border-y-transparent border-r-[6px] border-r-gray-900" />
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-blue-50/50 mt-auto">
        <button
          onClick={handleLogout}
          className={cn(
            "flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold text-red-500/80 hover:bg-red-50 hover:text-red-600 transition-all duration-300 border border-transparent hover:border-red-100/50",
            isOpen ? "justify-start" : "justify-center"
          )}
        >
          <LogOut size={20} />
          {isOpen && <span>Encerrar Sessão</span>}
        </button>
      </div>
    </aside>
  );
}
