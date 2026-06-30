-- 20260629213300_add_trial_defaults_and_consent.sql
-- Atualiza a função trigger de criação de perfil de usuário para incluir dias de trial padrão, consentimento automático e captação de dados de login social.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.usuarios (id, email, nome_completo, tipo, trial_ends_at, logo_url, telefone)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'comum',
    now() + interval '7 days',
    COALESCE(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    COALESCE(new.phone, new.raw_user_meta_data->>'phone', new.raw_user_meta_data->>'phone_number')
  )
  ON CONFLICT (id) DO UPDATE SET
    nome_completo = EXCLUDED.nome_completo,
    logo_url = COALESCE(usuarios.logo_url, EXCLUDED.logo_url),
    telefone = COALESCE(usuarios.telefone, EXCLUDED.telefone);

  -- Inserir consentimento automático para o novo usuário
  INSERT INTO public.consentimentos (user_id, aceitou_em, versao_politica)
  VALUES (new.id, now(), '1.0')
  ON CONFLICT DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Executa o backfill do trial de 7 dias para usuários antigos onde trial_ends_at está NULL
UPDATE public.usuarios 
SET trial_ends_at = created_at + interval '7 days' 
WHERE trial_ends_at IS NULL;

-- 2. Executa o backfill de dados sociais (logo/telefone) de logins anteriores que ficaram em branco
UPDATE public.usuarios u
SET 
  logo_url = COALESCE(u.logo_url, a.raw_user_meta_data->>'avatar_url', a.raw_user_meta_data->>'picture'),
  telefone = COALESCE(u.telefone, a.phone, a.raw_user_meta_data->>'phone', a.raw_user_meta_data->>'phone_number')
FROM auth.users a
WHERE u.id = a.id 
  AND (u.logo_url IS NULL OR u.telefone IS NULL);

-- 3. Executa o backfill de consentimento de políticas para usuários já existentes
INSERT INTO public.consentimentos (user_id, aceitou_em, versao_politica)
SELECT id, COALESCE(created_at, now()), '1.0'
FROM public.usuarios
WHERE id NOT IN (SELECT user_id FROM public.consentimentos)
ON CONFLICT DO NOTHING;
