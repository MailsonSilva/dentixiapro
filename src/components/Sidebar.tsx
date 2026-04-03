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
  Users,
  Settings,
  ChevronDown,
  Calendar,
  MessageSquare,
  Contact,
  LucideIcon
} from "lucide-react";

import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import Image from "next/image";
import { useSidebar } from "@/lib/SidebarContext";
import { useNotification } from "@/lib/NotificationContext";
import { Button } from "./ui/Button";

interface SidebarProps {
  type: 'comum' | 'parceiro';
}

type SubMenuItem = {
  name: string;
  href: string;
  icon: LucideIcon;
};

type MenuItemShape = {
  name: string;
  href?: string;
  icon: LucideIcon;
  subItems?: SubMenuItem[];
};

export function Sidebar({ type }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isCollapsed, toggle } = useSidebar();
  const { notify } = useNotification();
  
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>(() => {
    // Default open if pathname matches
    const isGestaoActive = pathname?.includes('/crm') || pathname?.includes('/mensagens') || pathname?.includes('/clientes') || pathname?.includes('/agenda');
    return {
      'Gestão de Clientes': isGestaoActive || true // We can keep it always initially true as well
    };
  });

  const toggleMenu = (name: string) => {
    setOpenMenus(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    notify("Sessão encerrada", "Você saiu da sua conta.", "info");
    router.push("/login");
  };

  const menuItems: MenuItemShape[] = type === 'parceiro' ? [
    { name: 'Dashboard', href: '/parceiros', icon: LayoutDashboard },
    { name: 'Perfil', href: '/perfil', icon: User },
  ] : [
    { name: 'Página Inicial', href: '/', icon: Home },
    { name: 'Simulações', href: '/simulacoes/resultados', icon: Sparkles },
    { 
      name: 'Gestão de Clientes', 
      icon: Users,
      subItems: [
        { name: 'Leads (CRM)', href: '/crm', icon: Contact },
        { name: 'Clientes', href: '/clientes', icon: Users },
        { name: 'Chat', href: '/mensagens', icon: MessageSquare },
        { name: 'Agenda', href: '/agenda', icon: Calendar },
      ],
    },
    { name: 'Tutoriais', href: '/aulas', icon: BookOpen },
    { name: 'Configurações', href: '/configuracoes', icon: Settings },
  ];

  return (
    <aside 
      className={cn(
        "hidden md:flex flex-col bg-white/95 backdrop-blur-2xl border-r border-blue-50/50 h-full z-40 transition-all duration-300 ease-in-out flex-shrink-0 overflow-hidden",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Header com Logo e Botão de Toggle */}
      <div className={cn(
        "p-5 flex items-center justify-between min-h-[80px]",
        isCollapsed ? "flex-col gap-4" : "flex-row"
      )}>
        {!isCollapsed ? (
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
            className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center p-1.5 group-hover:bg-primary/10 transition-colors"
          >
             <Image src="/logo-icon.png" alt="DentixIA" width={40} height={40} className="w-full h-full object-contain" priority />
          </motion.div>
        )}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={toggle}
          className="p-2 h-10 w-10 rounded-xl hover:bg-primary/5 text-primary transition-transform active:scale-90"
        >
          {isCollapsed ? <Menu size={24} /> : <ChevronLeft size={24} />}
        </Button>
      </div>

      {/* Navegação */}
      <nav className="flex-1 px-4 space-y-2 mt-6 overflow-y-auto scrollbar-hide pb-20">
        {menuItems.map((item) => {
          const Icon = item.icon;
          
          if (item.subItems) {
            const hasActiveSubItem = item.subItems.some((sub: SubMenuItem) => pathname === sub.href || pathname.startsWith(`${sub.href}/`));
            const isOpen = openMenus[item.name] || false;
            
            return (
              <div key={item.name} className="space-y-1">
                <button
                  onClick={() => {
                    if (isCollapsed) {
                      toggle();
                      setOpenMenus(prev => ({ ...prev, [item.name]: true }));
                    } else {
                      toggleMenu(item.name);
                    }
                  }}
                  className={cn(
                    "w-full group relative flex items-center px-4 py-3 rounded-xl text-sm font-bold transition-all duration-300",
                    hasActiveSubItem && !isOpen
                      ? "bg-primary/5 text-primary" 
                      : "text-gray-400 hover:bg-primary/5 hover:text-primary",
                    isCollapsed ? "justify-center" : "justify-between"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={20} strokeWidth={hasActiveSubItem ? 2.5 : 2} />
                    {!isCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                      >
                        {item.name}
                      </motion.span>
                    )}
                  </div>
                  
                  {!isCollapsed && (
                    <ChevronDown 
                      size={16} 
                      className={cn(
                        "transition-transform duration-300",
                        isOpen ? "rotate-180" : ""
                      )} 
                    />
                  )}

                  {isCollapsed && (
                    <div className="absolute left-full ml-4 px-3 py-2 bg-gray-900 text-white text-[11px] font-semibold capitalize tracking-wider rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50 shadow-2xl whitespace-nowrap translate-x-2 group-hover:translate-x-0">
                      {item.name}
                      <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 border-y-[6px] border-y-transparent border-r-[6px] border-r-gray-900" />
                    </div>
                  )}
                </button>

                {/* Sub-items */}
                <AnimatePresence>
                  {isOpen && !isCollapsed && (
                    <motion.div 
                      key={`submenu-${item.name}`}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="pl-4 space-y-1 overflow-hidden"
                    >
                      {item.subItems.map((subItem: SubMenuItem) => {
                        const SubIcon = subItem.icon;
                        const isSubActive = pathname === subItem.href || pathname.startsWith(`${subItem.href}/`);
                        return (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            className={cn(
                              "group relative flex items-center px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300",
                              isSubActive 
                                ? "bg-primary text-white shadow-md shadow-primary/20" 
                                : "text-gray-400 hover:bg-primary/5 hover:text-primary"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <SubIcon size={18} strokeWidth={isSubActive ? 2.5 : 2} />
                              <span>{subItem.name}</span>
                            </div>
                            
                            {isSubActive && (
                              <motion.div 
                                layoutId={`active-nav-indicator-${item.name}`}
                                className="absolute left-0 w-1.5 h-6 bg-accent rounded-full"
                              />
                            )}
                          </Link>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          }

          const isActive = pathname === item.href || (item.href !== '/' && !!item.href && pathname.startsWith(`${item.href}/`));
          
          return (
            <Link
              key={item.href ?? item.name}
              href={item.href ?? '#'}
              className={cn(
                "group relative flex items-center px-4 py-3 rounded-xl text-sm font-bold transition-all duration-300",
                isActive 
                  ? "bg-primary text-white shadow-lg shadow-primary/20" 
                  : "text-gray-400 hover:bg-primary/5 hover:text-primary",
                isCollapsed ? "justify-center" : "justify-between"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    {item.name}
                  </motion.span>
                )}
              </div>
              
              {!isCollapsed && (
                <ChevronRight 
                  size={16} 
                  className={cn(
                    "transition-all duration-300",
                    isActive ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0"
                  )} 
                />
              )}

              {isActive && (
                <motion.div 
                  layoutId="active-nav-indicator"
                  className={cn(
                    "absolute bg-accent rounded-full",
                    isCollapsed ? "bottom-0 w-8 h-1" : "left-0 w-1.5 h-8"
                  )}
                />
              )}
              
              {isCollapsed && (
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
            isCollapsed ? "justify-center" : "justify-start"
          )}
        >
          <LogOut size={20} />
          {!isCollapsed && <span>Encerrar Sessão</span>}
        </button>
      </div>
    </aside>
  );
}
