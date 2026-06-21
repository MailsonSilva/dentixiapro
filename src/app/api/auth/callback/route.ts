import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error("Erro ao trocar o código pela sessão:", error.message);
    } else if (data?.user) {
      const user = data.user;
      
      // Sincronização preventiva do perfil (tabela public.usuarios)
      try {
        const { data: profile, error: profileError } = await supabase
          .from("usuarios")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();

        if (!profile && !profileError) {
          // Se não existir perfil, cria um registro básico para o primeiro login
          const { error: insertError } = await supabase
            .from("usuarios")
            .insert({
              id: user.id,
              email: user.email,
              nome_completo: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Dentista",
              tipo: "comum", // Tipo padrão padrão do SaaS
            });

          if (insertError) {
            console.error("Erro ao criar perfil de usuário pós-OAuth:", insertError.message);
          }
        }
      } catch (dbErr) {
        console.error("Erro inesperado ao sincronizar perfil do usuário:", dbErr);
      }
    }
  }

  // Redirecionamento absoluto e seguro conforme Next.js 15
  return NextResponse.redirect(new URL("/", request.url));
}

