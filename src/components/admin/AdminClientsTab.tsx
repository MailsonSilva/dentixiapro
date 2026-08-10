"use client";

import React, { useState } from "react";
import {
  ClientRow,
  ClientSimulationItem,
  toggleBlockClientAction,
  getClientUsageHistoryAction,
} from "@/lib/admin/actions";
import {
  Search,
  Lock,
  Unlock,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  X,
  Copy,
  Check,
  UserCheck,
  UserX,
  Clock,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Eye,
  ImageIcon,
  Tag,
  Filter,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";

interface AdminClientsTabProps {
  clients: ClientRow[];
  totalClients: number;
  currentPage: number;
  searchQuery: string;
  statusFilter: "all" | "trial" | "subscribers" | "blocked";
  startDate: string | null;
  endDate: string | null;
  onSearchChange: (q: string) => void;
  onStatusFilterChange: (s: "all" | "trial" | "subscribers" | "blocked") => void;
  onDateRangeChange: (start: string | null, end: string | null) => void;
  onPageChange: (p: number) => void;
  onRefresh: () => void;
  loading: boolean;
}

export function AdminClientsTab({
  clients,
  totalClients,
  currentPage,
  searchQuery,
  statusFilter,
  startDate,
  endDate,
  onSearchChange,
  onStatusFilterChange,
  onDateRangeChange,
  onPageChange,
  onRefresh,
  loading,
}: AdminClientsTabProps) {
  const [blockingId, setBlockingId] = useState<string | null>(null);
  
  // Feedback visual individual de cópia (email ou telefone)
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Modal de Métricas e Imagens de Simulações do Cliente
  const [selectedClientMetrics, setSelectedClientMetrics] = useState<{
    client: ClientRow;
    metrics: {
      total: number;
      saved: number;
      unsaved: number;
      error: number;
      successRate: number;
    };
    simulations: ClientSimulationItem[];
    loading: boolean;
  } | null>(null);

  // Filtro de imagens no modal (Todas, Salvas, Geradas Não Salvas)
  const [simulationFilter, setSimulationFilter] = useState<"all" | "saved" | "unsaved">("all");
  
  // Imagem expandida para visualização em alta definição (Lightbox)
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  const totalPages = Math.ceil(totalClients / 10) || 1;

  // Função para copiar texto para a área de transferência com feedback
  const handleCopy = (text: string, key: string, label: string) => {
    if (!text) {
      toast.error(`${label} não informado.`);
      return;
    }
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`${label} copiado para a área de transferência!`);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  // Ação imediata de Bloquear / Desbloquear
  const handleToggleBlock = async (client: ClientRow) => {
    const newStatus = !client.is_blocked;
    const actionText = newStatus ? "bloquear" : "desbloquear";

    if (!confirm(`Tem certeza que deseja ${actionText} o acesso de ${client.nome_completo}?`)) {
      return;
    }

    setBlockingId(client.id);
    const res = await toggleBlockClientAction(client.id, newStatus);
    setBlockingId(null);

    if (res.error) {
      toast.error(`Erro ao ${actionText} cliente: ${res.error}`);
    } else {
      toast.success(`Cliente ${client.nome_completo} ${newStatus ? "bloqueado" : "desbloqueado"} com sucesso!`);
      onRefresh();
    }
  };

  // Abrir Métricas Numéricas e Imagens de Simulação no Modal
  const handleOpenMetrics = async (client: ClientRow) => {
    setSimulationFilter("all");
    setSelectedClientMetrics({
      client,
      metrics: {
        total: client.simulations_total,
        saved: client.simulations_saved,
        unsaved: client.simulations_unsaved,
        error: client.simulations_error,
        successRate: client.simulations_total > 0
          ? Math.round(((client.simulations_saved + client.simulations_unsaved) / client.simulations_total) * 100)
          : 100,
      },
      simulations: [],
      loading: true,
    });

    const res = await getClientUsageHistoryAction(client.id);
    if (!res.error && res.metrics) {
      setSelectedClientMetrics({
        client,
        metrics: res.metrics,
        simulations: res.simulations || [],
        loading: false,
      });
    } else {
      setSelectedClientMetrics((prev) => (prev ? { ...prev, loading: false } : null));
    }
  };

  // Atalhos rápidos de Período de Data
  const handleShortcutDate = (preset: "today" | "7days" | "month") => {
    const now = new Date();
    const endDateStr = now.toISOString().split("T")[0];

    if (preset === "today") {
      onDateRangeChange(endDateStr, endDateStr);
    } else if (preset === "7days") {
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      onDateRangeChange(past.toISOString().split("T")[0], endDateStr);
    } else if (preset === "month") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      onDateRangeChange(firstDay.toISOString().split("T")[0], endDateStr);
    }
  };

  const handleClearFilters = () => {
    onSearchChange("");
    onStatusFilterChange("all");
    onDateRangeChange(null, null);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header Resumo */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/80 backdrop-blur-md border border-slate-200/80 p-5 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 text-primary rounded-2xl border border-primary/20">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Gestão e Listagem de Clientes</h3>
            <p className="text-xs text-slate-500">
              Total de cadastros listados: <strong className="text-slate-800 font-bold">{totalClients}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca Avançada */}
      <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 p-5 rounded-2xl shadow-sm space-y-4">
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          
          {/* Busca Global */}
          <div className="md:col-span-4">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Busca Global
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Nome, E-mail ou Telefone..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary focus:bg-white transition-colors"
              />
            </div>
          </div>

          {/* Filtro por Status */}
          <div className="md:col-span-3">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Status da Conta
            </label>
            <select
              value={statusFilter}
              onChange={(e: any) => onStatusFilterChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-primary focus:bg-white transition-colors"
            >
              <option value="all">Todos os Clientes</option>
              <option value="trial">🟡 Apenas Em Testes (Trial)</option>
              <option value="subscribers">🟢 Apenas Assinantes Ativos</option>
              <option value="blocked">🔴 Apenas Bloqueados / Inativos</option>
            </select>
          </div>

          {/* Filtro por Data Inicial / Data Final */}
          <div className="md:col-span-5 grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Data Inicial
              </label>
              <input
                type="date"
                value={startDate || ""}
                onChange={(e) => onDateRangeChange(e.target.value || null, endDate)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-primary focus:bg-white transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Data Final
              </label>
              <input
                type="date"
                value={endDate || ""}
                onChange={(e) => onDateRangeChange(startDate, e.target.value || null)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-primary focus:bg-white transition-colors"
              />
            </div>
          </div>

        </div>

        {/* Atalhos Rápidos de Data & Limpar Filtros */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-[11px] font-medium">Atalhos de Data:</span>
            <button
              onClick={() => handleShortcutDate("today")}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-medium transition-colors"
            >
              Hoje
            </button>
            <button
              onClick={() => handleShortcutDate("7days")}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-medium transition-colors"
            >
              Últimos 7 dias
            </button>
            <button
              onClick={() => handleShortcutDate("month")}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-medium transition-colors"
            >
              Este Mês
            </button>
          </div>

          {(searchQuery || statusFilter !== "all" || startDate || endDate) && (
            <button
              onClick={handleClearFilters}
              className="flex items-center gap-1 text-primary hover:underline text-[11px] font-bold transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> Limpar Filtros
            </button>
          )}
        </div>

      </div>

      {/* Tabela de Clientes */}
      <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="py-4 px-6">Cliente</th>
                <th className="py-4 px-6">Contato Direct</th>
                <th className="py-4 px-6">Cadastro</th>
                <th className="py-4 px-6">Status do Plano</th>
                <th className="py-4 px-6 text-center">Quantidades de Simulações</th>
                <th className="py-4 px-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    Carregando clientes...
                  </td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    Nenhum cliente encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                clients.map((client) => {
                  const emailKey = `email_${client.id}`;
                  const phoneKey = `phone_${client.id}`;
                  const isCopiedEmail = copiedKey === emailKey;
                  const isCopiedPhone = copiedKey === phoneKey;

                  return (
                    <tr key={client.id} className="hover:bg-slate-50/80 transition-colors">
                      
                      {/* Nome + Ref/ID */}
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900">{client.nome_completo}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          ID: {client.id.substring(0, 8)}...
                        </div>
                      </td>

                      {/* Contato (E-mail + Telefone com botões Copiar) */}
                      <td className="py-4 px-6 space-y-1">
                        
                        {/* Email com botão Copiar */}
                        <div className="flex items-center gap-1.5 text-xs text-slate-800 font-medium">
                          <span className="truncate max-w-[180px]">{client.email}</span>
                          <button
                            onClick={() => handleCopy(client.email, emailKey, "E-mail")}
                            title="Copiar E-mail"
                            className="p-1 text-slate-400 hover:text-primary bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                          >
                            {isCopiedEmail ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>

                        {/* Telefone / WhatsApp com botão Copiar */}
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <span>{client.telefone ? client.telefone : "Tel. não informado"}</span>
                          {client.telefone && (
                            <button
                              onClick={() => handleCopy(client.telefone || "", phoneKey, "Telefone")}
                              title="Copiar Telefone / WhatsApp"
                              className="p-1 text-slate-400 hover:text-primary bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                            >
                              {isCopiedPhone ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>

                      </td>

                      {/* Data e Hora do Cadastro */}
                      <td className="py-4 px-6 text-xs text-slate-600">
                        {new Date(client.created_at).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                        <div className="text-[11px] text-slate-400">
                          {new Date(client.created_at).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>

                      {/* Status do Plano */}
                      <td className="py-4 px-6">
                        {client.is_blocked ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
                            <Lock className="w-3 h-3" /> Bloqueado / Inativo
                          </span>
                        ) : client.status_category === "subscriber" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Assinante Ativo
                          </span>
                        ) : client.status_category === "trial" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3 animate-pulse" />
                            <span>
                              Em Testes ({client.trial_days_remaining ?? 7}d restantes)
                            </span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            <UserX className="w-3 h-3" /> Trial Expirado / Inativo
                          </span>
                        )}
                      </td>

                      {/* Resumo de Quantidades de Simulação */}
                      <td className="py-4 px-6 text-center">
                        <div className="flex flex-col items-center gap-1">
                          
                          {/* Badge de Total de Simulações Geradas */}
                          <div className="text-xs font-bold text-slate-800">
                            Total: <strong className="text-primary font-mono text-sm">{client.simulations_total}</strong>
                          </div>

                          {/* Detalhamento de Salvas, Não Salvas e Erros */}
                          <div className="flex items-center gap-1.5 text-[11px] font-mono">
                            <span
                              className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold"
                              title="Simulações salvas no histórico"
                            >
                              💾 {client.simulations_saved} salvas
                            </span>
                            <span
                              className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-semibold"
                              title="Simulações geradas que o usuário não salvou"
                            >
                              ⚡ {client.simulations_unsaved} não salvas
                            </span>
                            {client.simulations_error > 0 && (
                              <span
                                className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-semibold"
                                title="Tentativas de simulação com erro"
                              >
                                ❌ {client.simulations_error} erros
                              </span>
                            )}
                          </div>

                        </div>
                      </td>

                      {/* Ações */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenMetrics(client)}
                            title="Ver Detalhamento das Quantidades de Simulação"
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                          >
                            <BarChart3 className="w-3.5 h-3.5 text-primary" /> Métricas
                          </button>

                          <button
                            onClick={() => handleToggleBlock(client)}
                            disabled={blockingId === client.id}
                            title={client.is_blocked ? "Desbloquear Acesso" : "Bloquear Acesso"}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                              client.is_blocked
                                ? "bg-emerald-100 hover:bg-emerald-200 text-emerald-700 border border-emerald-300"
                                : "bg-rose-100 hover:bg-rose-200 text-rose-700 border border-rose-300"
                            }`}
                          >
                            {client.is_blocked ? (
                              <>
                                <Unlock className="w-3.5 h-3.5" /> Desbloquear
                              </>
                            ) : (
                              <>
                                <Lock className="w-3.5 h-3.5" /> Bloquear
                              </>
                            )}
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50 text-xs text-slate-600">
          <div>
            Página <strong className="text-slate-900">{currentPage}</strong> de <strong className="text-slate-900">{totalPages}</strong>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-slate-700 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-slate-700 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Completo de Métricas e Galeria de Imagens das Simulações */}
      {selectedClientMetrics && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            
            {/* Header do Modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Métricas & Imagens: {selectedClientMetrics.client.nome_completo}
                </h3>
                <p className="text-xs text-slate-500">{selectedClientMetrics.client.email}</p>
              </div>
              <button
                onClick={() => setSelectedClientMetrics(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo com Scroll interno */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              
              {/* Card de Resumo Principal */}
              <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-slate-50 border border-primary/20 p-5 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Total de Simulações Geradas
                  </span>
                  <div className="text-3xl font-black text-slate-900 font-mono mt-1">
                    {selectedClientMetrics.metrics.total}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Taxa de Sucesso
                  </span>
                  <div className="text-2xl font-bold text-emerald-600 font-mono mt-1">
                    {selectedClientMetrics.metrics.successRate}%
                  </div>
                </div>
              </div>

              {/* Grid das 3 Quantidades Específicas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                
                {/* 1. Salvas */}
                <div
                  onClick={() => setSimulationFilter("saved")}
                  className={`p-4 rounded-xl space-y-1 cursor-pointer transition-all border ${
                    simulationFilter === "saved"
                      ? "bg-emerald-100/80 border-emerald-400 ring-2 ring-emerald-400/30"
                      : "bg-emerald-50/80 border-emerald-200/80 hover:bg-emerald-100/50"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-600" /> Salvas pelo Cliente
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-emerald-900 font-mono">
                    {selectedClientMetrics.metrics.saved}
                  </div>
                  <p className="text-[10px] text-emerald-700">Guardadas no histórico</p>
                </div>

                {/* 2. Geradas Não Salvas */}
                <div
                  onClick={() => setSimulationFilter("unsaved")}
                  className={`p-4 rounded-xl space-y-1 cursor-pointer transition-all border ${
                    simulationFilter === "unsaved"
                      ? "bg-blue-100/80 border-blue-400 ring-2 ring-blue-400/30"
                      : "bg-blue-50/80 border-blue-200/80 hover:bg-blue-100/50"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-blue-800">
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-blue-600" /> Geradas (Não Salvas)
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-blue-900 font-mono">
                    {selectedClientMetrics.metrics.unsaved}
                  </div>
                  <p className="text-[10px] text-blue-700">Simulações de teste</p>
                </div>

                {/* 3. Com Falha / Erro */}
                <div className="bg-rose-50/80 border border-rose-200/80 p-4 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800">
                    <AlertTriangle className="w-4 h-4 text-rose-600" /> Com Falha / Erro
                  </div>
                  <div className="text-2xl font-bold text-rose-900 font-mono">
                    {selectedClientMetrics.metrics.error}
                  </div>
                  <p className="text-[10px] text-rose-700">Erros no processamento</p>
                </div>

              </div>

              {/* Seção de Galeria Visual de Imagens */}
              <div className="space-y-4 pt-2 border-t border-slate-200">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-primary" /> Galeria de Imagens de Simulações
                    </h4>
                    <p className="text-xs text-slate-500">
                      Visualização completa de simulações salvas no histórico e testes gerados.
                    </p>
                  </div>

                  {/* Filtro da Galeria */}
                  <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                    <button
                      onClick={() => setSimulationFilter("all")}
                      className={`px-3 py-1 rounded-lg transition-colors ${
                        simulationFilter === "all"
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Todas ({selectedClientMetrics.simulations.length})
                    </button>
                    <button
                      onClick={() => setSimulationFilter("saved")}
                      className={`px-3 py-1 rounded-lg transition-colors ${
                        simulationFilter === "saved"
                          ? "bg-white text-emerald-700 shadow-sm font-bold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      💾 Salvas ({selectedClientMetrics.simulations.filter((s) => s.is_saved).length})
                    </button>
                    <button
                      onClick={() => setSimulationFilter("unsaved")}
                      className={`px-3 py-1 rounded-lg transition-colors ${
                        simulationFilter === "unsaved"
                          ? "bg-white text-blue-700 shadow-sm font-bold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      ⚡ Não Salvas ({selectedClientMetrics.simulations.filter((s) => !s.is_saved).length})
                    </button>
                  </div>
                </div>

                {/* Grid de Imagens */}
                {selectedClientMetrics.loading ? (
                  <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Carregando imagens e histórico de simulações do cliente...
                  </div>
                ) : selectedClientMetrics.simulations.length === 0 ? (
                  <div className="py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center text-slate-500 text-xs">
                    Nenhuma simulação registrada para este cliente.
                  </div>
                ) : (() => {
                  const filteredList = selectedClientMetrics.simulations.filter((s) => {
                    if (simulationFilter === "saved") return s.is_saved;
                    if (simulationFilter === "unsaved") return !s.is_saved;
                    return true;
                  });

                  if (filteredList.length === 0) {
                    return (
                      <div className="py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center text-slate-500 text-xs">
                        Nenhuma imagem encontrada para o filtro selecionado ({simulationFilter}).
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredList.map((sim, idx) => (
                        <div
                          key={`${sim.id}_${idx}`}
                          className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                        >
                          {/* Top Card Header */}
                          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                sim.is_saved
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                  : "bg-blue-100 text-blue-800 border border-blue-200"
                              }`}
                            >
                              {sim.is_saved ? (
                                <>
                                  <Sparkles className="w-3 h-3 text-emerald-600" /> Salva pelo Cliente
                                </>
                              ) : (
                                <>
                                  <Layers className="w-3 h-3 text-blue-600" /> Gerada (Não Salva)
                                </>
                              )}
                            </span>
                            <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                              <Calendar className="w-3 h-3" />
                              {new Date(sim.created_at).toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              })}{" "}
                              {new Date(sim.created_at).toLocaleTimeString("pt-BR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>

                          {/* Detalhes do Paciente e Procedimento */}
                          <div className="p-4 space-y-3 flex-1">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                  Paciente / Teste
                                </span>
                                <h5 className="text-xs font-bold text-slate-900">{sim.nome_paciente}</h5>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                  Procedimento & Cor
                                </span>
                                <div className="text-xs font-semibold text-slate-700 flex items-center gap-1 justify-end">
                                  <Tag className="w-3 h-3 text-primary" />
                                  <span>{sim.procedimento}</span>
                                  {sim.cor_utilizada && sim.cor_utilizada !== "-" && (
                                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 text-[10px] font-mono font-bold">
                                      {sim.cor_utilizada}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Imagens (Antes / Depois) Side-by-Side */}
                            <div className="grid grid-cols-2 gap-2 pt-1">
                              
                              {/* Imagem Original (Antes) */}
                              <div className="relative group bg-slate-100 rounded-xl overflow-hidden aspect-[4/3] border border-slate-200">
                                {sim.img_original_url ? (
                                  <>
                                    <img
                                      src={sim.img_original_url}
                                      alt="Original"
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-slate-900/70 backdrop-blur-sm text-white text-[10px] font-bold rounded-md">
                                      Original
                                    </div>
                                    <button
                                      onClick={() => setPreviewImage({ url: sim.img_original_url, title: `Original - ${sim.nome_paciente}` })}
                                      className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1"
                                    >
                                      <Eye className="w-4 h-4" /> Expandir
                                    </button>
                                  </>
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-[10px]">
                                    Sem imagem original
                                  </div>
                                )}
                              </div>

                              {/* Imagem Simulada (Depois) */}
                              <div className="relative group bg-slate-100 rounded-xl overflow-hidden aspect-[4/3] border border-slate-200">
                                {sim.img_simulada_url ? (
                                  <>
                                    <img
                                      src={sim.img_simulada_url}
                                      alt="Simulação IA"
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-primary/90 backdrop-blur-sm text-white text-[10px] font-bold rounded-md">
                                      Simulada (IA)
                                    </div>
                                    <button
                                      onClick={() => setPreviewImage({ url: sim.img_simulada_url, title: `Simulada IA - ${sim.nome_paciente}` })}
                                      className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1"
                                    >
                                      <Eye className="w-4 h-4" /> Expandir
                                    </button>
                                  </>
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-[10px]">
                                    Sem imagem simulada
                                  </div>
                                )}
                              </div>

                            </div>

                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

            </div>

            {/* Footer do Modal */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedClientMetrics(null)}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-colors"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Lightbox para Visualização em Alta Resolução */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-900/90 text-white">
              <span className="text-xs font-bold">{previewImage.title}</span>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2 flex items-center justify-center bg-black max-h-[80vh] overflow-hidden">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="max-h-[75vh] w-auto max-w-full object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
