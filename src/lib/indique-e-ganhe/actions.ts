"use server";

import { createClient } from "@/lib/supabaseServer";

function generateDTReferralCode(): string {
  const digits = Math.floor(100000 + Math.random() * 900000);
  return `DT${digits}`;
}

export async function getReferralDataAction() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Não autenticado", data: null };
  }

  // 1. Busca dados do usuário logado em public.usuarios
  let { data: userData } = await supabase
    .from('usuarios')
    .select('nome_completo, referral_code, commission_rate, created_at')
    .eq('id', user.id)
    .maybeSingle();

  let refCode = userData?.referral_code;

  // Garante regra 7: Nomenclatura do link de indicação "DT" + 6 números
  const dtCodeRegex = /^DT\d{6}$/;
  if (!refCode || !dtCodeRegex.test(refCode)) {
    refCode = generateDTReferralCode();
    await supabase
      .from('usuarios')
      .update({ referral_code: refCode })
      .eq('id', user.id);

    if (userData) {
      userData.referral_code = refCode;
    }
  }

  // 2. Busca views e registros diretos em paralelo
  const [headerResult, resumoResult, listaViewResult, directReferredUsersResult] = await Promise.all([
    supabase.from('view_parceiro_header').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('view_parceiro_resumo_cards').select('*').eq('id_parceiro_user', user.id),
    supabase.from('view_parceiro_lista_indicados').select('*').eq('id_parceiro_user', user.id),
    supabase.from('usuarios').select('id, nome_completo, email, created_at, trial_ends_at, tipo').eq('user_referredbycode', refCode)
  ]);

  // 3. Monta lista de indicados garantindo leitura total (regra 5)
  const listaFromView = listaViewResult.data || [];
  const directReferred = directReferredUsersResult.data || [];

  // Mapeia os usuários referenciados diretamente do BD caso não estejam na view
  const directMapped = directReferred.map(u => {
    const createdAt = new Date(u.created_at);
    const now = new Date();
    const trialEnds = u.trial_ends_at ? new Date(u.trial_ends_at) : null;
    let statusFormatado = "Em teste";
    if (trialEnds && trialEnds < now) {
      statusFormatado = "Inativo";
    }

    return {
      id_parceiro_user: user.id,
      nome_cliente: u.nome_completo || u.email?.split('@')[0] || "Cliente",
      email_cliente: u.email || "",
      data_cadastro_user: u.created_at,
      data_referencia: u.created_at,
      mes: createdAt.getMonth() + 1,
      ano: createdAt.getFullYear(),
      status_formatado: statusFormatado,
      nome_plano: "Plano DentixIA",
      valor_comissao_estimada: 19.70
    };
  });

  // Une lista da view com lista direta evitando duplicatas por email
  const existingEmails = new Set(listaFromView.map(i => i.email_cliente?.toLowerCase()));
  const mergedLista = [...listaFromView];

  directMapped.forEach(item => {
    if (!existingEmails.has(item.email_cliente?.toLowerCase())) {
      mergedLista.push(item);
    }
  });

  return {
    error: null,
    data: {
      userCreatedAt: userData?.created_at || user.created_at,
      userData: {
        nome_completo: userData?.nome_completo || user.user_metadata?.nome_completo || user.user_metadata?.full_name || "Usuário",
        referral_code: refCode,
        commission_rate: userData?.commission_rate ?? 10
      },
      header: headerResult.data,
      resumo: resumoResult.data || [],
      lista: mergedLista
    }
  };
}

