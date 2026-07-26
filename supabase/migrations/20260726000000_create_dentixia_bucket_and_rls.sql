-- Create public bucket `dentixia` for all Dentixia platform static assets
-- (logo, logo-icon, tip images). Client logos remain in `logoEmpresa`.
INSERT INTO storage.buckets (id, name, public)
VALUES ('dentixia', 'dentixia', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies to avoid conflicts on re-run
DROP POLICY IF EXISTS "Leitura pública dentixia" ON storage.objects;

-- Public read access (no auth required — these are static brand assets)
CREATE POLICY "Leitura pública dentixia" ON storage.objects
FOR SELECT
USING (bucket_id = 'dentixia');
