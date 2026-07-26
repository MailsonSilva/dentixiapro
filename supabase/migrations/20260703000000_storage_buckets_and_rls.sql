-- Migration: 20260703000000_storage_buckets_and_rls.sql
-- Descrição: Configuração dos buckets de Storage (simulacoes, dentixia) e RLS de isolamento de pasta por usuário

-- 1. Buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('simulacoes', 'simulacoes', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('dentixia', 'dentixia', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Políticas RLS para Bucket 'dentixia' (Ativos estáticos da plataforma)
DROP POLICY IF EXISTS "Leitura pública dentixia" ON storage.objects;
CREATE POLICY "Leitura pública dentixia" ON storage.objects
FOR SELECT
USING (bucket_id = 'dentixia');

-- 3. Políticas RLS para Bucket 'simulacoes' (Fotos de pacientes e simulações)
DROP POLICY IF EXISTS "Leitura pública para simulacoes" ON storage.objects;
DROP POLICY IF EXISTS "Upload permitido apenas para a pasta própria em simulacoes" ON storage.objects;
DROP POLICY IF EXISTS "Exclusão permitida apenas para arquivos próprios em simulacoes" ON storage.objects;

-- Leitura pública para exibição de imagens simuladas
CREATE POLICY "Leitura pública para simulacoes" ON storage.objects
FOR SELECT
USING (bucket_id = 'simulacoes');

-- Upload restrito estritamente à pasta nomeada com o próprio auth.uid() do usuário
CREATE POLICY "Upload permitido apenas para a pasta própria em simulacoes" ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'simulacoes' 
  AND auth.role() = 'authenticated' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Exclusão restrita apenas a arquivos na pasta do próprio usuário (ou Admin)
CREATE POLICY "Exclusão permitida apenas para arquivos próprios em simulacoes" ON storage.objects
FOR DELETE
USING (
  bucket_id = 'simulacoes' 
  AND auth.role() = 'authenticated' 
  AND (
    (storage.foldername(name))[1] = auth.uid()::text OR public.is_admin(auth.uid())
  )
);
