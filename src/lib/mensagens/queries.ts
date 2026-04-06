import { supabase } from "../supabase";

export interface Contact {
  id: string;
  name: string;
  phone: string | null;
}

export interface Channel {
  id: string;
  type: string;
  name: string | null;
  identifier: string;
}

export interface Conversation {
  id: string;
  contact_id: string;
  channel_id: string;
  last_message_at: string;
  status: string;
  bot_enabled?: boolean;
  contacts: Contact;
  communication_channels: Channel;
}

export interface Message {
  id: string;
  conversation_id: string;
  direction: "inbound" | "outbound";
  message: { text?: string; type?: string; source?: string };
  created_at: string;
}

/**
 * Busca todas as conversas de uma empresa (Multi-Tenant).
 */
export async function getConversations(companyId: string): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select(`*, contacts(id, name, phone), communication_channels(id, type, name, identifier)`)
    .eq("company_id", companyId)
    .order("last_message_at", { ascending: false });

  if (error) throw error;
  return (data || []) as Conversation[];
}

/**
 * Busca histórico de mensagens de uma conversa.
 * Lê diretamente da tabela nativa do N8N Memory e mapeia para a interface UI.
 */
export async function getMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from("n8n_chat_histories")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("hora_data_mensagem", { ascending: true }); // campo q existia

  if (error) throw error;
  
  return (data || []).map((row: any) => {
    // n8n salva como JSON no formato {"type": "human"|"ai", "data": {"content": "..."}}
    const type = row.message?.type || "human";
    const content = row.message?.data?.content || row.message?.content || "";
    
    return {
      id: String(row.id),
      conversation_id: row.conversation_id || row.session_id,
      // Se type for human, é inbound. Senão (ai) é outbound
      direction: type === "human" ? "inbound" : "outbound",
      message: {
        text: content,
        type: "text",
        source: type === "ai" ? "ai" : undefined
      },
      // Usamos hora_data_mensagem ou um fallback local
      created_at: row.hora_data_mensagem || new Date().toISOString()
    } as Message;
  });
}
