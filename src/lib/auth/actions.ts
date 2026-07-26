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
    // 1. Tipo, telefone e check_video do usuário
    const { data: usuarioData } = await supabase
      .from('usuarios')
      .select('tipo, telefone, check_video')
      .eq('id', user.id)
      .maybeSingle();

    let finalTipo: 'comum' | 'parceiro' = (usuarioData?.tipo as 'comum' | 'parceiro') || 'comum';

    const metaType = user.user_metadata?.tipo;
    if (metaType === 'parceiro' && finalTipo !== 'parceiro') {
      await supabase.from('usuarios').update({ tipo: 'parceiro' }).eq('id', user.id);
      finalTipo = 'parceiro';
    }

    const userTelefone = usuarioData?.telefone || user.user_metadata?.whatsapp || user.user_metadata?.telefone || user.user_metadata?.phone || null;
    const checkVideo = usuarioData?.check_video ?? user.user_metadata?.check_video ?? false;

    // 2. Se for parceiro, não tem role nem expirou trial
    if (finalTipo === 'parceiro') {
      return {
        error: null,
        data: {
          user,
          userType: 'parceiro' as const,
          userRole: null as any,
          trialExpired: false,
          telefone: userTelefone,
          checkVideo
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

    // Admin e super_admin NUNCA são bloqueados pelo trial
    if (role === 'admin' || role === 'super_admin') {
      return {
        error: null,
        data: {
          user,
          userType: 'comum' as const,
          userRole: role,
          trialExpired: false,
          telefone: userTelefone,
          checkVideo
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
        trialExpired,
        telefone: userTelefone,
        checkVideo
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

export async function saveUserPhoneAction(phone: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Não autenticado" };

  // 1. Atualiza metadata no Supabase Auth
  await supabase.auth.updateUser({
    data: { whatsapp: phone, telefone: phone, phone }
  });

  // 2. Tenta update no banco public.usuarios
  const { data: updateData, error: updateError } = await supabase
    .from("usuarios")
    .update({ telefone: phone })
    .eq("id", user.id)
    .select();

  if (updateError) return { error: updateError.message };

  // 3. Se nenhuma linha foi afetada, faz upsert garantindo criação
  if (!updateData || updateData.length === 0) {
    const { error: upsertError } = await supabase
      .from("usuarios")
      .upsert({
        id: user.id,
        email: user.email || "",
        telefone: phone,
        nome_completo: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Usuário",
        tipo: "comum",
        trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }, { onConflict: "id" });

    if (upsertError) return { error: upsertError.message };
  }

  return { error: null };
}

export async function setCheckVideoAction(checkVideo: boolean) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Não autenticado" };

  await supabase.auth.updateUser({
    data: { check_video: checkVideo }
  });

  const { error } = await supabase
    .from("usuarios")
    .update({ check_video: checkVideo })
    .eq("id", user.id);

  if (error) return { error: error.message };
  return { error: null };
}

