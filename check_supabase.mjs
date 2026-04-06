import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://setwhujbophxwzighcge.supabase.co';
const supabaseKey = 'sb_secret_3ZtEGoCP8KBofn9e59jVsQ_LR86LsQI'; // using service role key
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Checking tables...");
  const { data: q1, error: e1 } = await supabase.from('n8n_chat_histories').select('id, session_id').limit(1);
  console.log('n8n_chat_histories check:', q1 ? 'exists' : e1?.message);

  const { data: q2, error: e2 } = await supabase.from('messages').select('id').limit(1);
  console.log('messages check:', q2 ? 'exists' : e2?.message);
}

check();
