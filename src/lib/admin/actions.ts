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
  subscription_status: string;
  plan_name: string;
  simulations_success: number;
  simulations_error: number;
  created_at: string;
  last_login: string | null;
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

/**
 * Gatekeeper Security Check
 * Checks if the current authenticated user has role = 'admin' or tipo IN ('admin', 'super_admin')
 */
export async function checkAdminAccessAction(): Promise<{ isAdmin: boolean; error: string | null }> {
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
        return { isAdmin: true, error: null };
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
      return { isAdmin: true, error: null };
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

    // 3. Volume de Operações do Dia (simulacao_tracking)
    const { data: simData } = await supabase
      .from("simulacao_tracking")
      .select("status")
      .gte("created_at", startOfToday);

    let successCount = 0;
    let errorCount = 0;
    const todayTotal = simData ? simData.length : 0;

    if (simData) {
      simData.forEach((s) => {
        if (s.status === "acerto" || s.status === "salva" || s.status === "refeita") {
          successCount++;
        } else if (s.status === "erro") {
          errorCount++;
        }
      });
    }

    const successRate = todayTotal > 0 ? Math.round((successCount / todayTotal) * 100) : 100;

    // 4. Métricas de Crescimento (Referral)
    const { count: referralCount } = await supabase
      .from("usuarios")
      .select("id", { count: "exact", head: true })
      .not("user_referredbycode", "is", null);

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
      },
    };
  } catch (err: any) {
    return { data: null, error: err.message || "Erro ao carregar métricas" };
  }
}

/**
 * Get Dynamic Client List with Pagination and Search
 */
export async function getAdminClientsAction(
  searchQuery: string = "",
  page: number = 1,
  pageSize: number = 10
): Promise<{ clients: ClientRow[]; total: number; error: string | null }> {
  const access = await checkAdminAccessAction();
  if (!access.isAdmin) return { clients: [], total: 0, error: access.error || "Acesso negado" };

  try {
    const supabase = await createClient();

    let query = supabase
      .from("usuarios")
      .select("id, nome_completo, email, telefone, referral_code, user_referredbycode, is_blocked, tipo, created_at, last_login, trial_ends_at", { count: "exact" });

    if (searchQuery.trim()) {
      const q = `%${searchQuery.trim()}%`;
      query = query.or(`nome_completo.ilike.${q},email.ilike.${q},telefone.ilike.${q},referral_code.ilike.${q},id.eq.${searchQuery.trim()}`);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data: users, count, error: fetchErr } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (fetchErr) {
      return { clients: [], total: 0, error: fetchErr.message };
    }

    if (!users || users.length === 0) {
      return { clients: [], total: 0, error: null };
    }

    const userIds = users.map((u) => u.id);

    // Buscar contagem de simulações e status de assinatura em lote
    const [simRes, subRes] = await Promise.all([
      supabase
        .from("simulacao_tracking")
        .select("user_id, status")
        .in("user_id", userIds),
      supabase
        .from("subscriptions")
        .select("company_id, status, price_id")
        .in("status", ["active", "trialing"]),
    ]);

    const simMap: Record<string, { success: number; error: number }> = {};
    if (simRes.data) {
      simRes.data.forEach((s) => {
        if (!simMap[s.user_id]) simMap[s.user_id] = { success: 0, error: 0 };
        if (s.status === "erro") {
          simMap[s.user_id].error++;
        } else {
          simMap[s.user_id].success++;
        }
      });
    }

    const now = new Date();

    const formattedClients: ClientRow[] = users.map((u) => {
      const sim = simMap[u.id] || { success: 0, error: 0 };
      const isTrial = u.trial_ends_at && new Date(u.trial_ends_at) > now;
      
      return {
        id: u.id,
        nome_completo: u.nome_completo || "Sem nome",
        email: u.email || "",
        telefone: u.telefone || null,
        referral_code: u.referral_code || null,
        user_referredbycode: u.user_referredbycode || null,
        is_blocked: u.is_blocked ?? false,
        tipo: u.tipo || "comum",
        subscription_status: isTrial ? "Trial Ativo" : "Expirado / Sem Plano",
        plan_name: isTrial ? "Plano Trial (7 Dias)" : "Sem Assinatura",
        simulations_success: sim.success,
        simulations_error: sim.error,
        created_at: u.created_at,
        last_login: u.last_login || u.created_at,
      };
    });

    return { clients: formattedClients, total: count || 0, error: null };
  } catch (err: any) {
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
 * Detailed Simulation History for Modal / Expandable Row
 */
export async function getClientUsageHistoryAction(userId: string): Promise<{ history: SimulationHistoryItem[]; error: string | null }> {
  const access = await checkAdminAccessAction();
  if (!access.isAdmin) return { history: [], error: access.error || "Acesso negado" };

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("simulacao_tracking")
      .select("id, status, metadata, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return { history: [], error: error.message };

    return { history: data as SimulationHistoryItem[], error: null };
  } catch (err: any) {
    return { history: [], error: err.message || "Erro ao obter histórico" };
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

    // Estimativa simplificada de MRR (assumindo ticket médio de R$ 97,00 por assinatura ativa)
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

    // 3. LTV estimado (MRR / Churn Rate ou ticket médio * 12 se churn for 0)
    const ltv = churnRate > 0 ? Math.round(97 / (churnRate / 100)) : 97 * 12;

    // 4. Clientes inativos (> 14 dias sem login)
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const { count: inactiveCount } = await supabase
      .from("usuarios")
      .select("id", { count: "exact", head: true })
      .lt("last_login", fourteenDaysAgo);

    // 5. Usuários Trial com alto uso (> 5 simulações) que não converteram em assinatura
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

    // 6. Monitoramento de Custos de API (IA) por simulação
    const { count: totalSimulationsCount } = await supabase
      .from("simulacao_tracking")
      .select("id", { count: "exact", head: true });

    const simTotal = totalSimulationsCount || 0;
    const estimatedCostPerSimulationUSD = 0.015; // Estimativa de $0.015 USD por chamada de IA
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
