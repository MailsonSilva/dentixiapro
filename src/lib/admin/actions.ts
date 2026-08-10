"use server";

import { createClient } from "@/lib/supabaseServer";

export interface AdminMetrics {
  registrations: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  retention: {
    activeTrial: number;
    activePaid: number;
  };
  operations: {
    todayTotal: number;
    successCount: number;
    errorCount: number;
    successRate: number;
  };
  referral: {
    totalReferredSignups: number;
  };
  simulations: {
    totalSaved: number;
    totalGenerated: number;
    totalErrors: number;
  };
}

export interface ClientRow {
  id: string;
  nome_completo: string;
  email: string;
  telefone: string | null;
  referral_code: string | null;
  user_referredbycode: string | null;
  is_blocked: boolean;
  tipo: string;
  status_category: "trial" | "subscriber" | "blocked" | "inactive";
  subscription_status: string;
  plan_name: string;
  trial_days_remaining: number | null;
  simulations_total: number;
  simulations_saved: number;
  simulations_unsaved: number;
  simulations_error: number;
  created_at: string;
  last_login: string | null;
}

export interface ClientSavedSimulation {
  id: number;
  nome_paciente: string;
  procedimento: string;
  cor_utilizada: string;
  img_original_url: string;
  img_simulada_url: string;
  created_at: string;
}

export interface SimulationHistoryItem {
  id: string;
  status: "acerto" | "erro" | "refeita" | "salva";
  metadata: any;
  created_at: string;
}

export interface SaaSFinancialMetrics {
  mrr: number;
  churnRate: number;
  ltv: number;
  inactiveUsersCount: number;
  heavyTrialNonConvertedCount: number;
  apiCosts: {
    totalSimulationsCount: number;
    estimatedCostPerSimulationUSD: number;
    totalCostUSD: number;
    estimatedRevenueBRL: number;
  };
}

export type NotificationCategory = "comum" | "aviso" | "atualizacao" | "promocao";
export type NotificationTargetAudience = "all" | "new_users" | "trial" | "subscribers" | "inactive";

export interface NotificationHistoryItem {
  id: string;
  title: string;
  message: string;
  category: NotificationCategory;
  target_audience: NotificationTargetAudience;
  recipients_count: number;
  created_at: string;
  created_by: string | null;
}

/**
 * Gatekeeper Security Check
 * Checks if the current authenticated user has role = 'admin' or tipo IN ('admin', 'super_admin')
 */
export async function checkAdminAccessAction(): Promise<{ isAdmin: boolean; userId?: string; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { isAdmin: false, error: "Não autenticado" };
    }

    // 1. Verificação na tabela usuarios
    const { data: usuarioData, error: uError } = await supabase
      .from("usuarios")
      .select("tipo")
      .eq("id", user.id)
      .maybeSingle();

    if (!uError && usuarioData) {
      const tipo = (usuarioData.tipo || "").toLowerCase();
      if (tipo === "admin" || tipo === "super_admin") {
        return { isAdmin: true, userId: user.id, error: null };
      }
    }

    // 2. Verificação fallback em user_company role
    const { data: ucData } = await supabase
      .from("user_company")
      .select("role")
      .eq("user_id", user.id)
      .eq("active", true)
      .maybeSingle();

    if (ucData && (ucData.role === "admin" || ucData.role === "super_admin")) {
      return { isAdmin: true, userId: user.id, error: null };
    }

    return { isAdmin: false, error: "Acesso Não Autorizado" };
  } catch (err: any) {
    return { isAdmin: false, error: err.message || "Erro de verificação" };
  }
}

/**
 * Dashboard Overview Metrics
 */
export async function getAdminDashboardMetricsAction(): Promise<{ data: AdminMetrics | null; error: string | null }> {
  const access = await checkAdminAccessAction();
  if (!access.isAdmin) return { data: null, error: access.error || "Acesso negado" };

  try {
    const supabase = await createClient();
    const now = new Date();
    
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek).toISOString();
    
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // 1. Métricas de Cadastros
    const [todayRes, weekRes, monthRes] = await Promise.all([
      supabase.from("usuarios").select("id", { count: "exact", head: true }).gte("created_at", startOfToday),
      supabase.from("usuarios").select("id", { count: "exact", head: true }).gte("created_at", startOfWeek),
      supabase.from("usuarios").select("id", { count: "exact", head: true }).gte("created_at", startOfMonth),
    ]);

    // 2. Métricas de Retenção
    const { count: activeTrialCount } = await supabase
      .from("usuarios")
      .select("id", { count: "exact", head: true })
      .gte("trial_ends_at", now.toISOString());

    const { count: activePaidCount } = await supabase
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .in("status", ["active", "trialing"]);

    // 3. Volume de Operações do Dia
    const [simData, simSavedData] = await Promise.all([
      supabase.from("simulacao_tracking").select("status").gte("created_at", startOfToday),
      supabase.from("simulacoes").select("id").gte("created_at", startOfToday),
    ]);

    let successCount = 0;
    let errorCount = 0;

    if (simData.data) {
      simData.data.forEach((s) => {
        if (s.status === "acerto" || s.status === "salva" || s.status === "refeita") {
          successCount++;
        } else if (s.status === "erro") {
          errorCount++;
        }
      });
    }

    const savedTodayCount = simSavedData.data ? simSavedData.data.length : 0;
    if (successCount < savedTodayCount) {
      successCount = savedTodayCount;
    }

    const todayTotal = Math.max(simData.data ? simData.data.length : 0, successCount + errorCount);
    const successRate = todayTotal > 0 ? Math.round((successCount / todayTotal) * 100) : 100;

    // 4. Métricas de Crescimento (Referral)
    const { count: referralCount } = await supabase
      .from("usuarios")
      .select("id", { count: "exact", head: true })
      .not("user_referredbycode", "is", null);

    // 5. Métricas globais (all-time) de simulações na plataforma
    const [simTotalSavedRes, simTotalGeneratedRes, simTotalErrorsRes] = await Promise.all([
      supabase.from("simulacoes").select("id", { count: "exact", head: true }),
      supabase
        .from("simulacao_tracking")
        .select("id", { count: "exact", head: true })
        .in("status", ["acerto", "refeita"]),
      supabase
        .from("simulacao_tracking")
        .select("id", { count: "exact", head: true })
        .eq("status", "erro"),
    ]);

    return {
      error: null,
      data: {
        registrations: {
          today: todayRes.count || 0,
          thisWeek: weekRes.count || 0,
          thisMonth: monthRes.count || 0,
        },
        retention: {
          activeTrial: activeTrialCount || 0,
          activePaid: activePaidCount || 0,
        },
        operations: {
          todayTotal,
          successCount,
          errorCount,
          successRate,
        },
        referral: {
          totalReferredSignups: referralCount || 0,
        },
        simulations: {
          totalSaved: simTotalSavedRes.count || 0,
          totalGenerated: simTotalGeneratedRes.count || 0,
          totalErrors: simTotalErrorsRes.count || 0,
        },
      },
    };
  } catch (err: any) {
    return { data: null, error: err.message || "Erro ao carregar métricas" };
  }
}

/**
 * Get Dynamic Client List with Pagination, Search, Status Filter, and Date Range Filter
 */
export async function getAdminClientsAction(
  searchQuery: string = "",
  statusFilter: "all" | "trial" | "subscribers" | "blocked" = "all",
  startDate: string | null = null,
  endDate: string | null = null,
  page: number = 1,
  pageSize: number = 10
): Promise<{ clients: ClientRow[]; total: number; error: string | null }> {
  const access = await checkAdminAccessAction();
  if (!access.isAdmin) return { clients: [], total: 0, error: access.error || "Acesso negado" };

  try {
    const supabase = await createClient();
    const now = new Date();

    let query = supabase
      .from("usuarios")
      .select("*", { count: "exact" });

    // Busca Textual Global
    if (searchQuery && searchQuery.trim()) {
      const q = `%${searchQuery.trim()}%`;
      query = query.or(`nome_completo.ilike.${q},email.ilike.${q},telefone.ilike.${q},referral_code.ilike.${q},id.eq.${searchQuery.trim()}`);
    }

    // Filtros por Período de Data de Cadastro
    if (startDate && typeof startDate === "string" && startDate.trim()) {
      const sDate = new Date(startDate);
      if (!isNaN(sDate.getTime())) {
        sDate.setHours(0, 0, 0, 0);
        query = query.gte("created_at", sDate.toISOString());
      }
    }
    if (endDate && typeof endDate === "string" && endDate.trim()) {
      const eDate = new Date(endDate);
      if (!isNaN(eDate.getTime())) {
        eDate.setHours(23, 59, 59, 999);
        query = query.lte("created_at", eDate.toISOString());
      }
    }

    // Filtros por Status da Conta
    if (statusFilter === "blocked") {
      query = query.eq("is_blocked", true);
    } else if (statusFilter === "trial") {
      query = query.or("is_blocked.is.null,is_blocked.eq.false").gte("trial_ends_at", now.toISOString());
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data: users, count, error: fetchErr } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (fetchErr) {
      console.error("Erro no getAdminClientsAction query:", fetchErr);
      return { clients: [], total: 0, error: fetchErr.message };
    }

    if (!users || users.length === 0) {
      return { clients: [], total: 0, error: null };
    }

    const userIds = users.map((u) => u.id);

    // Buscar contagem de simulações em paralelo: 1. simulacao_tracking, 2. simulacoes
    const [simRes, simSavedRes] = await Promise.all([
      supabase
        .from("simulacao_tracking")
        .select("user_id, status")
        .in("user_id", userIds),
      supabase
        .from("simulacoes")
        .select("usuario_id")
        .in("usuario_id", userIds),
    ]);

    const simMap: Record<string, { saved: number; generatedSuccess: number; error: number }> = {};

    // 1. Processar simulacoes salvas no banco
    if (simSavedRes.data) {
      simSavedRes.data.forEach((s) => {
        if (!simMap[s.usuario_id]) simMap[s.usuario_id] = { saved: 0, generatedSuccess: 0, error: 0 };
        simMap[s.usuario_id].saved++;
      });
    }

    // 2. Processar tracking
    if (simRes.data) {
      simRes.data.forEach((s) => {
        if (!simMap[s.user_id]) simMap[s.user_id] = { saved: 0, generatedSuccess: 0, error: 0 };
        if (s.status === "erro") {
          simMap[s.user_id].error++;
        } else if (s.status === "acerto" || s.status === "refeita") {
          simMap[s.user_id].generatedSuccess++;
        }
      });
    }

    let formattedClients: ClientRow[] = users.map((u) => {
      const sim = simMap[u.id] || { saved: 0, generatedSuccess: 0, error: 0 };
      const isBlocked = u.is_blocked === true;
      const trialEndsAt = u.trial_ends_at ? new Date(u.trial_ends_at) : null;
      const isTrial = trialEndsAt && trialEndsAt > now && !isBlocked;

      let trialDaysRemaining: number | null = null;
      if (trialEndsAt && trialEndsAt > now) {
        const diffTime = Math.abs(trialEndsAt.getTime() - now.getTime());
        trialDaysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      let statusCategory: "trial" | "subscriber" | "blocked" | "inactive" = "inactive";
      let subscriptionStatus = "Inativo / Sem Plano";
      let planName = "Sem Assinatura";

      if (isBlocked) {
        statusCategory = "blocked";
        subscriptionStatus = "Bloqueado";
        planName = "Acesso Suspenso";
      } else if (isTrial) {
        statusCategory = "trial";
        subscriptionStatus = `Em Testes (${trialDaysRemaining}d restantes)`;
        planName = "Plano Trial (7 Dias)";
      }

      const saved = sim.saved;
      const unsaved = Math.max(0, sim.generatedSuccess - saved);
      const error = sim.error;
      const totalSims = saved + unsaved + error;

      return {
        id: u.id,
        nome_completo: u.nome_completo || u.full_name || u.email?.split("@")[0] || "Sem nome",
        email: u.email || "",
        telefone: u.telefone || u.whatsapp || u.phone || null,
        referral_code: u.referral_code || null,
        user_referredbycode: u.user_referredbycode || u.user_referred_by_code || null,
        is_blocked: isBlocked,
        tipo: u.tipo || "comum",
        status_category: statusCategory,
        subscription_status: subscriptionStatus,
        plan_name: planName,
        trial_days_remaining: trialDaysRemaining,
        simulations_total: totalSims,
        simulations_saved: saved,
        simulations_unsaved: unsaved,
        simulations_error: error,
        created_at: u.created_at || new Date().toISOString(),
        last_login: u.last_login || u.created_at || null,
      };
    });

    if (statusFilter === "subscribers") {
      formattedClients = formattedClients.filter((c) => c.status_category === "subscriber");
    }

    return { clients: formattedClients, total: count || formattedClients.length, error: null };
  } catch (err: any) {
    console.error("Exceção no getAdminClientsAction:", err);
    return { clients: [], total: 0, error: err.message || "Erro ao buscar clientes" };
  }
}

/**
 * Immediate Action: Toggle Block / Unblock Client
 */
export async function toggleBlockClientAction(userId: string, isBlocked: boolean): Promise<{ success: boolean; error: string | null }> {
  const access = await checkAdminAccessAction();
  if (!access.isAdmin) return { success: false, error: access.error || "Acesso negado" };

  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("usuarios")
      .update({ is_blocked: isBlocked })
      .eq("id", userId);

    if (error) return { success: false, error: error.message };

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message || "Erro ao alterar status do cliente" };
  }
}

/**
 * Obter Estatísticas Métricas de Simulações de um Cliente (Salvas, Geradas Não Salvas e Erros de API)
 */
export async function getClientUsageHistoryAction(userId: string): Promise<{
  metrics: {
    total: number;
    saved: number;
    unsaved: number;
    error: number;
    successRate: number;
  };
  error: string | null;
}> {
  const access = await checkAdminAccessAction();
  if (!access.isAdmin) {
    return {
      metrics: { total: 0, saved: 0, unsaved: 0, error: 0, successRate: 0 },
      error: access.error || "Acesso negado",
    };
  }

  try {
    const supabase = await createClient();

    const [savedRes, trackingRes] = await Promise.all([
      supabase
        .from("simulacoes")
        .select("id", { count: "exact", head: true })
        .eq("usuario_id", userId),
      supabase
        .from("simulacao_tracking")
        .select("status")
        .eq("user_id", userId),
    ]);

    const savedCount = savedRes.count || 0;
    let generatedSuccessCount = 0;
    let errorCount = 0;

    if (trackingRes.data) {
      trackingRes.data.forEach((item) => {
        if (item.status === "erro") {
          errorCount++;
        } else if (item.status === "acerto" || item.status === "refeita") {
          generatedSuccessCount++;
        }
      });
    }

    const unsavedCount = Math.max(0, generatedSuccessCount - savedCount);
    const totalSimulations = savedCount + unsavedCount + errorCount;
    const successTotal = savedCount + unsavedCount;
    const successRate = totalSimulations > 0 ? Math.round((successTotal / totalSimulations) * 100) : 100;

    return {
      metrics: {
        total: totalSimulations,
        saved: savedCount,
        unsaved: unsavedCount,
        error: errorCount,
        successRate,
      },
      error: null,
    };
  } catch (err: any) {
    return {
      metrics: { total: 0, saved: 0, unsaved: 0, error: 0, successRate: 0 },
      error: err.message || "Erro ao obter métricas",
    };
  }
}

/**
 * Advanced SaaS Metrics & API Cost Monitoring
 */
export async function getSaaSFinancialAndCostMetricsAction(): Promise<{ data: SaaSFinancialMetrics | null; error: string | null }> {
  const access = await checkAdminAccessAction();
  if (!access.isAdmin) return { data: null, error: access.error || "Acesso negado" };

  try {
    const supabase = await createClient();
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Assinaturas Ativas para Cálculo de MRR
    const { data: subs } = await supabase
      .from("subscriptions")
      .select("id, status, quantity, price_id")
      .in("status", ["active", "trialing"]);

    const activeSubCount = subs ? subs.length : 0;
    const mrr = activeSubCount * 97;

    // 2. Churn Rate estimado (%)
    const { count: canceledCount } = await supabase
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "canceled")
      .gte("canceled_at", thirtyDaysAgo);

    const totalActiveAndCanceled = activeSubCount + (canceledCount || 0);
    const churnRate = totalActiveAndCanceled > 0 ? parseFloat((((canceledCount || 0) / totalActiveAndCanceled) * 100).toFixed(1)) : 0;

    // 3. LTV estimado
    const ltv = churnRate > 0 ? Math.round(97 / (churnRate / 100)) : 97 * 12;

    // 4. Clientes inativos (> 14 dias sem login)
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const { count: inactiveCount } = await supabase
      .from("usuarios")
      .select("id", { count: "exact", head: true })
      .lt("last_login", fourteenDaysAgo);

    // 5. Usuários Trial com alto uso
    const { data: highSimUsers } = await supabase
      .from("simulacao_tracking")
      .select("user_id");

    const simCounts: Record<string, number> = {};
    if (highSimUsers) {
      highSimUsers.forEach((s) => {
        simCounts[s.user_id] = (simCounts[s.user_id] || 0) + 1;
      });
    }

    const heavyUsers = Object.keys(simCounts).filter((uid) => simCounts[uid] >= 5);
    const heavyTrialNonConvertedCount = heavyUsers.length;

    // 6. Monitoramento de Custos de API
    const [simTrackingCountRes, simulacoesCountRes] = await Promise.all([
      supabase.from("simulacao_tracking").select("id", { count: "exact", head: true }),
      supabase.from("simulacoes").select("id", { count: "exact", head: true }),
    ]);

    const simTotal = Math.max(simTrackingCountRes.count || 0, simulacoesCountRes.count || 0);
    const estimatedCostPerSimulationUSD = 0.015;
    const totalCostUSD = parseFloat((simTotal * estimatedCostPerSimulationUSD).toFixed(2));
    const estimatedRevenueBRL = mrr;

    return {
      error: null,
      data: {
        mrr,
        churnRate,
        ltv,
        inactiveUsersCount: inactiveCount || 0,
        heavyTrialNonConvertedCount,
        apiCosts: {
          totalSimulationsCount: simTotal,
          estimatedCostPerSimulationUSD,
          totalCostUSD,
          estimatedRevenueBRL,
        },
      },
    };
  } catch (err: any) {
    return { data: null, error: err.message || "Erro ao calcular métricas SaaS" };
  }
}

/**
 * Busca o link do vídeo de boas-vindas (Pública)
 */
export async function getPublicWelcomeVideoUrlAction(): Promise<{ url: string; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "welcome_video_url")
      .maybeSingle();

    if (error) return { url: "", error: error.message };
    return { url: data?.value || "", error: null };
  } catch (err: any) {
    return { url: "", error: err.message };
  }
}

/**
 * Atualiza o link do vídeo de boas-vindas no painel admin
 */
export async function updateWelcomeVideoUrlAction(url: string): Promise<{ success: boolean; error: string | null }> {
  const access = await checkAdminAccessAction();
  if (!access.isAdmin) return { success: false, error: access.error || "Acesso negado" };

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("system_settings")
      .upsert({
        key: "welcome_video_url",
        value: url.trim(),
        updated_at: new Date().toISOString(),
      });

    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Central de Notificações Push: Calcula o número de destinatários por segmento
 */
export async function getTargetAudienceCountAction(
  targetAudience: NotificationTargetAudience
): Promise<{ count: number; error: string | null }> {
  const access = await checkAdminAccessAction();
  if (!access.isAdmin) return { count: 0, error: access.error || "Acesso negado" };

  try {
    const supabase = await createClient();
    const now = new Date();

    if (targetAudience === "all") {
      const { count } = await supabase
        .from("usuarios")
        .select("id", { count: "exact", head: true })
        .or("is_blocked.is.null,is_blocked.eq.false");
      return { count: count || 0, error: null };
    }

    if (targetAudience === "new_users") {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("usuarios")
        .select("id", { count: "exact", head: true })
        .or("is_blocked.is.null,is_blocked.eq.false")
        .gte("created_at", sevenDaysAgo);
      return { count: count || 0, error: null };
    }

    if (targetAudience === "trial") {
      const { count } = await supabase
        .from("usuarios")
        .select("id", { count: "exact", head: true })
        .or("is_blocked.is.null,is_blocked.eq.false")
        .gte("trial_ends_at", now.toISOString());
      return { count: count || 0, error: null };
    }

    if (targetAudience === "subscribers") {
      const { count } = await supabase
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .in("status", ["active", "trialing"]);
      return { count: count || 0, error: null };
    }

    if (targetAudience === "inactive") {
      const { count } = await supabase
        .from("usuarios")
        .select("id", { count: "exact", head: true })
        .or("is_blocked.is.null,is_blocked.eq.false")
        .or(`trial_ends_at.lt.${now.toISOString()},trial_ends_at.is.null`);
      return { count: count || 0, error: null };
    }

    return { count: 0, error: null };
  } catch (err: any) {
    return { count: 0, error: err.message || "Erro ao calcular audiência" };
  }
}

/**
 * Central de Notificações Push: Dispara uma notificação e salva no histórico
 */
export async function sendNotificationAction(payload: {
  title: string;
  message: string;
  category: NotificationCategory;
  target_audience: NotificationTargetAudience;
}): Promise<{ success: boolean; recipients_count: number; error: string | null }> {
  const access = await checkAdminAccessAction();
  if (!access.isAdmin) return { success: false, recipients_count: 0, error: access.error || "Acesso negado" };

  try {
    const supabase = await createClient();

    if (!payload.title.trim() || !payload.message.trim()) {
      return { success: false, recipients_count: 0, error: "Título e mensagem são obrigatórios." };
    }

    if (payload.title.length > 60) {
      return { success: false, recipients_count: 0, error: "O título não pode exceder 60 caracteres." };
    }

    const countRes = await getTargetAudienceCountAction(payload.target_audience);
    const recipientsCount = countRes.count || 0;

    const { error: insertErr } = await supabase
      .from("notifications_history")
      .insert({
        title: payload.title.trim(),
        message: payload.message.trim(),
        category: payload.category,
        target_audience: payload.target_audience,
        recipients_count: recipientsCount,
        created_by: access.userId || null,
      });

    if (insertErr) {
      return { success: false, recipients_count: 0, error: insertErr.message };
    }

    return { success: true, recipients_count: recipientsCount, error: null };
  } catch (err: any) {
    return { success: false, recipients_count: 0, error: err.message || "Erro ao enviar notificação" };
  }
}

/**
 * Central de Notificações Push: Busca histórico de envios
 */
export async function getNotificationHistoryAction(): Promise<{
  history: NotificationHistoryItem[];
  error: string | null;
}> {
  const access = await checkAdminAccessAction();
  if (!access.isAdmin) return { history: [], error: access.error || "Acesso negado" };

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("notifications_history")
      .select("id, title, message, category, target_audience, recipients_count, created_at, created_by")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return { history: [], error: error.message };

    return { history: (data as NotificationHistoryItem[]) || [], error: null };
  } catch (err: any) {
    return { history: [], error: err.message || "Erro ao obter histórico de notificações" };
  }
}

/**
 * APP CLIENTE: Busca as notificações mais recentes para exibição ao usuário logado
 */
export async function getUserNotificationsAction(): Promise<{
  notifications: NotificationHistoryItem[];
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { notifications: [], error: null };
    }

    const { data: userData } = await supabase
      .from("usuarios")
      .select("created_at, trial_ends_at")
      .eq("id", user.id)
      .maybeSingle();

    const now = new Date();
    const userCategories: NotificationTargetAudience[] = ["all"];

    if (userData) {
      const createdAt = new Date(userData.created_at);
      const isNewUser = now.getTime() - createdAt.getTime() <= 7 * 24 * 60 * 60 * 1000;
      if (isNewUser) userCategories.push("new_users");

      const trialEndsAt = userData.trial_ends_at ? new Date(userData.trial_ends_at) : null;
      if (trialEndsAt && trialEndsAt > now) {
        userCategories.push("trial");
      } else {
        userCategories.push("inactive");
      }
    }

    const { data, error } = await supabase
      .from("notifications_history")
      .select("id, title, message, category, target_audience, recipients_count, created_at, created_by")
      .in("target_audience", userCategories)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) return { notifications: [], error: error.message };

    return { notifications: (data as NotificationHistoryItem[]) || [], error: null };
  } catch (err: any) {
    return { notifications: [], error: err.message };
  }
}
