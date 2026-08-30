import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "npm:stripe@^14.25.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeKey || !supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Configuração do servidor incompleta (chaves ausentes)." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado: cabeçalho de autenticação ausente." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Validar autenticação do usuário chamador via JWT
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Não autorizado: token de autenticação inválido ou expirado." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { company_id, return_url } = await req.json();

    if (!company_id) {
      return new Response(
        JSON.stringify({ error: "company_id é obrigatório." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Prevenção de IDOR: Verificar se o usuário autenticado é proprietário da company ou admin
    const isDirectOwner = user.id === company_id;
    let hasCompanyAccess = isDirectOwner;

    if (!hasCompanyAccess) {
      // Verificar vínculo na tabela user_company
      const { data: ucData } = await supabase
        .from("user_company")
        .select("id, role")
        .eq("user_id", user.id)
        .eq("company_id", company_id)
        .maybeSingle();

      if (ucData) {
        hasCompanyAccess = true;
      }
    }

    if (!hasCompanyAccess) {
      // Fallback: verificar se é admin do sistema
      const { data: userData } = await supabase
        .from("usuarios")
        .select("tipo")
        .eq("id", user.id)
        .maybeSingle();

      const userTipo = (userData?.tipo || "").toLowerCase();
      if (userTipo === "admin" || userTipo === "super_admin") {
        hasCompanyAccess = true;
      }
    }

    if (!hasCompanyAccess) {
      return new Response(
        JSON.stringify({ error: "Acesso proibido: você não tem permissão para gerenciar o faturamento desta empresa." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    // 3. Buscar o stripe_customer_id da empresa
    const { data: customerData, error: custError } = await supabase
      .from("customers")
      .select("stripe_customer_id")
      .eq("company_id", company_id)
      .maybeSingle();

    if (custError || !customerData?.stripe_customer_id) {
      return new Response(
        JSON.stringify({ error: "Cliente Stripe não encontrado para esta empresa." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Criar a sessão do portal do cliente no Stripe
    const session = await stripe.billingPortal.sessions.create({
      customer: customerData.stripe_customer_id,
      return_url: return_url || "https://app.dentixia.com/perfil",
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Erro ao criar sessão do portal:", err.message);
    return new Response(
      JSON.stringify({ error: err.message || "Erro interno ao processar portal." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
