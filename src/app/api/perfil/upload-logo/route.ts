import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Não autenticado. Faça login novamente." },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Nenhum arquivo enviado ou formato inválido." },
        { status: 400 }
      );
    }

    // Validação de tamanho (máx 3MB)
    const MAX_SIZE = 3 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "A imagem deve ter no máximo 3MB." },
        { status: 400 }
      );
    }

    // Validação de tipo MIME
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Formato não suportado. Envie apenas JPG, PNG, WEBP ou GIF." },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${user.id}.${ext}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Upload para o bucket logoEmpresa
    const { error: uploadError } = await supabase.storage
      .from("logoEmpresa")
      .upload(path, fileBuffer, {
        upsert: true,
        contentType: file.type,
        cacheControl: "0",
      });

    if (uploadError) {
      console.error("[Upload Logo] Erro no Supabase Storage:", uploadError.message);
      return NextResponse.json(
        {
          error: `Erro ao salvar no armazenamento: ${uploadError.message}. Verifique se o bucket 'logoEmpresa' existe no Supabase.`,
        },
        { status: 500 }
      );
    }

    // Obter URL pública
    const { data: publicData } = supabase.storage
      .from("logoEmpresa")
      .getPublicUrl(path);

    const publicUrl = publicData.publicUrl;

    // Atualizar no banco de dados
    const { error: dbError } = await supabase
      .from("usuarios")
      .update({ logo_url: publicUrl })
      .eq("id", user.id);

    if (dbError) {
      console.warn("[Upload Logo] Erro ao atualizar tabela usuarios:", dbError.message);
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Erro inesperado ao processar upload.";
    console.error("[Upload Logo] Erro inesperado:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
