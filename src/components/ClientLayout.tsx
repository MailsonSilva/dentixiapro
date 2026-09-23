"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { BottomNavigation } from "@/components/BottomNavigation";
import { SidebarProvider } from "../lib/SidebarContext";
import { DrawerProvider, useDrawer } from "../lib/DrawerContext";
import { NotificationProvider } from "../lib/NotificationContext";
import { getClientLayoutDataAction, signOutAction, saveUserPhoneAction, setCheckVideoAction } from "@/lib/auth/actions";
import { getPublicWelcomeVideoUrlAction } from "@/lib/admin/actions";
import { WelcomeVideoModal } from "@/components/WelcomeVideoModal";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, ArrowRight, Loader2, X, Home, Sparkles, User, Gift, BookOpen, LogOut, Phone, Play, CheckSquare, Square, ShieldCheck } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { IMAGES } from "@/lib/images";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/Input";
import { useNotification } from "../lib/NotificationContext";
import { UserNotificationsBanner } from "@/components/UserNotificationsBanner";


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
  const router = useRouter();
  const { isOpen: drawerOpen, closeDrawer } = useDrawer();

  const navItems = userType === 'parceiro' ? [
    { name: 'Dashboard', href: '/parceiros', icon: Home },
    { name: 'Indique e Ganhe', href: '/indique-e-ganhe', icon: Gift },
    { name: 'Perfil', href: '/perfil', icon: User },
  ] : [
    { name: 'Início', href: '/', icon: Home },
    { name: 'Simulações', href: '/simulacoes/resultados', icon: Sparkles },
    { name: 'Aulas', href: '/aulas', icon: BookOpen },
    { name: 'Perfil', href: '/perfil', icon: User },
    ...((userRole === 'admin' || userRole === 'super_admin') ? [{ name: 'Admin', href: '/admin', icon: ShieldCheck }] : []),
  ];

  // Badge descritivo do role
  const roleBadge: Record<NonNullable<UserRole>, { label: string; color: string }> = {
    admin: { label: 'Administrador', color: 'bg-primary/10 text-primary' },
    manager: { label: 'Gerente', color: 'bg-violet-100 text-violet-600' },
    user: { label: 'Usuário', color: 'bg-gray-100 text-gray-500' },
    super_admin: { label: 'Super Admin', color: 'bg-amber-100 text-amber-600' },
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
              <Image src={IMAGES.logo} alt="DentixIA" width={130} height={32} className="h-8 w-auto object-contain" priority />
              <button onClick={closeDrawer} className="p-3 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
                <X size={22} />
              </button>
            </div>
            {badge && userType === 'comum' && (
              <span className={`inline-flex text-[10px] font-semibold capitalize tracking-widest px-2.5 py-1 rounded-full ${badge?.color || ''}`}>
                {badge?.label || ''}
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
                    "flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-bold transition-all",
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
                await signOutAction();
                router.push("/login");
              }}
              className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-bold text-red-500 hover:bg-red-50 transition-all"
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
  const { notify } = useNotification();
  const [loading, setLoading] = useState(true);
  const [trialExpired, setTrialExpired] = useState(false);
  const [userType, setUserType] = useState<'comum' | 'parceiro'>('comum');
  const [userRole, setUserRole] = useState<'admin' | 'manager' | 'user' | 'super_admin' | null>(null);
  const { closeDrawer } = useDrawer();
  const [isMobile, setIsMobile] = useState(false);

  // States para modal de completar cadastro (WhatsApp) e vídeo de boas-vindas
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);

  const [showWelcomeVideo, setShowWelcomeVideo] = useState(false);
  const [welcomeVideoUrl, setWelcomeVideoUrl] = useState("");
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const path = pathname ?? "";
  const isAuthPage = path.includes("/login") || path.includes("/register") || path.includes("/forgot") || path.includes("/redefinir-senha");
  const isFullscreenPage = path === "/planos";

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    async function loadUserData() {
      if (isAuthPage || isFullscreenPage) {
        setLoading(false);
        return;
      }

      try {
        const res = await getClientLayoutDataAction();
        if (res.error || !res.data) {
          setLoading(false);
          return;
        }

        const { userType: type, userRole: role, trialExpired: expired, telefone, checkVideo } = res.data;
        setUserType(type);
        setUserRole(role);
        setTrialExpired(expired);

        // 1. Validação de WhatsApp obrigatório (Social Login ou cadastro sem fone)
        if (!telefone || telefone.trim().length < 10) {
          setShowPhoneModal(true);
        } else {
          setShowPhoneModal(false);
          if (!checkVideo) {
            // 2. Se o fone está ok e checkVideo for false, busca a URL do vídeo de boas-vindas e exibe o modal
            const videoRes = await getPublicWelcomeVideoUrlAction();
            if (videoRes.url && videoRes.url.trim()) {
              setWelcomeVideoUrl(videoRes.url.trim());
              setShowWelcomeVideo(true);
            }
          }
        }

        if (type === 'parceiro') {
          const parceiroRoutes = ['/parceiros', '/perfil', '/redefinir-senha', '/indique-e-ganhe'];
          const isParceiroRoute = parceiroRoutes.some(r => (pathname || "").startsWith(r));
          if (!isParceiroRoute) router.push('/parceiros');
        }
      } catch (err) {
        console.error('Erro ao carregar dados do layout:', err);
      } finally {
        setLoading(false);
      }
    }

    loadUserData();
  }, [pathname, isAuthPage, isFullscreenPage, isMobile, router]);

  // Fechar drawer ao mudar de rota
  useEffect(() => {
    closeDrawer();
  }, [pathname, closeDrawer]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
    let masked = digits;
    if (digits.length > 2) masked = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length > 7) {
      const body = digits.length === 11
        ? `${digits.slice(2, 7)}-${digits.slice(7)}`
        : `${digits.slice(2, 6)}-${digits.slice(6)}`;
      masked = `(${digits.slice(0, 2)}) ${body}`;
    }
    setPhoneInput(masked);
  };

  const handleSavePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDigits = phoneInput.replace(/\D/g, "");
    if (!cleanDigits || cleanDigits.length < 10) {
      notify("Telefone inválido", "Preencha um número de WhatsApp válido com DDD.", "warning");
      return;
    }
    setSavingPhone(true);
    const { error } = await saveUserPhoneAction(phoneInput);
    setSavingPhone(false);
    if (error) {
      notify("Erro ao salvar", error, "error");
    } else {
      notify("Cadastro concluído!", "Seu número de WhatsApp foi salvo.", "success");
      setShowPhoneModal(false);
      const videoRes = await getPublicWelcomeVideoUrlAction();
      if (videoRes.url && videoRes.url.trim()) {
        setWelcomeVideoUrl(videoRes.url.trim());
        setShowWelcomeVideo(true);
      }
      router.refresh();
    }
  };

  const handleCloseWelcomeVideo = async () => {
    setShowWelcomeVideo(false);
  };

  // Estado offline
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleRetryConnection = () => {
    if (navigator.onLine) {
      setIsOffline(false);
      window.location.reload();
    } else {
      notify("Sem conexão", "Ainda não detectamos conexão com a internet.", "warning");
    }
  };

  if (isAuthPage || isFullscreenPage) {
    return (
      <>
        {children}
        {/* Banner/Modal Offline para Auth/Fullscreen */}
        <AnimatePresence>
          {isOffline && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[999999] bg-gray-900/85 backdrop-blur-md flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center border border-gray-100"
              >
                <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-amber-600">
                  <AlertCircle size={30} />
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">Sem Conexão</h2>
                <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                  Você está offline. Verifique sua conexão com o Wi-Fi ou dados móveis para continuar.
                </p>
                <button
                  onClick={handleRetryConnection}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-md active:scale-[0.98]"
                >
                  Tentar Novamente
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  const isAdmin = userRole === 'admin' || userRole === 'super_admin';
  const showBlocker = trialExpired && !isAdmin;

  return (
    <div className="flex h-[100dvh] w-full bg-secondary-bg overflow-hidden relative">
      <UserNotificationsBanner />
      <Sidebar type={userType} userRole={userRole} />

      {/* Mobile Drawer (tarefa 7) */}
      <MobileDrawer userType={userType} userRole={userRole} />

      {/* BottomNavigation — fixed, persiste em todas as rotas mobile */}
      <BottomNavigation type={userType} />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {userType === 'parceiro' && <Navbar type={userType} />}
        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-16 md:pb-8 pt-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="animate-spin text-primary" size={32} />
            </div>
          ) : (
            children
          )}
        </main>
      </div>

      {/* Modal Modo Offline */}
      <AnimatePresence>
        {isOffline && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999999] bg-gray-900/85 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center border border-gray-100"
            >
              <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-amber-600">
                <AlertCircle size={30} />
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Sem Conexão</h2>
              <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                Você está offline. Verifique sua conexão com a internet para acessar as ferramentas.
              </p>
              <button
                onClick={handleRetryConnection}
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-md active:scale-[0.98]"
              >
                Tentar Novamente
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Obrigatório: Completar Cadastro (WhatsApp) */}
      <AnimatePresence>
        {showPhoneModal && !isOffline && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[99999] bg-gray-900/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100"
            >
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-3">
                  <Phone size={28} />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Completar Cadastro</h2>
                <p className="text-gray-500 text-sm mt-1 leading-relaxed">
                  Para acessar a plataforma, por favor informe seu número de WhatsApp com DDD.
                </p>
              </div>

              <form onSubmit={handleSavePhone} className="space-y-4">
                <Input
                  label="WhatsApp"
                  required
                  value={phoneInput}
                  onChange={handlePhoneChange}
                  placeholder="(00) 00000-0000"
                  icon={<Phone size={20} />}
                />

                <button
                  type="submit"
                  disabled={savingPhone}
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 cursor-pointer disabled:opacity-50"
                >
                  {savingPhone ? <Loader2 className="animate-spin" size={20} /> : "Salvar e Continuar"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bloqueio Global (Paywall) */}
      <AnimatePresence>
        {showBlocker && !showPhoneModal && !isOffline && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[9999] bg-gray-900/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-lg p-4 md:p-6 max-w-sm w-full shadow-2xl text-center border border-gray-100"
            >
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={24} className="text-red-600" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">Acesso Expirado</h2>
              <p className="text-gray-500 mb-8 leading-relaxed">
                Seu período de teste de 7 dias chegou ao fim. Assine um plano agora para continuar usando todas as ferramentas do DentixIA Pro.
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => router.push("/planos")}
                  className="w-full bg-primary hover:bg-primary/90 text-white py-2 px-4 rounded-md text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md shadow-primary/20"
                >
                  Ver Planos e Assinar
                  <ArrowRight size={20} />
                </button>

                <button
                  onClick={async () => {
                    await signOutAction();
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

      {/* Modal Vídeo de Boas-Vindas Vertical (1080x1920 / ~80% da tela) */}
      <WelcomeVideoModal
        isOpen={showWelcomeVideo && !showPhoneModal && !isOffline}
        videoUrl={welcomeVideoUrl}
        onClose={handleCloseWelcomeVideo}
      />
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
