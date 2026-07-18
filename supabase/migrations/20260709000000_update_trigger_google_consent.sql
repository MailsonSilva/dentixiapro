-- ===================================================================
-- MIGRATION: 20260709000000_update_trigger_google_consent.sql
-- 
-- Melhora o trigger handle_new_user para verificar consentimentos
-- existentes por e-mail ao logar via Google/OAuth.
-- ===================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  existing_user_id UUID;
  has_consent BOOLEAN;
BEGIN
  -- 1. Verifica se já existe um usuário cadastrado com este e-mail no public.usuarios
  SELECT id INTO existing_user_id 
  FROM public.usuarios 
  WHERE email = new.email 
  LIMIT 1;
  
  -- 2. Se o usuário não existe na tabela public.usuarios, cria o registro normalmente
  IF existing_user_id IS NULL THEN
    INSERT INTO public.usuarios (id, email, nome_completo, tipo, trial_ends_at, logo_url, telefone, referral_code)
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

  -- 3. Verifica se este e-mail já possui termo de consentimento aceito 
  --    (pesquisa pelo id do usuário existente ou pelo id novo)
  SELECT EXISTS(
    SELECT 1 
    FROM public.consentimentos 
    WHERE user_id = existing_user_id
  ) INTO has_consent;

  -- 4. Se não houver consentimento registrado para esse e-mail, insere o consentimento automático
  IF NOT has_consent THEN
    INSERT INTO public.consentimentos (user_id, aceitou_em, versao_politica)
    VALUES (new.id, now(), '1.0')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
