"use server";

import { createClient } from "@/lib/supabaseServer";

export async function getReferralDataAction() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Não autenticado", data: null };
  }

  const [userDataResult, headerResult, resumoResult, listaResult] = await Promise.all([
    supabase.from('usuarios').select('nome_completo, referral_code, commission_rate').eq('id', user.id).single(),
    supabase.from('view_parceiro_header').select('*').eq('id', user.id).single(),
    supabase.from('view_parceiro_resumo_cards').select('*').eq('id_parceiro_user', user.id),
    supabase.from('view_parceiro_lista_indicados').select('*').eq('id_parceiro_user', user.id)
  ]);

  return {
    error: null,
    data: {
      userCreatedAt: user.created_at,
      userData: userDataResult.data,
      header: headerResult.data,
      resumo: resumoResult.data || [],
      lista: listaResult.data || []
    }
  };
}
