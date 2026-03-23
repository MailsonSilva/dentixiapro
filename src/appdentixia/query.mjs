import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('view_parceiro_lista_indicados').select('*').limit(1);
  console.log('view_parceiro_lista_indicados:', data, error);

  const { data: res, error: e2 } = await supabase.from('view_parceiro_resumo_cards').select('*').limit(1);
  console.log('view_parceiro_resumo_cards:', res, e2);
}
run();
