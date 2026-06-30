"use server";

import { createClient } from "@supabase/supabase-js";
import { createClient as createSupabaseServerClient } from "@/lib/supabaseServer";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseAdminInstance: ReturnType<typeof createClient> | null = null;

function getSupabaseAdmin() {
  if (!supabaseAdminInstance) {
    if (!supabaseUrl || !supabaseServiceKey) {
      // Em vez de lançar erro, retorna null para que a função chamadora faça fallback
      return null;
    }
    supabaseAdminInstance = createClient(supabaseUrl, supabaseServiceKey);
  }
  return supabaseAdminInstance as any;
}

export async function getProfileCompanyAction(userId: string) {
  const admin = getSupabaseAdmin();
  // Se a service role key não estiver configurada, retorna userId como fallback silencioso
  if (!admin) return userId;

  try {
    const { data: companyData } = await admin
      .from("company")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    return companyData?.id ?? userId;
  } catch {
    return userId;
  }
}

export async function getUserProfileAction() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Não autenticado", data: null };
  }

  // Metadados do auth (fallback para usuários OAuth - Google retorna full_name, picture, etc.)
  const authMeta = user.user_metadata ?? {};
  const authName = authMeta.full_name || authMeta.name || null;
  const authAvatar = authMeta.avatar_url || authMeta.picture || null;

  // Busca dados de perfil do usuário (maybeSingle evita crash se perfil ainda não existe)
  const { data: profile, error: dbError } = await supabase
    .from("usuarios")
    .select("id, nome_completo, telefone, email, logo_url, tipo, empresa, cpf, PIX")
    .eq("id", user.id)
    .maybeSingle();

  if (dbError) {
    return { error: dbError.message, data: null };
  }

  // Busca status de assinatura da view verificar_status_usuario (maybeSingle evita crash se não há rows)
  const { data: statusData } = await supabase
    .from("verificar_status_usuario")
    .select("status_code, dias_restantes")
    .maybeSingle();

  // Converter logo_url para URL Pública se necessário
  let logoUrl = profile?.logo_url || null;
  if (logoUrl && !logoUrl.startsWith("http")) {
    const { data } = supabase.storage.from("logoEmpresa").getPublicUrl(logoUrl);
    logoUrl = data.publicUrl;
  }
  // Fallback: usa avatar do Google/OAuth se não tiver logo no banco
  if (!logoUrl && authAvatar) {
    logoUrl = authAvatar;
  }

  // Fallback de nome: usa metadados do auth se nome do banco estiver vazio
  const nomeCompleto = profile?.nome_completo || authName || user.email?.split("@")[0] || "Dentista";

  return {
    error: null,
    data: {
      profile: {
        ...(profile ?? {}),
        id: user.id,
        email: profile?.email || user.email || "",
        nome_completo: nomeCompleto,
        logo_url: logoUrl,
      },
      status: {
        status_code: statusData?.status_code ?? null,
        dias_restantes: statusData?.dias_restantes ?? null,
      }
    }
  };
}

export async function updateUserProfileAction(payload: {
  nome_completo: string;
  telefone: string;
  empresa: string;
  cpf: string;
  PIX: string;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Não autenticado" };
  }

  const { error } = await supabase
    .from("usuarios")
    .update({
      nome_completo: payload.nome_completo,
      telefone: payload.telefone,
      empresa: payload.empresa,
      cpf: payload.cpf,
      PIX: payload.PIX,
    })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

export async function updateUserLogoAction(logoUrl: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Não autenticado" };
  }

  const { error } = await supabase
    .from("usuarios")
    .update({ logo_url: logoUrl })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

export async function uploadUserLogoAction(base64Data: string, mimeType: string, fileExt: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Não autenticado", url: null };
  }

  const path = `${user.id}.${fileExt}`;
  const buffer = Buffer.from(base64Data, "base64");

  const { error: uploadError } = await supabase.storage
    .from("logoEmpresa")
    .upload(path, buffer, {
      upsert: true,
      contentType: mimeType,
      cacheControl: '0'
    });

  if (uploadError) {
    return { error: uploadError.message, url: null };
  }

  const { data: publicUrlResult } = supabase.storage.from("logoEmpresa").getPublicUrl(path);

  // Também atualiza o profile
  const { error: dbError } = await supabase
    .from("usuarios")
    .update({ logo_url: publicUrlResult.publicUrl })
    .eq("id", user.id);

  if (dbError) {
    return { error: dbError.message, url: null };
  }

  return { error: null, url: publicUrlResult.publicUrl };
}


