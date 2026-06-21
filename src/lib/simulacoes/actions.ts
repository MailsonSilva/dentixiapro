"use server";

import { createClient } from "@supabase/supabase-js";
import { createClient as createSupabaseServerClient } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";

let supabaseAdminInstance: ReturnType<typeof createClient> | null = null;

function getSupabaseAdmin() {
  if (!supabaseAdminInstance) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error("Credenciais do Supabase Admin não configuradas no servidor.");
    }
    supabaseAdminInstance = createClient(url, key);
  }
  return supabaseAdminInstance;
}

function base64ToBuffer(base64: string): Buffer {
  if (!base64 || typeof base64 !== "string") {
    throw new Error("Formato de imagem base64 inválido ou vazio.");
  }
  // Strip data URI prefix if present (e.g. "data:image/png;base64,...") using replace
  const clean = base64.replace(/^data:image\/[a-z]+;base64,/, "");
  return Buffer.from(clean, "base64");
}

export async function saveSimulationAction(
  formData: FormData
): Promise<{ id: number; img_original_url: string; img_simulada_url: string }> {
  console.log("saveSimulationAction invoked on server with keys:", Array.from(formData.keys()));
  
  // Obter a sessão de forma segura no servidor
  const supabaseServer = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabaseServer.auth.getUser();
  
  if (authError || !user) {
    throw new Error("Usuário não autenticado.");
  }
  
  const userId = user.id;
  const imgOriginalBase64 = formData.get("imagem_original") as string | null;
  const imgSimuladaBase64 = formData.get("imagem_simulada") as string | null;
  const procedure = formData.get("procedimento") as string | null;
  const patientName = formData.get("nome_paciente") as string | null;
  const colorHex = formData.get("cor") as string | null;

  console.log("Parsed FormData fields on server:", {
    hasImgOriginal: !!imgOriginalBase64,
    hasImgSimulada: !!imgSimuladaBase64,
    procedure,
    patientName,
    userId,
    colorHex,
  });

  // Type Guards e validações defensivas
  if (!imgOriginalBase64 || typeof imgOriginalBase64 !== "string") {
    throw new Error("Imagem original inválida ou ausente.");
  }
  if (!imgSimuladaBase64 || typeof imgSimuladaBase64 !== "string") {
    throw new Error("Imagem simulada inválida ou ausente.");
  }
  if (!patientName || typeof patientName !== "string" || !patientName.trim()) {
    throw new Error("Nome do paciente é obrigatório.");
  }
  if (!procedure || typeof procedure !== "string") {
    throw new Error("Procedimento é obrigatório.");
  }
  if (!colorHex || typeof colorHex !== "string") {
    throw new Error("Cor utilizada é obrigatória.");
  }

  const uuid = crypto.randomUUID();
  const bucket = "simulacoes";
  const originalPath = `${userId}/${uuid}_original.png`;
  const simuladaPath = `${userId}/${uuid}_simulada.png`;

  const bufferOriginal = base64ToBuffer(imgOriginalBase64);
  const bufferSimulado = base64ToBuffer(imgSimuladaBase64);

  console.log("Buffers generated. Starting Supabase Storage upload...", {
    originalPath,
    simuladaPath,
    bufferOriginalLength: bufferOriginal.length,
    bufferSimuladoLength: bufferSimulado.length,
  });

  const admin = getSupabaseAdmin();

  const [uploadBefore, uploadAfter] = await Promise.all([
    admin.storage.from(bucket).upload(originalPath, bufferOriginal, {
      contentType: "image/png",
    }),
    admin.storage.from(bucket).upload(simuladaPath, bufferSimulado, {
      contentType: "image/png",
    }),
  ]);

  if (uploadBefore.error) {
    console.error("Supabase storage upload before error:", uploadBefore.error);
    throw new Error(`Upload original: ${uploadBefore.error.message}`);
  }
  if (uploadAfter.error) {
    console.error("Supabase storage upload after error:", uploadAfter.error);
    throw new Error(`Upload resultado: ${uploadAfter.error.message}`);
  }

  console.log("Uploads successful. Fetching public URLs...");

  const { data: { publicUrl: originalUrl } } = admin.storage
    .from(bucket)
    .getPublicUrl(originalPath);

  const { data: { publicUrl: simuladaUrl } } = admin.storage
    .from(bucket)
    .getPublicUrl(simuladaPath);

  console.log("Public URLs retrieved:", { originalUrl, simuladaUrl });

  console.log("Inserting simulation record into database...");
  const { data: inserted, error } = await admin
    .from("simulacoes")
    .insert({
      usuario_id: userId,
      procedimento: procedure,
      img_original_url: originalUrl,
      img_simulada_url: simuladaUrl,
      nome_paciente: patientName,
      cor_utilizada: colorHex,
    })
    .select()
    .single();

  if (error) {
    console.error("Database insert error:", error);
    throw new Error(error.message);
  }
  console.log("Simulation record inserted successfully:", inserted?.id);
  revalidatePath("/simulacoes/resultados");
  return inserted;
}

export async function deleteSimulationAction(id: number): Promise<void> {
  const supabaseServer = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabaseServer.auth.getUser();
  if (authError || !user) {
    throw new Error("Usuário não autenticado.");
  }
  
  const admin = getSupabaseAdmin();

  // Buscar a simulação para garantir propriedade
  const { data: sim, error: fetchError } = await admin
    .from("simulacoes")
    .select("usuario_id, img_original_url, img_simulada_url")
    .eq("id", id)
    .single();

  if (fetchError || !sim) {
    throw new Error("Simulação não encontrada.");
  }

  if (sim.usuario_id !== user.id) {
    throw new Error("Não autorizado.");
  }

  // Deletar do banco de dados
  const { error: deleteDbError } = await admin
    .from("simulacoes")
    .delete()
    .eq("id", id);

  if (deleteDbError) {
    throw new Error(`Erro ao deletar do banco: ${deleteDbError.message}`);
  }

  // Deletar imagens do storage
  try {
    const bucket = "simulacoes";
    const extractPath = (url: string) => {
      const parts = url.split(`/public/${bucket}/`);
      return parts.length > 1 ? parts[1] : null;
    };
    const pathOriginal = extractPath(sim.img_original_url);
    const pathSimulada = extractPath(sim.img_simulada_url);

    const pathsToDelete = [pathOriginal, pathSimulada].filter(Boolean) as string[];
    if (pathsToDelete.length > 0) {
      await admin.storage.from(bucket).remove(pathsToDelete);
    }
  } catch (storageErr) {
    console.error("Erro ao remover arquivos do storage:", storageErr);
  }
  revalidatePath("/simulacoes/resultados");
}
