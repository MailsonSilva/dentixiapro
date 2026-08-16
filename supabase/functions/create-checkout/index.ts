import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";

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

    const payload = await req.json();
    const {
      price_id,
      email,
      company_id,
      return_url,
      name,
      cpf,
      phone,
      referral_code,
      address,
    } = payload;

    if (!price_id || !company_id) {
      return new Response(
        JSON.stringify({ error: "price_id e company_id são obrigatórios." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Verificar se a empresa já possui um stripe_customer_id salvo
    let customerId: string | null = null;
    const { data: customerRecord } = await supabase
      .from("customers")
      .select("stripe_customer_id")
      .eq("company_id", company_id)
      .maybeSingle();

    if (customerRecord?.stripe_customer_id) {
      customerId = customerRecord.stripe_customer_id;
    } else {
      // 2. Buscar por email no Stripe antes de criar um novo
      if (email) {
        const existingStripeCustomers = await stripe.customers.list({
          email: email,
          limit: 1,
        });

        if (existingStripeCustomers.data.length > 0) {
          customerId = existingStripeCustomers.data[0].id;
        }
      }

      // 3. Se não existir, criar novo Customer no Stripe
      if (!customerId) {
        const newCustomer = await stripe.customers.create({
          email: email || undefined,
          name: name || undefined,
          phone: phone || undefined,
          metadata: {
            company_id,
            cpf: cpf || "",
            referral_code: referral_code || "",
            referred_by: referral_code || "",
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

      // 4. Salvar vínculo da empresa com o Stripe Customer
      if (customerId) {
        await supabase.from("customers").upsert({
          company_id,
          stripe_customer_id: customerId,
        });
      }
    }

    const metadataPayload = {
      company_id,
      referral_code: referral_code || "",
      referred_by: referral_code || "",
    };

    // 5. Criar a sessão de Checkout do Stripe
    const session = await stripe.checkout.sessions.create({
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
      },
      metadata: metadataPayload,
    });

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
