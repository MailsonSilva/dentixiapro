import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// --- HELPERS ---

async function verifyStripeSignature(secret: string, signatureHeader: string, body: string) {
  const parts = signatureHeader.split(',');
  const timestamp = parts.find(p => p.startsWith('t='))?.split('=')[1];
  const signature = parts.find(p => p.startsWith('v1='))?.split('=')[1];

  if (!timestamp || !signature) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const signedPayload = encoder.encode(`${timestamp}.${body}`);
  const signatureBytes = new Uint8Array(
    signature.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
  );

  return await crypto.subtle.verify("HMAC", key, signatureBytes, signedPayload);
}

async function stripeFetch(endpoint: string) {
  try {
    const response = await fetch(`https://api.stripe.com/v1${endpoint}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${Deno.env.get("STRIPE_SECRET_KEY")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    if (!response.ok) {
        const txt = await response.text();
        console.error(`🚨 Erro API Stripe ${endpoint}: ${response.status} | ${txt}`);
        return null;
    }
    return await response.json();
  } catch (error) {
    console.error(`Erro Fetch:`, error);
    return null;
  }
}

// Helper para datas do Stripe (Unix Timestamp -> ISO String)
const safeDate = (timestamp: any) => {
  if (!timestamp || isNaN(timestamp)) return null;
  return new Date(timestamp * 1000).toISOString();
};

// --- SERVIDOR ---

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const signature = req.headers.get("Stripe-Signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SIGNING_SECRET");
  const body = await req.text();

  if (!signature || !webhookSecret) return new Response("Erro assinatura", { status: 400 });

  const isValid = await verifyStripeSignature(webhookSecret, signature, body);
  if (!isValid) return new Response("Invalid Signature", { status: 400 });

  const event = JSON.parse(body);
  console.log(`🔔 Evento recebido: ${event.type}`);

  try {
    switch (event.type) {
      // --- PRODUTOS E PREÇOS ---
      case "product.created":
      case "product.updated":
        await upsertProduct(supabase, event.data.object);
        break;
      case "price.created":
      case "price.updated":
        await upsertPrice(supabase, event.data.object);
        break;

      // --- ASSINATURAS ---
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await manageSubscription(supabase, event.data.object);
        break;

      case "checkout.session.completed":
        const session = event.data.object;
        if (session.mode === "subscription") {
            const customerId = session.customer;
            const companyId = session.metadata?.company_id;
            
            if (customerId && companyId) {
                // 1. Garante que a company existe antes de salvar o customer (evita FK constraint violation)
                await supabase.from("company").upsert({
                    id: companyId,
                    name: `Empresa ${companyId.substring(0, 8)}`,
                    active: true,
                }, { onConflict: 'id' });

                // 2. Salva o vínculo de Stripe Customer ID com a Empresa no Supabase
                const { error: custError } = await supabase.from("customers").upsert({
                    stripe_customer_id: customerId,
                    company_id: companyId
                }, { onConflict: 'company_id' });
                if (custError) {
                    console.error(`❌ Erro ao associar customer e company no Supabase:`, custError.message);
                } else {
                    console.log(`✅ Customer ${customerId} associado à empresa ${companyId}`);
                }
            }

            let subId = typeof session.subscription === 'object' ? session.subscription?.id : session.subscription;
            if (subId) {
                const subData = await stripeFetch(`/subscriptions/${subId}`);
                if (subData) {
                    if (!subData.metadata) subData.metadata = {};
                    if (!subData.metadata.company_id && companyId) {
                        subData.metadata.company_id = companyId;
                    }
                    await manageSubscription(supabase, subData);
                }
            }
        }
        break;

      case "invoice.payment_succeeded":
        console.log(`✅ Pagamento de fatura processado no Stripe: ${event.data.object?.id}`);
        break;
    }
  } catch (error: any) {
    console.error(`❌ Erro Lógico no Switch: ${error.message}`);
    return new Response(JSON.stringify({ error: error.message }), { status: 200, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

// --- FUNÇÕES AUXILIARES ---

// 1. Salvar Produto
async function upsertProduct(supabase: any, product: any) {
  const { error } = await supabase.from("products").upsert({
    id: product.id,
    active: product.active,
    name: product.name,
    description: product.description,
    image: product.images?.[0] ?? null,
    metadata: product.metadata,
  });
  if (error) console.error("Erro ao salvar produto:", error.message);
  else console.log(`📦 Produto salvo: ${product.name}`);
}

// 2. Salvar Preço
async function upsertPrice(supabase: any, price: any) {
  const { error } = await supabase.from("prices").upsert({
    id: price.id,
    product_id: typeof price.product === 'string' ? price.product : price.product?.id,
    active: price.active,
    currency: price.currency,
    description: price.nickname,
    type: price.type,
    unit_amount: price.unit_amount,
    interval: price.recurring?.interval,
    interval_count: price.recurring?.interval_count,
    trial_period_days: price.recurring?.trial_period_days,
    metadata: price.metadata,
  });
  if (error) console.error("Erro ao salvar preço:", error.message);
  else console.log(`💲 Preço salvo: ${price.unit_amount}`);
}

// 3. Assinaturas
async function manageSubscription(supabase: any, subscription: any) {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
  
  // Tenta achar o company_id de duas formas:
  // A. Pelo cadastro do Customer (Tabela customers)
  const { data: customerData } = await supabase.from("customers").select("company_id").eq("stripe_customer_id", customerId).maybeSingle();
  
  // B. Pelos metadados da própria assinatura (caso venha do checkout session)
  const companyIdFinal = customerData?.company_id || subscription.metadata?.company_id;

  if (!companyIdFinal) {
      console.error(`❌ Erro: Assinatura ${subscription.id} sem company_id vinculado.`);
      return;
  }

  const now = new Date().toISOString();

  // 1. Garante que a company existe via upsert
  await supabase.from("company").upsert({
      id: companyIdFinal,
      name: `Empresa ${companyIdFinal.substring(0, 8)}`,
      active: true,
  }, { onConflict: 'id' });

  // 2. Garante o registro na tabela customers (evita tabela vazia)
  if (customerId) {
      await supabase.from("customers").upsert({
          company_id: companyIdFinal,
          stripe_customer_id: customerId,
      }, { onConflict: 'company_id' });
  }

  // 3. Garante o vínculo na tabela user_company com role padrão 'user' (não-admin)
  const { data: ucExists } = await supabase.from("user_company").select("id").eq("company_id", companyIdFinal).maybeSingle();
  if (!ucExists) {
      const { error: ucErr } = await supabase.from("user_company").upsert({
          user_id: companyIdFinal,
          company_id: companyIdFinal,
          role: 'user',
          active: true,
      }, { onConflict: 'user_id,company_id' });
      if (ucErr) {
          console.warn(`⚠️ Aviso ao vincular user_company:`, ucErr.message);
      }
  }

  // 4. Mapeamento correto para persistir a assinatura
  const { error } = await supabase.from("subscriptions").upsert({
      id: subscription.id,
      company_id: companyIdFinal,
      metadata: subscription.metadata ?? {},
      status: subscription.status,
      price_id: subscription.items?.data?.[0]?.price?.id,
      quantity: subscription.items?.data?.[0]?.quantity,
      cancel_at_period_end: subscription.cancel_at_period_end ?? false,
      
      // Datas convertidas com segurança
      created: safeDate(subscription.created) ?? now,
      current_period_start: safeDate(subscription.current_period_start) ?? now,
      current_period_end: safeDate(subscription.current_period_end) ?? now,
      ended_at: safeDate(subscription.ended_at),
      cancel_at: safeDate(subscription.cancel_at),
      canceled_at: safeDate(subscription.canceled_at),
      trial_start: safeDate(subscription.trial_start),
      trial_end: safeDate(subscription.trial_end),
  }, { onConflict: 'id' });

  if (error) {
      console.error(`❌ Erro ao salvar subscription no Supabase:`, error.message);
  } else {
      console.log(`✅ Assinatura ${subscription.id} salva com sucesso para empresa: ${companyIdFinal}`);
  }
}
