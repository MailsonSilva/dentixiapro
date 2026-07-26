-- Migration: 20260725230000_admin_panel_features.sql

-- 1. Adicionar colunas de controle na tabela usuarios
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- 2. Garantir índice para busca de clientes por nome, email, whatsapp e referral_code
CREATE INDEX IF NOT EXISTS idx_usuarios_search ON public.usuarios (email, nome_completo, telefone, referral_code);
CREATE INDEX IF NOT EXISTS idx_usuarios_created_at ON public.usuarios (created_at);

-- 3. Criar função SECURITY DEFINER para checar permissão de admin sem recursão em RLS
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

-- 4. Atualizar políticas RLS da tabela usuarios sem recursão
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
