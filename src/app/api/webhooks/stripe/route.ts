// Rota desativada. O processamento do Stripe Webhook é gerenciado diretamente pelas Edge Functions do Supabase.
export async function POST() {
  return new Response("Webhook gerenciado pelo Supabase Edge Functions", { status: 200 });
}
