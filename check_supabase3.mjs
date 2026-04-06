import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://setwhujbophxwzighcge.supabase.co';
const supabaseKey = 'sb_secret_3ZtEGoCP8KBofn9e59jVsQ_LR86LsQI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.rpc('get_triggers');
  // if rpc 'get_triggers' doesn't exist it will error, which is fine
  console.log('rpc:', error || data);
}

check();
