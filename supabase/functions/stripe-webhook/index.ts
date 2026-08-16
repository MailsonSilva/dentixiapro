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
            
            // 1. Salva o vínculo de Stripe Customer ID com a Empresa no Supabase
            if (customerId && companyId) {
                const { error: custError } = await supabase.from("customers").upsert({
                    stripe_customer_id: customerId,
                    company_id: companyId
                });
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
                    // 2. Garante a propagação do company_id da sessão para a assinatura
                    if (!subData.metadata) subData.metadata = {};
                    if (!subData.metadata.company_id && companyId) {
                        subData.metadata.company_id = companyId;
                    }
                    await manageSubscription(supabase, subData);
                }
            }
        }
        break;

      // --- COMISSÕES ---
      case "invoice.payment_succeeded":
        const invoice = event.data.object;
        // Verifica se é maior que 0 para evitar processar trials gratuitos como venda
        if (invoice.amount_paid > 0) {
          await processarComissao(supabase, invoice);
        } else {
            console.log("ℹ️ Pagamento R$ 0,00 (Trial ou 100% off). Ignorado para comissão.");
        }
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

  // Mapeamento correto para evitar erros de tipo
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
  });

  if (error) {
      console.error(`❌ Erro ao salvar subscription no Supabase:`, error.message);
  } else {
      console.log(`✅ Assinatura salva com sucesso para empresa: ${companyIdFinal}`);
  }
}

// 4. Comissões
async function processarComissao(supabase: any, invoice: any) {
    console.log(`🔍 [COMISSÃO] Analisando Fatura: ${invoice.id}`);

    let referralCode = null;
    let companyIdDoCliente = null;
    let subMetadata = null;

    let subId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;

    if (!subId && invoice.lines?.data) {
        const lineItem = invoice.lines.data.find((l: any) => l.subscription);
        if (lineItem) subId = typeof lineItem.subscription === 'string' ? lineItem.subscription : lineItem.subscription.id;
    }

    if (subId) {
        const sub = await stripeFetch(`/subscriptions/${subId}`);
        if (sub) subMetadata = sub.metadata;
    } 
    
    if (!subMetadata) {
        const custId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
        const subsList = await stripeFetch(`/subscriptions?customer=${custId}&limit=1`);
        
        if (subsList && subsList.data && subsList.data.length > 0) {
            subMetadata = subsList.data[0].metadata;
        }
    }

    if (subMetadata) {
        if (subMetadata.referred_by) referralCode = subMetadata.referred_by;
        else if (subMetadata.referral_code) referralCode = subMetadata.referral_code;
        if (subMetadata.company_id) companyIdDoCliente = subMetadata.company_id;
    }

    if (!referralCode) {
        const custId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
        const customer = await stripeFetch(`/customers/${custId}`);
        if (customer && customer.metadata?.referred_by) {
             referralCode = customer.metadata.referred_by;
             if (!companyIdDoCliente) companyIdDoCliente = customer.metadata?.company_id;
        }
    }

    if (!referralCode) {
        console.log("🛑 IMPOSSÍVEL PROCESSAR: Código 'referred_by' não encontrado.");
        return;
    }

    const { data: parceiro, error } = await supabase
      .from("user_company")
      .select("company_id, commission_model, commission_rate")
      .eq("referral_code", referralCode)
      .maybeSingle();

    if (error || !parceiro) {
      console.log(`❌ Parceiro não existe: ${referralCode}`);
      return;
    }

    let devePagar = false;
    let motivo = "";

    if (parceiro.commission_model === 'recurring') {
      devePagar = true;
      motivo = "Recorrente";
    } else {
      let jaRecebeu = false;
      if (companyIdDoCliente) {
         const { count } = await supabase
            .from("comissoes")
            .select("*", { count: 'exact', head: true })
            .eq("indicado_company_id", companyIdDoCliente)
            .eq("parceiro_id", parceiro.company_id);
         if (count && count > 0) jaRecebeu = true;
      }

      if (!jaRecebeu) {
          devePagar = true;
          motivo = "One-Time (1º Pagamento)";
      } else {
          motivo = "One-Time (Duplicado)";
      }
    }

    console.log(`⚖️ Decisão: ${devePagar ? "APROVADO" : "RECUSADO"} | ${motivo}`);

    if (devePagar) {
      const valorVendaReal = invoice.amount_paid / 100;
      const taxa = parceiro.commission_rate || 10;
      const valorComissao = valorVendaReal * (taxa / 100);

      const { error: insertError } = await supabase.from("comissoes").insert({
        parceiro_id: parceiro.company_id,
        indicado_company_id: companyIdDoCliente,
        valor_venda: valorVendaReal,
        valor_comissao: valorComissao,
        percentual_aplicado: taxa,
        tipo_comissao: parceiro.commission_model,
        status: 'pendente',
        fatura_stripe_id: invoice.id
      });

      if (insertError) console.error("🚨 Erro SQL:", insertError.message);
      else console.log(`🎉 SUCESSO! Comissão R$ ${valorComissao} gravada.`);
    }
}
