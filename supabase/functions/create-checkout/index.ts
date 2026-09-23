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

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Validação opcional de JWT se fornecido no cabeçalho
    const authHeader = req.headers.get("Authorization");
    let authenticatedUser: any = null;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "").trim();
      if (token && token !== Deno.env.get("SUPABASE_ANON_KEY")) {
        const { data: { user } } = await supabase.auth.getUser(token);
        authenticatedUser = user;
      }
    }

    const payload = await req.json();
    const {
      price_id,
      email,
      company_id,
      return_url,
      name,
      cpf,
      phone,
      address,
    } = payload;

    if (!price_id || !company_id) {
      return new Response(
        JSON.stringify({ error: "price_id e company_id são obrigatórios." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Se o usuário estiver autenticado, garante que não está usando company_id de terceiro
    if (authenticatedUser) {
      const isDirectOwner = authenticatedUser.id === company_id;
      if (!isDirectOwner) {
        const { data: ucLink } = await supabase
          .from("user_company")
          .select("id")
          .eq("user_id", authenticatedUser.id)
          .eq("company_id", company_id)
          .maybeSingle();

        if (!ucLink) {
          // Checar se é admin
          const { data: uData } = await supabase
            .from("usuarios")
            .select("tipo")
            .eq("id", authenticatedUser.id)
            .maybeSingle();

          const tipo = (uData?.tipo || "").toLowerCase();
          if (tipo !== "admin" && tipo !== "super_admin") {
            return new Response(
              JSON.stringify({ error: "Acesso proibido: identificador de empresa incompatível com o usuário autenticado." }),
              { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      }
    }

    // 1. Garante que a company existe no Supabase antes de qualquer operação
    await supabase.from("company").upsert({
      id: company_id,
      name: name || `Empresa ${company_id.substring(0, 8)}`,
      active: true,
    }, { onConflict: "id" });

    // 2. Buscar usuário para verificar se ainda está no período de teste (Regra 3)
    let trialEndTimestamp: number | undefined = undefined;
    const { data: usuarioRecord } = await supabase
      .from("usuarios")
      .select("trial_ends_at")
      .eq("id", company_id)
      .maybeSingle();

    if (usuarioRecord?.trial_ends_at) {
      const trialEndsDate = new Date(usuarioRecord.trial_ends_at);
      const now = new Date();
      const diffSeconds = Math.floor((trialEndsDate.getTime() - now.getTime()) / 1000);

      // Stripe exige que trial_end seja no mínimo 48 horas (172800 segundos) à frente no futuro
      if (diffSeconds >= 172800) {
        trialEndTimestamp = Math.floor(trialEndsDate.getTime() / 1000);
        console.log(`⏳ Usuário com teste ativo até ${trialEndsDate.toISOString()} (${Math.ceil(diffSeconds / 86400)} dias restantes). Adicionando trial_end no Stripe.`);
      }
    }

    // 3. Verificar se a empresa já possui um stripe_customer_id salvo
    let customerId: string | null = null;
    const { data: customerRecord } = await supabase
      .from("customers")
      .select("stripe_customer_id")
      .eq("company_id", company_id)
      .maybeSingle();

    if (customerRecord?.stripe_customer_id) {
      customerId = customerRecord.stripe_customer_id;
    } else {
      // 4. Buscar por email no Stripe antes de criar um novo
      if (email) {
        const existingStripeCustomers = await stripe.customers.list({
          email: email,
          limit: 1,
        });

        if (existingStripeCustomers.data.length > 0) {
          customerId = existingStripeCustomers.data[0].id;
        }
      }

      // 5. Se não existir, criar novo Customer no Stripe
      if (!customerId) {
        const newCustomer = await stripe.customers.create({
          email: email || undefined,
          name: name || undefined,
          phone: phone || undefined,
          metadata: {
            company_id,
            cpf: cpf || "",
          },
          address: address
            ? {
                line1: address.line1 || "",
                city: address.city || "",
                postal_code: address.postal_code || "",
                state: address.state || "",
                country: "BR",
              }
            : undefined,
        });
        customerId = newCustomer.id;
      }

      // 6. Salvar vínculo da empresa com o Stripe Customer
      if (customerId) {
        await supabase.from("customers").upsert({
          company_id,
          stripe_customer_id: customerId,
        }, { onConflict: "company_id" });
      }
    }

    const metadataPayload = {
      company_id,
    };

    // 7. Criar a sessão de Checkout do Stripe
    const sessionParams: any = {
      customer: customerId || undefined,
      customer_email: customerId ? undefined : email,
      payment_method_types: ["card"],
      line_items: [
        {
          price: price_id,
          quantity: 1,
        },
      ],
      mode: "subscription",
      allow_promotion_codes: true,
      success_url: `${return_url || "https://app.dentixia.com/perfil"}?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${return_url || "https://app.dentixia.com/planos"}?canceled=true`,
      subscription_data: {
        metadata: metadataPayload,
        ...(trialEndTimestamp ? { trial_end: trialEndTimestamp } : {}),
      },
      metadata: metadataPayload,
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Erro ao criar sessão de checkout:", err.message);
    return new Response(
      JSON.stringify({ error: err.message || "Erro interno ao processar checkout." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
