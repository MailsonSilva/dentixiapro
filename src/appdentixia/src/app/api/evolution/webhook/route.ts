import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let body: any = null;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    
    if (!body) return NextResponse.json({ success: true });

    // 1. Verificamos se o evento é MESSAGES_UPSERT
    const event = body.event || body.type || body.body?.event;
    const instanceName = body.instance || body.body?.instance;

    if (event === "messages.upsert" || event === "MESSAGES_UPSERT" || body.data?.message) {
       console.log(`[▶️ WEBOOK RELAY INGRESS] Recebido evento da Instância: ${instanceName}`);
       try {
           const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
           
           if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
               console.warn("⚠️ ALERTA DE SEGURANÇA: Chave SUPABASE_SERVICE_ROLE_KEY está faltando no `.env.local`. O RLS bloqueará operações no background webhook server!");
           }

           const supabase = createClient(
             process.env.NEXT_PUBLIC_SUPABASE_URL!,
             supabaseAdminKey
           );

           console.log(`[🔍 Consultando BD] Verificando existência da Instância: ${instanceName}...`);
           const { data: channelData, error: channelErr } = await supabase
              .from("communication_channels")
              .select("id, company_id")
              .eq("identifier", instanceName)
              .single();
           
           if (channelErr || !channelData) {
               console.error(`[❌ Falha de Canal] Não achou no BD. Falha: ${channelErr?.message || 'Inexistente'}. Inserção DB Bypassada! (Continua Forward to N8N)...`);
           }

           if (channelData) {
               // Extraindo Domicílios da Mensagem
               const msgData = body.data || body.body?.data || body.message; // Adaptado pra diferentes configs do evolution n8n vs system
               
               if (msgData && msgData.key) {
                   const { remoteJid, fromMe } = msgData.key;
                   const senderPhone = remoteJid.split('@')[0].replace(/\D/g, ""); // Extrai DDD+Número
                   
                   const msgType = msgData.messageType || Object.keys(msgData.message || {})[0] || 'unknown';
                   let textContent = "Nova mensagem de mídia/outro";
                   
                   if (msgType === "conversation") textContent = msgData.message?.conversation || textContent;
                   if (msgType === "extendedTextMessage") textContent = msgData.message?.extendedTextMessage?.text || textContent;
                   if (msgType === "imageMessage") textContent = "📷 Imagem recebida: " + (msgData.message?.imageMessage?.caption || "");
                   if (msgType === "audioMessage") textContent = "🎤 Áudio recebido";
                   if (msgType === "documentWithCaptionMessage") textContent = "📄 Documento recebido";

                   console.log(`[💬 Processando DB] Identificado payload de texto de +${senderPhone}. Inserindo Contacts, Conversations...`);
                   let contactId = null;
                   const { data: contactExist, error: cErr } = await supabase
                       .from("contacts")
                       .select("id")
                       .eq("company_id", channelData.company_id)
                       .eq("phone", senderPhone)
                       .single();
                   
                   if (cErr && cErr.code !== 'PGRST116') {
                       console.error(`[❌ RLS/Acesso Negado em Contacts] ${cErr.message}`);
                   }

                   if (contactExist) {
                       contactId = contactExist.id;
                   } else {
                       const pushName = msgData.pushName || "Contato Novo";
                       const { data: newContact, error: insertCErr } = await supabase.from("contacts").insert({
                           company_id: channelData.company_id,
                           name: pushName,
                           phone: senderPhone,
                           type: "lead",
                           status: "novo"
                       }).select("id").single();
                       if (newContact) contactId = newContact.id;
                       if (insertCErr) console.error(`[❌ Falha RLS Insert Contacts]`, insertCErr);
                   }

                   if (contactId) {
                       let conversationId = null;
                       const { data: convExist } = await supabase
                           .from("conversations")
                           .select("id")
                           .eq("company_id", channelData.company_id)
                           .eq("contact_id", contactId)
                           .eq("channel_id", channelData.id)
                           .single();
                       
                       if (convExist) {
                           conversationId = convExist.id;
                           await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversationId);
                       } else {
                           const { data: newConv, error: newConvErr } = await supabase.from("conversations").insert({
                               company_id: channelData.company_id,
                               contact_id: contactId,
                               channel_id: channelData.id,
                               status: "active",
                               last_message_at: new Date().toISOString()
                           }).select("id").single();
                           if (newConv) conversationId = newConv.id;
                           if (newConvErr) console.error(`[❌ Falha RLS Insert Conversation]`, newConvErr);
                       }

                       if (conversationId) {
                           const { error: msgErr } = await supabase.from("messages").insert({
                               company_id: channelData.company_id,
                               conversation_id: conversationId,
                               contact_id: contactId,
                               direction: fromMe ? "outbound" : "inbound",
                               message: { text: textContent, type: msgType === "audioMessage" ? "audio" : "text" }
                           });
                           if (msgErr) {
                               console.error(`[❌ Falha RLS Insert Message] A mensagem não salvou na UI:`, msgErr);
                           } else {
                               console.log(`[✅ SUCESSO BD] Mensagem salva em Messages e UI Realtime foi atualizada.`);
                           }
                       }
                   }
               }
           }
       } catch (err) {
           console.error("Erro CRÍTICO interno ao processar Payload via Supabase:", err);
       }
    }

    // 6. FORWARD PARA O SEU SERVIDOR N8N (Relay)
    // Opcional: Se existir N8N_WEBHOOK_URL, a gente repassa tudo cru, intacto, para Maria Processar!
    if (process.env.N8N_WEBHOOK_URL) {
      try {
        await fetch(process.env.N8N_WEBHOOK_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // Mantemos custom headers se necessário (como o host da evolution)
          },
          body: rawBody // Payload 100% original que a Evolution enviou p/ garantir Langchain do n8n funcione
        });
      } catch (err) {
        console.error("Falha ao retransmitir (Forward) payload para o N8N:", err);
      }
    }

    return NextResponse.json({ success: true, relayed: !!process.env.N8N_WEBHOOK_URL });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown Error";
    console.error("Webhook Relay Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
