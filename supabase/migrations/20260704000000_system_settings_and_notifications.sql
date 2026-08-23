-- Migration: 20260704000000_system_settings_and_notifications.sql
-- Descrição: Configurações globais do sistema (ex: vídeo de boas-vindas) e histórico de notificações

-- 1. Tabela system_settings para configurações globais do sistema
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura de configuracoes do sistema" ON public.system_settings;
CREATE POLICY "Leitura de configuracoes do sistema"
ON public.system_settings FOR SELECT
TO public, authenticated, anon
USING (true);

DROP POLICY IF EXISTS "Admins podem gerenciar configuracoes" ON public.system_settings;
CREATE POLICY "Admins podem gerenciar configuracoes"
ON public.system_settings FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Inserir chave padrão do vídeo de boas-vindas se não existir
INSERT INTO public.system_settings (key, value)
VALUES ('welcome_video_url', 'https://youtu.be/dQw4w9WgXcQ')
ON CONFLICT (key) DO NOTHING;

-- 2. Tabela public.notifications_history e índices
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

CREATE INDEX IF NOT EXISTS idx_notifications_history_created_at ON public.notifications_history (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_history_category ON public.notifications_history (category);
CREATE INDEX IF NOT EXISTS idx_notifications_history_target ON public.notifications_history (target_audience);

ALTER TABLE public.notifications_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read notifications" ON public.notifications_history;
CREATE POLICY "Authenticated users can read notifications"
ON public.notifications_history FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can insert notifications history" ON public.notifications_history;
CREATE POLICY "Admins can insert notifications history"
ON public.notifications_history FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin(auth.uid())
);
