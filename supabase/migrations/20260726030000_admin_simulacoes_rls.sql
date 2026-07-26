-- Migration: 20260726030000_admin_simulacoes_rls.sql

-- 1. Políticas RLS para a tabela public.simulacoes (permite leitura pelo próprio usuário ou por administradores)
ALTER TABLE public.simulacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own simulacoes" ON public.simulacoes;
DROP POLICY IF EXISTS "Admins can read all simulacoes" ON public.simulacoes;

CREATE POLICY "Users can read own simulacoes"
ON public.simulacoes FOR SELECT
TO authenticated
USING (
  usuario_id = auth.uid() OR public.is_admin(auth.uid())
);

-- 2. Políticas RLS para a tabela public.simulacao_tracking (permite leitura pelo próprio usuário ou por administradores)
ALTER TABLE public.simulacao_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own simulation tracking" ON public.simulacao_tracking;
DROP POLICY IF EXISTS "Admins can read all simulation tracking" ON public.simulacao_tracking;

CREATE POLICY "Admins can read all simulation tracking"
ON public.simulacao_tracking FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR public.is_admin(auth.uid())
);
