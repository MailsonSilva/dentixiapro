import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const userId = session.user.id;
    
    // Obter company_id
    const { data: userCompany } = await supabase
      .from('user_company')
      .select('company_id')
      .eq('user_id', userId)
      .single();

    if (!userCompany) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });
    }

    const url = new URL(request.url);
    const instanceName = url.searchParams.get("instanceName");

    if (!instanceName) {
      return NextResponse.json({ error: 'Nome da instância é obrigatório' }, { status: 400 });
    }

    const evolutionUrl = process.env.EVOLUTION_API_URL?.replace(/\/+$/, '');
    const globalApiKey = process.env.EVOLUTION_GLOBAL_API_KEY;

    if (!evolutionUrl || !globalApiKey) {
      return NextResponse.json({ error: 'API Keys da Evolution não configuradas no Servidor.' }, { status: 500 });
    }

    console.log(`[Evolution] Desconectando instância: ${instanceName}`);

    // Logout
    const logoutRes = await fetch(`${evolutionUrl}/instance/logout/${instanceName}`, {
      method: 'DELETE',
      headers: {
        'apikey': globalApiKey
      }
    });

    if (!logoutRes.ok) {
        const err = await logoutRes.text();
        console.warn("Aviso Evolution (Logout):", err);
        return NextResponse.json({ error: 'Falha ao desconectar o aparelho: ' + err }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error: unknown) {
    console.error("Exceção:", error);
    if (error instanceof Error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
