import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" ? value as JsonRecord : {};
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function getMessagePayload(msgData: JsonRecord) {
  const msgType = msgData.messageType || Object.keys(msgData.message || {})[0] || "unknown";
  const message = asRecord(msgData.message);
  const audio = asRecord(message.audioMessage);
  const image = asRecord(message.imageMessage);
  const documentMessage =
    asRecord(message.documentMessage).url
      ? asRecord(message.documentMessage)
      : asRecord(asRecord(asRecord(message.documentWithCaptionMessage).message).documentMessage);

  if (msgType === "conversation") {
    return { text: asString(message.conversation), type: "text", source: "human" };
  }

  if (msgType === "extendedTextMessage") {
    return { text: asString(asRecord(message.extendedTextMessage).text), type: "text", source: "human" };
  }

  if (msgType === "audioMessage") {
    return {
      text: "Audio recebido",
      type: "audio",
      source: "human",
      media_url: asString(audio.url) || null,
      mimetype: asString(audio.mimetype) || null,
      seconds: typeof audio.seconds === "number" ? audio.seconds : null,
      ptt: audio.ptt ?? null,
    };
  }

  if (msgType === "imageMessage") {
    return {
      text: image.caption ? `Imagem recebida: ${asString(image.caption)}` : "Imagem recebida",
      type: "image",
      source: "human",
      media_url: asString(image.url) || null,
      mimetype: asString(image.mimetype) || null,
    };
  }

  if (msgType === "documentMessage" || msgType === "documentWithCaptionMessage") {
    return {
      text: "Documento recebido",
      type: "document",
      source: "human",
      media_url: asString(documentMessage.url) || null,
      mimetype: asString(documentMessage.mimetype) || null,
      file_name: asString(documentMessage.fileName) || null,
    };
  }

  return { text: "Nova mensagem de midia/outro", type: "text", source: "human" };
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    let body: JsonRecord | null = null;

    try {
      body = asRecord(JSON.parse(rawBody));
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (!body) return NextResponse.json({ success: true });

    let shouldForwardToN8n = true;
    const bodyBody = asRecord(body.body);
    const bodyData = asRecord(body.data);
    const event = body.event || body.type || bodyBody.event;
    const instanceName = asString(body.instance || bodyBody.instance);

    if (event === "messages.upsert" || event === "MESSAGES_UPSERT" || bodyData.message) {
      try {
        const supabaseAdminKey =
          process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
          console.warn("SUPABASE_SERVICE_ROLE_KEY ausente. Webhook pode ser bloqueado por RLS.");
        }

        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, supabaseAdminKey);

        const { data: channelData, error: channelErr } = await supabase
          .from("communication_channels")
          .select("id, company_id")
          .eq("identifier", instanceName)
          .single();

        if (channelErr || !channelData) {
          console.error(
            `[Evolution Webhook] Canal nao encontrado: ${channelErr?.message || "inexistente"}`
          );
        }

        if (channelData) {
          const msgData = Object.keys(bodyData).length
            ? bodyData
            : Object.keys(asRecord(bodyBody.data)).length
            ? asRecord(bodyBody.data)
            : asRecord(body.message);

          const messageKey = asRecord(msgData.key);
          if (Object.keys(messageKey).length) {
            const remoteJid = asString(messageKey.remoteJid);
            const fromMe = messageKey.fromMe === true;
            const senderPhone = String(remoteJid || "").split("@")[0].replace(/\D/g, "");
            const messagePayload = getMessagePayload(msgData);

            let contactId: string | null = null;
            const { data: contactExist, error: contactErr } = await supabase
              .from("contacts")
              .select("id")
              .eq("company_id", channelData.company_id)
              .eq("phone", senderPhone)
              .single();

            if (contactErr && contactErr.code !== "PGRST116") {
              console.error(`[Evolution Webhook] Erro ao buscar contato: ${contactErr.message}`);
            }

            if (contactExist) {
              contactId = contactExist.id;
            } else {
              const pushName = asString(msgData.pushName) || "Contato Novo";
              const { data: newContact, error: insertContactErr } = await supabase
                .from("contacts")
                .insert({
                  company_id: channelData.company_id,
                  name: pushName,
                  phone: senderPhone,
                  type: "lead",
                  status: "novo",
                })
                .select("id")
                .single();

              if (insertContactErr) {
                console.error("[Evolution Webhook] Erro ao criar contato:", insertContactErr);
              }
              if (newContact) contactId = newContact.id;
            }

            if (contactId) {
              let conversationId: string | null = null;
              const { data: convExist } = await supabase
                .from("conversations")
                .select("id, bot_enabled")
                .eq("company_id", channelData.company_id)
                .eq("contact_id", contactId)
                .eq("channel_id", channelData.id)
                .single();

              if (convExist) {
                conversationId = convExist.id;
                if (convExist.bot_enabled === false) shouldForwardToN8n = false;
                await supabase
                  .from("conversations")
                  .update({ last_message_at: new Date().toISOString() })
                  .eq("id", conversationId);
              } else {
                const { data: newConv, error: newConvErr } = await supabase
                  .from("conversations")
                  .insert({
                    company_id: channelData.company_id,
                    contact_id: contactId,
                    channel_id: channelData.id,
                    status: "active",
                    last_message_at: new Date().toISOString(),
                  })
                  .select("id")
                  .single();

                if (newConvErr) {
                  console.error("[Evolution Webhook] Erro ao criar conversa:", newConvErr);
                }
                if (newConv) conversationId = newConv.id;
              }

              if (conversationId) {
                const { error: msgErr } = await supabase.from("chat_messages").insert({
                  company_id: channelData.company_id,
                  conversation_id: conversationId,
                  contact_id: contactId,
                  direction: fromMe ? "outbound" : "inbound",
                  message: messagePayload,
                  source: "evolution",
                  external_id: asString(messageKey.id) || null,
                  delivery_status: fromMe ? "sent" : "received",
                });

                if (msgErr) {
                  console.error("[Evolution Webhook] Erro ao inserir chat_messages:", msgErr);
                }
              }
            }
          }
        }
      } catch (err) {
        console.error("Erro interno ao processar webhook via Supabase:", err);
      }
    }

    if (process.env.N8N_WEBHOOK_URL && shouldForwardToN8n) {
      try {
        await fetch(process.env.N8N_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: rawBody,
        });
      } catch (err) {
        console.error("Falha ao retransmitir payload para o N8N:", err);
      }
    }

    return NextResponse.json({ success: true, relayed: !!process.env.N8N_WEBHOOK_URL });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown Error";
    console.error("Webhook Relay Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
