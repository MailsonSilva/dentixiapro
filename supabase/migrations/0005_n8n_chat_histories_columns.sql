-- ==============================================================================
-- 🚀  MIGRAÇÃO DENTIXIA PRO: INTEGRAÇÃO DIRETA N8N_CHAT_HISTORIES
-- ==============================================================================
-- Este script adapta a tabela original do N8N para funcionar como nossa
-- central de mensagens oficial do CRM. Execute no SQL Editor do Supabase.

BEGIN;

  -- 1. Adicionar colunas de contexto do CRM na tabela n8n_chat_histories
  ALTER TABLE public.n8n_chat_histories 
    ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.company(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE;

  -- 2. Habilitar Supabase Realtime para n8n_chat_histories
  -- Assim que o N8N inserir, a UI do chat atualiza sozinha
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 
      FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = 'n8n_chat_histories'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.n8n_chat_histories;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Ignorar erro caso a tabela / pub já esteja vinculada
  END;
  $$;

  -- 3. Dropar o Trigger Antigo (se ele existir da migração anterior)
  DROP TRIGGER IF EXISTS trg_sync_n8n_chat_to_messages ON public.n8n_chat_histories;
  DROP FUNCTION IF EXISTS public.sync_n8n_chat_to_messages();

  -- 4. Função para auto-preencher contact_id, company_id e conversation_id
  -- Quando o N8N salvar a mensagem, ele só manda o session_id (que é o nosso contact_id).
  -- Esse trigger captura o registro no ar e preenche o resto das colunas!
  CREATE OR REPLACE FUNCTION public.enrich_n8n_chat_histories()
  RETURNS TRIGGER AS $$
  DECLARE
      v_contact_id UUID;
      v_company_id UUID;
      v_conversation_id UUID;
  BEGIN
      -- Garantir que session_id seja lido como UUID. Se falhar, é lixo do N8N e ignoramos o enriquecimento.
      BEGIN
          v_contact_id := NEW.session_id::UUID;
      EXCEPTION WHEN invalid_text_representation THEN
          RETURN NEW; 
      END;

      -- Localiza o contato para encontrar o ID da Empresa
      SELECT company_id INTO v_company_id
      FROM public.contacts
      WHERE id = v_contact_id;

      -- Se o contato não existe, não conseguimos vincular, apenas deixa nulo
      IF v_company_id IS NULL THEN
          RETURN NEW;
      END IF;

      -- Setar os valores base no registro que está sendo INSERIDO
      NEW.contact_id := v_contact_id;
      NEW.company_id := v_company_id;

      -- Se o insert já tem o conversation_id (enviado pelo App via sendMessageAction)
      -- não precisamos criar / buscar conversa nova.
      IF NEW.conversation_id IS NOT NULL THEN
          -- Atualiza o last_message_at da conversa existente
          UPDATE public.conversations SET last_message_at = now() WHERE id = NEW.conversation_id;
          RETURN NEW;
      END IF;

      -- Se não tem, o insert veio do N8N! Precisamos achar ou criar a conversa.
      SELECT id INTO v_conversation_id
      FROM public.conversations
      WHERE contact_id = v_contact_id
      ORDER BY created_at DESC LIMIT 1;

      -- Se não encontrou conversa aberta para o contato, cria uma
      IF v_conversation_id IS NULL THEN
          DECLARE
              v_channel_id UUID;
          BEGIN
              SELECT id INTO v_channel_id FROM public.communication_channels WHERE company_id = v_company_id AND active = true LIMIT 1;
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

      -- Define o conversation_id no objeto que está sendo salvo no banco
      NEW.conversation_id := v_conversation_id;

      -- Atualiza o last_message_at da conversa com a data atual
      UPDATE public.conversations SET last_message_at = now() WHERE id = v_conversation_id;

      RETURN NEW;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  -- 5. Ligar o Trigger ENRICH na tabela n8n_chat_histories ANTES do INSERT
  DROP TRIGGER IF EXISTS trg_enrich_n8n_chat_histories ON public.n8n_chat_histories;

  -- IMPORTANTE: Usamos BEFORE INSERT para podermos manipular o "NEW" antes de gravar
  CREATE TRIGGER trg_enrich_n8n_chat_histories
  BEFORE INSERT ON public.n8n_chat_histories
  FOR EACH ROW
  EXECUTE FUNCTION public.enrich_n8n_chat_histories();

COMMIT;
