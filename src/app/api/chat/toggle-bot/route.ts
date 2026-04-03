import { NextRequest, NextResponse } from "next/server";

const REDIS_URL = process.env.REDIS_URL || "";
const REDIS_TOKEN = process.env.REDIS_TOKEN || "";

/**
 * POST /api/chat/toggle-bot
 * Atualiza o AgenteStatus no Redis do n8n.
 * "Desativado" → IA para de responder
 * "Ativo"       → IA volta a responder
 */
export async function POST(req: NextRequest) {
  try {
    const { remoteJid, enabled } = await req.json();
    if (!remoteJid) return NextResponse.json({ error: "remoteJid é obrigatório" }, { status: 400 });

    const status = enabled ? "Ativo" : "Desativado";
    const key = `${remoteJid}_status`;

    // Upstash Redis REST API
    if (REDIS_URL && REDIS_TOKEN) {
      const res = await fetch(`${REDIS_URL}/set/${encodeURIComponent(key)}/${encodeURIComponent(status)}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
      });
      if (!res.ok) {
        const err = await res.text();
        console.warn("[toggle-bot] Redis error:", err);
      }
    } else {
      console.warn("[toggle-bot] REDIS_URL/TOKEN não configurados — só Supabase foi atualizado");
    }

    return NextResponse.json({ success: true, status });
  } catch (err: unknown) {
    console.error("[toggle-bot]", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
