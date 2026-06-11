"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { BottomNavigation } from "@/components/BottomNavigation";
import { SidebarProvider } from "@/lib/SidebarContext";
import { DrawerProvider, useDrawer } from "@/lib/DrawerContext";
import { NotificationProvider } from "@/lib/NotificationContext";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, ArrowRight, Loader2, X, Home, Sparkles, MessageSquare, User, Gift, BookOpen, LogOut } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

type UserRole = 'admin' | 'manager' | 'user' | 'super_admin' | null;

// ── Mobile Drawer ────────────────────────────────────────────────────────────
function MobileDrawer({
  userType,
  userRole,
}: {
  userType: 'comum' | 'parceiro';
  userRole: UserRole;
}) {
  const pathname = usePathname();
  const { drawerOpen, closeDrawer } = useDrawer();

  const navItems = userType === 'parceiro' ? [
    { name: 'Dashboard', href: '/parceiros', icon: Home },
    { name: 'Indique e Ganhe', href: '/indique-e-ganhe', icon: Gift },
    { name: 'Perfil', href: '/perfil', icon: User },
  ] : [
    { name: 'Página Inicial', href: '/', icon: Home },
    { name: 'Simulações', href: '/simulacoes/resultados', icon: Sparkles },
    { name: 'Ver Tutoriais', href: '/aulas', icon: BookOpen },
    { name: 'CRM', href: '/crm', icon: MessageSquare },
    { name: 'Indique e Ganhe', href: '/indique-e-ganhe', icon: Gift },
    { name: 'Perfil', href: '/perfil', icon: User },
  ];

  // Badge descritivo do role
  const roleBadge: Record<NonNullable<UserRole>, { label: string; color: string }> = {
    admin:       { label: 'Administrador', color: 'bg-primary/10 text-primary' },
    manager:     { label: 'Gerente',       color: 'bg-violet-100 text-violet-600' },
    user:        { label: 'Usuário',       color: 'bg-gray-100 text-gray-500' },
    super_admin: { label: 'Super Admin',   color: 'bg-amber-100 text-amber-600' },
  };
  const badge = userRole ? roleBadge[userRole] : null;

  return (
    <AnimatePresence>
      {drawerOpen && (
        <motion.div
          key="mobile-drawer-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] bg-gray-900/60 backdrop-blur-sm md:hidden"
          onClick={closeDrawer}
        />
      )}
      {drawerOpen && (
        <motion.aside
          key="mobile-drawer-content"
          initial={{ x: "-100%" }}
          animate={{ x: 0 }}
          exit={{ x: "-100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed top-0 left-0 bottom-0 z-[80] w-72 bg-white shadow-2xl flex flex-col md:hidden"
        >
          {/* Logo header */}
          <div className="p-6 pt-12 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <Image src="/logo.png" alt="DentixIA" width={130} height={32} className="h-8 w-auto object-contain" priority />
              <button onClick={closeDrawer} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
                <X size={22} />
              </button>
            </div>
            {badge && userType === 'comum' && (
              <span className={`inline-flex text-[10px] font-semibold capitalize tracking-widest px-2.5 py-1 rounded-full ${badge.color}`}>
                {badge.label}
              </span>
            )}
          </div>

          {/* Nav items */}
          <nav className="flex-1 px-4 pt-6 space-y-2 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeDrawer}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all",
                    isActive
                      ? "bg-primary text-white shadow-lg shadow-primary/20"
                      : "text-gray-500 hover:bg-primary/5 hover:text-primary"
                  )}
                >
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  {item.name}
                </Link>
              );
            })}
            
          </nav>

          {/* Rodapé com Opção de Sair (Logout) */}
          <div className="p-6 border-t border-gray-100">
            <button
              onClick={async () => {
                const { error } = await supabase.auth.signOut();
                if (!error) window.location.href = "/login";
              }}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 transition-all"
            >
              <LogOut size={20} />
              Sair da Conta
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function ClientLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [trialExpired, setTrialExpired] = useState(false);
  const [userType, setUserType] = useState<'comum' | 'parceiro'>('comum');
  const [userRole, setUserRole] = useState<'admin' | 'manager' | 'user' | 'super_admin' | null>(null);
  const { closeDrawer } = useDrawer();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (isMobile && pathname.startsWith("/clientes")) {
      router.replace("/");
    }
  }, [isMobile, pathname, router]);

  const isAuthPage = pathname.includes("/login") || pathname.includes("/register") || pathname.includes("/forgot");
  const isFullscreenPage = pathname === "/planos";
  const isPublicPage = pathname === "/" || isFullscreenPage;

  useEffect(() => {
    async function checkAccess() {
      if (isAuthPage || isFullscreenPage) {
        setLoading(false);
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (!isAuthPage && !isPublicPage) router.replace('/login');
          setLoading(false);
          return;
        }

        // ── Passo 1: Verificar tipo global do usuário (parceiro vs comum) ──
        const { data: usuarioData } = await supabase
          .from('usuarios')
          .select('tipo')
          .eq('id', user.id)
          .single();

        const metaType = user.user_metadata?.tipo;
        let finalTipo = usuarioData?.tipo || 'comum';

        // Sincronizar tipo com metadata do auth se necessário
        if (metaType === 'parceiro' && finalTipo !== 'parceiro') {
          await supabase.from('usuarios').update({ tipo: 'parceiro' }).eq('id', user.id);
          finalTipo = 'parceiro';
        }

        // ── Passo 2: Parceiro → área restrita de parceiro ─────────────────
        if (finalTipo === 'parceiro') {
          setUserType('parceiro');
          setUserRole(null);
          setTrialExpired(false);
          const parceiroRoutes = ['/parceiros', '/perfil', '/redefinir-senha', '/indique-e-ganhe'];
          const isParceiroRoute = parceiroRoutes.some(r => pathname.startsWith(r));
          if (!isParceiroRoute) router.push('/parceiros');
          setLoading(false);
          return;
        }

        // ── Passo 3: Comum → verificar role na empresa ────────────────────
        setUserType('comum');

        // Buscar role do usuário na empresa ativa
        const { data: ucData } = await supabase
          .from('user_company')
          .select('role')
          .eq('user_id', user.id)
          .eq('active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const role = ucData?.role as 'admin' | 'manager' | 'user' | null;
        setUserRole(role);

        // Admin tem acesso total — sem verificação de trial
        if (role === 'admin') {
          setTrialExpired(false);
          setLoading(false);
          return;
        }

        // User e Manager: verificar status do trial/assinatura
        const { data: statusData, error: statusErr } = await supabase
          .from('verificar_status_usuario')
          .select('status_code, descricao, dias_restantes')
          .single();

        if (statusErr) {
          console.error('Erro ao verificar status:', statusErr.message);
          setLoading(false);
          return;
        }

        setTrialExpired(statusData ? statusData.status_code !== 3 : false);
      } catch (err) {
        console.error('Erro ao validar acesso:', err);
      } finally {
        setLoading(false);
      }
    }

    checkAccess();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, isAuthPage, isFullscreenPage, isPublicPage]);

  // Fechar drawer ao mudar de rota
  useEffect(() => {
    closeDrawer();
  }, [pathname, closeDrawer]);

  if (isAuthPage || isFullscreenPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-secondary-bg">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  const showBlocker = trialExpired && !isPublicPage;

  return (
    <div className="flex h-screen w-full bg-secondary-bg overflow-hidden relative">
      <Sidebar type={userType} />

      {/* Mobile Drawer (tarefa 7) */}
      <MobileDrawer userType={userType} userRole={userRole} />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {userType !== 'parceiro' ? <BottomNavigation /> : <Navbar type={userType} />}
        <main className={cn(
          "flex-1 overflow-y-auto",
          pathname === "/mensagens" ? "h-full" : "pb-24 md:pb-8 pt-4"
        )}>
          {children}
        </main>
      </div>

      {/* Bloqueio Global (Paywall) */}
      <AnimatePresence>
        {showBlocker && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[9999] bg-gray-900/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl text-center border border-white/20"
            >
              <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={40} className="text-red-600" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">Acesso Expirado</h2>
              <p className="text-gray-500 mb-8 leading-relaxed">
                Seu período de teste de 7 dias chegou ao fim. Assine um plano agora para continuar usando todas as ferramentas do DentixIA Pro.
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={() => router.push("/planos")}
                  className="w-full bg-primary hover:bg-primary/90 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-primary/20"
                >
                  Ver Planos e Assinar
                  <ArrowRight size={20} />
                </button>
                
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    router.push("/login");
                  }}
                  className="w-full text-gray-400 hover:text-gray-600 py-2 text-sm font-semibold transition-colors"
                >
                  Sair da conta
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <DrawerProvider>
        <NotificationProvider>
          <Suspense fallback={null}>
            <ClientLayoutContent>{children}</ClientLayoutContent>
          </Suspense>
        </NotificationProvider>
      </DrawerProvider>
    </SidebarProvider>
  );
}
