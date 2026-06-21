"use server";

import { createClient } from "@/lib/supabaseServer";

export async function getCurrentUserAction() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return { error: error?.message || "Não autenticado", user: null };
  }
  return { error: null, user };
}

export async function signInWithPasswordAction(email: string, password: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    return { error: error.message, data: null };
  }
  return { error: null, data };
}

export async function signInWithGoogleAction(origin: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/api/auth/callback`,
    },
  });
  if (error) {
    return { error: error.message, data: null };
  }
  return { error: null, data };
}

export async function signUpAction(payload: {
  email: string;
  password: string;
  optionsData: {
    nome_completo: string;
    full_name?: string;
    whatsapp: string;
    telefone?: string;
    user_referredbycode: string | null;
    tipo: "comum" | "parceiro";
    commission_rate?: number;
  };
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      data: payload.optionsData,
    },
  });

  if (error) {
    return { error: error.message, data: null };
  }

  // Se registrou com sucesso e é usuário comum/parceiro, insere o consentimento
  if (data?.user) {
    const { error: consentError } = await supabase.from("consentimentos").insert({
      user_id: data.user.id,
      aceitou_em: new Date().toISOString(),
      versao_politica: "1.0",
    });
    if (consentError) {
      console.error("Erro ao salvar consentimento:", consentError);
    }
  }

  return { error: null, data };
}

export async function signOutAction() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    return { error: error.message };
  }
  return { error: null };
}

export async function resetPasswordForEmailAction(email: string, origin: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/redefinir-senha`,
  });
  if (error) {
    return { error: error.message };
  }
  return { error: null };
}

export async function updateUserPasswordAction(password: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: error.message };
  }
  return { error: null };
}

export async function getClientLayoutDataAction() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      error: "Não autenticado",
      data: null
    };
  }

  try {
    // 1. Tipo do usuário
    const { data: usuarioData } = await supabase
      .from('usuarios')
      .select('tipo')
      .eq('id', user.id)
      .maybeSingle();

    let finalTipo: 'comum' | 'parceiro' = (usuarioData?.tipo as 'comum' | 'parceiro') || 'comum';

    const metaType = user.user_metadata?.tipo;
    if (metaType === 'parceiro' && finalTipo !== 'parceiro') {
      await supabase.from('usuarios').update({ tipo: 'parceiro' }).eq('id', user.id);
      finalTipo = 'parceiro';
    }

    // 2. Se for parceiro, não tem role nem expirou trial
    if (finalTipo === 'parceiro') {
      return {
        error: null,
        data: {
          user,
          userType: 'parceiro' as const,
          userRole: null as any,
          trialExpired: false
        }
      };
    }

    // 3. Se for comum, busca role
    const { data: ucData } = await supabase
      .from('user_company')
      .select('role')
      .eq('user_id', user.id)
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const role = ucData?.role as 'admin' | 'manager' | 'user' | 'super_admin' | null;

    if (role === 'admin') {
      return {
        error: null,
        data: {
          user,
          userType: 'comum' as const,
          userRole: role,
          trialExpired: false
        }
      };
    }

    // Verifica status do trial
    const { data: statusData } = await supabase
      .from('verificar_status_usuario')
      .select('status_code')
      .maybeSingle();

    const trialExpired = statusData ? statusData.status_code !== 3 : false;

    return {
      error: null,
      data: {
        user,
        userType: 'comum' as const,
        userRole: role,
        trialExpired
      }
    };
  } catch (err: any) {
    console.error('Erro na action getClientLayoutDataAction:', err);
    return {
      error: err.message || "Erro interno",
      data: null
    };
  }
}

