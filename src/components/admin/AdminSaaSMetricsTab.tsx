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
          <div key={i} className="h-40 bg-white/80 rounded-2xl border border-slate-200 p-6"></div>
        ))}
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="p-8 text-center bg-white/80 rounded-2xl border border-slate-200 text-slate-500">
        Não foi possível carregar as métricas de SaaS e Custos.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 1. Indicadores Financeiros (SaaS Core) */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" /> Indicadores Financeiros (SaaS Core)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* MRR */}
          <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 hover:border-emerald-500/40 transition-all shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">MRR (Receita Recorrente Mensal)</span>
              <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-slate-800">
              R$ {metrics.mrr.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 font-bold" /> Baseado em assinaturas ativas
            </p>
          </div>

          {/* Churn Rate */}
          <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 hover:border-rose-500/40 transition-all shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-700">Churn Rate Mensal</span>
              <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl">
                <TrendingDown className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-slate-800">{metrics.churnRate}%</div>
            <p className="text-xs text-slate-500 mt-2">
              Taxa de cancelamentos nos últimos 30 dias
            </p>
          </div>

          {/* LTV */}
          <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 hover:border-primary/40 transition-all shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">LTV (Lifetime Value)</span>
              <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                <Award className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-slate-800">
              R$ {metrics.ltv.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Valor estimado gerado por cliente
            </p>
          </div>

        </div>
      </div>

      {/* 2. Métricas de Engajamento e Risco */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 mb-4 flex items-center gap-2">
          <UserX className="w-4 h-4 text-amber-600" /> Engajamento e Prevenção de Churn
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Clientes Inativos */}
          <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 flex items-start gap-4 shadow-sm">
            <div className="p-3 bg-amber-100 text-amber-700 rounded-xl border border-amber-200">
              <UserX className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-slate-800">{metrics.inactiveUsersCount}</div>
              <div className="text-sm font-bold text-amber-700 mt-0.5">Clientes Inativos (+14 dias)</div>
              <p className="text-xs text-slate-500 mt-1">
                Usuários que não realizam login recente. Risco elevado de cancelamento (Churn).
              </p>
            </div>
          </div>

          {/* Trial Alto Uso Sem Conversão */}
          <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 flex items-start gap-4 shadow-sm">
            <div className="p-3 bg-purple-100 text-purple-700 rounded-xl border border-purple-200">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-slate-800">{metrics.heavyTrialNonConvertedCount}</div>
              <div className="text-sm font-bold text-purple-700 mt-0.5">Trial de Alto Uso sem Conversão</div>
              <p className="text-xs text-slate-500 mt-1">
                Usuários em Trial com 5+ simulações processadas. Oportunidade quente para abordagem de vendas.
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* 3. Monitoramento de Custos de API de Inteligência Artificial */}
      <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl border border-primary/20">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-800">Monitoramento de Custos de API (IA)</h4>
              <p className="text-xs text-slate-500">Estimativa de consumo externo por simulação vs faturamento bruto</p>
            </div>
          </div>
          <span className="text-xs text-primary font-mono font-bold bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
            ~${metrics.apiCosts.estimatedCostPerSimulationUSD} USD / simulação
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 font-medium">Total de Simulações Processadas</span>
            <div className="text-2xl font-extrabold text-slate-800 mt-1">{metrics.apiCosts.totalSimulationsCount}</div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 font-medium">Custo Estimado de API (USD)</span>
            <div className="text-2xl font-extrabold text-rose-600 mt-1">${metrics.apiCosts.totalCostUSD} USD</div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 font-medium">Faturamento Estimado (BRL)</span>
            <div className="text-2xl font-extrabold text-emerald-600 mt-1">R$ {metrics.apiCosts.estimatedRevenueBRL.toLocaleString("pt-BR")}</div>
          </div>
        </div>

        {/* Visual Bar Indicator */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Margem Operacional de Custos AI</span>
            <span className="text-emerald-600 font-bold">Excelente Margem (&lt; 5% do faturamento)</span>
          </div>
          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200">
            <div className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-full rounded-full w-[4%]"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
