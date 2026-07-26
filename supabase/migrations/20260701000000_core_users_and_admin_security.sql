-- Migration: 20260701000000_core_users_and_admin_security.sql
-- Descrição: Estrutura base de usuários, função is_admin e segurança RLS sem recursão

-- 1. Colunas de controle na tabela public.usuarios (se não existirem)
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
ADD COLUMN IF NOT EXISTS check_video BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '7 days'),
ADD COLUMN IF NOT EXISTS referral_code TEXT;

-- 2. Índices de alta performance para busca e filtros de usuários
CREATE INDEX IF NOT EXISTS idx_usuarios_search ON public.usuarios (email, nome_completo, telefone, referral_code);
CREATE INDEX IF NOT EXISTS idx_usuarios_created_at ON public.usuarios (created_at);

-- 3. Função SECURITY DEFINER para verificar se o usuário é Admin sem causar recursão RLS
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.usuarios 
    WHERE id = user_id AND tipo::text IN ('admin', 'super_admin', 'parceiro')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Atualizar/Garantir RLS na tabela usuarios
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

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
