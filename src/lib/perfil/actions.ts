"use server";

import { createClient } from "@supabase/supabase-js";
import { createClient as createSupabaseServerClient } from "@/lib/supabaseServer";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getProfileCompanyAction(userId: string) {
  // Queries public.company using the user's ID as fallback or checking if it exists
  const { data: companyData } = await supabaseAdmin
    .from("company")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  return companyData?.id ?? userId;
}

export async function getUserProfileAction() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Não autenticado", data: null };
  }

  // Busca dados de perfil do usuário
  const { data: profile, error: dbError } = await supabase
    .from("usuarios")
    .select("id, nome_completo, telefone, email, logo_url, tipo, empresa, cpf, PIX")
    .eq("id", user.id)
    .single();

  if (dbError) {
    return { error: dbError.message, data: null };
  }

  // Busca status de assinatura da view verificar_status_usuario
  const { data: statusData } = await supabase
    .from("verificar_status_usuario")
    .select("status_code, dias_restantes")
    .single();

  // Converter logo_url para URL Pública se necessário
  let logoUrl = profile.logo_url;
  if (logoUrl && !logoUrl.startsWith("http")) {
    const { data } = supabase.storage.from("logoEmpresa").getPublicUrl(logoUrl);
    logoUrl = data.publicUrl;
  }

  return {
    error: null,
    data: {
      profile: {
        ...profile,
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


