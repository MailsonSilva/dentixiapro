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

export interface PatientAppointmentRecord {
  id: string;
  start_time: string;
  end_time: string;
  procedure_name: string;
  status: string;
  created_at?: string;
}

export interface PatientMessageRecord {
  id: string;
  direction: "inbound" | "outbound";
  message: {
    text?: string;
    type?: string;
    source?: string;
    media_url?: string;
  };
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

export async function getPatientAppointments(contactId: string): Promise<PatientAppointmentRecord[]> {
  const { data, error } = await supabase
    .from("appointments")
    .select("id, start_time, end_time, procedure_name, status, created_at")
    .eq("contact_id", contactId)
    .order("start_time", { ascending: false })
    .limit(20);

  if (error) throw error;
  return (data || []) as PatientAppointmentRecord[];
}

export async function getPatientMessages(contactId: string): Promise<PatientMessageRecord[]> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, direction, message, created_at")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;
  return (data || []) as PatientMessageRecord[];
}
