"use server";

import { createClient } from "@/lib/supabaseServer";

export async function getPlansAction() {
  const supabase = await createClient();
  const { data: priceRows, error } = await supabase
    .from("prices")
    .select("id, unit_amount, interval, currency, active, product_id, metadata, products(name, description, metadata)")
    .eq("active", true)
    .order("unit_amount", { ascending: true });

  if (error) {
    console.error("Erro ao buscar planos:", error);
    return { error: error.message, plans: [] };
  }

  const isStatusAtivo = (meta: any) => {
    if (!meta) return false;
    let obj = meta;
    if (typeof obj === "string") {
      try {
        obj = JSON.parse(obj);
      } catch {
        return false;
      }
    }
    const s = String(obj?.status || "").toLowerCase().trim();
    return s === "ativo" || s === "active";
  };

  // Filtra estritamente apenas produtos e preços com metadata.status = 'ativo'
  const activePrices = (priceRows as any[] || []).filter((p) => {
    const priceActive = isStatusAtivo(p.metadata);
    const productActive = isStatusAtivo(p.products?.metadata);
    return priceActive && productActive;
  });

  const mapped = activePrices.map((p) => ({
    id: p.id,
    unit_amount: p.unit_amount,
    interval: p.interval,
    currency: p.currency,
    active: p.active,
    product_name: p.products?.name ?? (p.interval === "year" ? "Plano Anual" : "Plano Mensal"),
    product_description: p.products?.description ?? null,
  }));

  return { error: null, plans: mapped };
}

export async function getPlanosUserDataAction() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Não autenticado", data: null };
  }

  // Busca dados do usuario
  const { data: u, error: uError } = await supabase
    .from("usuarios")
    .select("nome_completo,email,cpf,telefone,address,city,postal_code,state,id,referral_code,referred_by_code,trial_ends_at")
    .eq("id", user.id)
    .single();

  if (uError) {
    return { error: uError.message, data: null };
  }

  // Busca o company_id mais recente
  const { data: uc } = await supabase
    .from("user_company")
    .select("company_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    error: null,
    data: {
      ...u,
      company_id: uc?.company_id ?? user.id,
    }
  };
}

export async function createCheckoutSessionAction(payload: {
  price_id: string;
  email: string;
  company_id: string;
  return_url: string;
  name: string;
  cpf: string;
  address: {
    line1: string;
    city: string;
    postal_code: string;
    state: string;
  };
  phone: string;
  referral_code: string;
}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/create-checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${anonKey}`,
        apikey: anonKey,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { error: errText || "Erro ao criar sessão de pagamento.", url: null };
    }

    const json = await res.json();
    if (json?.url) {
      return { error: null, url: json.url };
    }
    return { error: "URL de checkout não retornada.", url: null };
  } catch (err: any) {
    return { error: err.message || "Erro de rede no servidor.", url: null };
  }
}
