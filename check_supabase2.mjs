import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://setwhujbophxwzighcge.supabase.co';
const supabaseKey = 'sb_secret_3ZtEGoCP8KBofn9e59jVsQ_LR86LsQI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: q1, error: e1 } = await supabase.from('n8n_chat_histories').select('*').limit(1);
  console.log('n8n_chat_histories row:', JSON.stringify(q1, null, 2), e1);

  const { data: q2, error: e2 } = await supabase.from('messages').select('*').limit(1);
  console.log('messages row:', JSON.stringify(q2, null, 2), e2);
}

check();
