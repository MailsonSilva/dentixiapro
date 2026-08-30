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
    const { data: ucData } = await admin
      .from("user_company")
      .select("company_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (ucData?.company_id) return ucData.company_id;

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

  // Metadados do auth (fallback para usuários OAuth)
  const authMeta = user.user_metadata ?? {};
  const authName = authMeta.full_name || authMeta.name || null;
  const authAvatar = authMeta.avatar_url || authMeta.picture || null;
  const authPhone = authMeta.whatsapp || authMeta.telefone || authMeta.phone || null;

  // Executar consultas simultaneamente
  const [profileRes, statusRes, ucRes] = await Promise.all([
    supabase
      .from("usuarios")
      .select("id, nome_completo, telefone, email, logo_url, tipo, empresa, cpf, PIX, check_video")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("verificar_status_usuario")
      .select("status_code, dias_restantes")
      .maybeSingle(),
    supabase
      .from("user_company")
      .select("company_id, role")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  let profile: any = profileRes.data;

  // Fallback se a coluna check_video não existir na tabela usuarios
  if (profileRes.error) {
    const { data: fallbackProfile, error: fallbackError } = await supabase
      .from("usuarios")
      .select("id, nome_completo, telefone, email, logo_url, tipo, empresa, cpf, PIX")
      .eq("id", user.id)
      .maybeSingle();

    if (fallbackError) {
      return { error: fallbackError.message, data: null };
    }
    profile = fallbackProfile;
  }

  const statusData = statusRes.data;
  const userCompanyId = ucRes.data?.company_id ?? user.id;

  // Resolver role do usuário (usuarios.tipo ou user_company.role)
  const uTipo = (profile?.tipo || "").toLowerCase();
  const ucRole = (ucRes.data?.role || "").toLowerCase();
  const userRole = (uTipo === 'admin' || uTipo === 'super_admin') 
    ? uTipo 
    : (ucRole === 'admin' || ucRole === 'super_admin' ? ucRole : (ucRole || uTipo || null));

  // Busca assinatura em paralelo com fallback duplo (por company_id e por user.id)
  let subData: any = null;
  const { data: subByCompany } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("company_id", userCompanyId)
    .neq("status", "canceled")
    .maybeSingle();

  if (subByCompany) {
    subData = subByCompany;
  } else if (userCompanyId !== user.id) {
    const { data: subByUser } = await supabase
      .from("subscriptions")
      .select("status")
      .eq("company_id", user.id)
      .neq("status", "canceled")
      .maybeSingle();
    subData = subByUser;
  }

  const temAssinatura = !!subData && (subData.status === "active" || subData.status === "trialing");

  // Resolver foto de perfil / logo
  let finalLogoUrl = profile?.logo_url && profile.logo_url.trim() !== "" ? profile.logo_url : null;
  if (finalLogoUrl && !finalLogoUrl.startsWith("http")) {
    const { data } = supabase.storage.from("logoEmpresa").getPublicUrl(finalLogoUrl);
    finalLogoUrl = data.publicUrl;
  }
  if (!finalLogoUrl && authAvatar) {
    finalLogoUrl = authAvatar;
  }

  const finalNome = profile?.nome_completo || authName || user.email?.split("@")[0] || "Dentista";
  const finalEmail = profile?.email || user.email || "";
  const finalTelefone = profile?.telefone || authPhone || "";

  // Auto-sync (fire-and-forget) — apenas se perfil for nulo
  if (!profile) {
    supabase.from("usuarios").upsert({
      id: user.id,
      email: finalEmail,
      nome_completo: finalNome,
      telefone: finalTelefone || null,
      logo_url: finalLogoUrl || null,
    }, { onConflict: "id" }).then(() => {});
  }

  return {
    error: null,
    data: {
      profile: {
        ...(profile ?? {}),
        id: user.id,
        email: finalEmail,
        nome_completo: finalNome,
        telefone: finalTelefone,
        logo_url: finalLogoUrl,
      },
      status: {
        status_code: statusData?.status_code ?? null,
        dias_restantes: statusData?.dias_restantes ?? null,
        tem_assinatura: temAssinatura,
      },
      userRole,
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

  // Atualiza metadata no Auth
  await supabase.auth.updateUser({
    data: {
      full_name: payload.nome_completo,
      whatsapp: payload.telefone,
      telefone: payload.telefone,
      phone: payload.telefone,
    }
  });

  const { error } = await supabase
    .from("usuarios")
    .upsert({
      id: user.id,
      email: user.email || "",
      nome_completo: payload.nome_completo,
      telefone: payload.telefone,
      empresa: payload.empresa,
      cpf: payload.cpf,
      PIX: payload.PIX,
    }, { onConflict: "id" });

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

  // Validação e sanitização estrita da extensão do arquivo
  const allowedExtensions = ["png", "jpg", "jpeg", "webp", "gif"];
  const sanitizedExt = (fileExt || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  if (!sanitizedExt || !allowedExtensions.includes(sanitizedExt)) {
    return { error: "Extensão de imagem inválida. Permitidos: PNG, JPG, JPEG, WEBP, GIF.", url: null };
  }

  const allowedMimeTypes = ["image/png", "image/jpeg", "image/webp", "image/gif"];
  const finalMimeType = allowedMimeTypes.includes(mimeType) ? mimeType : `image/${sanitizedExt === "jpg" ? "jpeg" : sanitizedExt}`;

  const path = `${user.id}.${sanitizedExt}`;
  const buffer = Buffer.from(base64Data, "base64");

  const { error: uploadError } = await supabase.storage
    .from("logoEmpresa")
    .upload(path, buffer, {
      upsert: true,
      contentType: finalMimeType,
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


