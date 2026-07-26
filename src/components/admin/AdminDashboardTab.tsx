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
  // IMPORTANTE: autoplay=0 para manter o vídeo pausado ao carregar
  return `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1`;
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
          <div key={i} className="h-40 bg-white/80 rounded-2xl border border-slate-200 p-6"></div>
        ))}
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="p-8 text-center bg-white/80 rounded-2xl border border-slate-200 text-slate-500">
        Não foi possível carregar as métricas do painel.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Cards de Resumo no Topo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: Cadastros */}
        <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 hover:border-primary/40 transition-all shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Novos Cadastros</span>
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
              <UserPlus className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-slate-800">{metrics.registrations.today}</span>
              <span className="text-xs text-slate-500 font-medium">Hoje</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500 border-t border-slate-100 pt-3 mt-3">
              <span>Esta Semana: <strong className="text-slate-800">{metrics.registrations.thisWeek}</strong></span>
              <span>Este Mês: <strong className="text-slate-800">{metrics.registrations.thisMonth}</strong></span>
            </div>
          </div>
        </div>

        {/* Card 2: Retenção & Trial */}
        <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 hover:border-emerald-500/40 transition-all shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Retenção de Contas</span>
            <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-slate-800">{metrics.retention.activePaid}</span>
              <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Assinantes Ativos
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-500 border-t border-slate-100 pt-3 mt-3">
              <span>Contas em Trial:</span>
              <strong className="text-emerald-700">{metrics.retention.activeTrial}</strong>
            </div>
          </div>
        </div>

        {/* Card 3: Operações e Sucesso */}
        <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 hover:border-purple-500/40 transition-all shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-600">Volume de Operações</span>
            <div className="p-2.5 bg-purple-100 text-purple-600 rounded-xl">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-slate-800">{metrics.operations.todayTotal}</span>
              <span className="text-xs text-slate-500 font-medium">Hoje</span>
            </div>
            <div className="flex items-center justify-between text-xs border-t border-slate-100 pt-3 mt-3">
              <span className="flex items-center text-emerald-600 font-medium gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {metrics.operations.successCount} ok
              </span>
              <span className="flex items-center text-rose-600 font-medium gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> {metrics.operations.errorCount} erros
              </span>
              <span className="text-slate-800 font-bold">{metrics.operations.successRate}% taxa</span>
            </div>
          </div>
        </div>

        {/* Card 4: Indicações (Referral) */}
        <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 hover:border-amber-500/40 transition-all shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Crescimento Referral</span>
            <div className="p-2.5 bg-amber-100 text-amber-600 rounded-xl">
              <Share2 className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-slate-800">{metrics.referral.totalReferredSignups}</span>
              <span className="text-xs text-amber-700 font-semibold">Via Indicação</span>
            </div>
            <div className="text-xs text-slate-500 border-t border-slate-100 pt-3 mt-3 flex items-center justify-between">
              <span>Conversão orgânica viral</span>
              <TrendingUp className="w-4 h-4 text-amber-600" />
            </div>
          </div>
        </div>

      </div>

      {/* Seção de Configuração do Vídeo de Boas-Vindas da Página Inicial */}
      <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl border border-primary/20">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Vídeo de Boas-Vindas (Página Inicial)</h3>
              <p className="text-xs text-slate-500">
                Insira o link do YouTube (Vídeo Normal ou Shorts). O formato é exibido verticalmente (9:16 / ~80% da tela) e permanece <strong className="text-primary font-bold">pausado</strong> até o usuário dar play.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 rounded-full">
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
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary focus:bg-white transition-colors"
            />
          </div>
          <button
            onClick={handleSaveVideo}
            disabled={savingVideo || loadingVideo}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-primary/20 disabled:opacity-50"
          >
            {savingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Salvar Vídeo</span>
          </button>
        </div>

        {/* Pré-visualização do Vídeo se houver embedUrl */}
        {embedUrl ? (
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col md:flex-row items-start gap-6">
            <div className="w-full md:w-56 h-[320px] bg-black rounded-xl overflow-hidden border border-slate-300 shadow-lg relative flex items-center justify-center flex-shrink-0">
              <iframe
                src={embedUrl}
                title="Pré-visualização do Vídeo"
                className="w-full h-full object-cover"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="space-y-2 text-xs text-slate-600 pt-2">
              <div className="flex items-center gap-2 text-emerald-600 font-bold">
                <CheckCircle2 className="w-4 h-4" /> Link do YouTube configurado (vídeo pausado ao carregar)!
              </div>
              <p>
                O vídeo permanece pausado até que o cliente decida iniciar o playback no modal de boas-vindas.
              </p>
              <div className="pt-2">
                <a
                  href={videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-primary hover:underline font-bold text-[11px]"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Abrir no YouTube
                </a>
              </div>
            </div>
          </div>
        ) : videoUrl.trim() ? (
          <p className="text-xs text-amber-600 flex items-center gap-1.5 pt-1 font-semibold">
            <AlertTriangle className="w-4 h-4" /> Cole um link válido do YouTube (ex: youtube.com/shorts/... ou youtube.com/watch?v=...)
          </p>
        ) : null}
      </div>

      {/* Destaques adicionais do Dashboard */}
      <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 text-primary rounded-2xl border border-primary/20">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Status da Plataforma</h3>
            <p className="text-xs text-slate-500">Operações e infraestrutura rodando em conformidade total.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-ping"></span>
            Sistema 100% Operacional
          </span>
        </div>
      </div>
    </div>
  );
}
