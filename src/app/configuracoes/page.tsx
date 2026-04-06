"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  MessageCircle,
  Shield,
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
  Receipt,
  Gift,
  Plug,
  Stethoscope,
  Trash2,
  Plus,
  CalendarDays,
} from "lucide-react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useNotification } from "@/lib/NotificationContext";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { getProcedureCatalog, ProcedureCatalogItem } from "@/lib/agenda/queries";
import { addProcedureToCatalog, deleteProcedureFromCatalog } from "@/lib/clientes/actions";

// ── Constants ─────────────────────────────────────────────────────────────────
const APP_VERSION = "4.0.0";
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
}: {
  statusCode: number | null;
  diasRestantes: number | null;
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
          "flex items-center gap-3 px-5 py-4 rounded-2xl border text-sm font-semibold mb-6 shadow-sm",
          urgent
            ? "bg-amber-50 border-amber-200 text-amber-700"
            : "bg-emerald-50 border-emerald-200 text-emerald-700"
        )}
      >
        {urgent ? (
          <Clock size={20} className="flex-shrink-0" />
        ) : (
          <CheckCircle2 size={20} className="flex-shrink-0" />
        )}
        <span className="flex-1">
          {`Seu teste acaba em: ${diasRestantes} ${diasRestantes === 1 ? "dia" : "dias"}.`}
        </span>
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
        Ver Planos Agora
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
  maxWidthClass = "sm:max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidthClass?: string;
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
            className={cn(
              "relative w-full bg-white rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col",
              maxWidthClass
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800 tracking-wide capitalize">{title}</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
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
export default function ConfiguracoesPage() {
  const router = useRouter();
  const { notify } = useNotification();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [diasRestantes, setDiasRestantes] = useState<number | null>(null);

  // modal states
  const [showEdit, setShowEdit] = useState(false);
  const [showPartners, setShowPartners] = useState(false);
  const [showProcedures, setShowProcedures] = useState(false);
  const [showBusinessHours, setShowBusinessHours] = useState(false);

  // Procedures management
  const [procedures, setProcedures] = useState<ProcedureCatalogItem[]>([]);
  const [newProcName, setNewProcName] = useState("");
  const [newProcDuration, setNewProcDuration] = useState(60);
  const [isSavingProc, setIsSavingProc] = useState(false);

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
  const [portalLoading, setPortalLoading] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      // Busca dados do usuário e status de assinatura em paralelo
      const [{ data }, { data: statusData }, { data: ucData }] = await Promise.all([
        supabase.from("usuarios").select("*").eq("id", user.id).single(),
        supabase
          .from("verificar_status_usuario")
          .select("status_code, dias_restantes")
          .single(),
        supabase
          .from("user_company")
          .select("company_id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      setUserData(data);
      setStatusCode(statusData?.status_code ?? null);
      setDiasRestantes(statusData?.dias_restantes ?? null);
      setCompanyId(ucData?.company_id ?? null);
      setEditNome(data?.nome_completo || "");
      setEditEmail(data?.email || "");
      setEditTelefone(data?.telefone || "");
      setEditEmpresa(data?.empresa || "");
      setEditCpf(data?.cpf || "");
      setEditPix(data?.PIX || "");
      setLogoUrl(data?.logo_url || null);
      setLoading(false);
    }
    loadProfile();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
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
    setPortalLoading(true);
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
    } finally {
      setPortalLoading(false);
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const ext = file.name.split(".").pop();
      const path = `${user.id}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("logoEmpresa")
        .upload(path, file, { 
          upsert: true, 
          contentType: file.type,
          cacheControl: '0'
        });
      
      if (upErr) throw upErr;

      const { data: { publicUrl } } = supabase.storage.from("logoEmpresa").getPublicUrl(path);

      const { error: dbErr } = await supabase
        .from("usuarios")
        .update({ logo_url: publicUrl })
        .eq("id", user.id);
      
      if (dbErr) throw dbErr;

      setLogoUrl(publicUrl);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setUserData((prev: any) => ({ ...prev, logo_url: publicUrl }));
      notify("Foto atualizada!", "Sua logo foi salva com sucesso.", "success");
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      console.error("Erro ao subir logo:", err);
      notify("Erro", err.message || "Não foi possível enviar a imagem.", "error");
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { error } = await supabase
        .from("usuarios")
        .update({
          nome_completo: editNome,
          telefone: editTelefone,
          empresa: editEmpresa,
          cpf: editCpf,
          PIX: editPix,
        })
        .eq("id", user.id);

      if (error) throw error;

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
    } catch {
      notify("Erro", "Não foi possível salvar.", "error");
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
            {logoUrl || userData?.logo_url ? (
              <Image
                src={logoUrl ?? userData.logo_url}
                alt="Logo"
                width={80}
                height={80}
                className="w-20 h-20 rounded-full object-cover shadow-xl"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-primary to-blue-400 flex items-center justify-center text-3xl font-semibold text-white shadow-xl">
                {userData?.nome_completo?.charAt(0)?.toUpperCase() || "D"}
              </div>
            )}
          </div>
          <h1 className="text-xl font-semibold text-gray-800">{userData?.nome_completo || "Usuário"}</h1>
          <p className="text-sm text-gray-400">{userData?.email}</p>
        </motion.div>

        {/* Trial Banner — apenas para usuário comum; oculto se assinatura ativa (statusCode=3, diasRestantes=999) */}
        {isComum && <TrialBanner statusCode={statusCode} diasRestantes={diasRestantes} />}

        <p className="text-[11px] font-bold text-gray-400 capitalize tracking-widest mb-3 px-1">
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
            {/* Assinatura — aparece apenas para usuários comuns que possuem assinatura (paga ou trial) */}
            {isComum && statusCode === 3 ? (
              <button
                onClick={handleOpenPortal}
                disabled={portalLoading}
                className="w-full flex items-center justify-between px-4 py-3.5 transition-colors group text-gray-700 hover:bg-primary/5 disabled:opacity-60"
              >
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-600 group-hover:bg-primary/10 group-hover:text-primary">
                    {portalLoading ? <Loader2 size={18} className="animate-spin" /> : <Receipt size={18} />}
                  </div>
                  <span className="font-semibold text-[15px]">
                    {portalLoading ? "Abrindo..." : "Minha Assinatura"}
                  </span>
                </div>
                <ChevronRight size={18} className="text-gray-300 group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
              </button>
            ) : isComum && statusCode !== 3 ? (
              <SettingsRow
                icon={CreditCard}
                label="Assinar Agora"
                onClick={() => router.push("/planos")}
              />
            ) : null}
          </div>
        </div>

        {/* Geral */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
          <p className="text-[11px] font-bold text-gray-400 capitalize tracking-widest px-4 pt-4 pb-1">Geral</p>
          <div className="divide-y divide-gray-50">
            {isComum && (
              <SettingsRow
                icon={Plug}
                label="Integrações (API)"
                onClick={() => router.push("/configuracoes/integracoes")}
              />
            )}
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

        {/* Clínica — Procedimentos */}
        {isComum && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
            <p className="text-[11px] font-bold text-gray-400 capitalize tracking-widest px-4 pt-4 pb-1">Clínica</p>
            <div className="divide-y divide-gray-50">
              <SettingsRow
                icon={Stethoscope}
                label="Procedimentos"
                onClick={() => {
                  setShowProcedures(true);
                  getProcedureCatalog().then(setProcedures).catch(console.error);
                }}
              />
            </div>
          </div>
        )}

        {/* Agenda — Horários de Funcionamento */}
        {isComum && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
            <p className="text-[11px] font-bold text-gray-400 capitalize tracking-widest px-4 pt-4 pb-1">Agenda</p>
            <div className="divide-y divide-gray-50">
              <SettingsRow
                icon={CalendarDays}
                label="Horários de Funcionamento"
                onClick={() => setShowBusinessHours(true)}
              />
            </div>
          </div>
        )}

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
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt="Logo"
                  width={80}
                  height={80}
                  className="w-20 h-20 rounded-full object-cover shadow-lg"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-primary to-blue-400 flex items-center justify-center text-3xl font-semibold text-white shadow-lg">
                  {editNome?.charAt(0)?.toUpperCase() || "D"}
                </div>
              )}
              {/* Camera button overlay */}
              <button
                onClick={() => logoInputRef.current?.click()}
                disabled={logoUploading}
                className="absolute bottom-0 right-0 w-7 h-7 bg-primary text-white rounded-full flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors"
              >
                {logoUploading ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
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

      {/* Modal: Procedimentos da Clínica */}
      <Modal open={showProcedures} onClose={() => setShowProcedures(false)} title="Procedimentos da Clínica">
        <div className="p-6 space-y-4">
          {/* Adicionar novo */}
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 space-y-3">
            <p className="text-xs font-bold text-primary">Adicionar Procedimento Personalizado</p>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Nome do procedimento"
                value={newProcName}
                onChange={(e) => setNewProcName(e.target.value)}
                className="col-span-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Duração (min)</label>
                <input
                  type="number"
                  min={15}
                  step={15}
                  value={newProcDuration}
                  onChange={(e) => setNewProcDuration(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none"
                />
              </div>
              <button
                disabled={!newProcName.trim() || isSavingProc || !companyId}
                onClick={async () => {
                  if (!newProcName.trim() || !companyId) return;
                  setIsSavingProc(true);
                  try {
                    await addProcedureToCatalog({ companyId, name: newProcName.trim(), durationMin: newProcDuration });
                    const updated = await getProcedureCatalog();
                    setProcedures(updated);
                    setNewProcName("");
                    setNewProcDuration(60);
                    notify("Adicionado!", "Procedimento criado com sucesso.", "success");
                  } catch {
                    notify("Erro", "Não foi possível adicionar.", "error");
                  } finally {
                    setIsSavingProc(false);
                  }
                }}
                className="flex items-center justify-center gap-2 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingProc ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Adicionar
              </button>
            </div>
          </div>

          {/* Lista de procedimentos */}
          <div className="space-y-2">
            {procedures.map((proc) => (
              <div
                key={proc.id}
                className="flex items-center justify-between px-4 py-3 bg-white border border-gray-100 rounded-xl"
              >
                <div>
                  <p className="font-semibold text-sm text-gray-800">{proc.name}</p>
                  <p className="text-xs text-gray-400">{proc.duration_min} min</p>
                </div>
                {proc.is_system ? (
                  <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">
                    Sistema
                  </span>
                ) : (
                  <button
                    onClick={async () => {
                      try {
                        await deleteProcedureFromCatalog(proc.id);
                        setProcedures((p) => p.filter((x) => x.id !== proc.id));
                        notify("Removido", "Procedimento excluído.", "success");
                      } catch {
                        notify("Erro", "Não foi possível remover.", "error");
                      }
                    }}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
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
                <p className="text-gray-500 text-xs mt-1">Marketing odontológico focado em resultados rápidos.</p>
                <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-emerald-500" /> Especialistas</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal: Horários de Funcionamento */}
      <BusinessHoursModal
        open={showBusinessHours}
        onClose={() => setShowBusinessHours(false)}
        companyId={companyId}
        notify={notify}
      />
    </div>
  );
}

// ── BusinessHoursModal ────────────────────────────────────────────────────────
const DAY_LABELS = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];

type DayConfig = {
  day_of_week: number;
  is_open: boolean;
  open_time: string;
  close_time: string;
  slot_duration_minutes: number;
};

function BusinessHoursModal({
  open, onClose, companyId, notify
}: {
  open: boolean;
  onClose: () => void;
  companyId: string | null;
  notify: (title: string, msg: string, type: "success"|"error"|"info"|"warning") => void;
}) {
  const [days, setDays] = useState<DayConfig[]>(() =>
    Array.from({ length: 7 }, (_, i) => ({
      day_of_week: i,
      is_open: i >= 1 && i <= 5,
      open_time: "08:00",
      close_time: "18:00",
      slot_duration_minutes: 60,
    }))
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !companyId) return;
    setLoading(true);
    supabase
      .from("company_business_hours")
      .select("*")
      .eq("company_id", companyId)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setDays(prev => prev.map(d => {
            const saved = data.find((r: DayConfig) => r.day_of_week === d.day_of_week);
            return saved ? { ...d, ...saved } : d;
          }));
        }
        setLoading(false);
      });
  }, [open, companyId]);

  const update = (idx: number, patch: Partial<DayConfig>) =>
    setDays(prev => prev.map((d, i) => i === idx ? { ...d, ...patch } : d));

  const handleSave = async () => {
    if (!companyId) return;
    setSaving(true);
    try {
      const rows = days.map(d => ({ ...d, company_id: companyId }));
      const { error } = await supabase
        .from("company_business_hours")
        .upsert(rows, { onConflict: "company_id,day_of_week" });
      if (error) throw error;
      notify("Horários salvos!", "Configuração atualizada com sucesso.", "success");
      onClose();
    } catch (err: unknown) {
      notify("Erro", (err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Horários de Funcionamento" maxWidthClass="sm:max-w-2xl">
      <div className="p-6 space-y-4">
        
        <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex gap-3 text-blue-800">
          <Clock className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm leading-relaxed">
            Configure abaixo a agenda da clínica. <strong className="font-semibold">Nossa IA de agendamento automático</strong> irá sugerir horários para os pacientes apenas nas janelas ativas selecionadas aqui.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-primary" size={28} />
          </div>
        ) : (
          <div className="space-y-3">
            {days.map((day, i) => (
              <div
                key={day.day_of_week}
                className={cn(
                  "group flex flex-col md:flex-row md:items-center gap-3 md:gap-4 p-4 rounded-2xl border transition-all duration-300",
                  day.is_open 
                    ? "border-primary/10 bg-white shadow-sm hover:border-primary/30 hover:shadow-md" 
                    : "border-transparent bg-gray-50/50 opacity-80 hover:opacity-100"
                )}
              >
                <div className="flex items-center justify-between md:justify-start gap-3 w-full md:w-[130px] flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => update(i, { is_open: !day.is_open })}
                      className={cn(
                        "w-11 h-6 rounded-full transition-all duration-300 relative flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-primary/30",
                        day.is_open ? "bg-primary" : "bg-gray-300"
                      )}
                    >
                      <span className={cn(
                        "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300",
                        day.is_open ? "translate-x-5" : "translate-x-0"
                      )} />
                    </button>
                    <span className={cn("font-semibold text-xs", day.is_open ? "text-gray-800" : "text-gray-500")}>
                      {DAY_LABELS[day.day_of_week]}
                    </span>
                  </div>
                  {!day.is_open && (
                    <span className="md:hidden text-[9px] tracking-wider uppercase font-bold text-gray-400 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200">
                      Fechado
                    </span>
                  )}
                </div>

                {day.is_open ? (
                  <div className="flex flex-col md:flex-row md:items-center gap-3 flex-1 w-full text-gray-700">
                    <div className="flex items-center justify-between gap-1 sm:gap-2 w-full md:w-auto flex-1">
                      <div className="flex items-center justify-center flex-1 bg-gray-50/50 hover:bg-gray-50 rounded-xl px-2 py-2 transition-colors border border-transparent focus-within:border-primary/40 focus-within:bg-white overflow-hidden">
                        <Clock size={14} className="text-gray-400 mr-1.5 hidden sm:block flex-shrink-0" />
                        <input
                          type="time"
                          value={day.open_time}
                          onChange={e => update(i, { open_time: e.target.value })}
                          className="bg-transparent text-xs focus:outline-none font-semibold text-center w-full"
                        />
                      </div>
                      <span className="text-gray-300 text-[10px] font-semibold uppercase tracking-wider flex-shrink-0">Até</span>
                      <div className="flex items-center justify-center flex-1 bg-gray-50/50 hover:bg-gray-50 rounded-xl px-2 py-2 transition-colors border border-transparent focus-within:border-primary/40 focus-within:bg-white overflow-hidden">
                        <Clock size={14} className="text-gray-400 mr-1.5 hidden sm:block flex-shrink-0" />
                        <input
                          type="time"
                          value={day.close_time}
                          onChange={e => update(i, { close_time: e.target.value })}
                          className="bg-transparent text-xs focus:outline-none font-semibold text-center w-full"
                        />
                      </div>
                    </div>

                    <div className="w-full md:w-auto ml-0 md:ml-auto">
                      <div className="flex items-center justify-center px-2 py-2 bg-violet-50/50 text-violet-700 rounded-xl border border-transparent hover:border-violet-100 transition-colors hover:bg-violet-50 w-full md:w-[130px]">
                        <select
                          value={day.slot_duration_minutes}
                          onChange={e => update(i, { slot_duration_minutes: Number(e.target.value) })}
                          className="bg-transparent text-[11px] font-semibold focus:outline-none cursor-pointer w-full text-center appearance-none"
                          title="Duração do agendamento (Slot)"
                        >
                          {[15,30,45,60,90,120].map(m => (
                            <option key={m} value={m}>{m} min / slot</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 hidden md:flex items-center justify-end">
                    <span className="text-[9px] tracking-wider uppercase font-bold text-gray-400 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200">
                      Fechado
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="pt-4 mt-2 border-t border-gray-100">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-primary text-white py-3.5 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 hover:bg-primary/95 transition-all shadow-lg shadow-primary/20 disabled:opacity-70 disabled:shadow-none"
          >
            {saving ? <><Loader2 size={18} className="animate-spin" /> Salvando...</> : <><Save size={18} /> Salvar Horários</>}
          </button>
        </div>
      </div>
    </Modal>
  );
}
