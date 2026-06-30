-- ===================================================================
-- MIGRATION: 20260629213300_add_trial_defaults_and_consent.sql
-- 
-- Execute este script no SQL Editor do Supabase Dashboard.
-- ===================================================================

-- 1. Atualiza o trigger de criação de usuário para incluir trial_ends_at,
--    sincronização de dados OAuth (avatar, telefone) e consentimento automático.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.usuarios (id, email, nome_completo, tipo, trial_ends_at, logo_url, telefone)
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
      new.raw_user_meta_data->>'phone',
      new.raw_user_meta_data->>'phone_number'
    )
  )
  ON CONFLICT (id) DO NOTHING;

  -- Inserir consentimento automático para o novo usuário
  INSERT INTO public.consentimentos (user_id, aceitou_em, versao_politica)
  VALUES (new.id, now(), '1.0')
  ON CONFLICT DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================================================
-- 2. BACKFILL: Concede 7 dias de trial a partir do created_at
--    para todos os usuários existentes onde trial_ends_at é NULL.
-- ===================================================================
UPDATE public.usuarios 
SET trial_ends_at = created_at + interval '7 days' 
WHERE trial_ends_at IS NULL;

-- ===================================================================
-- 3. BACKFILL: Preenche logo_url com o avatar do Google/OAuth
--    para usuários que fizeram login social mas estão sem foto.
-- ===================================================================
UPDATE public.usuarios u
SET 
  logo_url = COALESCE(
    u.logo_url,
    a.raw_user_meta_data->>'avatar_url',
    a.raw_user_meta_data->>'picture'
  ),
  nome_completo = CASE
    WHEN u.nome_completo IS NULL OR u.nome_completo = split_part(a.email, '@', 1)
    THEN COALESCE(
      a.raw_user_meta_data->>'full_name',
      a.raw_user_meta_data->>'name',
      u.nome_completo
    )
    ELSE u.nome_completo
  END
FROM auth.users a
WHERE u.id = a.id;

-- ===================================================================
-- 4. BACKFILL: Insere consentimento para usuários já existentes
--    que não possuem registro na tabela consentimentos.
-- ===================================================================
INSERT INTO public.consentimentos (user_id, aceitou_em, versao_politica)
SELECT id, COALESCE(created_at, now()), '1.0'
FROM public.usuarios
WHERE id NOT IN (SELECT user_id FROM public.consentimentos)
ON CONFLICT DO NOTHING;
