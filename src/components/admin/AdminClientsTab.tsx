"use client";

import React, { useState } from "react";
import { ClientRow, SimulationHistoryItem, toggleBlockClientAction, getClientUsageHistoryAction } from "@/lib/admin/actions";
import { Search, Lock, Unlock, History, ChevronLeft, ChevronRight, X, AlertCircle, CheckCircle2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

interface AdminClientsTabProps {
  clients: ClientRow[];
  totalClients: number;
  currentPage: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onPageChange: (p: number) => void;
  onRefresh: () => void;
  loading: boolean;
}

export function AdminClientsTab({
  clients,
  totalClients,
  currentPage,
  searchQuery,
  onSearchChange,
  onPageChange,
  onRefresh,
  loading,
}: AdminClientsTabProps) {
  const [blockingId, setBlockingId] = useState<string | null>(null);
  
  // Modal de histórico
  const [selectedClientHistory, setSelectedClientHistory] = useState<{
    client: ClientRow;
    history: SimulationHistoryItem[];
    loading: boolean;
  } | null>(null);

  const totalPages = Math.ceil(totalClients / 10) || 1;

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

  return (
    <div className="space-y-6">
      {/* Barra de Pesquisa e Filtros */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-900/90 border border-zinc-800 p-4 rounded-2xl">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por Nome, E-mail, WhatsApp ou Código..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-950/80 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
        <div className="text-xs text-zinc-400 font-medium">
          Total de clientes: <strong className="text-white font-semibold">{totalClients}</strong>
        </div>
      </div>

      {/* Tabela de Clientes */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="bg-zinc-950/60 border-b border-zinc-800 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              <tr>
                <th className="py-4 px-6">Cliente</th>
                <th className="py-4 px-6">Contato</th>
                <th className="py-4 px-6">Status da Conta</th>
                <th className="py-4 px-6">Assinatura</th>
                <th className="py-4 px-6 text-center">Simulações (Ok / Erro)</th>
                <th className="py-4 px-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500">
                    Carregando clientes...
                  </td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500">
                    Nenhum cliente encontrado para esta busca.
                  </td>
                </tr>
              ) : (
                clients.map((client) => (
                  <tr key={client.id} className="hover:bg-zinc-800/40 transition-colors">
                    
                    {/* Nome + Código */}
                    <td className="py-4 px-6">
                      <div className="font-medium text-white">{client.nome_completo}</div>
                      <div className="text-xs text-zinc-500 font-mono mt-0.5">
                        Ref: {client.referral_code || client.id.substring(0, 8)}
                      </div>
                    </td>

                    {/* Contato (E-mail / WhatsApp) */}
                    <td className="py-4 px-6">
                      <div className="text-zinc-200">{client.email}</div>
                      <div className="text-xs text-zinc-400">
                        {client.telefone ? client.telefone : "WhatsApp não informado"}
                      </div>
                    </td>

                    {/* Status da Conta (Ativo vs Bloqueado) */}
                    <td className="py-4 px-6">
                      {client.is_blocked ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <Lock className="w-3 h-3" /> Bloqueado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" /> Ativo
                        </span>
                      )}
                    </td>

                    {/* Assinatura */}
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        {client.plan_name}
                      </span>
                    </td>

                    {/* Contador de Uso */}
                    <td className="py-4 px-6 text-center">
                      <div className="inline-flex items-center gap-2 bg-zinc-950/80 px-3 py-1 rounded-lg border border-zinc-800 text-xs">
                        <span className="text-emerald-400 font-semibold">{client.simulations_success} ok</span>
                        <span className="text-zinc-600">/</span>
                        <span className="text-rose-400 font-semibold">{client.simulations_error} erros</span>
                      </div>
                    </td>

                    {/* Ações (Bloquear Instantâneo + Histórico) */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Botão de Histórico */}
                        <button
                          onClick={() => handleOpenHistory(client)}
                          title="Ver Histórico de Uso"
                          className="p-2 text-zinc-400 hover:text-white bg-zinc-800/80 hover:bg-zinc-800 rounded-xl transition-colors"
                        >
                          <History className="w-4 h-4" />
                        </button>

                        {/* Botão de Bloqueio Instantâneo */}
                        <button
                          onClick={() => handleToggleBlock(client)}
                          disabled={blockingId === client.id}
                          title={client.is_blocked ? "Desbloquear Acesso" : "Bloquear Acesso Imediatamente"}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                            client.is_blocked
                              ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30"
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
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 bg-zinc-950/40 text-xs text-zinc-400">
          <div>
            Página <strong className="text-white">{currentPage}</strong> de <strong className="text-white">{totalPages}</strong>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-1.5 bg-zinc-800/80 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="p-1.5 bg-zinc-800/80 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-white transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal do Histórico de Uso do Cliente */}
      {selectedClientHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Header do Modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950">
              <div>
                <h3 className="text-base font-semibold text-white">
                  Histórico Comportamental: {selectedClientHistory.client.nome_completo}
                </h3>
                <p className="text-xs text-zinc-400">{selectedClientHistory.client.email}</p>
              </div>
              <button
                onClick={() => setSelectedClientHistory(null)}
                className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-6 overflow-y-auto space-y-4">
              {selectedClientHistory.loading ? (
                <div className="py-8 text-center text-zinc-400">Carregando histórico detalhado...</div>
              ) : selectedClientHistory.history.length === 0 ? (
                <div className="py-8 text-center text-zinc-500">
                  Nenhuma simulação registrada para este cliente até o momento.
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedClientHistory.history.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3.5 bg-zinc-950/80 border border-zinc-800 rounded-xl text-xs"
                    >
                      <div className="flex items-center gap-3">
                        {item.status === "acerto" && (
                          <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                            <CheckCircle2 className="w-4 h-4" />
                          </span>
                        )}
                        {item.status === "erro" && (
                          <span className="p-2 bg-rose-500/10 text-rose-400 rounded-lg">
                            <AlertCircle className="w-4 h-4" />
                          </span>
                        )}
                        {item.status === "refeita" && (
                          <span className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
                            <History className="w-4 h-4" />
                          </span>
                        )}
                        {item.status === "salva" && (
                          <span className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg">
                            <CheckCircle2 className="w-4 h-4" />
                          </span>
                        )}

                        <div>
                          <div className="font-medium text-white capitalize">Simulação: {item.status}</div>
                          <div className="text-[11px] text-zinc-500">
                            {new Date(item.created_at).toLocaleString("pt-BR")}
                          </div>
                        </div>
                      </div>

                      {item.metadata && Object.keys(item.metadata).length > 0 && (
                        <div className="text-[11px] text-zinc-400 bg-zinc-900 px-2.5 py-1 rounded border border-zinc-800 font-mono">
                          {JSON.stringify(item.metadata)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer do Modal */}
            <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-950 flex justify-end">
              <button
                onClick={() => setSelectedClientHistory(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium rounded-xl transition-colors"
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
