import { supabase } from "@/lib/supabase";

export async function upsertContact(data: {
  name: string;
  company_id: string;
  id?: string;
}) {
  const { data: contact, error } = await supabase
    .from("contacts")
    .upsert({
      id: data.id,
      name: data.name,
      company_id: data.company_id,
    })
    .select()
    .single();

  if (error) throw error;
  return contact;
}

export async function addProcedureToCatalog(data: {
  companyId: string;
  name: string;
  durationMin: number;
}) {
  const { data: procedure, error } = await supabase
    .from("procedure_catalog")
    .insert({
      company_id: data.companyId,
      name: data.name,
      duration_min: data.durationMin,
    })
    .select()
    .single();

  if (error) throw error;
  return procedure;
}

export async function deleteProcedureFromCatalog(id: string) {
  const { error } = await supabase
    .from("procedure_catalog")
    .delete()
    .eq("id", id);

  if (error) throw error;
  return true;
}

export async function addProcedureRecord(data: {
  companyId: string;
  contactId: string;
  procedureName: string;
  catalogId: string | null;
  performedAt: string;
  status: "realizado" | "cancelado" | "pendente";
  notes?: string;
}) {
  const { data: record, error } = await supabase
    .from("procedure_records")
    .insert({
      company_id: data.companyId,
      contact_id: data.contactId,
      procedure_name: data.procedureName,
      catalog_id: data.catalogId,
      performed_at: data.performedAt,
      status: data.status,
      notes: data.notes,
    })
    .select()
    .single();

  if (error) throw error;
  return record;
}

export async function deleteProcedureRecord(id: string) {
  const { error } = await supabase
    .from("procedure_records")
    .delete()
    .eq("id", id);

  if (error) throw error;
  return true;
}
