import { supabase } from "../supabase";

/**
 * Envia uma mensagem via Evolution API e persiste no Supabase.
 */
export async function sendMessageAction({
  text,
  conversationId,
  companyId,
  contactId,
  channelIdentifier,
  phone
}: {
  text: string;
  conversationId: string;
  companyId: string;
  contactId: string;
  channelIdentifier: string;
  phone: string;
}) {
  // 1. Evolution API Call
  const res = await fetch("/api/evolution/message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      phone,
      instance: channelIdentifier,
    }),
  });

  const resData = await res.json();
  if (!res.ok) throw new Error(resData?.error || "Falha do Evolution API");

  // 2. Persistência no DB
  const { error: msgError } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    company_id: companyId,
    contact_id: contactId,
    direction: "outbound",
    message: { text, type: "text" },
  });

  if (msgError) throw msgError;

  // 3. Update conversation state (last_message, bot off)
  await supabase.from("conversations").update({ 
    last_message_at: new Date().toISOString(),
    bot_enabled: false 
  }).eq("id", conversationId);

  return { success: true };
}

/**
 * Alterna o estado do robô (Maria IA) para uma conversa.
 * Sincroniza Supabase (bot_enabled) + Redis do n8n (AgenteStatus).
 */
export async function toggleBotState(
  conversationId: string,
  enabled: boolean,
  remoteJid?: string  // Identificador da conversa no WhatsApp (IdConversa no Redis)
) {
  // 1. Supabase
  const { error } = await supabase
    .from("conversations")
    .update({ bot_enabled: enabled })
    .eq("id", conversationId);

  if (error) throw error;

  // 2. Redis n8n — via API route interna
  if (remoteJid) {
    await fetch("/api/chat/toggle-bot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ remoteJid, enabled }),
    }).catch(() => {/* silent — Redis é best-effort */});
  }

  return { success: true };
}
