-- Migration: 20260702000000_auth_trigger_and_consent.sql
-- Descrição: Trigger handle_new_user unificado e tabela de consentimentos

-- 1. Garantir existência da tabela public.consentimentos
CREATE TABLE IF NOT EXISTS public.consentimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  aceitou_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  versao_politica VARCHAR(20) DEFAULT '1.0' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.consentimentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own consent" ON public.consentimentos;
CREATE POLICY "Users can read own consent"
ON public.consentimentos FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can insert own consent" ON public.consentimentos;
CREATE POLICY "Users can insert own consent"
ON public.consentimentos FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 2. Trigger handle_new_user consolidado e robusto (suporta cadastro por email e OAuth Google)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  existing_user_id UUID;
  has_consent BOOLEAN;
BEGIN
  -- Verificar se já existe registro em public.usuarios
  SELECT id INTO existing_user_id 
  FROM public.usuarios 
  WHERE email = new.email 
  LIMIT 1;
  
  IF existing_user_id IS NULL THEN
    INSERT INTO public.usuarios (
      id, 
      email, 
      nome_completo, 
      tipo, 
      trial_ends_at, 
      logo_url, 
      telefone, 
      referral_code
    )
    VALUES (
      new.id,
      new.email,
      COALESCE(
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'name',
        split_part(new.email, '@', 1)
      ),
      'comum',
      now() + interval '7 days',
      COALESCE(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
      COALESCE(
        new.phone,
        new.raw_user_meta_data->>'whatsapp',
        new.raw_user_meta_data->>'telefone',
        new.raw_user_meta_data->>'phone',
        new.raw_user_meta_data->>'phone_number'
      ),
      UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8))
    )
    ON CONFLICT (id) DO NOTHING;
    
    existing_user_id := new.id;
  END IF;

  -- Checar consentimento registrado
  SELECT EXISTS(
    SELECT 1 
    FROM public.consentimentos 
    WHERE user_id = existing_user_id
  ) INTO has_consent;

  IF NOT has_consent THEN
    INSERT INTO public.consentimentos (user_id, aceitou_em, versao_politica)
    VALUES (existing_user_id, now(), '1.0')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Vincular trigger na tabela auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
