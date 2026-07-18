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
          .select("id, logo_url, nome_completo")
          .eq("id", user.id)
          .maybeSingle();

        if (!profile && !profileError) {
          // Se não existir perfil, cria um registro básico para o primeiro login com dados adicionais do login social
          const { error: insertError } = await supabase
            .from("usuarios")
            .insert({
              id: user.id,
              email: user.email,
              nome_completo: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Dentista",
              tipo: "comum", // Tipo padrão do SaaS
              trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              logo_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
              telefone: user.phone || user.user_metadata?.phone || user.user_metadata?.phone_number || null,
            });

          if (insertError) {
            console.error("Erro ao criar perfil de usuário pós-OAuth:", insertError.message);
          }
        } else if (profile) {
          // Usuário já existe — sincroniza dados sociais que podem estar faltando (ex: foto do Google)
          const avatarFromOAuth = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
          const nameFromOAuth = user.user_metadata?.full_name || user.user_metadata?.name || null;
          if (avatarFromOAuth || nameFromOAuth) {
            const updatePayload: Record<string, string> = {};
            // Só atualiza logo_url se ainda não tiver uma foto personalizada
            if (avatarFromOAuth && !profile.logo_url) updatePayload.logo_url = avatarFromOAuth;
            // Só atualiza nome se ainda estiver vazio ou igual ao fallback de email
            if (nameFromOAuth && (!profile.nome_completo || profile.nome_completo === user.email?.split("@")[0])) {
              updatePayload.nome_completo = nameFromOAuth;
            }
            if (Object.keys(updatePayload).length > 0) {
              await supabase.from("usuarios").update(updatePayload).eq("id", user.id);
            }
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


