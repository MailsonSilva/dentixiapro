"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  MessageCircle,
  Shield,
  ShieldCheck,
  Handshake,
  LogOut,
  ChevronRight,
  X,
  Clock,
  AlertCircle,
  CheckCircle2,
  Phone,
  Save,
  Loader2,
  Star,
  ExternalLink,
  Mail,
  Building2,
  CreditCard,
  KeyRound,
  Camera,
  QrCode,
  ArrowRight,
  Gift
} from "lucide-react";
import Image from "next/image";
import { getCurrentUserAction, signOutAction } from "@/lib/auth/actions";
import {
  getProfileCompanyAction,
  getUserProfileAction,
  updateUserProfileAction,
  uploadUserLogoAction,
} from "@/lib/perfil/actions";
import { useRouter } from "next/navigation";
import { useNotification } from "@/lib/NotificationContext";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import packageJson from "../../../package.json";

// ── Constants ─────────────────────────────────────────────────────────────────
const APP_VERSION = packageJson.version;
const SUPPORT_URL =
  "https://api.whatsapp.com/send/?phone=5598933005102&text&type=phone_number&app_absent=0";
const PROSPECTA_URL =
  "https://api.whatsapp.com/send/?phone=554391596932&text=Ol%C3%A1%2C+vim+pela+DentixIA.+Como+funciona+o+trabalho+da+Prospecta+Odonto%3F&type=phone_number&app_absent=0";



// ── Trial Banner ──────────────────────────────────────────────────────────────
// statusCode: 3 = acesso liberado (trial ou assinatura ativa) | 2 = trial expirado
// diasRestantes: 999 = assinatura paga ativa | >0 = dias de trial restantes | 0 = expirado
function TrialBanner({
  statusCode,
  diasRestantes,
  temAssinatura,
}: {
  statusCode: number | null;
  diasRestantes: number | null;
  temAssinatura: boolean;
}) {
  const router = useRouter();

  // Assinatura ativa paga → não mostrar banner
  if (statusCode === 3 && diasRestantes === 999) return null;

  // Trial ainda ativo
  if (statusCode === 3 && diasRestantes !== null && diasRestantes > 0) {
    const urgent = diasRestantes <= 2;
    return (
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 rounded-2xl border text-sm font-semibold mb-6 shadow-sm",
          urgent
            ? "bg-amber-50 border-amber-200 text-amber-700"
            : "bg-emerald-50 border-emerald-200 text-emerald-700"
        )}
      >
        <div className="flex items-center gap-3">
          {urgent ? (
            <Clock size={20} className="flex-shrink-0" />
          ) : (
            <CheckCircle2 size={20} className="flex-shrink-0" />
          )}
          <span className="flex-1">
            {`Seu teste acaba em: ${diasRestantes} ${diasRestantes === 1 ? "dia" : "dias"}.`}
          </span>
        </div>
        {!temAssinatura && (
          <button
            onClick={() => router.push("/planos")}
            className={cn(
              "px-4 py-2 rounded-xl font-bold transition-all text-xs flex items-center justify-center gap-1.5 active:scale-[0.98] self-start sm:self-auto",
              urgent
                ? "bg-amber-600 hover:bg-amber-700 text-white"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            )}
          >
            Assinar Agora
            <ArrowRight size={14} />
          </button>
        )}
      </motion.div>
    );
  }

  // Trial expirado e sem assinatura
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-3 px-5 py-4 rounded-2xl border text-sm font-semibold mb-6 shadow-sm bg-red-50 border-red-200 text-red-700"
    >
      <div className="flex items-center gap-3">
        <AlertCircle size={20} className="flex-shrink-0" />
        <span className="flex-1">
          Seu período de testes expirou. Assine para continuar tendo acesso total.
        </span>
      </div>
      <button
        onClick={() => router.push("/planos")}
        className="mt-1 w-full bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
      >
        Assinar Agora
        <ArrowRight size={16} />
      </button>
    </motion.div>
  );
}

// ── Settings Row ──────────────────────────────────────────────────────────────
function SettingsRow({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between px-4 py-3.5 transition-colors group",
        danger
          ? "text-red-500 hover:bg-red-50"
          : "text-gray-700 hover:bg-primary/5"
      )}
    >
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center",
            danger ? "bg-red-100 text-red-500" : "bg-gray-100 text-gray-500 group-hover:bg-primary/10 group-hover:text-primary"
          )}
        >
          <Icon size={18} />
        </div>
        <span className="font-semibold text-[15px]">{label}</span>
      </div>
      <ChevronRight
        size={18}
        className={cn(
          "transition-transform group-hover:translate-x-0.5",
          danger ? "text-red-300" : "text-gray-300 group-hover:text-primary"
        )}
      />
    </button>
  );
}

// ── Modal Wrapper ─────────────────────────────────────────────────────────────
function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="relative w-full sm:max-w-lg bg-white rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800 tracking-wide capitalize">{title}</h2>
              <button
                onClick={onClose}
                className="p-3 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 scrollbar-hide">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PerfilPage() {
  const router = useRouter();
  const { notify } = useNotification();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [userData, setUserData] = useState<any>(null);
  const [userFallbackName, setUserFallbackName] = useState("Dentista");
  const [loading, setLoading] = useState(true);
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [diasRestantes, setDiasRestantes] = useState<number | null>(null);
  const [temAssinatura, setTemAssinatura] = useState(false);
  const [imageError, setImageError] = useState(false);

  // modal states
  const [showEdit, setShowEdit] = useState(false);
  const [showPartners, setShowPartners] = useState(false);

  // edit form
  const [editNome, setEditNome] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editTelefone, setEditTelefone] = useState("");
  const [editEmpresa, setEditEmpresa] = useState("");
  const [editCpf, setEditCpf] = useState("");
  const [editPix, setEditPix] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        // Busca dados de perfil e company em paralelo (auth é validada dentro da action)
        const [profileResult, userResult] = await Promise.all([
          getUserProfileAction(),
          getCurrentUserAction(),
        ]);

        if (profileResult.error || !profileResult.data) {
          console.error("Erro ao carregar perfil:", profileResult.error);
          if (!userResult.user) { router.push("/login"); return; }
          notify("Erro de conexão", "Verifique as configurações.", "error");
          return;
        }

        const { profile, status, userRole: role } = profileResult.data;
        const user = userResult.user;
        if (!user) { router.push("/login"); return; }

        // Busca companyId em paralelo (fire-and-forget style)
        getProfileCompanyAction(user.id).then(val => setCompanyId(val ?? null));

        setUserData(profile);
        const rawFallback = user.user_metadata?.nome_completo || user.email?.split('@')[0] || "Dentista";
        setUserFallbackName(rawFallback);
        setStatusCode(status?.status_code ?? null);
        setDiasRestantes(status?.dias_restantes ?? null);
        setTemAssinatura(status?.tem_assinatura ?? false);
        setUserRole(role ?? null);
        setEditNome(profile?.nome_completo || "");
        setEditEmail(profile?.email || "");
        setEditTelefone(profile?.telefone || "");
        setEditEmpresa(profile?.empresa || "");
        setEditCpf(profile?.cpf || "");
        setEditPix(profile?.PIX || "");
        setLogoUrl(profile?.logo_url || null);
        setImageError(false);
      } catch (error) {
        console.error("Erro fatal ao carregar perfil:", error);
        notify("Erro de conexão", "Verifique as configurações.", "error");
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [router, notify]);

  const handleLogout = async () => {
    await signOutAction();
    notify("Sessão encerrada", "Você saiu da sua conta.", "info");
    router.push("/login");
  };

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const handleOpenPortal = async () => {
    if (!companyId) {
      notify("Sem assinatura", "Você ainda não possui uma assinatura ativa.", "info");
      return;
    }
    try {
      const return_url = `${window.location.origin}/perfil`;
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-portal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ANON_KEY}`,
          apikey: ANON_KEY,
        },
        body: JSON.stringify({ company_id: companyId, return_url }),
      });
      const json = await res.json();
      if (json?.url) {
        window.location.href = json.url;
      } else {
        throw new Error(json?.error || "Não foi possível abrir o portal.");
      }
    } catch (err: unknown) {
      notify("Erro", err instanceof Error ? err.message : "Tente novamente.", "error");
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validar tamanho (ex: 2MB)
    if (file.size > 2 * 1024 * 1024) {
      notify("Erro", "A imagem deve ter no máximo 2MB.", "error");
      return;
    }

    setLogoUploading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        try {
          const base64 = (reader.result as string).split(",")[1];
          const ext = file.name.split(".").pop() || "";
          
          const uploadRes = await uploadUserLogoAction(base64, file.type, ext);
          if (uploadRes.error || !uploadRes.url) {
            throw new Error(uploadRes.error || "Erro no upload da imagem.");
          }

          setLogoUrl(uploadRes.url);
          setImageError(false);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setUserData((prev: any) => ({ ...prev, logo_url: uploadRes.url }));
          notify("Foto atualizada!", "Sua logo foi salva com sucesso.", "success");
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Não foi possível processar a imagem.";
          console.error("Erro no processamento da imagem:", err);
          notify("Erro", msg, "error");
        } finally {
          setLogoUploading(false);
          if (logoInputRef.current) logoInputRef.current.value = "";
        }
      };
      reader.onerror = () => {
        throw new Error("Erro ao ler arquivo local.");
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Não foi possível enviar a imagem.";
      console.error("Erro ao subir logo:", err);
      notify("Erro", msg, "error");
      setLogoUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const { user, error: userError } = await getCurrentUserAction();
      if (userError || !user) throw new Error("Não autenticado");

      // Chamada segura Server-Side para atualização cadastral no BD
      const res = await updateUserProfileAction({
        nome_completo: editNome,
        telefone: editTelefone,
        empresa: editEmpresa,
        cpf: editCpf,
        PIX: editPix,
      });

      if (res.error) throw new Error(res.error);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setUserData((prev: any) => ({
        ...prev,
        nome_completo: editNome,
        telefone: editTelefone,
        empresa: editEmpresa,
        cpf: editCpf,
        PIX: editPix,
      }));
      notify("Perfil atualizado!", "Suas informações foram salvas.", "success");
      setShowEdit(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Não foi possível salvar.";
      notify("Erro", msg, "error");
    } finally {
      setIsSaving(false);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-secondary-bg">
        <Loader2 className="animate-spin text-primary" size={36} />
      </div>
    );
  }

  const isComum = userData?.tipo === "comum" || !userData?.tipo;
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';

  return (
    <div className="flex flex-col min-h-full flex-1 pb-24 md:pb-8 bg-secondary-bg">
      <main className="max-w-4xl mx-auto w-full px-4 py-6 md:pt-8">

        {/* Avatar + name */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center mb-8"
        >
          <div className="relative mb-3">
            {logoUrl && !imageError ? (
              <Image
                src={logoUrl}
                alt="Logo"
                width={96}
                height={96}
                className="w-24 h-24 rounded-full object-cover shadow-xl"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-primary to-blue-400 flex items-center justify-center text-4xl font-semibold text-white shadow-xl">
                {userData?.nome_completo?.charAt(0)?.toUpperCase() || "D"}
              </div>
            )}
          </div>
          <h1 className="text-xl font-semibold text-gray-800">
            {`Dr(a). ${(() => {
              const rawName = userData?.nome_completo || userFallbackName;
              const cleanName = rawName.replace(/^(dr\(a\)\.?|dr\.?|dra\.?|doctor\.?)\s+/i, "").trim();
              const firstName = cleanName.split(" ")[0];
              return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
            })()}`}
          </h1>
          <p className="text-sm text-gray-400">{userData?.email}</p>
        </motion.div>

        {/* Trial Banner — apenas para usuário comum que NÃO é admin */}
        {isComum && !isAdmin && <TrialBanner statusCode={statusCode} diasRestantes={diasRestantes} temAssinatura={temAssinatura} />}

        <p className="text-sm font-bold text-gray-400 capitalize tracking-widest mb-3 px-1">
          Abaixo estão suas configurações
        </p>

        {/* Conta */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
          <p className="text-[11px] font-bold text-gray-400 capitalize tracking-widest px-4 pt-4 pb-1">Conta</p>
          <div className="divide-y divide-gray-50">
            <SettingsRow
              icon={User}
              label="Editar Perfil"
              onClick={() => setShowEdit(true)}
            />
            {/* Assinatura — se já tem assinatura (ativa, pendente ou trialing), mostra "Ver sua conta" para ir ao portal, senão mostra "Assinar Agora" */}
            {isComum && temAssinatura ? (
              <SettingsRow
                icon={CreditCard}
                label="Ver sua conta"
                onClick={handleOpenPortal}
              />
            ) : isComum ? (
              <SettingsRow
                icon={CreditCard}
                label="Assinar Agora"
                onClick={() => router.push("/planos")}
              />
            ) : null}
            {/* Menu Admin — visível apenas para admin/super_admin */}
            {(userRole === 'admin' || userRole === 'super_admin') && (
              <SettingsRow
                icon={ShieldCheck}
                label="Painel Administrativo"
                onClick={() => router.push("/admin")}
              />
            )}
          </div>
        </div>

        {/* Geral */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
          <p className="text-[11px] font-bold text-gray-400 capitalize tracking-widest px-4 pt-4 pb-1">Geral</p>
          <div className="divide-y divide-gray-50">
            {isComum && (
              <SettingsRow
                icon={Gift}
                label="Indique e Ganhe"
                onClick={() => router.push("/indique-e-ganhe")}
              />
            )}
            <SettingsRow
              icon={MessageCircle}
              label="Suporte"
              onClick={() => window.open(SUPPORT_URL, "_blank")}
            />
            <SettingsRow
              icon={Shield}
              label="Termos de Uso"
              onClick={() => router.push('/termos')}
            />
            <SettingsRow
              icon={Shield}
              label="Política de Privacidade"
              onClick={() => router.push('/privacidade')}
            />
            <SettingsRow
              icon={Handshake}
              label="Nossos Parceiros"
              onClick={() => setShowPartners(true)}
            />
          </div>
        </div>

        {/* Sair */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="divide-y divide-gray-50">
            <SettingsRow icon={LogOut} label="Sair" onClick={handleLogout} danger />
          </div>
        </div>

        {/* Version */}
        <p className="text-center text-xs text-gray-400">Versão: {APP_VERSION}</p>
      </main>

      {/* ── MODAL: Editar Perfil ──────────────────────────────────────────── */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Editar Perfil">
        <div className="p-6 space-y-4">
          {/* Logo upload */}
          <div className="flex flex-col items-center mb-2">
            <div className="relative">
              {logoUrl && !imageError ? (
                <Image
                  src={logoUrl}
                  alt="Logo"
                  width={96}
                  height={96}
                  className="w-24 h-24 rounded-full object-cover shadow-lg"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-primary to-blue-400 flex items-center justify-center text-4xl font-semibold text-white shadow-lg">
                  {editNome?.charAt(0)?.toUpperCase() || "D"}
                </div>
              )}
              {/* Camera button overlay */}
              <button
                onClick={() => logoInputRef.current?.click()}
                disabled={logoUploading}
                className="absolute bottom-0 right-0 w-11 h-11 bg-primary text-white rounded-full flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors"
              >
                {logoUploading ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
              </button>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
            </div>
            <p className="text-xs text-gray-400 mt-2">Logo da Empresa</p>
          </div>

          <Input
            label="Nome Completo"
            placeholder="Seu nome completo"
            value={editNome}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditNome(e.target.value)}
            icon={<User size={18} />}
          />
          <Input
            label="E-mail"
            placeholder="seu@email.com"
            value={editEmail}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditEmail(e.target.value)}
            icon={<Mail size={18} />}
            disabled
          />
          <Input
            label="Telefone"
            placeholder="(99) 99999-9999"
            value={editTelefone}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const val = e.target.value.replace(/\D/g, "");
              if (val.length > 11) return;
              
              let masked = val;
              if (val.length > 2) masked = `(${val.slice(0, 2)}) ${val.slice(2)}`;
              if (val.length > 7) masked = `(${val.slice(0, 2)}) ${val.slice(2, 7)}-${val.slice(7)}`;
              if (val.length > 10) masked = `(${val.slice(0, 2)}) ${val.slice(2, 3)} ${val.slice(3, 7)}-${val.slice(7)}`;
              
              setEditTelefone(masked);
            }}
            icon={<Phone size={18} />}
          />
          <Input
            label="Empresa"
            placeholder="Nome da sua clínica"
            value={editEmpresa}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditEmpresa(e.target.value)}
            icon={<Building2 size={18} />}
          />
          <Input
            label="CPF"
            placeholder="000.000.000-00"
            value={editCpf}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const val = e.target.value.replace(/\D/g, "");
              if (val.length > 11) return;

              let masked = val;
              if (val.length > 3) masked = `${val.slice(0, 3)}.${val.slice(3)}`;
              if (val.length > 6) masked = `${val.slice(0, 3)}.${val.slice(3, 6)}.${val.slice(6)}`;
              if (val.length > 9) masked = `${val.slice(0, 3)}.${val.slice(3, 6)}.${val.slice(6, 9)}-${val.slice(9)}`;
              
              setEditCpf(masked);
            }}
            icon={<CreditCard size={18} />}
          />

          <Input
            label="PIX"
            placeholder="CPF, CNPJ, e-mail ou chave PIX"
            value={editPix}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditPix(e.target.value)}
            icon={<QrCode size={18} />}
          />

          <button
            disabled={isSaving}
            onClick={handleSaveProfile}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-semibold transition-all",
              isSaving ? "bg-gray-300 cursor-not-allowed" : "bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
            )}
          >
            {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            {isSaving ? "Salvando..." : "Salvar Alterações"}
          </button>

          <button
            onClick={() => { setShowEdit(false); router.push("/redefinir-senha"); }}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold transition-all border-2 border-primary text-primary hover:bg-primary/5"
          >
            <KeyRound size={20} />
            Alterar Senha
          </button>
        </div>
      </Modal>

      {/* Modal: Nossos Parceiros (mantido caso necessário) */}
      <Modal open={showPartners} onClose={() => setShowPartners(false)} title="Nossos Parceiros">
        <div className="p-6">
          <h3 className="text-center text-primary font-bold text-base mb-5">
            Marketing de prospecção
          </h3>

          {/* Prospecta Odonto card */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <div className="flex gap-4">
              {/* Logo placeholder */}
              <div className="w-16 h-16 rounded-xl bg-[#0d3152] flex-shrink-0 flex items-center justify-center overflow-hidden">
                <svg viewBox="0 0 64 64" fill="none" className="w-10 h-10" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="32" cy="32" r="24" stroke="white" strokeWidth="2.5" fill="none" />
                  <circle cx="32" cy="32" r="16" stroke="white" strokeWidth="2" fill="none" />
                  <circle cx="32" cy="32" r="8" stroke="white" strokeWidth="1.5" fill="none" />
                  <circle cx="32" cy="32" r="3" fill="white" />
                </svg>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold text-gray-800 text-sm">PROSPECTA ODONTO</h4>
                  {/* Stars */}
                  <div className="flex gap-0.5 flex-shrink-0">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={12} fill="#F59E0B" stroke="none" />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed mt-1">
                  Somos a 1ª agência de marketing odontológico especializada em captação de pacientes
                  e já atendemos mais de 7.000 clínicas em todo o Brasil.
                </p>
                <a
                  href={PROSPECTA_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-3 text-primary text-xs font-bold hover:underline"
                >
                  <ExternalLink size={13} />
                  Saiba Mais
                </a>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
