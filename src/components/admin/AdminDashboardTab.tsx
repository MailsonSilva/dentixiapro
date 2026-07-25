"use client";

import React from "react";
import { AdminMetrics } from "@/lib/admin/actions";
import { UserPlus, ShieldCheck, Activity, Share2, CheckCircle2, AlertTriangle, TrendingUp, Users } from "lucide-react";

interface AdminDashboardTabProps {
  metrics: AdminMetrics | null;
  loading: boolean;
}

export function AdminDashboardTab({ metrics, loading }: AdminDashboardTabProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-40 bg-zinc-900/80 rounded-2xl border border-zinc-800 p-6"></div>
        ))}
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="p-8 text-center bg-zinc-900/40 rounded-2xl border border-zinc-800 text-zinc-400">
        Não foi possível carregar as métricas do painel.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Cards de Resumo no Topo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: Cadastros */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 hover:border-cyan-500/30 transition-all shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Novos Cadastros</span>
            <div className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-xl">
              <UserPlus className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-bold text-white">{metrics.registrations.today}</span>
              <span className="text-xs text-zinc-400 font-medium">Hoje</span>
            </div>
            <div className="flex justify-between text-xs text-zinc-400 border-t border-zinc-800/80 pt-3 mt-3">
              <span>Esta Semana: <strong className="text-zinc-200">{metrics.registrations.thisWeek}</strong></span>
              <span>Este Mês: <strong className="text-zinc-200">{metrics.registrations.thisMonth}</strong></span>
            </div>
          </div>
        </div>

        {/* Card 2: Retenção & Trial */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 hover:border-emerald-500/30 transition-all shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Retenção de Contas</span>
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-bold text-white">{metrics.retention.activePaid}</span>
              <span className="text-xs text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Assinantes Ativos
              </span>
            </div>
            <div className="flex justify-between text-xs text-zinc-400 border-t border-zinc-800/80 pt-3 mt-3">
              <span>Contas em Trial (7 dias):</span>
              <strong className="text-emerald-400">{metrics.retention.activeTrial}</strong>
            </div>
          </div>
        </div>

        {/* Card 3: Operações e Sucesso */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 hover:border-purple-500/30 transition-all shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-400">Volume de Operações</span>
            <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-bold text-white">{metrics.operations.todayTotal}</span>
              <span className="text-xs text-zinc-400 font-medium">Hoje</span>
            </div>
            <div className="flex items-center justify-between text-xs border-t border-zinc-800/80 pt-3 mt-3">
              <span className="flex items-center text-emerald-400 gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {metrics.operations.successCount} ok
              </span>
              <span className="flex items-center text-rose-400 gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> {metrics.operations.errorCount} erros
              </span>
              <span className="text-zinc-300 font-semibold">{metrics.operations.successRate}% taxa</span>
            </div>
          </div>
        </div>

        {/* Card 4: Indicações (Referral) */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 hover:border-amber-500/30 transition-all shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">Crescimento Referral</span>
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl">
              <Share2 className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-bold text-white">{metrics.referral.totalReferredSignups}</span>
              <span className="text-xs text-amber-400 font-medium">Via Indicação</span>
            </div>
            <div className="text-xs text-zinc-400 border-t border-zinc-800/80 pt-3 mt-3 flex items-center justify-between">
              <span>Conversão orgânica viral</span>
              <TrendingUp className="w-4 h-4 text-amber-400" />
            </div>
          </div>
        </div>

      </div>

      {/* Destaques adicionais do Dashboard */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800/80 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-2xl border border-cyan-500/20">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Status da Plataforma</h3>
            <p className="text-xs text-zinc-400">Operações e infraestrutura rodando em conformidade total.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-ping"></span>
            Sistema 100% Operacional
          </span>
        </div>
      </div>
    </div>
  );
}
