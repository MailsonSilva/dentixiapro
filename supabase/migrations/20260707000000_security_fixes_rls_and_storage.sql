-- Migration: 20260707000000_security_fixes_rls_and_storage.sql
-- Descrição: Correções de segurança críticas:
-- 1. Remoção de 'parceiro' da função is_admin() para restabelecer o isolamento de tenant via RLS.
-- 2. Restrição de leitura pública do bucket de storage 'simulacoes' (privacidade de imagens médicas de pacientes).
-- 3. Atualização das políticas dependentes em tabelas e storage.

-- 1. Redefinição estrita da função is_admin() (apenas 'admin' e 'super_admin')
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.usuarios 
    WHERE id = user_id AND tipo::text IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Atualização das políticas RLS da tabela usuarios para garantir isolamento
DROP POLICY IF EXISTS "Admins can read all users" ON public.usuarios;
DROP POLICY IF EXISTS "Admins can update all users" ON public.usuarios;

CREATE POLICY "Admins can read all users" 
ON public.usuarios FOR SELECT 
TO authenticated 
USING (
  auth.uid() = id OR public.is_admin(auth.uid())
);

CREATE POLICY "Admins can update all users" 
ON public.usuarios FOR UPDATE 
TO authenticated 
USING (
  auth.uid() = id OR public.is_admin(auth.uid())
);

-- 3. Blindagem de privacidade do Bucket 'simulacoes' no Storage
-- Remove política pública de leitura
DROP POLICY IF EXISTS "Leitura pública para simulacoes" ON storage.objects;
DROP POLICY IF EXISTS "Leitura restrita para simulacoes" ON storage.objects;

-- Concede leitura SELECT apenas para o próprio dentista/proprietário da pasta ou administradores
CREATE POLICY "Leitura restrita para simulacoes" ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'simulacoes' 
  AND (
    (storage.foldername(name))[1] = auth.uid()::text 
    OR public.is_admin(auth.uid())
  )
);

-- 4. Garantir políticas seguras para public.simulacoes
DROP POLICY IF EXISTS "Admins can read all simulacoes" ON public.simulacoes;
DROP POLICY IF EXISTS "Users can delete own simulacoes" ON public.simulacoes;

CREATE POLICY "Admins can read all simulacoes"
ON public.simulacoes FOR SELECT
TO authenticated
USING (
  usuario_id = auth.uid() OR public.is_admin(auth.uid())
);

CREATE POLICY "Users can delete own simulacoes"
ON public.simulacoes FOR DELETE
TO authenticated
USING (
  usuario_id = auth.uid() OR public.is_admin(auth.uid())
);

-- 5. Atualização da view verificar_status_usuario para refletir as novas regras de admin
CREATE OR REPLACE VIEW public.verificar_status_usuario AS
 SELECT u.id AS user_id,
    COALESCE((uc.company_id)::text, (u.id)::text, 'novo_usuario'::text) AS company_id,
    u.trial_ends_at,
    s.price_id AS plano_atual,
        CASE
            WHEN (u.tipo = 'admin'::tipo_usuario OR public.is_admin(u.id)) THEN 3
            WHEN ((s.status = ANY (ARRAY['active'::subscription_status, 'trialing'::subscription_status])) OR (u.trial_ends_at > now())) THEN 3
            WHEN (uc.company_id IS NULL AND s.id IS NULL) THEN 1
            ELSE 2
        END AS status_code,
        CASE
            WHEN (u.tipo = 'admin'::tipo_usuario OR public.is_admin(u.id)) THEN 'Acesso Liberado (Admin).'::text
            WHEN ((s.status = ANY (ARRAY['active'::subscription_status, 'trialing'::subscription_status])) OR (u.trial_ends_at > now())) THEN 'Acesso Liberado.'::text
            WHEN (uc.company_id IS NULL AND s.id IS NULL) THEN 'Trial Expirado -> Cadastrar Empresa.'::text
            ELSE 'Trial Expirado -> Pagar.'::text
        END AS descricao,
        CASE
            WHEN (u.tipo = 'admin'::tipo_usuario OR public.is_admin(u.id)) THEN 999
            WHEN (s.status = ANY (ARRAY['active'::subscription_status, 'trialing'::subscription_status])) THEN 999
            WHEN (u.trial_ends_at > now()) THEN (ceil((EXTRACT(epoch FROM (u.trial_ends_at - now())) / (86400)::numeric)))::integer
            ELSE 0
        END AS dias_restantes
   FROM ((usuarios u
     LEFT JOIN user_company uc ON ((u.id = uc.user_id)))
     LEFT JOIN ( SELECT DISTINCT ON (subscriptions.company_id) subscriptions.id,
            subscriptions.company_id,
            subscriptions.status,
            subscriptions.metadata,
            subscriptions.price_id,
            subscriptions.quantity,
            subscriptions.cancel_at_period_end,
            subscriptions.created,
            subscriptions.current_period_start,
            subscriptions.current_period_end,
            subscriptions.ended_at,
            subscriptions.cancel_at,
            subscriptions.canceled_at,
            subscriptions.trial_start,
            subscriptions.trial_end
           FROM subscriptions
          ORDER BY subscriptions.company_id, subscriptions.created DESC) s 
          ON ((uc.company_id = s.company_id) OR (u.id = s.company_id)))
  WHERE (u.id = auth.uid());
