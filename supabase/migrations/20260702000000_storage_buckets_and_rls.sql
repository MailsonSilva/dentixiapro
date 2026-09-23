-- Migration: 20260702000000_storage_buckets_and_rls.sql
-- Descrição: Configuração e políticas RLS completas para todos os buckets de Storage (dentixia, simulacoes, logoEmpresa)

-- 1. Criação dos buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('dentixia', 'dentixia', true),
  ('simulacoes', 'simulacoes', true),
  ('logoEmpresa', 'logoEmpresa', true)
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

CREATE POLICY "Leitura pública para simulacoes" ON storage.objects
FOR SELECT
USING (bucket_id = 'simulacoes');

CREATE POLICY "Upload permitido apenas para a pasta própria em simulacoes" ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'simulacoes' 
  AND auth.role() = 'authenticated' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Exclusão permitida apenas para arquivos próprios em simulacoes" ON storage.objects
FOR DELETE
USING (
  bucket_id = 'simulacoes' 
  AND auth.role() = 'authenticated' 
  AND (
    (storage.foldername(name))[1] = auth.uid()::text OR public.is_admin(auth.uid())
  )
);

-- 4. Políticas RLS para Bucket 'logoEmpresa' (Logo/Foto de perfil do dentista - raiz ou pasta)
DROP POLICY IF EXISTS "Logo SELECT publica" ON storage.objects;
DROP POLICY IF EXISTS "Logo INSERT proprio usuario" ON storage.objects;
DROP POLICY IF EXISTS "Logo UPDATE proprio usuario" ON storage.objects;
DROP POLICY IF EXISTS "Logo DELETE proprio usuario" ON storage.objects;

CREATE POLICY "Logo SELECT publica" ON storage.objects
FOR SELECT
USING (bucket_id = 'logoEmpresa');

CREATE POLICY "Logo INSERT proprio usuario" ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'logoEmpresa'
  AND auth.role() = 'authenticated'
  AND (
    split_part(name, '.', 1) = auth.uid()::text
    OR
    (storage.foldername(name))[1] = auth.uid()::text
  )
);

CREATE POLICY "Logo UPDATE proprio usuario" ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'logoEmpresa'
  AND auth.role() = 'authenticated'
  AND (
    split_part(name, '.', 1) = auth.uid()::text
    OR
    (storage.foldername(name))[1] = auth.uid()::text
  )
);

CREATE POLICY "Logo DELETE proprio usuario" ON storage.objects
FOR DELETE
USING (
  bucket_id = 'logoEmpresa'
  AND auth.role() = 'authenticated'
  AND (
    split_part(name, '.', 1) = auth.uid()::text
    OR
    (storage.foldername(name))[1] = auth.uid()::text
  )
);
