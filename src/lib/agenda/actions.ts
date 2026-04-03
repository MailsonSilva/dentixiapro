import { supabase } from "../supabase";
import { addMinutes, parseISO, format } from "date-fns";

// ────────────────────────────────────────────────────────────
// Verificação de conflito de horário
// ────────────────────────────────────────────────────────────
async function checkConflict(
  companyId: string,
  startTime: Date,
  excludeId?: string
): Promise<boolean> {
  let query = supabase
    .from("appointments")
    .select("id")
    .eq("company_id", companyId)
    .eq("start_time", startTime.toISOString())
    .neq("status", "cancelled");

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data } = await query.maybeSingle();
  return !!data;
}

// ────────────────────────────────────────────────────────────
// Criar agendamento
// ────────────────────────────────────────────────────────────
export async function createAppointmentAction({
  date,
  time,
  procedure,
  catalogId,
  durationMin,
  contactId,
  companyId,
}: {
  date: string;
  time: string;
  procedure: string;
  catalogId?: string | null;
  durationMin?: number;
  contactId: string;
  companyId: string;
}) {
  const startTime = parseISO(`${date}T${time}:00`);
  const endTime = addMinutes(startTime, durationMin ?? 60);

  // Anti-duplicação — camada de aplicação
  const hasConflict = await checkConflict(companyId, startTime);
  if (hasConflict) {
    throw new Error("Já existe um agendamento neste horário. Escolha outro horário.");
  }

  const { data, error } = await supabase
    .from("appointments")
    .insert([
      {
        company_id: companyId,
        contact_id: contactId,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        procedure_name: procedure,
        catalog_id: catalogId ?? null,
        status: "scheduled",
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ────────────────────────────────────────────────────────────
// Atualizar agendamento (edição)
// ────────────────────────────────────────────────────────────
export async function updateAppointmentAction(
  id: string,
  {
    date,
    time,
    procedure,
    catalogId,
    durationMin,
    contactId,
    companyId,
  }: {
    date: string;
    time: string;
    procedure: string;
    catalogId?: string | null;
    durationMin?: number;
    contactId: string;
    companyId: string;
  }
) {
  const startTime = parseISO(`${date}T${time}:00`);
  const endTime = addMinutes(startTime, durationMin ?? 60);

  // Anti-duplicação excluindo o próprio agendamento
  const hasConflict = await checkConflict(companyId, startTime, id);
  if (hasConflict) {
    throw new Error("Já existe um agendamento neste horário. Escolha outro horário.");
  }

  const { error } = await supabase
    .from("appointments")
    .update({
      contact_id: contactId,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      procedure_name: procedure,
      catalog_id: catalogId ?? null,
    })
    .eq("id", id);

  if (error) throw error;
  return { success: true };
}

// ────────────────────────────────────────────────────────────
// Mover agendamento via Drag-and-Drop (mantém horário local, muda data)
// ────────────────────────────────────────────────────────────
export type DropResult =
  | { status: "success" }
  | { status: "conflict" };

export async function updateAppointmentDateAction(
  id: string,
  newDate: string, // "yyyy-MM-dd"
  companyId: string
): Promise<DropResult> {
  // Busca o agendamento atual para preservar hora e duração
  const { data: current, error: fetchErr } = await supabase
    .from("appointments")
    .select("start_time, end_time")
    .eq("id", id)
    .single();

  if (fetchErr) throw fetchErr;

  const oldStart = parseISO(current.start_time);
  const oldEnd = parseISO(current.end_time);
  const duration = oldEnd.getTime() - oldStart.getTime(); // em ms

  // FIX: usar format() do date-fns respeita o horário LOCAL (não UTC)
  // toISOString().substring(11,16) causava desvio de +3h no BR (UTC-3)
  const localTime = format(oldStart, "HH:mm");
  const newStart = parseISO(`${newDate}T${localTime}:00`);
  const newEnd = new Date(newStart.getTime() + duration);

  // Verificar conflito no novo horário — retorna {status: conflict} ao invés de lançar
  const hasConflict = await checkConflict(companyId, newStart, id);
  if (hasConflict) {
    return { status: "conflict" };
  }

  const { error } = await supabase
    .from("appointments")
    .update({
      start_time: newStart.toISOString(),
      end_time: newEnd.toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
  return { status: "success" };
}

// ────────────────────────────────────────────────────────────
// Atualizar status
// ────────────────────────────────────────────────────────────
export async function updateAppointmentStatusAction(id: string, status: string) {
  const { error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("id", id);

  if (error) throw error;
  return { success: true };
}

// ────────────────────────────────────────────────────────────
// Excluir agendamento (soft-cancel)
// ────────────────────────────────────────────────────────────
export async function deleteAppointmentAction(id: string) {
  const { error } = await supabase
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", id);

  if (error) throw error;
  return { success: true };
}
