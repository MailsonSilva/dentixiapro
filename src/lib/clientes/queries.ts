import { supabase } from "../supabase";

export interface ProcedureRecord {
  id: string;
  contact_id: string;
  company_id: string;
  catalog_id: string | null;
  procedure_name: string;
  performed_at: string;
  status: "realizado" | "cancelado" | "pendente";
  notes: string | null;
  created_at: string;
}

/**
 * Busca o histórico de procedimentos de um paciente.
 */
export async function getProcedureRecords(contactId: string): Promise<ProcedureRecord[]> {
  const { data, error } = await supabase
    .from("procedure_records")
    .select("*")
    .eq("contact_id", contactId)
    .order("performed_at", { ascending: false });

  if (error) throw error;
  return (data || []) as ProcedureRecord[];
}
