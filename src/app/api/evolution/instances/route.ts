import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET() {
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

    const companyId = userCompany.company_id;

    // 1. Busca os canais cadastrados no DB para essa empresa
    const { data: channels, error: channelsError } = await supabase
      .from('communication_channels')
      .select('*')
      .eq('company_id', companyId)
      .eq('type', 'whatsapp');

    if (channelsError) {
      throw new Error('Falha ao bucar canais do Supabase: ' + channelsError.message);
    }

    if (!channels || channels.length === 0) {
      return NextResponse.json({ instances: [] });
    }

    const evolutionUrl = process.env.EVOLUTION_API_URL?.replace(/\/+$/, '');
    const globalApiKey = process.env.EVOLUTION_GLOBAL_API_KEY;

    if (!evolutionUrl || !globalApiKey) {
      return NextResponse.json({ error: 'API Keys da Evolution não configuradas no Servidor.' }, { status: 500 });
    }

    // 2. Busca lista de instâncias atual no Evolution API
    const fetchRes = await fetch(`${evolutionUrl}/instance/fetchInstances`, {
      method: 'GET',
      headers: {
        'apikey': globalApiKey
      }
    });

    if (!fetchRes.ok) {
        throw new Error('Falha ao contactar Evolution API');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allInstances: any[] = await fetchRes.json();

    // 3. Fazer o merge das informações (estado da conexao real)
    const result = channels.map(channel => {
      // Tentativa de achar o channel no array da Evolution de forma robusta
      const evoInst = allInstances.find(i => 
        (i?.instance?.instanceName === channel.identifier) || 
        (i?.instanceName === channel.identifier) ||
        (i?.name === channel.identifier)
      );

      let state = 'disconnected';
      const instData = evoInst?.instance || evoInst;

      if (instData) {
        state = instData.state || instData.status || instData.connectionStatus || 'disconnected';
      }

      // Evita falsos-negativos
      if (typeof state === 'string' && (state.toLowerCase() === 'open' || state.toLowerCase() === 'connected')) {
        state = 'open';
      }

      // Tentativa de extrair o número de telefone conectado (Jid ou Profile Jid no Evolution V2)
      let phoneConnected = "";
      if (instData?.ownerJid) {
         phoneConnected = instData.ownerJid.split('@')[0];
      } else if (instData?.profile?.id) {
         phoneConnected = instData.profile.id.split('@')[0];
      } else if (instData?.info?.wid) {
         phoneConnected = instData.info.wid.split(':')[0].split('@')[0];
      } else if (instData?.number) {
         phoneConnected = instData.number;
      }

      return {
        id: channel.id,
        name: channel.name,
        instanceName: channel.identifier,
        state: state,
        created_at: channel.created_at,
        active: channel.active,
        phone: phoneConnected
      };
    });

    return NextResponse.json({ instances: result });

  } catch (error: unknown) {
    console.error("Exceção GET /instances:", error);
    if (error instanceof Error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
