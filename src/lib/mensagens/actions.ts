import { supabase } from "../supabase";

export async function sendMessageAction({
  text,
  conversationId,
  companyId,
  contactId,
  channelIdentifier,
  phone,
}: {
  text: string;
  conversationId: string;
  companyId: string;
  contactId: string;
  channelIdentifier: string;
  phone: string;
}) {
  const now = new Date().toISOString();

  const { data: fastMsg, error: fastMsgError } = await supabase
    .from("chat_messages")
    .insert({
      conversation_id: conversationId,
      company_id: companyId,
      contact_id: contactId,
      direction: "outbound",
      message: { text, type: "text", source: "agent" },
      source: "app",
      delivery_status: "sending",
      created_at: now,
    })
    .select("id")
    .single();

  if (fastMsgError) throw fastMsgError;

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

  if (!res.ok) {
    await supabase
      .from("chat_messages")
      .update({ delivery_status: "failed" })
      .eq("id", fastMsg.id);
    throw new Error(resData?.error || "Falha do Evolution API");
  }

  await supabase
    .from("chat_messages")
    .update({
      delivery_status: "sent",
      external_id: resData?.evolution?.key?.id || resData?.evolution?.id || null,
    })
    .eq("id", fastMsg.id);

  const { error: memoryError } = await supabase.from("n8n_chat_histories").insert({
    session_id: contactId,
    conversation_id: conversationId,
    company_id: companyId,
    contact_id: contactId,
    message: {
      type: "ai",
      data: { content: text },
      additional_kwargs: { created_at: now },
    },
    hora_data_mensagem: now,
  });

  if (memoryError) throw memoryError;

  await supabase
    .from("conversations")
    .update({
      last_message_at: now,
      bot_enabled: false,
    })
    .eq("id", conversationId);

  return { success: true };
}

export async function toggleBotState(
  conversationId: string,
  enabled: boolean,
  remoteJid?: string
) {
  const { error } = await supabase
    .from("conversations")
    .update({ bot_enabled: enabled })
    .eq("id", conversationId);

  if (error) throw error;

  if (remoteJid) {
    await fetch("/api/chat/toggle-bot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ remoteJid, enabled }),
    }).catch(() => {});
  }

  return { success: true };
}
