"use client";

import React, { useState } from "react";
import {
  ClientRow,
  SimulationHistoryItem,
  toggleBlockClientAction,
  getClientUsageHistoryAction,
} from "@/lib/admin/actions";
import {
  Search,
  Lock,
  Unlock,
  History,
  ChevronLeft,
  ChevronRight,
  X,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  UserCheck,
  UserX,
  Clock,
  RotateCcw,
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

  // Modal de Histórico de Uso
  const [selectedClientHistory, setSelectedClientHistory] = useState<{
    client: ClientRow;
    history: SimulationHistoryItem[];
    loading: boolean;
  } | null>(null);

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

  // Abrir Histórico de Uso no Modal
  const handleOpenHistory = async (client: ClientRow) => {
    setSelectedClientHistory({ client, history: [], loading: true });
    const res = await getClientUsageHistoryAction(client.id);
    if (res.error) {
      toast.error(`Erro ao carregar histórico: ${res.error}`);
      setSelectedClientHistory(null);
    } else {
      setSelectedClientHistory({ client, history: res.history, loading: false });
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
                <th className="py-4 px-6 text-center">Simulações</th>
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

                      {/* Contador de Simulações */}
                      <td className="py-4 px-6 text-center">
                        <div className="inline-flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200 text-xs font-mono">
                          <span className="text-emerald-700 font-bold">{client.simulations_success} ok</span>
                          <span className="text-slate-300">/</span>
                          <span className="text-rose-600 font-bold">{client.simulations_error} erros</span>
                        </div>
                      </td>

                      {/* Ações */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenHistory(client)}
                            title="Ver Histórico de Uso"
                            className="p-2 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                          >
                            <History className="w-4 h-4" />
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

      {/* Modal do Histórico de Uso */}
      {selectedClientHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Histórico Comportamental: {selectedClientHistory.client.nome_completo}
                </h3>
                <p className="text-xs text-slate-500">{selectedClientHistory.client.email}</p>
              </div>
              <button
                onClick={() => setSelectedClientHistory(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {selectedClientHistory.loading ? (
                <div className="py-8 text-center text-slate-500">Carregando histórico detalhado...</div>
              ) : selectedClientHistory.history.length === 0 ? (
                <div className="py-8 text-center text-slate-500">
                  Nenhuma simulação registrada para este cliente até o momento.
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedClientHistory.history.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    >
                      <div className="flex items-center gap-3">
                        {item.status === "acerto" && (
                          <span className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                            <CheckCircle2 className="w-4 h-4" />
                          </span>
                        )}
                        {item.status === "erro" && (
                          <span className="p-2 bg-rose-100 text-rose-700 rounded-lg">
                            <AlertCircle className="w-4 h-4" />
                          </span>
                        )}
                        {item.status === "refeita" && (
                          <span className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                            <History className="w-4 h-4" />
                          </span>
                        )}
                        {item.status === "salva" && (
                          <span className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                            <CheckCircle2 className="w-4 h-4" />
                          </span>
                        )}

                        <div>
                          <div className="font-bold text-slate-800 capitalize">Simulação: {item.status}</div>
                          <div className="text-[11px] text-slate-500">
                            {new Date(item.created_at).toLocaleString("pt-BR")}
                          </div>
                        </div>
                      </div>

                      {item.metadata && Object.keys(item.metadata).length > 0 && (
                        <div className="text-[11px] text-slate-600 bg-white px-2.5 py-1 rounded border border-slate-200 font-mono">
                          {JSON.stringify(item.metadata)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedClientHistory(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
