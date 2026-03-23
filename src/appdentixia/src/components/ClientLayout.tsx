"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { SidebarProvider } from "@/lib/SidebarContext";
import { NotificationProvider } from "@/lib/NotificationContext";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, ArrowRight, Loader2 } from "lucide-react";

function ClientLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [trialExpired, setTrialExpired] = useState(false);
  const [userType, setUserType] = useState<'comum' | 'parceiro'>('comum');
  
  // Ocultar layout global em páginas de login/registro e planos (fullscreen)
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
          if (!isAuthPage && !isPublicPage) {
            router.replace('/login');
          }
          setLoading(false);
          return;
        }

        // Auto-fix tipo if metadata says parceiro but table says comum
        const { data: usuarioData } = await supabase.from('usuarios').select('tipo').eq('id', user.id).single();
        const metaType = user.user_metadata?.tipo;
        let finalTipoUsuario = usuarioData?.tipo || 'comum';

        if (metaType === 'parceiro' && finalTipoUsuario !== 'parceiro') {
           await supabase.from('usuarios').update({ tipo: 'parceiro' }).eq('id', user.id);
           finalTipoUsuario = 'parceiro';
        }

        setUserType(finalTipoUsuario === 'parceiro' ? 'parceiro' : 'comum');

        if (finalTipoUsuario === 'admin') {
          setTrialExpired(false);
          setLoading(false);
          return;
        }

        if (finalTipoUsuario === 'parceiro') {
          setTrialExpired(false);
          // Redireciona parceiro para o dashboard se tentar acessar a aplicação
          if (!pathname.startsWith('/parceiros') && !pathname.startsWith('/perfil') && !pathname.startsWith('/redefinir-senha')) {
            router.push('/parceiros');
          }
          setLoading(false);
          return;
        }

        // Usa a view que considera TANTO trial_ends_at (user_company) QUANTO assinatura ativa no Stripe
        // status_code 3 = acesso liberado | 1 ou 2 = bloqueado
        const { data: statusData, error } = await supabase
          .from("verificar_status_usuario")
          .select("status_code, descricao, dias_restantes")
          .single();

        if (error) {
          console.error("Erro ao verificar status:", error.message);
          // Em caso de erro de consulta, não bloquear para não prejudicar usuário
          setLoading(false);
          return;
        }

        if (statusData && statusData.status_code !== 3) {
          setTrialExpired(true);
        } else {
          setTrialExpired(false);
        }
      } catch (err) {
        console.error("Erro ao validar acesso:", err);
      } finally {
        setLoading(false);
      }
    }
    
    checkAccess();
  // Revalida apenas em mudanças de path estritas. Retornos do stripe resetam a session global de qualquer forma no componente pai/mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, isAuthPage, isFullscreenPage, isPublicPage]);


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
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {userType !== 'parceiro' && <Navbar type={userType} />}
        <main className="flex-1 overflow-y-auto pb-24 md:pb-8 pt-4">
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
              <h2 className="text-2xl font-black text-gray-800 mb-3">Acesso Expirado</h2>
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
      <NotificationProvider>
        <Suspense fallback={null}>
          <ClientLayoutContent>{children}</ClientLayoutContent>
        </Suspense>
      </NotificationProvider>
    </SidebarProvider>
  );
}
