-- Migration: 20260707000000_fix_logo_empresa_rls.sql
-- Descricao: Cria o bucket logoEmpresa e corrige as politicas RLS
-- O arquivo e salvo como {user.id}.{ext} na raiz do bucket (sem subpasta)
-- A policy anterior usava foldername() que nao funciona para arquivos na raiz

-- 1. Criar bucket se nao existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('logoEmpresa', 'logoEmpresa', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Remover politicas antigas
DROP POLICY IF EXISTS "Insert vbymam_0" ON storage.objects;
DROP POLICY IF EXISTS "Update vbymam_0" ON storage.objects;
DROP POLICY IF EXISTS "Select s9cuo1_0" ON storage.objects;
DROP POLICY IF EXISTS "Delete vbymam_0" ON storage.objects;
DROP POLICY IF EXISTS "Logo SELECT publica" ON storage.objects;
DROP POLICY IF EXISTS "Logo INSERT proprio usuario" ON storage.objects;
DROP POLICY IF EXISTS "Logo UPDATE proprio usuario" ON storage.objects;
DROP POLICY IF EXISTS "Logo DELETE proprio usuario" ON storage.objects;

-- 3. SELECT: leitura publica
CREATE POLICY "Logo SELECT publica" ON storage.objects
FOR SELECT
USING (bucket_id = 'logoEmpresa');

-- 4. INSERT: usuario autenticado pode fazer upload do seu proprio arquivo
-- Suporta: raiz (uid.ext) ou pasta (uid/arquivo.ext)
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

-- 5. UPDATE
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

-- 6. DELETE
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
