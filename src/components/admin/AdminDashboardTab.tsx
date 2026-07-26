"use client";

import React, { useEffect, useState } from "react";
import { AdminMetrics, getPublicWelcomeVideoUrlAction, updateWelcomeVideoUrlAction } from "@/lib/admin/actions";
import { UserPlus, ShieldCheck, Activity, Share2, CheckCircle2, AlertTriangle, TrendingUp, Users, Video, Save, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface AdminDashboardTabProps {
  metrics: AdminMetrics | null;
  loading: boolean;
}

export function getYouTubeEmbedUrl(url: string): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  let videoId = "";
  if (trimmed.includes("youtu.be/")) {
    videoId = trimmed.split("youtu.be/")[1]?.split("?")[0]?.split("&")[0];
  } else if (trimmed.includes("youtube.com/shorts/")) {
    videoId = trimmed.split("youtube.com/shorts/")[1]?.split("?")[0]?.split("&")[0];
  } else if (trimmed.includes("youtube.com/watch")) {
    const searchParams = new URLSearchParams(trimmed.split("?")[1] || "");
    videoId = searchParams.get("v") || "";
  } else if (trimmed.includes("youtube.com/embed/")) {
    videoId = trimmed.split("youtube.com/embed/")[1]?.split("?")[0]?.split("&")[0];
  }

  if (!videoId) return null;
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
}

export function AdminDashboardTab({ metrics, loading }: AdminDashboardTabProps) {
  const [videoUrl, setVideoUrl] = useState("");
  const [savingVideo, setSavingVideo] = useState(false);
  const [loadingVideo, setLoadingVideo] = useState(true);

  useEffect(() => {
    async function loadVideoSetting() {
      setLoadingVideo(true);
      const res = await getPublicWelcomeVideoUrlAction();
      if (res.url) {
        setVideoUrl(res.url);
      }
      setLoadingVideo(false);
    }
    loadVideoSetting();
  }, []);

  const handleSaveVideo = async () => {
    setSavingVideo(true);
    const res = await updateWelcomeVideoUrlAction(videoUrl);
    if (res.success) {
      toast.success("Link do vídeo atualizado com sucesso!");
    } else {
      toast.error(`Erro ao salvar vídeo: ${res.error}`);
    }
    setSavingVideo(false);
  };

  const embedUrl = getYouTubeEmbedUrl(videoUrl);

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
              <span>Contas em Trial:</span>
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

      {/* Seção de Configuração do Vídeo de Boas-Vindas da Página Inicial */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 hover:border-cyan-500/30 transition-all shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-xl">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Vídeo de Boas-Vindas (Página Inicial)</h3>
              <p className="text-xs text-zinc-400">
                Insira o link do YouTube (Vídeo Normal ou Shorts). O formato será exibido em <strong className="text-cyan-400">Vertical (1080x1920 / ~80% da tela)</strong> assim que o usuário acessar a página inicial.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-full">
            Vertical 9:16 (~80vh)
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="Ex: https://www.youtube.com/watch?v=... ou https://youtube.com/shorts/..."
              disabled={loadingVideo}
              className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
          <button
            onClick={handleSaveVideo}
            disabled={savingVideo || loadingVideo}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-semibold text-xs transition-all shadow-md shadow-cyan-950 disabled:opacity-50"
          >
            {savingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Salvar Vídeo</span>
          </button>
        </div>

        {/* Pré-visualização do Vídeo se houver embedUrl */}
        {embedUrl ? (
          <div className="mt-4 pt-4 border-t border-zinc-800/80 flex flex-col md:flex-row items-start gap-6">
            <div className="w-full md:w-56 h-[320px] bg-black rounded-xl overflow-hidden border border-zinc-700 shadow-2xl relative flex items-center justify-center flex-shrink-0">
              <iframe
                src={embedUrl}
                title="Pré-visualização do Vídeo"
                className="w-full h-full object-cover"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="space-y-2 text-xs text-zinc-400 pt-2">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4" /> Link do YouTube reconhecido e pronto!
              </div>
              <p>
                Este vídeo será exibido em um modal vertical responsivo ocupando aproximadamente 80% da altura da tela na página inicial.
              </p>
              <div className="pt-2">
                <a
                  href={videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-cyan-400 hover:underline font-medium text-[11px]"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Abrir no YouTube
                </a>
              </div>
            </div>
          </div>
        ) : videoUrl.trim() ? (
          <p className="text-xs text-amber-400 flex items-center gap-1.5 pt-1">
            <AlertTriangle className="w-4 h-4" /> Cole um link válido do YouTube (ex: youtube.com/shorts/... ou youtube.com/watch?v=...)
          </p>
        ) : null}
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
