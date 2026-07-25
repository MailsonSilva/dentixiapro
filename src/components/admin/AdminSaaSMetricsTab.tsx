"use client";

import React from "react";
import { SaaSFinancialMetrics } from "@/lib/admin/actions";
import { DollarSign, TrendingDown, Award, UserX, AlertCircle, Cpu, BarChart3, ArrowUpRight } from "lucide-react";

interface AdminSaaSMetricsTabProps {
  metrics: SaaSFinancialMetrics | null;
  loading: boolean;
}

export function AdminSaaSMetricsTab({ metrics, loading }: AdminSaaSMetricsTabProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 bg-zinc-900/80 rounded-2xl border border-zinc-800 p-6"></div>
        ))}
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="p-8 text-center bg-zinc-900/40 rounded-2xl border border-zinc-800 text-zinc-400">
        Não foi possível carregar as métricas de SaaS e Custos.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 1. Indicadores Financeiros (SaaS Core) */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-cyan-400" /> Indicadores Financeiros (SaaS Core)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* MRR */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 hover:border-emerald-500/30 transition-all shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">MRR (Receita Recorrente Mensal)</span>
              <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-bold text-white">
              R$ {metrics.mrr.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-zinc-400 mt-2 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" /> Baseado em assinaturas ativas
            </p>
          </div>

          {/* Churn Rate */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 hover:border-rose-500/30 transition-all shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">Churn Rate Mensal</span>
              <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl">
                <TrendingDown className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-bold text-white">{metrics.churnRate}%</div>
            <p className="text-xs text-zinc-400 mt-2">
              Taxa de cancelamentos nos últimos 30 dias
            </p>
          </div>

          {/* LTV */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 hover:border-cyan-500/30 transition-all shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">LTV (Lifetime Value)</span>
              <div className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-xl">
                <Award className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-bold text-white">
              R$ {metrics.ltv.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-zinc-400 mt-2">
              Valor estimado gerado por cliente
            </p>
          </div>

        </div>
      </div>

      {/* 2. Métricas de Engajamento e Risco */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
          <UserX className="w-4 h-4 text-amber-400" /> Engajamento e Prevenção de Churn
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Clientes Inativos */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 flex items-start gap-4">
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <UserX className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{metrics.inactiveUsersCount}</div>
              <div className="text-sm font-medium text-amber-400 mt-0.5">Clientes Inativos (+14 dias)</div>
              <p className="text-xs text-zinc-400 mt-1">
                Usuários que não realizam login recente. Risco elevado de cancelamento (Churn).
              </p>
            </div>
          </div>

          {/* Trial Alto Uso Sem Conversão */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 flex items-start gap-4">
            <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{metrics.heavyTrialNonConvertedCount}</div>
              <div className="text-sm font-medium text-purple-400 mt-0.5">Trial de Alto Uso sem Conversão</div>
              <p className="text-xs text-zinc-400 mt-1">
                Usuários em Trial com 5+ simulações processadas. Oportunidade quente para abordagem de vendas.
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* 3. Monitoramento de Custos de API de Inteligência Artificial */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-white">Monitoramento de Custos de API (IA)</h4>
              <p className="text-xs text-zinc-400">Estimativa de consumo externo por simulação vs faturamento bruto</p>
            </div>
          </div>
          <span className="text-xs text-cyan-400 font-mono bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
            ~${metrics.apiCosts.estimatedCostPerSimulationUSD} USD / simulação
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="p-4 bg-zinc-950/80 rounded-xl border border-zinc-800/80">
            <span className="text-xs text-zinc-400 font-medium">Total de Simulações Processadas</span>
            <div className="text-2xl font-bold text-white mt-1">{metrics.apiCosts.totalSimulationsCount}</div>
          </div>

          <div className="p-4 bg-zinc-950/80 rounded-xl border border-zinc-800/80">
            <span className="text-xs text-zinc-400 font-medium">Custo Estimado de API (USD)</span>
            <div className="text-2xl font-bold text-rose-400 mt-1">${metrics.apiCosts.totalCostUSD} USD</div>
          </div>

          <div className="p-4 bg-zinc-950/80 rounded-xl border border-zinc-800/80">
            <span className="text-xs text-zinc-400 font-medium">Faturamento Estimado (BRL)</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">R$ {metrics.apiCosts.estimatedRevenueBRL.toLocaleString("pt-BR")}</div>
          </div>
        </div>

        {/* Visual Bar Indicator */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-zinc-400">
            <span>Margem Operacional de Custos AI</span>
            <span className="text-emerald-400 font-semibold">Excelente Margem (&lt; 5% do faturamento)</span>
          </div>
          <div className="w-full bg-zinc-950 h-3 rounded-full overflow-hidden p-0.5 border border-zinc-800">
            <div className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-full rounded-full w-[4%]"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
