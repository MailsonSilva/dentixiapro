import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
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

    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: 'Nome do canal é obrigatório' }, { status: 400 });
    }

    const evolutionUrl = process.env.EVOLUTION_API_URL?.replace(/\/+$/, ''); // Ensure no trailing slash
    const globalApiKey = process.env.EVOLUTION_GLOBAL_API_KEY;
    
    const host = request.headers.get("host") || "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    const webhookUrl = process.env.NEXT_PUBLIC_SITE_URL 
         ? `${process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, '')}/api/evolution/webhook` 
         : `${protocol}://${host}/api/evolution/webhook`;

    if (!evolutionUrl || !globalApiKey) {
      return NextResponse.json({ error: 'API Keys da Evolution não configuradas no Servidor.' }, { status: 500 });
    }

    // Gerar um nome único e minúsculo para a instância
    const cleanName = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
    const uniqueSuffix = Math.floor(Date.now() / 1000).toString();
    const instanceName = `${cleanName}_${uniqueSuffix}`;

    console.log(`[Evolution] Criando instância: ${instanceName} para empresa ${companyId}`);

    // Configurando Payload para Evolution API v2
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const createPayload: any = {
      instanceName,
      integration: "WHATSAPP-BAILEYS",
      qrcode: true,
      rejectCall: true,
      groupsIgnore: true,
      alwaysOnline: true,
      readMessages: false,
      readStatus: false,
    };

    if (webhookUrl) {
      createPayload.webhook = {
        url: webhookUrl,
        byEvents: false,
        base64: true,
        events: ["MESSAGES_UPSERT"]
      };
    }

    // 1. Criar Instância (já configurada com Webhook no v2)
    const createRes = await fetch(`${evolutionUrl}/instance/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': globalApiKey
      },
      body: JSON.stringify(createPayload)
    });

    if (!createRes.ok) {
        const err = await createRes.text();
        console.error("Erro Evolution (Create):", err);
        return NextResponse.json({ error: 'Falha ao criar instância na Evolution API: ' + err }, { status: 500 });
    }

    const createData = await createRes.json();
    let qrCodeBase64 = createData.qrcode?.base64;

    // Dependendo da versao da api da Evolution, o payload pode alterar a chave
    if (!qrCodeBase64 && createData.qrcode && typeof createData.qrcode === 'string') {
      qrCodeBase64 = createData.qrcode;
    }

    // 2. Salvar no Supabase
    const { data: channelData, error: insertError } = await supabase
      .from('communication_channels')
      .insert({
        company_id: companyId,
        type: 'whatsapp',
        identifier: instanceName,
        name: name,
        active: true
      })
      .select()
      .single();

    if (insertError) {
      console.error("Erro Supabase (Insert):", insertError);
      return NextResponse.json({ error: 'Falha ao vincular canal à empresa' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      instanceName,
      qrcode: qrCodeBase64,
      channel: channelData
    });

  } catch (error: unknown) {
    console.error("Exceção:", error);
    if (error instanceof Error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
