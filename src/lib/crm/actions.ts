import { supabase } from "../supabase";
import { Contact } from "./queries";

/**
 * Atualiza o estágio de um contato (Drag & Drop no Kanban).
 * Coluna correta: stage_id (não crm_stage_id)
 */
export async function updateContactStage(contactId: string, stageId: string) {
  const { error } = await supabase
    .from("contacts")
    .update({ stage_id: stageId })
    .eq("id", contactId);

  if (error) throw error;
  return { success: true };
}

/**
 * Deleta um contato do CRM.
 */
export async function deleteContact(id: string) {
  const { error } = await supabase
    .from("contacts")
    .delete()
    .eq("id", id);

  if (error) throw error;
  return { success: true };
}

// ────────────────────────────────────────────────────────────
// Cria um novo contato
// ────────────────────────────────────────────────────────────
export async function createContact(payload: {
  company_id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  birth_date?: string | null;
  stage_id?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<Contact> {
  const { data, error } = await supabase
    .from("contacts")
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data as Contact;
}

// ────────────────────────────────────────────────────────────
// Atualiza um contato existente — sem upsert para evitar PGRST204
// ────────────────────────────────────────────────────────────
export async function updateContact(
  id: string,
  payload: {
    name?: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    birth_date?: string | null;
    stage_id?: string | null;
    metadata?: Record<string, unknown>;
  }
): Promise<Contact> {
  const { data, error } = await supabase
    .from("contacts")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Contact;
}

/**
 * @deprecated Use createContact() ou updateContact() separadamente.
 * Mantido por compatibilidade com módulos que ainda não foram migrados.
 */
export async function upsertContact(contactData: {
  id?: string;
  company_id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  birth_date?: string | null;
  stage_id?: string | null;
  metadata?: Record<string, unknown>;
}) {
  if (contactData.id) {
    const { id, ...payload } = contactData;
    return updateContact(id, payload);
  }
  return createContact(contactData);
}
