-- Migration: 20260725200000_add_check_video_and_simulacao_tracking.sql

-- 1. Adicionar coluna check_video na tabela usuarios (se não existir)
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS check_video BOOLEAN DEFAULT FALSE;

-- 2. Criar a tabela simulacao_tracking
CREATE TABLE IF NOT EXISTS public.simulacao_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('acerto', 'erro', 'refeita', 'salva')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS na simulacao_tracking
ALTER TABLE public.simulacao_tracking ENABLE ROW LEVEL SECURITY;

-- Política de Leitura/Escrita para o próprio usuário autenticado
CREATE POLICY "Users can insert own simulation tracking" 
ON public.simulacao_tracking FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own simulation tracking" 
ON public.simulacao_tracking FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Admins / Super Admins podem ler tudo (para o painel administrativo interno)
CREATE POLICY "Admins can read all simulation tracking" 
ON public.simulacao_tracking FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.usuarios 
        WHERE id = auth.uid() AND tipo IN ('super_admin', 'parceiro')
    )
);
