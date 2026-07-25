-- Migration: 20260725230000_admin_panel_features.sql

-- 1. Adicionar colunas de controle na tabela usuarios
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- 2. Garantir índice para busca de clientes por nome, email, whatsapp e referral_code
CREATE INDEX IF NOT EXISTS idx_usuarios_search ON public.usuarios (email, nome_completo, telefone, referral_code);
CREATE INDEX IF NOT EXISTS idx_usuarios_created_at ON public.usuarios (created_at);

-- 3. Atualizar política de segurança para permitir que admins visualizem e atualizem todos os usuários
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Admins can read all users' AND tablename = 'usuarios'
    ) THEN
        CREATE POLICY "Admins can read all users" 
        ON public.usuarios FOR SELECT 
        TO authenticated 
        USING (
            auth.uid() = id OR 
            EXISTS (
                SELECT 1 FROM public.usuarios 
                WHERE id = auth.uid() AND tipo::text IN ('admin', 'super_admin')
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update all users' AND tablename = 'usuarios'
    ) THEN
        CREATE POLICY "Admins can update all users" 
        ON public.usuarios FOR UPDATE 
        TO authenticated 
        USING (
            EXISTS (
                SELECT 1 FROM public.usuarios 
                WHERE id = auth.uid() AND tipo::text IN ('admin', 'super_admin')
            )
        );
    END IF;
END $$;
