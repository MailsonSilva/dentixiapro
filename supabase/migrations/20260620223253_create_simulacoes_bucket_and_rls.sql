-- Criar bucket 'simulacoes' no storage do Supabase
INSERT INTO storage.buckets (id, name, public)
VALUES ('simulacoes', 'simulacoes', true)
ON CONFLICT (id) DO NOTHING;

-- Excluir políticas antigas se existirem para evitar conflitos de recriação
DROP POLICY IF EXISTS "Leitura pública para simulacoes" ON storage.objects;
DROP POLICY IF EXISTS "Upload permitido apenas para a pasta própria em simulacoes" ON storage.objects;
DROP POLICY IF EXISTS "Exclusão permitida apenas para arquivos próprios em simulacoes" ON storage.objects;

-- Criar política de Leitura pública para o bucket 'simulacoes'
CREATE POLICY "Leitura pública para simulacoes" ON storage.objects
FOR SELECT
USING (bucket_id = 'simulacoes');

-- Criar política de Upload (INSERT) limitado à própria pasta (nomeada com o ID do usuário)
CREATE POLICY "Upload permitido apenas para a pasta própria em simulacoes" ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'simulacoes' 
  AND auth.role() = 'authenticated' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Criar política de Exclusão (DELETE) limitada a arquivos da própria pasta
CREATE POLICY "Exclusão permitida apenas para arquivos próprios em simulacoes" ON storage.objects
FOR DELETE
USING (
  bucket_id = 'simulacoes' 
  AND auth.role() = 'authenticated' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
