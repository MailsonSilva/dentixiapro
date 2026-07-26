-- Migration: 20260726020000_update_notifications_rls.sql

-- Atualizar políticas RLS da tabela notifications_history para permitir leitura por todos os usuários autenticados
DROP POLICY IF EXISTS "Admins can read notifications history" ON public.notifications_history;
DROP POLICY IF EXISTS "Authenticated users can read notifications" ON public.notifications_history;

CREATE POLICY "Authenticated users can read notifications"
ON public.notifications_history FOR SELECT
TO authenticated
USING (true);
