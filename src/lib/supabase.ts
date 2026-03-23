import { createBrowserClient } from '@supabase/ssr';

export const createClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    // Retorna um cliente nulo ou loga o aviso durante o build sem quebrar o processo
    if (typeof window === 'undefined') {
       console.warn("⚠️ Variáveis do Supabase ausentes no momento do build.");
    }
  }

  return createBrowserClient(
    url || "",
    anonKey || ""
  );
};

export const supabase = createClient();
