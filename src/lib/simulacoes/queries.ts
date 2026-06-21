import { createClient } from "@supabase/supabase-js";
import { createClient as createSupabaseServerClient } from "@/lib/supabaseServer";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface Simulacao {
  id: number;
  created_at: string;
  usuario_id: string;
  procedimento: string;
  img_original_url: string;
  img_simulada_url: string;
  nome_paciente: string;
  cor_utilizada: string;
  company_id?: string;
  contact_id?: string | null;
}

export async function getSimulationsAction(): Promise<Simulacao[]> {
  const supabaseServer = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabaseServer.auth.getUser();
  
  if (authError || !user) {
    throw new Error("Usuário não autenticado.");
  }

  const { data, error } = await supabaseAdmin
    .from("simulacoes")
    .select("*")
    .eq("usuario_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao buscar simulações no servidor:", error);
    throw new Error(error.message);
  }

  return (data || []) as Simulacao[];
}
