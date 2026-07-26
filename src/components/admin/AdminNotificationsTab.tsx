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
} from "lucide-react";
import { toast } from "sonner";

export function AdminNotificationsTab() {
  const [activeSubTab, setActiveSubTab] = useState<"create" | "history">("create");

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
  }, [targetAudience]);

  // Carregar histórico
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
    if (activeSubTab === "history") {
      fetchHistory();
    }
  }, [activeSubTab]);

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
      setActiveSubTab("history");
      fetchHistory();
    }
  };

  const categories: { id: NotificationCategory; label: string; icon: any; color: string }[] = [
    { id: "comum", label: "Comum / Geral", icon: Info, color: "text-blue-700 bg-blue-50 border-blue-200" },
    { id: "aviso", label: "Aviso Importante", icon: AlertTriangle, color: "text-amber-700 bg-amber-50 border-amber-200" },
    { id: "atualizacao", label: "Atualização Sistema", icon: Rocket, color: "text-indigo-700 bg-indigo-50 border-indigo-200" },
    { id: "promocao", label: "Promoção / Oferta", icon: Gift, color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  ];

  const audiences: { id: NotificationTargetAudience; label: string; desc: string; icon: any }[] = [
    { id: "all", label: "Todos os Usuários", desc: "Base completa de clientes ativos na plataforma", icon: Users },
    { id: "new_users", label: "Novos Usuários", desc: "Cadastrados nos últimos 7 dias", icon: UserPlus },
    { id: "trial", label: "Usuários em Teste (Trial)", desc: "Clientes com período de testes ativo", icon: Clock },
    { id: "subscribers", label: "Assinantes Ativos", desc: "Apenas usuários com assinaturas Pro/Ativas", icon: CheckCircle2 },
    { id: "inactive", label: "Inativos / Trial Expirado", desc: "Foco em reengajamento e conversão", icon: UserX },
  ];

  return (
    <div className="space-y-6">
      
      {/* Header da Aba */}
      <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 text-primary rounded-2xl border border-primary/20">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Central de Notificações Push</h2>
            <p className="text-xs text-slate-500">Criação, disparo segmentado em massa e histórico de envios no aplicativo</p>
          </div>
        </div>

        {/* Sub-abas */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          <button
            onClick={() => setActiveSubTab("create")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
              activeSubTab === "create"
                ? "bg-white text-primary shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Send className="w-3.5 h-3.5" /> Nova Notificação
          </button>
          <button
            onClick={() => setActiveSubTab("history")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
              activeSubTab === "history"
                ? "bg-white text-primary shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <History className="w-3.5 h-3.5" /> Histórico ({history.length})
          </button>
        </div>
      </div>

      {activeSubTab === "create" ? (
        <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
          <form onSubmit={handleOpenConfirm} className="space-y-6">
            
            {/* 1. Categoria */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
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
                      className={`flex flex-col items-center justify-center p-3.5 rounded-xl border text-xs font-semibold transition-all ${
                        selected
                          ? `${cat.color} ring-2 ring-primary/40 shadow-sm`
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                      }`}
                    >
                      <Icon className="w-5 h-5 mb-1.5" />
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Título e Conteúdo */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    2. Título da Notificação
                  </label>
                  <span className={`text-[11px] font-mono ${title.length > 50 ? "text-amber-600 font-bold" : "text-slate-400"}`}>
                    {title.length}/60
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={60}
                  placeholder="Ex: Novo recurso liberado! Confira agora."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  3. Conteúdo / Mensagem
                </label>
                <textarea
                  rows={4}
                  placeholder="Escreva a mensagem detalhada que os clientes receberão em seus celulares..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary focus:bg-white transition-colors"
                />
              </div>
            </div>

            {/* 3. Segmentação de Destinatários */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  4. Segmentação de Destinatários (Targeting)
                </label>
                <div className="text-xs font-medium text-primary flex items-center gap-1.5 bg-primary/10 px-3 py-1 rounded-lg border border-primary/20">
                  {calculatingCount ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
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
                      className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                        selected
                          ? "bg-primary/10 border-primary/40 text-slate-900 shadow-sm"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            selected ? "bg-primary text-white" : "bg-slate-200/80 text-slate-600"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-800">{aud.label}</div>
                          <div className="text-[11px] text-slate-500">{aud.desc}</div>
                        </div>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="radio"
                          name="target_audience"
                          checked={selected}
                          onChange={() => setTargetAudience(aud.id)}
                          className="w-4 h-4 text-primary border-slate-300 focus:ring-primary bg-slate-100"
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
                className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-primary/20"
              >
                <Send className="w-4 h-4" /> Disparar Notificação agora
              </button>
            </div>

          </form>
        </div>
      ) : (
        /* Histórico de Envios */
        <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
          {loadingHistory ? (
            <div className="py-12 text-center text-slate-500 flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs">Carregando histórico de notificações...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              Nenhuma notificação foi disparada ainda.
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          item.category === "aviso"
                            ? "bg-amber-100 text-amber-700 border border-amber-200"
                            : item.category === "atualizacao"
                            ? "bg-indigo-100 text-indigo-700 border border-indigo-200"
                            : item.category === "promocao"
                            ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                            : "bg-blue-100 text-blue-700 border border-blue-200"
                        }`}
                      >
                        {item.category}
                      </span>
                      <h4 className="text-xs font-bold text-slate-800">{item.title}</h4>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {new Date(item.created_at).toLocaleString("pt-BR")}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-200">
                    {item.message}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <div>
                      Segmento: <strong className="text-slate-800 capitalize">{item.target_audience}</strong>
                    </div>
                    <div className="text-primary font-bold">
                      {item.recipients_count} destinatários impactados
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal de Confirmação de Envio */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Confirmar Disparo Push</h3>
                <p className="text-xs text-slate-500">Esta ação enviará mensagens imediatamente</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Título:</span>
                <span className="font-semibold text-slate-800">{title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Categoria:</span>
                <span className="font-semibold text-primary uppercase">{category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Segmento Selecionado:</span>
                <span className="font-semibold text-slate-800 capitalize">{targetAudience}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-sm">
                <span className="text-slate-700 font-medium">Total de Destinatários:</span>
                <strong className="text-emerald-600">{recipientCount ?? 0} usuários</strong>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={sending}
                className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSendNotification}
                disabled={sending}
                className="w-1/2 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 shadow-md shadow-primary/20"
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
