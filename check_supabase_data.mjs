import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://setwhujbophxwzighcge.supabase.co';
const supabaseKey = 'sb_secret_3ZtEGoCP8KBofn9e59jVsQ_LR86LsQI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: q1, error: e1 } = await supabase.from('n8n_chat_histories').select('*').order('id', { ascending: false }).limit(2);
  console.log('--- N8N CHAT HISTORIES ---');
  console.log(JSON.stringify(q1, null, 2));
  
  if (q1 && q1.length > 0) {
     const sessionId = q1[0].session_id;
     console.log('Session ID:', sessionId);
     // Try to fetch the conversation
     const { data: q2, error: e2 } = await supabase.from('conversations').select('*').eq('id', sessionId).limit(1);
     console.log('--- MATCHING CONVERSATION ---');
     console.log(JSON.stringify(q2, null, 2));
     if(e2) console.error('Conv Error:', e2);
  }
}

check();
