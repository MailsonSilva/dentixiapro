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
 */
export async function getMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data || []) as Message[];
}
