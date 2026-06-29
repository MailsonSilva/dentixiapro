import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const response = NextResponse.redirect(new URL("/", request.url));

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            response.cookies.set({ name, value: "", ...options, maxAge: 0 });
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error("Erro ao trocar o código pela sessão:", error.message);
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url));
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
              tipo: "comum", // Tipo padrão do SaaS
            });

          if (insertError) {
            console.error("Erro ao criar perfil de usuário pós-OAuth:", insertError.message);
          }
        }
      } catch (dbErr) {
        console.error("Erro inesperado ao sincronizar perfil do usuário:", dbErr);
      }
    }

    return response;
  }

  return NextResponse.redirect(new URL("/login", request.url));
}


