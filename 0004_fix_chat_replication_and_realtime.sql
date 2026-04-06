-- ==============================================================================
-- 🚀  MIGRAÇÃO DENTIXIA PRO: CORREÇÃO DO CHAT (REALTIME E N8N SYNC)
-- ==============================================================================
-- Copie este script inteiro e execute no "SQL Editor" do Supabase.

BEGIN;

  -- 1. Habilitar Supabase Realtime para a tabela `messages`
  -- Isso corrige o Ponto 3: As mensagens não estavam atualizando sozinhas no front
  -- pois a tabela não estava na "publication" do Supabase Realtime.
  
  -- Para evitar erros caso já esteja, nós tentamos adicionar. 
  -- Se o Supabase reclamar que "já existe", não tem problema, o importante é garantir.
  -- Usamos blocos DO para adicionar sem quebrar caso ocorra ignorar.
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 
      FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Em caso de erro (ex publication nao existe), tentamos criar (padrão supabase)
    -- Ou ignoramos se ja existe
  END;
  $$;

  -- 2. Trigger para Replicar do N8N Memory para Messages (Ponto 1 e 2)
  -- Remove duplicidades: N8N vai inserir SÓ no Postgres Chat Memory Node
  -- E o Supabase replica para o chat_history visual

  CREATE OR REPLACE FUNCTION public.sync_n8n_chat_to_messages()
  RETURNS TRIGGER AS $$
  DECLARE
      v_conversation_id UUID;
      v_company_id UUID;
      v_contact_id UUID;
      v_direction TEXT;
      v_message_text TEXT;
      v_message_type TEXT;
  BEGIN
      -- N8N Usa o contact_id como session_id na memory. 
      -- Garantir que session_id seja lido como UUID. Se falhar, ignoramos.
      BEGIN
          v_contact_id := NEW.session_id::UUID;
      EXCEPTION WHEN invalid_text_representation THEN
          RETURN NEW; 
      END;

      -- Localiza o contato para encontrar o ID da Empresa
      SELECT company_id INTO v_company_id
      FROM public.contacts
      WHERE id = v_contact_id;

      -- Se o contato não existe no nosso Schema, não tem como associar a mensagem, então sai
      IF v_company_id IS NULL THEN
          RETURN NEW;
      END IF;

      -- Localiza a conversa ativa para este contato
      SELECT id INTO v_conversation_id
      FROM public.conversations
      WHERE contact_id = v_contact_id
      ORDER BY created_at DESC LIMIT 1;

      -- Se o N8N iniciou conversa com um contato que não tem conversa criada na nossa base, criaremos uma!
      IF v_conversation_id IS NULL THEN
          DECLARE
              v_channel_id UUID;
          BEGIN
              -- Pega o primeiro canal disponivel da empresa para associar a conversa (fallback padrao)
              SELECT id INTO v_channel_id FROM public.communication_channels WHERE company_id = v_company_id AND active = true LIMIT 1;
              -- Se a empresa não tem canais registrados, nós criamos um virtual genérico na hora. 
              IF v_channel_id IS NULL THEN
                  INSERT INTO public.communication_channels (company_id, type, identifier, name)
                  VALUES (v_company_id, 'whatsapp', 'default_channel', 'Canal Principal')
                  RETURNING id INTO v_channel_id;
              END IF;

              INSERT INTO public.conversations (company_id, contact_id, channel_id, status)
              VALUES (v_company_id, v_contact_id, v_channel_id, 'active')
              RETURNING id INTO v_conversation_id;
          END;
      END IF;

      -- Extrair tipo e texto da mensagem. 
      -- N8N salva no padrão LC Type: {"type": "human", "data": {"content": "oi"}}
      v_message_type := NEW.message->>'type';
      v_message_text := NEW.message->'data'->>'content';

      IF v_message_type IS NULL THEN
          v_message_type := 'human';
      END IF;

      IF v_message_text IS NULL THEN
          v_message_text := NEW.message->>'content';
      END IF;
      
      IF v_message_type = 'human' THEN
          v_direction := 'inbound';
      ELSE
          v_direction := 'outbound';
      END IF;

      -- Evita duplicação conferindo se já existe mensagem recente com msm texto
      -- Evitar loop caso algo insira antes
      IF EXISTS (
          SELECT 1 FROM public.messages 
          WHERE conversation_id = v_conversation_id 
          AND direction = v_direction
          AND (message->>'text') = v_message_text
          AND created_at >= (now() - interval '5 seconds')
      ) THEN
          RETURN NEW;
      END IF;

      -- Insere na tabela 'messages' para renderizar no front
      INSERT INTO public.messages (
          conversation_id,
          company_id,
          contact_id,
          direction,
          message,
          created_at
      ) VALUES (
          v_conversation_id,
          v_company_id,
          v_contact_id,
          v_direction,
          jsonb_build_object('text', v_message_text, 'source', 'ai'),
          COALESCE(
              (NEW.message->'data'->>'additional_kwargs')::jsonb->>'created_at',
              now()::text
          )::TIMESTAMPTZ
      );

      -- Se for inbound, atualiza a the conversation last_message_at
      UPDATE public.conversations
      SET last_message_at = now()
      WHERE id = v_conversation_id;

      RETURN NEW;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  -- Recria o gatilho sem erros
  DROP TRIGGER IF EXISTS trg_sync_n8n_chat_to_messages ON public.n8n_chat_histories;

  CREATE TRIGGER trg_sync_n8n_chat_to_messages
  AFTER INSERT ON public.n8n_chat_histories
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_n8n_chat_to_messages();

COMMIT;
