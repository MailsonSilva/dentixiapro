"use client";

import React, { useState, useEffect } from "react";
import {
  NotificationCategory,
  NotificationTargetAudience,
  NotificationHistoryItem,
  getTargetAudienceCountAction,
  sendNotificationAction,
  getNotificationHistoryAction,
} from "@/lib/admin/actions";
import {
  Bell,
  X,
  Send,
  History,
  Info,
  AlertTriangle,
  Rocket,
  Gift,
  Users,
  UserPlus,
  Clock,
  CheckCircle2,
  UserX,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

interface AdminNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminNotificationsModal({ isOpen, onClose }: AdminNotificationsModalProps) {
  const [activeTab, setActiveTab] = useState<"create" | "history">("create");

  // Form states
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<NotificationCategory>("comum");
  const [targetAudience, setTargetAudience] = useState<NotificationTargetAudience>("all");

  // Audience calculation
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [calculatingCount, setCalculatingCount] = useState(false);

  // Confirmation modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [sending, setSending] = useState(false);

  // History state
  const [history, setHistory] = useState<NotificationHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Recalcular audiência quando o targetAudience mudar
  useEffect(() => {
    if (!isOpen) return;

    async function updateCount() {
      setCalculatingCount(true);
      const res = await getTargetAudienceCountAction(targetAudience);
      if (res.error) {
        toast.error(`Erro ao calcular destinatários: ${res.error}`);
      } else {
        setRecipientCount(res.count);
      }
      setCalculatingCount(false);
    }

    updateCount();
  }, [targetAudience, isOpen]);

  // Carregar histórico quando mudar para a aba "history" ou ao abrir
  const fetchHistory = async () => {
    setLoadingHistory(true);
    const res = await getNotificationHistoryAction();
    if (res.error) {
      toast.error(`Erro ao carregar histórico: ${res.error}`);
    } else {
      setHistory(res.history);
    }
    setLoadingHistory(false);
  };

  useEffect(() => {
    if (isOpen && activeTab === "history") {
      fetchHistory();
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Por favor, informe o título da notificação.");
      return;
    }
    if (title.length > 60) {
      toast.error("O título deve ter no máximo 60 caracteres.");
      return;
    }
    if (!message.trim()) {
      toast.error("Por favor, informe o conteúdo da mensagem.");
      return;
    }
    setShowConfirmModal(true);
  };

  const handleSendNotification = async () => {
    setSending(true);
    const res = await sendNotificationAction({
      title,
      message,
      category,
      target_audience: targetAudience,
    });
    setSending(false);

    if (res.error) {
      toast.error(`Erro no disparo: ${res.error}`);
    } else {
      toast.success(
        `Notificação "${title}" enviada com sucesso para ${res.recipients_count} usuário(s)!`
      );
      setShowConfirmModal(false);
      setTitle("");
      setMessage("");
      setActiveTab("history");
      fetchHistory();
    }
  };

  const categories: { id: NotificationCategory; label: string; icon: any; color: string }[] = [
    { id: "comum", label: "Comum / Geral", icon: Info, color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30" },
    { id: "aviso", label: "Aviso Importante", icon: AlertTriangle, color: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
    { id: "atualizacao", label: "Atualização Sistema", icon: Rocket, color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30" },
    { id: "promocao", label: "Promoção / Oferta", icon: Gift, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
  ];

  const audiences: { id: NotificationTargetAudience; label: string; desc: string; icon: any }[] = [
    { id: "all", label: "Todos os Usuários", desc: "Base completa de clientes ativos na plataforma", icon: Users },
    { id: "new_users", label: "Novos Usuários", desc: "Cadastrados nos últimos 7 dias", icon: UserPlus },
    { id: "trial", label: "Usuários em Teste (Trial)", desc: "Clientes com período de testes ativo", icon: Clock },
    { id: "subscribers", label: "Assinantes Ativos", desc: "Apenas usuários com assinaturas Pro/Ativas", icon: CheckCircle2 },
    { id: "inactive", label: "Inativos / Trial Expirado", desc: "Foco em reengajamento e conversão", icon: UserX },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-zinc-900 border border-zinc-800 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header do Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-xl">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Central de Notificações Push</h3>
              <p className="text-xs text-zinc-400">Disparo de mensagens em massa e segmentadas no aplicativo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas */}
        <div className="flex items-center gap-2 border-b border-zinc-800 px-6 bg-zinc-950/50 pt-2">
          <button
            onClick={() => setActiveTab("create")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
              activeTab === "create"
                ? "bg-zinc-900 text-cyan-400 border-cyan-400 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 border-transparent"
            }`}
          >
            <Send className="w-3.5 h-3.5" /> Criar e Disparar Notificação
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
              activeTab === "history"
                ? "bg-zinc-900 text-cyan-400 border-cyan-400 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 border-transparent"
            }`}
          >
            <History className="w-3.5 h-3.5" /> Histórico de Disparos
          </button>
        </div>

        {/* Conteúdo do Modal */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === "create" ? (
            <form onSubmit={handleOpenConfirm} className="space-y-6">
              
              {/* Categoria */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                  1. Categoria da Notificação
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {categories.map((cat) => {
                    const Icon = cat.icon;
                    const selected = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition-all ${
                          selected
                            ? `${cat.color} ring-1 ring-cyan-500/50 shadow-md`
                            : "bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                        }`}
                      >
                        <Icon className="w-5 h-5 mb-1.5" />
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Título e Mensagem */}
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                      2. Título da Notificação
                    </label>
                    <span className={`text-[11px] font-mono ${title.length > 50 ? "text-amber-400" : "text-zinc-500"}`}>
                      {title.length}/60
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={60}
                    placeholder="Ex: Novo recurso liberado! Confira agora."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    3. Conteúdo / Mensagem
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Escreva a mensagem detalhada que os clientes receberão em seus celulares/painel..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
              </div>

              {/* Segmentação de Destinatários */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                    4. Segmentação de Destinatários (Targeting)
                  </label>
                  <div className="text-xs font-medium text-cyan-400 flex items-center gap-1.5 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/20">
                    {calculatingCount ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                    ) : (
                      <Users className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {calculatingCount
                        ? "Calculando leitores..."
                        : `${recipientCount ?? 0} destinatário(s) elegível(is)`}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  {audiences.map((aud) => {
                    const Icon = aud.icon;
                    const selected = targetAudience === aud.id;
                    return (
                      <div
                        key={aud.id}
                        onClick={() => setTargetAudience(aud.id)}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                          selected
                            ? "bg-cyan-500/10 border-cyan-500/40 text-white"
                            : "bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-lg ${
                              selected ? "bg-cyan-500/20 text-cyan-400" : "bg-zinc-900 text-zinc-400"
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-white">{aud.label}</div>
                            <div className="text-[11px] text-zinc-400">{aud.desc}</div>
                          </div>
                        </div>

                        <div className="flex items-center">
                          <input
                            type="radio"
                            name="target_audience"
                            checked={selected}
                            onChange={() => setTargetAudience(aud.id)}
                            className="w-4 h-4 text-cyan-500 border-zinc-700 focus:ring-cyan-500 bg-zinc-900"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Botão de Disparo */}
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={!title.trim() || !message.trim() || calculatingCount}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl transition-all shadow-lg shadow-cyan-500/20"
                >
                  <Send className="w-4 h-4" /> Disparar Notificação
                </button>
              </div>

            </form>
          ) : (
            /* Histórico de Disparos */
            <div className="space-y-4">
              {loadingHistory ? (
                <div className="py-12 text-center text-zinc-400 flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                  <p className="text-xs">Carregando histórico de notificações...</p>
                </div>
              ) : history.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-xs">
                  Nenhuma notificação foi disparada ainda.
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 bg-zinc-950/80 border border-zinc-800 rounded-xl space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              item.category === "aviso"
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : item.category === "atualizacao"
                                ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                                : item.category === "promocao"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                            }`}
                          >
                            {item.category}
                          </span>
                          <h4 className="text-xs font-bold text-white">{item.title}</h4>
                        </div>
                        <span className="text-[11px] text-zinc-500">
                          {new Date(item.created_at).toLocaleString("pt-BR")}
                        </span>
                      </div>

                      <p className="text-xs text-zinc-300 bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/80">
                        {item.message}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-zinc-800/50">
                        <div>
                          Segmento: <strong className="text-white capitalize">{item.target_audience}</strong>
                        </div>
                        <div className="text-cyan-400 font-medium">
                          {item.recipients_count} destinatários impactados
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer do Modal */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium rounded-xl transition-colors"
          >
            Fechar Central
          </button>
        </div>

      </div>

      {/* Modal de Confirmação de Envio */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Confirmar Disparo Push</h3>
                <p className="text-xs text-zinc-400">Esta ação enviará mensagens imediatamente</p>
              </div>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-400">Título:</span>
                <span className="font-semibold text-white">{title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Categoria:</span>
                <span className="font-semibold text-cyan-400 uppercase">{category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Segmento Selecionado:</span>
                <span className="font-semibold text-white capitalize">{targetAudience}</span>
              </div>
              <div className="flex justify-between border-t border-zinc-800 pt-2 text-sm">
                <span className="text-zinc-300 font-medium">Total de Destinatários:</span>
                <strong className="text-emerald-400">{recipientCount ?? 0} usuários</strong>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={sending}
                className="w-1/2 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSendNotification}
                disabled={sending}
                className="w-1/2 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Confirmar Disparo
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
