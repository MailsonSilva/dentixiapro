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
  faceta: `APLIQUE FACETAS DENTAIS — PRIORIDADE MÁXIMA NA COR, NATURALIDADE ANATÔMICA E ALINHAMENTO CONSERVADOR: Aplique facetas dentais em todos os dentes naturais visíveis. A cor exata deve ser {{ $json.body.vitacor }} e isso é o REQUISITO PRINCIPAL. As facetas devem recobrir a superfície vestibular dos dentes visíveis, neutralizando a coloração original e reproduzindo com fidelidade a cor {{ $json.body.vitacor }}, com resultado harmônico, natural e altamente foto realista. As facetas devem ser ultraconservadoras e seguir rigorosamente a anatomia original de cada dente, preservando contorno, posição, proporção, volume e escala dental original. É absolutamente proibido gerar dentes grandes, largos, longos, espessos, quadrados, chapados, blocados ou com aparência de “peças de dominó”. Não aumentar de forma perceptível a altura cérvico-incisal, a largura mésio-distal, a espessura vestibular ou a projeção anterior dos dentes. Não expandir visualmente a arcada. Não ampliar o corredor dentário. Não aumentar a área total de dentes visíveis.O alinhamento deve ser feito de forma mínima e conservadora, corrigindo apenas pequenas imperfeições superficiais, como discreta irregularidade de borda, trincas leves, pequenos desgastes ou assimetrias sutis. Não transformar os dentes em formas retangulares uniformes. Não padronizar todos os dentes com o mesmo tamanho ou a mesma largura. Preserve a anatomia dental individual e a hierarquia natural entre os elementos: incisivos centrais com leve predominância natural, sem hipertrofia; incisivos laterais discretamente mais estreitos e, quando compatível com a anatomia original, ligeiramente menos longos que os centrais; caninos com anatomia própria preservada, sem alargamento excessivo e sem aspecto arredondado artificial. As bordas incisais devem ficar alinhadas de forma harmoniosa, mas não totalmente retas, não planificadas e não artificiais. Preserve uma linha incisal natural, com microvariações anatômicas sutis. Manter embrasuras incisais visíveis e naturais, sem fechamento excessivo dos espaços interincisais. Preservar os sulcos de separação entre os dentes, a individualização anatômica e o contorno interproximal. Evitar efeito monobloco, efeito placa única ou aparência contínua sem separação dental. As facetas devem apresentar aspecto de odontologia estética realista, com: contornos anatômicos naturais; espessura visual discreta; emergência cervical compatível; integração gengival precisa; textura superficial realista; brilho equilibrado e não chapado; translucidez controlada nas bordas incisais; leve variação óptica para evitar aparência opaca, artificial ou excessivamente porcelanizada. Não abrir mais o sorriso. Não alterar o posicionamento dos lábios. Não modificar a curvatura da arcada. Não mudar a quantidade de dentes expostos. Não mexer na gengiva, pele, bochechas, fundo ou iluminação. REGRA ANATÔMICA DE SEGURANÇA: Se houver dúvida entre estética e naturalidade, priorize sempre a naturalidade anatômica conservadora. Se houver dúvida entre uniformidade e realismo, priorize sempre o realismo. As facetas devem parecer finas, proporcionais e integradas aos dentes originais, sem volume excessivo, sem alargamento e sem aparência grosseira.`,
  implante: `ESPECIALISTA EM REABILITAÇÃO ORAL BIOESTÉTICA: Atue como um especialista em design dental foto realista de alta precisão. AÇÃO TÉCNICA E CROMÁTICA: Reconstrua exclusivamente os dentes ausentes, preenchendo apenas os espaços anatômicos correspondentes a cada elemento dental. Não transforme toda área escura visível da boca em estrutura dentária. Simule a instalação de implantes e coroas odontológicas com encaixe anatômico individual. Aplique a cor {{COR_HEX}} em toda a dentição visível, reservando textura, sombras e translucidez naturais. CONTROLE RÍGIDO DE TAMANHO, ESCALA E VOLUME:* Utilize como referência obrigatória o tamanho dos dentes naturais remanescentes, dos dentes contralaterais correspondentes e do espaço delimitado pela gengiva original. Cada novo dente deve possuir altura e largura iguais ou ligeiramente menores que os dentes naturais equivalentes presentes na imagem. Não utilizar proporções estéticas idealizadas com base no tamanho da face. Não ampliar o sorriso e não criar dentes para ocupar áreas sem suporte gengival. Os novos dentes devem permanecer estritamente dentro dos limites anatômicos individuais de cada alvéolo e espaço protético. Não ultrapassar a margem gengival, o plano oclusal, a curvatura original da arcada ou o volume dos dentes vizinhos. É proibido aumentar:
a altura cérvico-incisal das coroas; a largura mésio-distal; a projeção vestibular; a área total de dentes visíveis; a abertura da boca; a separação entre os lábios;
a exposição dental do sorriso; a dimensão vertical da dentição. Os dentes não devem parecer longos, largos, projetados, dominantes ou grandes em relação à boca. Não criar dentes que se estendam profundamente para dentro da área escura da cavidade oral. Em caso de dúvida sobre o tamanho, escolha sempre a menor dimensão anatomicamente plausível. REFERÊNCIA DE ESCALA OBRIGATÓRIA: Mantenha a dentição reconstruída na mesma escala fotográfica dos dentes naturais já existentes. A reconstrução deve parecer encaixada dentro da boca original, e não sobreposta sobre ela. Preserve exatamente o tamanho original da boca, o arco do sorriso e a quantidade de dentes expostos pelos lábios. NATURALIDADE E TEXTURA DO ESMALTE: Mantenha a microtextura superficial realista, com brilho não uniforme, equilibrado, focado e suave. Inclua translucidez controlada nas bordas incisais e variação sutil de opacidade, evitando aparência sólida, artificial ou excessivamente porcelanizada. A junção entre dentes e gengiva deve ser natural e integrada. RESTRIÇÃO MÁXIMA DE TECIDOS MOLES — CAMADA FACIAL TRAVADA: É absolutamente proibido modificar, suavizar, reposicionar, ampliar ou alterar a cor e o formato dos lábios, da abertura da boca, da gengiva não relacionada diretamente ao dente reconstruído, das bochechas ou da pele. Preserve integralmente a textura da pele, poros, rugas finas, iluminação, enquadramento e perspectiva originais. REGRA FINAL DE PRIORIDADE: Caso exista conflito entre preencher uma ausência e manter o tamanho anatômico, preserve o tamanho anatômico e deixe espaços naturais entre os dentes. Nunca aumente os dentes para eliminar completamente áreas escuras da boca.`,
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
