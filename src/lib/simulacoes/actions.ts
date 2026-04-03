import { supabase } from "../supabase";
import { base64ToBlob, toothColors } from "./utils";

/**
 * Envia imagem para o webhook do N8N e retorna o resultado em Base64.
 */
export async function generateSimulationAction(
  imageBase64: string,
  colorId: string,
  procedure: string
) {
  const hex = toothColors.find(c => c.id === colorId)?.hex ?? "#FFFFFF";
  const base64Pure = imageBase64.split(",")[1];

  const res = await fetch("https://webhook.vps.webartemodelos.com/webhook/dentixiapro", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      data: base64Pure,
      vitacor: hex,
      procedure: procedure,
    }),
  });

  const json = await res.json();
  if (json.status === "error" || !json.data) {
    throw new Error(json.message || "Erro ao gerar simulação pela IA");
  }

  return `data:image/jpeg;base64,${json.data}`;
}

/**
 * Salva os resultados no Storage (Multi-tenant) e no Banco de Dados.
 */
export async function saveSimulationAction({
  originalBase64,
  resultBase64,
  procedure,
  patientName,
  contactId,
  companyId,
  userId
}: {
  originalBase64: string;
  resultBase64: string;
  procedure: string;
  patientName: string;
  contactId?: string | null;
  companyId: string;
  userId: string;
}) {
  const ts = Date.now();

  // 1. Upload Original
  const origBlob = base64ToBlob(originalBase64);
  const origPath = `${companyId}/original/${ts}.jpg`;
  await supabase.storage.from("simulacoes").upload(origPath, origBlob, { contentType: "image/jpeg" });
  const { data: { publicUrl: origUrl } } = supabase.storage.from("simulacoes").getPublicUrl(origPath);

  // 2. Upload Simulada
  const simBlob = base64ToBlob(resultBase64);
  const simPath = `${companyId}/simulada/${ts}.jpg`;
  await supabase.storage.from("simulacoes").upload(simPath, simBlob, { contentType: "image/jpeg" });
  const { data: { publicUrl: simUrl } } = supabase.storage.from("simulacoes").getPublicUrl(simPath);

  // 3. Insert DB
  const { error } = await supabase.from("simulacoes").insert({
    company_id: companyId,
    created_by: userId,
    procedimento: procedure,
    nome_paciente: patientName,
    contact_id: contactId ?? null,
    img_original_url: origUrl,
    img_simulada_url: simUrl,
  });

  if (error) throw error;
  return { success: true };
}
