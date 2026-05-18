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
  message: {
    text?: string;
    type?: string;
    source?: string;
    media_url?: string;
    mimetype?: string;
    seconds?: number;
    file_name?: string;
  };
  created_at: string;
  delivery_status?: string;
}

export async function getConversations(companyId: string): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select(`*, contacts(id, name, phone), communication_channels(id, type, name, identifier)`)
    .eq("company_id", companyId)
    .order("last_message_at", { ascending: false });

  if (error) throw error;
  return (data || []) as Conversation[];
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, conversation_id, direction, message, created_at, delivery_status")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data || []) as Message[];
}
