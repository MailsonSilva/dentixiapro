import { supabase } from "../supabase";

interface AddProcedureRecordInput {
  companyId: string;
  contactId: string;
  procedureName: string;
  catalogId?: string | null;
  performedAt: string; // "yyyy-MM-dd"
  status: "realizado" | "cancelado" | "pendente";
  notes?: string;
}

/**
 * Adiciona um registro de procedimento ao histórico do paciente.
 */
export async function addProcedureRecord(input: AddProcedureRecordInput) {
  const { data, error } = await supabase
    .from("procedure_records")
    .insert([
      {
        company_id: input.companyId,
        contact_id: input.contactId,
        catalog_id: input.catalogId ?? null,
        procedure_name: input.procedureName,
        performed_at: input.performedAt,
        status: input.status,
        notes: input.notes ?? null,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Remove um registro de histórico de procedimento.
 */
export async function deleteProcedureRecord(id: string) {
  const { error } = await supabase
    .from("procedure_records")
    .delete()
    .eq("id", id);

  if (error) throw error;
  return { success: true };
}

interface ProcedureCatalogInput {
  companyId: string;
  name: string;
  durationMin: number;
}

/**
 * Adiciona um procedimento personalizado ao catálogo da empresa.
 */
export async function addProcedureToCatalog(input: ProcedureCatalogInput) {
  const { data, error } = await supabase
    .from("procedure_catalog")
    .insert([
      {
        company_id: input.companyId,
        name: input.name,
        duration_min: input.durationMin,
        is_system: false,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Remove um procedimento personalizado do catálogo (apenas não-sistema).
 */
export async function deleteProcedureFromCatalog(id: string) {
  const { error } = await supabase
    .from("procedure_catalog")
    .delete()
    .eq("id", id)
    .eq("is_system", false);

  if (error) throw error;
  return { success: true };
}
