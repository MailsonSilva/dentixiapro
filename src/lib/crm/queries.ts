import { supabase } from "../supabase";

export interface Stage {
  id: string;
  name: string;
  color: string;
  order_index: number;
}

export interface Contact {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  metadata: Record<string, any> | null;
  stage_id: string | null;
  created_at: string;
  company_id: string;
}

export const DEFAULT_STAGES = [
  { name: "Novo Lead", color: "#6366f1", order_index: 0 },
  { name: "Em Atendimento", color: "#0ea5e9", order_index: 1 },
  { name: "Avaliação Agendada", color: "#f59e0b", order_index: 2 },
  { name: "Em Orçamento", color: "#8b5cf6", order_index: 3 },
  { name: "Tratamento Aprovado", color: "#06b6d4", order_index: 4 },
  { name: "Em Tratamento", color: "#0F50A6", order_index: 5 },
  { name: "Finalizado", color: "#10b981", order_index: 6 },
  { name: "Perdido", color: "#ef4444", order_index: 7 },
];

/**
 * Busca os estágios do CRM para uma empresa.
 */
export async function getCrmStages(companyId: string): Promise<Stage[]> {
  const { data, error } = await supabase
    .from("crm_stages")
    .select("*")
    .eq("company_id", companyId)
    .order("order_index");

  if (error) throw error;

  // Se não houver estágios, cria os padrões
  if (!data || data.length === 0) {
    const defaults = DEFAULT_STAGES.map((s) => ({ ...s, company_id: companyId }));
    const { data: inserted, error: insertError } = await supabase
      .from("crm_stages")
      .insert(defaults)
      .select();
    
    if (insertError) throw insertError;
    return inserted as Stage[];
  }

  return data as Stage[];
}

/**
 * Busca todos os contatos vinculados a uma empresa.
 */
export async function getCrmContacts(companyId: string): Promise<Contact[]> {
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as Contact[];
}
