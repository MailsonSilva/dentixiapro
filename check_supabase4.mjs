import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://setwhujbophxwzighcge.supabase.co';
const supabaseKey = 'sb_secret_3ZtEGoCP8KBofn9e59jVsQ_LR86LsQI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const targetId = 'fd8b22aa-e727-4bb3-aa4d-e63f6c0e3ca9';
  console.log('Checking ID:', targetId);
  
  const { data: q2 } = await supabase.from('contacts').select('id, name').eq('id', targetId).limit(1);
  console.log('Is it a Contact?', JSON.stringify(q2));

  const { data: q4 } = await supabase.from('conversations').select('*').limit(2);
  console.log('Sample Conversations:', JSON.stringify(q4));
  
  const { data: q5 } = await supabase.from('company').select('*').limit(1);
  console.log('Sample Company:', JSON.stringify(q5));
}

check();
