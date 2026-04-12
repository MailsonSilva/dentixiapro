import { supabase } from "../supabase";

export interface Appointment {
  id: string;
  company_id: string;
  contact_id: string;
  start_time: string;
  end_time: string;
  procedure_name: string;
  catalog_id: string | null;
  status: string;
  contacts?: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
  };
}

export interface ProcedureCatalogItem {
  id: string;
  company_id: string | null;
  name: string;
  duration_min: number;
  is_system: boolean;
}

/**
 * Busca agendamentos de uma empresa em um intervalo de tempo.
 */
export async function getAppointments(start: string, end: string): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from("appointments")
    .select(`
      id,
      company_id,
      contact_id,
      start_time,
      end_time,
      procedure_name,
      catalog_id,
      status,
      contacts!contact_id (id, name, phone, email)
    `)
    .gte("start_time", start)
    .lte("start_time", end)
    .neq("status", "cancelled");

  if (error) throw error;
  return (data || []) as unknown as Appointment[];
}

/**
 * Busca um agendamento específico pelo ID.
 */
export async function getAppointmentById(id: string): Promise<Appointment | null> {
  const { data, error } = await supabase
    .from("appointments")
    .select(`
      id,
      company_id,
      contact_id,
      start_time,
      end_time,
      procedure_name,
      catalog_id,
      status,
      contacts!contact_id (id, name, phone, email)
    `)
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as unknown as Appointment;
}

import { Contact } from "../crm/queries";

/**
 * Busca contatos para uso no seletor de agendamento.
 */
export async function getCalendarContacts(): Promise<Contact[]> {
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .order("name");

  if (error) throw error;
  return data || [];
}

/**
 * Busca o catálogo de procedimentos: globais (is_system=true) + personalizados da empresa.
 */
export async function getProcedureCatalog(companyId?: string): Promise<ProcedureCatalogItem[]> {
  let query = supabase
    .from("procedure_catalog")
    .select("*")
    .order("is_system", { ascending: false })
    .order("name");

  if (companyId) {
    query = query.or(`company_id.eq.${companyId},is_system.eq.true`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as ProcedureCatalogItem[];
}

/**
 * Busca horários de funcionamento da empresa.
 */
export async function getCompanyBusinessHours(companyId: string) {
  const { data, error } = await supabase
    .from("company_business_hours")
    .select("*")
    .eq("company_id", companyId)
    .order("day_of_week");

  if (error) throw error;
  return data;
}

