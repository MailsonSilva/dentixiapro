-- Migration: 20260706000000_verificar_status_usuario_view.sql
-- Descrição: View para verificação de status da assinatura, trial e privilégios de Admin do usuário

CREATE OR REPLACE VIEW public.verificar_status_usuario AS
 SELECT u.id AS user_id,
    COALESCE((uc.company_id)::text, 'novo_usuario'::text) AS company_id,
    u.trial_ends_at,
    s.price_id AS plano_atual,
        CASE
            WHEN (u.tipo = 'admin'::tipo_usuario OR public.is_admin(u.id)) THEN 3
            WHEN ((s.status = ANY (ARRAY['active'::subscription_status, 'trialing'::subscription_status])) OR (u.trial_ends_at > now())) THEN 3
            WHEN (uc.company_id IS NULL) THEN 1
            ELSE 2
        END AS status_code,
        CASE
            WHEN (u.tipo = 'admin'::tipo_usuario OR public.is_admin(u.id)) THEN 'Acesso Liberado (Admin).'::text
            WHEN ((s.status = ANY (ARRAY['active'::subscription_status, 'trialing'::subscription_status])) OR (u.trial_ends_at > now())) THEN 'Acesso Liberado.'::text
            WHEN (uc.company_id IS NULL) THEN 'Trial Expirado -> Cadastrar Empresa.'::text
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
          ORDER BY subscriptions.company_id, subscriptions.created DESC) s ON ((uc.company_id = s.company_id)))
  WHERE (u.id = auth.uid());
