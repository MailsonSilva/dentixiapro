-- Migration: 20260705000000_subscriptions_and_status_view.sql
-- Descrição: Vínculo user_company, políticas de segurança Stripe (customers/subscriptions) e view de status de usuário definitiva

-- 1. Garantir existência e integridade da tabela user_company
CREATE TABLE IF NOT EXISTS public.user_company (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'owner',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, company_id)
);

ALTER TABLE public.user_company ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios podem ler seu vinculo com empresa" ON public.user_company;
CREATE POLICY "Usuarios podem ler seu vinculo com empresa"
ON public.user_company FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- 2. Políticas RLS para tabela customers (Stripe)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'customers') THEN
    ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Usuarios podem ler seu customer Stripe" ON public.customers;
    CREATE POLICY "Usuarios podem ler seu customer Stripe"
    ON public.customers FOR SELECT
    TO authenticated
    USING (
      company_id::text = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.user_company uc 
        WHERE uc.user_id = auth.uid() AND uc.company_id::text = customers.company_id::text
      )
      OR public.is_admin(auth.uid())
    );
  END IF;
END $$;

-- 3. Políticas RLS para tabela subscriptions (Stripe)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'subscriptions') THEN
    ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Usuarios podem ler suas assinaturas" ON public.subscriptions;
    CREATE POLICY "Usuarios podem ler suas assinaturas"
    ON public.subscriptions FOR SELECT
    TO authenticated
    USING (
      company_id::text = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.user_company uc 
        WHERE uc.user_id = auth.uid() AND uc.company_id::text = subscriptions.company_id::text
      )
      OR public.is_admin(auth.uid())
    );
  END IF;
END $$;

-- 4. View definitiva verificar_status_usuario com suporte resiliente a company_id = user_id
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
