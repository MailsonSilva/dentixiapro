import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const isAuthPage = request.nextUrl.pathname.startsWith('/login') || 
                     request.nextUrl.pathname.startsWith('/register') ||
                     request.nextUrl.pathname.startsWith('/forgot') ||
                     request.nextUrl.pathname.startsWith('/reset-password');
  
  // Lista de arquivos públicos que nunca devem ser bloqueados
  const publicFiles = ['/logo.png', '/favicon.ico', '/next.svg', '/vercel.svg'];
  const isPublicFile = publicFiles.includes(request.nextUrl.pathname);
  const isNextInternal = request.nextUrl.pathname.startsWith('/_next');

  // 4. Redirecionamento baseado no perfil (Role-based Routing)
  if (user) {
    const tipoUsuario = user.user_metadata?.tipo_usuario;

    // Se estiver em uma página de auth (login/register), redireciona para a home correta
    if (isAuthPage) {
      const home = tipoUsuario === 'parceiro' ? '/parceiros' : '/';
      return NextResponse.redirect(new URL(home, request.url));
    }

    // Se um Parceiro tentar acessar a Home (comum)
    if (tipoUsuario === 'parceiro' && request.nextUrl.pathname === '/') {
      return NextResponse.redirect(new URL('/parceiros', request.url));
    }

    // Se um Usuário Comum tentar acessar o Painel de Parceiros
    if (tipoUsuario === 'comum' && request.nextUrl.pathname.startsWith('/parceiros')) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Se NÃO estiver logado e NÃO for uma página de auth/pública, vai para login
  if (!user && !isAuthPage && !isPublicFile && !isNextInternal) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - logo.png
     */
    '/((?!api|_next/static|_next/image|favicon.ico|logo.png|forgot|reset-password).*)',
  ],
};
