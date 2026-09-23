-- Migration: 20260706000000_cleanup_and_referral_fix.sql
-- Descrição: Limpeza de triggers/funções obsoletas e atualização do trigger de novos usuários

-- 1. Remoção de Triggers Obsoletos do banco legado
DROP TRIGGER IF EXISTS trg_apply_rules ON public.usuarios;
DROP TRIGGER IF EXISTS trg_pagamento_codigo ON public.subscriptions;
DROP TRIGGER IF EXISTS trg_parceiro_codigo ON public.usuarios;

-- 2. Remoção de Funções Obsoletas do banco legado
DROP FUNCTION IF EXISTS public.generate_referral_code();
DROP FUNCTION IF EXISTS public.trigger_usuario_pagou_ganha_codigo();
DROP FUNCTION IF EXISTS public.trigger_parceiro_nasce_com_codigo();
DROP FUNCTION IF EXISTS public.propagate_referral_info();
DROP FUNCTION IF EXISTS public.gerar_codigo_pac(uuid);
DROP FUNCTION IF EXISTS public.apply_commission_rules();

-- 3. Garantir colunas necessárias na tabela public.usuarios
ALTER TABLE public.usuarios
ADD COLUMN IF NOT EXISTS referral_code TEXT,
ADD COLUMN IF NOT EXISTS referred_by_code TEXT,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '7 days'),
ADD COLUMN IF NOT EXISTS commission_rate NUMERIC DEFAULT 10,
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS check_video BOOLEAN DEFAULT FALSE;

-- 4. Índice para busca rápida de indicação
CREATE INDEX IF NOT EXISTS idx_usuarios_referral_code ON public.usuarios (referral_code);
CREATE INDEX IF NOT EXISTS idx_usuarios_referred_by_code ON public.usuarios (referred_by_code);

-- 5. Função handle_new_user() moderna e unificada
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  existing_user_id UUID;
  has_consent BOOLEAN;
  v_tipo public.tipo_usuario;
  v_ref_code TEXT;
  v_referred_by TEXT;
  v_comm_rate NUMERIC;
  v_comm_model public.indication_type;
BEGIN
  -- 1. Determina o tipo do usuário (padrão 'comum')
  IF (new.raw_user_meta_data->>'tipo') = 'parceiro' THEN
    v_tipo := 'parceiro'::public.tipo_usuario;
    v_comm_rate := 25.0;
    v_comm_model := 'recurring'::public.indication_type;
  ELSE
    v_tipo := 'comum'::public.tipo_usuario;
    v_comm_rate := 10.0;
    v_comm_model := 'one_time'::public.indication_type;
  END IF;

  -- 2. Extrai o código de indicação de quem o indicou
  v_referred_by := NULLIF(TRIM(COALESCE(
    new.raw_user_meta_data->>'user_referredbycode',
    new.raw_user_meta_data->>'referred_by_code',
    new.raw_user_meta_data->>'ref',
    new.raw_user_meta_data->>'referral_code'
  )), '');

  -- 3. Gera código de indicação único para este novo usuário (8 caracteres alfanuméricos)
  v_ref_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || clock_timestamp()::TEXT) FROM 1 FOR 8));

  -- 4. Insere ou atualiza na tabela espelho public.usuarios
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
      referral_code,
      referred_by_code,
      commission_rate,
      commission_model
    )
    VALUES (
      new.id,
      new.email,
      COALESCE(
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'nome_completo',
        new.raw_user_meta_data->>'name',
        split_part(new.email, '@', 1)
      ),
      v_tipo,
      now() + interval '7 days',
      COALESCE(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
      COALESCE(
        new.phone,
        new.raw_user_meta_data->>'whatsapp',
        new.raw_user_meta_data->>'telefone',
        new.raw_user_meta_data->>'phone',
        new.raw_user_meta_data->>'phone_number'
      ),
      v_ref_code,
      v_referred_by,
      v_comm_rate,
      v_comm_model
    )
    ON CONFLICT (id) DO UPDATE SET
      nome_completo = EXCLUDED.nome_completo,
      telefone = COALESCE(public.usuarios.telefone, EXCLUDED.telefone),
      referred_by_code = COALESCE(public.usuarios.referred_by_code, EXCLUDED.referred_by_code);
    
    existing_user_id := new.id;
  END IF;

  -- 5. Garante consentimento de termos
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

-- 6. Recria o trigger on_auth_user_created em auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
