import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const pathname = request.nextUrl.pathname;

  // 1. Arquivos estáticos e rotas internas do Next.js são ignorados imediatamente
  const isNextInternal = pathname.startsWith('/_next') || pathname.startsWith('/api/');
  const publicFiles = ['/logo.png', '/favicon.ico', '/next.svg', '/vercel.svg', '/logo-google.png', '/logo-icon.png', '/manifest.json', '/sw.js'];
  const isPublicFile = publicFiles.includes(pathname) || /\.(png|jpg|jpeg|gif|svg|ico|css|js|json|webp)$/.test(pathname);

  if (isNextInternal || isPublicFile) {
    return response;
  }

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

  const isAuthPage = pathname.startsWith('/login') || 
                     pathname.startsWith('/register') ||
                     pathname.startsWith('/forgot') ||
                     pathname.startsWith('/reset-password');

  // Páginas públicas — acessíveis sem autenticação
  const isPublicPage = pathname === '/planos';

  let user = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    
    if (error) {
      const errorMsg = error.message?.toLowerCase() || '';
      if (errorMsg.includes('refresh_token_not_found') || 
          errorMsg.includes('refresh token not found') || 
          error.status === 400 || 
          error.code === 'refresh_token_not_found') {
        
        if (isAuthPage) {
          // Se já está na página de auth, deixa passar limpo sem loop de redirecionamento
          return response;
        }
        
        // Limpa cookies de sessão e redireciona limpo para o /login
        const redirectResponse = NextResponse.redirect(new URL('/login', request.url));
        request.cookies.getAll().forEach(cookie => {
          if (cookie.name.startsWith('sb-')) {
            redirectResponse.cookies.set(cookie.name, '', { maxAge: 0, path: '/' });
          }
        });
        return redirectResponse;
      }
    } else {
      user = data.user;
    }
  } catch (e) {
    // Silencia erros inesperados na busca do usuário
  }

  // 4. Redirecionamento baseado no perfil (Role-based Routing)
  if (user) {
    const tipoUsuario = user.user_metadata?.tipo || user.user_metadata?.tipo_usuario;

    // Se estiver em uma página de auth (login/register), redireciona para a home correta
    if (isAuthPage) {
      const home = tipoUsuario === 'parceiro' ? '/parceiros' : '/';
      return NextResponse.redirect(new URL(home, request.url));
    }

    // Se um Parceiro tentar acessar a Home (comum)
    if (tipoUsuario === 'parceiro' && pathname === '/') {
      return NextResponse.redirect(new URL('/parceiros', request.url));
    }

    // Se um Usuário Comum tentar acessar o Painel de Parceiros
    if (tipoUsuario === 'comum' && pathname.startsWith('/parceiros')) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Se NÃO estiver logado e NÃO for uma página pública ou de autenticação, vai para login
  if (!user && !isAuthPage && !isPublicPage) {
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
