"use server";

import { createClient } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";
import { toothColors } from "@/lib/simulacoes/utils";

// ─── Types (TypeScript puro, sem Zod) ────────────────────────────────────────
type TipoTratamento = "clareamento" | "faceta" | "implante";

export interface ResultadoSimulacao {
  success: boolean;
  urlSimulada?: string;
  urlOriginal?: string;
  error?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4 MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png"];
// ⚠️  Bucket existente com RLS configurada em 20260620223253_create_simulacoes_bucket_and_rls.sql
const STORAGE_BUCKET = "simulacoes";

// ─── Prompts clínicos fotorrealistas (extraídos do fluxo DentixFF/n8n) ────────
const PROMPTS_CLINICOS: Record<TipoTratamento, string> = {
  clareamento:
    "APLIQUE CLAREAMENTO DENTAL FOTORREALISTA - PRIORIZAR ASPECTO NATURAL E BRILHO EQUILIBRADO",
  faceta: `pinte o dente de azul se não ouver dentes insira flores no lugar`,
  implante: `pinte o dente de verde se não ouver dentes insira flores no lugar`,
};

// ─── Validação nativa (TypeScript puro — sem biblioteca Zod) ──────────────────
function validarArquivoImagem(file: File): string | null {
  if (!file || file.size === 0) return "Nenhuma imagem foi enviada.";
  if (file.size > MAX_FILE_SIZE)
    return `A imagem é muito grande (${(file.size / 1024 / 1024).toFixed(1)} MB). O limite máximo é de 4 MB.`;
  if (!ALLOWED_MIME_TYPES.includes(file.type))
    return `Formato inválido: "${file.type}". Use apenas JPG, JPEG ou PNG.`;
  return null;
}

// ─── Buscador Recursivo de Imagem ─────────────────────────────────────────────
// Esta função caça dinamicamente a string Base64 dentro do JSON do Google,
// protegendo seu código contra mudanças no schema da API v1beta.
function extrairImagemDoGemini(obj: unknown): string | undefined {
  if (!obj) return undefined;

  // Se for array, percorre recursivamente
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const result = extrairImagemDoGemini(item);
      if (result) return result;
    }
    return undefined;
  }

  // Se for um objeto puro
  if (typeof obj === "object") {
    const rawObj = obj as Record<string, unknown>;

    // Condição de parada: achou uma string na propriedade 'data' que seja grande (Base64)
    if (typeof rawObj.data === "string" && rawObj.data.length > 500) {
      return rawObj.data;
    }

    const inlineData = rawObj.inlineData as Record<string, unknown> | undefined;
    if (inlineData && typeof inlineData.data === "string") {
      return inlineData.data;
    }

    const inline_data = rawObj.inline_data as Record<string, unknown> | undefined;
    if (inline_data && typeof inline_data.data === "string") {
      return inline_data.data;
    }

    // Percorre recursivamente todas as outras chaves do objeto
    for (const key of Object.keys(rawObj)) {
      const result = extrairImagemDoGemini(rawObj[key]);
      if (result) return result;
    }
  }

  return undefined;
}
// ─── Server Action Principal ──────────────────────────────────────────────────
// Pipeline completo: validação → upload original → Gemini AI → upload resultado → DB
// Chamada única do cliente: não há round-trip com n8n.
export async function gerarSimulacaoNativa(
  formData: FormData
): Promise<ResultadoSimulacao> {
  try {
    // ── 1. Autenticação via supabaseServer (NUNCA usar o cliente browser aqui) ──
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Usuário não autenticado." };
    }

    // ── 2. Extração dos campos do FormData ────────────────────────────────────
    const tipoTratamentoRaw = formData.get("tipoTratamento") as string | null;
    const file = formData.get("imagem");
    const corSelecionada = formData.get("corSelecionada") as string | null;

    // ── 3. Validação de negócio com condicionais TypeScript (sem Zod) ─────────
    const tiposValidos: TipoTratamento[] = ["clareamento", "faceta", "implante"];

    if (
      !tipoTratamentoRaw ||
      !tiposValidos.includes(tipoTratamentoRaw as TipoTratamento)
    ) {
      return {
        success: false,
        error: `Tipo de tratamento inválido. Use: ${tiposValidos.join(", ")}.`,
      };
    }

    if (!(file instanceof File)) {
      return { success: false, error: "Campo 'imagem' ausente ou inválido." };
    }

    const erroArquivo = validarArquivoImagem(file);
    if (erroArquivo) return { success: false, error: erroArquivo };

    const tipoTratamento = tipoTratamentoRaw as TipoTratamento;
    let promptClinico = PROMPTS_CLINICOS[tipoTratamento];

    const colorItem = toothColors.find((c) => c.id === corSelecionada);
    const hex = colorItem ? colorItem.hex : "#F7F5EC"; // Fallback para BL1
    promptClinico = promptClinico.replace(/\{\{COR_HEX\}\}/g, hex);

    // ── 4. Upload da foto original para o Supabase Storage ────────────────────
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const fileName = `${user.id}/${Date.now()}-original.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, fileBuffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      return {
        success: false,
        error: `Erro no upload da imagem: ${uploadError.message}`,
      };
    }

    const urlOriginal = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(fileName).data.publicUrl;

    // ── 5. Chamada para a API do Gemini via Interactions API (v1beta/interactions)
    const base64Imagem = fileBuffer.toString("base64");

    const geminiResponse = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/interactions",
      {
        method: "POST",
        headers: {
          "x-goog-api-key": process.env.GEMINI_API_KEY ?? "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gemini-3.1-flash-lite-image",
          input: [
            {
              type: "text",
              text: promptClinico,
            },
            {
              type: "image",
              mime_type: file.type,
              data: base64Imagem,
            },
          ],
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errBody = await geminiResponse.text();
      await trackSimulacaoAction("erro", { tipoTratamento, error: errBody });
      return {
        success: false,
        error: `Falha na API Gemini Interactions (${geminiResponse.status}): ${errBody}`,
      };
    }

    const geminiData = await geminiResponse.json();

    // ── Extração Dinâmica e Robusta da Imagem ─────────────────────────────────
    const imagemSimuladaBase64: string | undefined =
      extrairImagemDoGemini(geminiData) ||
      geminiData.output?.[0]?.data ||                                      // Fallback: Padrão primário Interactions API
      geminiData.outputs?.[0]?.data ||                                     // Fallback: Variação plural
      geminiData.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || // Fallback: Padrão GenerateContent API
      geminiData.candidates?.[0]?.content?.parts?.[0]?.inline_data?.data;  // Fallback: Variação snake_case

    if (!imagemSimuladaBase64) {
      console.log("JSON COMPLETO (sem cortes):", JSON.stringify(geminiData));
      await trackSimulacaoAction("erro", { tipoTratamento, error: "Formato de retorno da API não reconhecido" });
      return {
        success: false,
        error: "A imagem foi gerada, mas o formato de retorno da API não foi reconhecido. Verifique os logs do servidor.",
      };
    }

    // ── 6. Upload da imagem simulada gerada pela IA ───────────────────────────
    const simFileName = `${user.id}/${Date.now()}-simulada.png`;
    const simBuffer = Buffer.from(imagemSimuladaBase64, "base64");

    const { error: simUploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(simFileName, simBuffer, { contentType: "image/png", upsert: false });

    if (simUploadError) {
      await trackSimulacaoAction("erro", { tipoTratamento, error: simUploadError.message });
      return {
        success: false,
        error: `Erro no upload da simulação: ${simUploadError.message}`,
      };
    }

    const urlSimulada = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(simFileName).data.publicUrl;

    await trackSimulacaoAction("acerto", { tipoTratamento, urlOriginal, urlSimulada });
    return { success: true, urlSimulada, urlOriginal };
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : "Erro desconhecido no servidor.";
    await trackSimulacaoAction("erro", { error: msg });
    return { success: false, error: msg };
  }
}

// ─── Tracking de Simulações ──────────────────────────────────────────────────
export async function trackSimulacaoAction(
  status: "acerto" | "erro" | "refeita" | "salva",
  metadata: Record<string, unknown> = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Não autenticado" };

    const { error } = await supabase.from("simulacao_tracking").insert({
      user_id: user.id,
      status,
      metadata,
    });

    if (error) {
      console.error("Erro ao registrar tracking de simulação:", error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro no tracking";
    console.error("Exceção no tracking de simulação:", msg);
    return { success: false, error: msg };
  }
}

export async function salvarSimulacaoConfirmada(
  nomePaciente: string,
  procedimento: string,
  urlOriginal: string,
  urlSimulada: string,
  corUtilizada: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Usuário não autenticado." };
    }

    if (!nomePaciente || !nomePaciente.trim()) {
      return { success: false, error: "Nome do paciente é obrigatório." };
    }

    const { error: dbError } = await supabase.from("simulacoes").insert({
      usuario_id: user.id,
      procedimento: procedimento,
      img_original_url: urlOriginal,
      img_simulada_url: urlSimulada,
      nome_paciente: nomePaciente.trim(),
      cor_utilizada: corUtilizada,
    });

    if (dbError) {
      return { success: false, error: `Erro ao salvar simulação no banco: ${dbError.message}` };
    }

    // Registrar tracking de 'salva'
    await trackSimulacaoAction("salva", { procedimento, nomePaciente: nomePaciente.trim(), corUtilizada });

    revalidatePath("/simulacoes/resultados");
    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido ao salvar.";
    return { success: false, error: msg };
  }
}
