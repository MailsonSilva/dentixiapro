-- Migration: 20260705000000_notifications_history.sql
-- Descrição: Tabela public.notifications_history e políticas RLS

-- 1. Criar tabela de Histórico de Notificações
CREATE TABLE IF NOT EXISTS public.notifications_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  category VARCHAR(50) NOT NULL, -- 'comum', 'aviso', 'atualizacao', 'promocao'
  target_audience VARCHAR(50) NOT NULL, -- 'all', 'new_users', 'trial', 'subscribers', 'inactive'
  recipients_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  created_by UUID REFERENCES public.usuarios(id) ON DELETE SET NULL
);

-- 2. Índices de performance
CREATE INDEX IF NOT EXISTS idx_notifications_history_created_at ON public.notifications_history (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_history_category ON public.notifications_history (category);
CREATE INDEX IF NOT EXISTS idx_notifications_history_target ON public.notifications_history (target_audience);

-- 3. Habilitar RLS
ALTER TABLE public.notifications_history ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS
DROP POLICY IF EXISTS "Admins can read notifications history" ON public.notifications_history;
DROP POLICY IF EXISTS "Authenticated users can read notifications" ON public.notifications_history;
DROP POLICY IF EXISTS "Admins can insert notifications history" ON public.notifications_history;

-- Permitir que todos os usuários autenticados leiam as notificações publicadas
CREATE POLICY "Authenticated users can read notifications"
ON public.notifications_history FOR SELECT
TO authenticated
USING (true);

-- Apenas administradores podem registrar novas notificações no histórico
CREATE POLICY "Admins can insert notifications history"
ON public.notifications_history FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin(auth.uid())
);
