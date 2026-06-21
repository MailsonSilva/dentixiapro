import { supabase } from "@/lib/supabase";

export interface PatientAppointmentRecord {
  id: string;
  procedure_name: string;
  start_time: string;
  status: string;
}

export interface PatientMessageRecord {
  id: string;
  direction: "inbound" | "outbound";
  message: {
    type: string;
    text?: string;
  };
  created_at: string;
}

export interface ProcedureRecord {
  id: string;
  procedure_name: string;
  performed_at: string;
  status: "realizado" | "cancelado" | "pendente";
  notes?: string;
}

export async function getPatientAppointments(contactId: string): Promise<PatientAppointmentRecord[]> {
  const { data, error } = await supabase
    .from("appointments")
    .select("id, procedure_name, start_time, status")
    .eq("contact_id", contactId)
    .order("start_time", { ascending: false });

  if (error) return [];
  return data || [];
}

export async function getPatientMessages(contactId: string): Promise<PatientMessageRecord[]> {
  // Retorna vazio conforme a remoção do módulo de chat em Junho 2026
  return [];
}

export async function getProcedureRecords(contactId: string): Promise<ProcedureRecord[]> {
  const { data, error } = await supabase
    .from("procedure_records")
    .select("id, procedure_name, performed_at, status, notes")
    .eq("contact_id", contactId)
    .order("performed_at", { ascending: false });

  if (error) return [];
  return (data as ProcedureRecord[]) || [];
}
