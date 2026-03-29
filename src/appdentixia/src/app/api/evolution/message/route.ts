import { NextResponse } from "next/server";
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
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
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { text, phone, instance } = await req.json();

    if (!text || !phone || !instance) {
      return NextResponse.json({ error: "Faltam parâmetros obrigatórios (text, phone, instance)" }, { status: 400 });
    }

    const evolutionUrl = process.env.EVOLUTION_API_URL?.replace(/\/+$/, '');
    const globalApiKey = process.env.EVOLUTION_GLOBAL_API_KEY;

    if (!evolutionUrl || !globalApiKey) {
      return NextResponse.json({ error: "API Keys Evolution não configuradas no servidor." }, { status: 500 });
    }

    // Adaptar Telefone ("551199..." sem @s.whatsapp.net para o Evolution API sendText)
    const cleanPhone = phone.replace(/\D/g, "");

    console.log(`[Evolution Send] Disparando para ${cleanPhone} usando instância ${instance}...`);

    const response = await fetch(`${evolutionUrl}/message/sendText/${instance}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": globalApiKey
      },
      body: JSON.stringify({
        number: cleanPhone,
        text: text
      })
    });

    const responseData = await response.json();

    if (!response.ok) {
        console.error("[Evolution Rota] Erro do WhatsApp:", responseData);
        return NextResponse.json({ 
            error: responseData?.response?.message || responseData?.message || "WhatsApp API recusou o envio. O número é válido?" 
        }, { status: response.status });
    }

    return NextResponse.json({ success: true, evolution: responseData });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro interno do Backend Rota Message";
    console.error("[Evolution Rota] Erro Fatal:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
