-- ============================================================================
-- M-008: Chat fast lane + CRM status orchestration
-- ============================================================================
-- Objetivo:
-- - chat_messages vira a tabela rapida da UI.
-- - n8n_chat_histories continua sendo memoria/contexto do n8n.
-- - mensagens do Evolution/app entram primeiro em chat_messages para aparecer
--   na tela sem esperar o workflow do n8n.

BEGIN;

  CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    message JSONB NOT NULL,
    source TEXT NOT NULL DEFAULT 'app',
    external_id TEXT,
    delivery_status TEXT NOT NULL DEFAULT 'sent',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_created
    ON public.chat_messages (conversation_id, created_at);

  CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_messages_external_id
    ON public.chat_messages (external_id)
    WHERE external_id IS NOT NULL;

  ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Users can manage chat messages inside their company"
    ON public.chat_messages;

  CREATE POLICY "Users can manage chat messages inside their company"
    ON public.chat_messages FOR ALL
    USING (
      company_id IN (
        SELECT company_id FROM public.user_company WHERE user_id = auth.uid()
      )
    )
    WITH CHECK (
      company_id IN (
        SELECT company_id FROM public.user_company WHERE user_id = auth.uid()
      )
    );

  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  $$;

  ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

  CREATE OR REPLACE FUNCTION public.mirror_n8n_history_to_chat_messages()
  RETURNS TRIGGER AS $$
  DECLARE
      v_direction TEXT;
      v_message_type TEXT;
      v_message_text TEXT;
      v_source TEXT;
      v_created_at TIMESTAMPTZ;
  BEGIN
      IF NEW.conversation_id IS NULL OR NEW.company_id IS NULL OR NEW.contact_id IS NULL THEN
          RETURN NEW;
      END IF;

      v_message_type := COALESCE(NEW.message->>'type', 'human');
      v_message_text := COALESCE(NEW.message->'data'->>'content', NEW.message->>'content', '');
      v_direction := CASE WHEN v_message_type = 'human' THEN 'inbound' ELSE 'outbound' END;
      v_source := CASE WHEN v_message_type = 'ai' THEN 'ai' ELSE 'n8n' END;
      v_created_at := COALESCE(NEW.hora_data_mensagem, now());

      IF EXISTS (
          SELECT 1
          FROM public.chat_messages cm
          WHERE cm.conversation_id = NEW.conversation_id
            AND cm.direction = v_direction
            AND COALESCE(cm.message->>'text', '') = v_message_text
            AND cm.created_at >= (v_created_at - interval '8 seconds')
            AND cm.created_at <= (v_created_at + interval '8 seconds')
      ) THEN
          RETURN NEW;
      END IF;

      INSERT INTO public.chat_messages (
          conversation_id,
          company_id,
          contact_id,
          direction,
          message,
          source,
          created_at
      ) VALUES (
          NEW.conversation_id,
          NEW.company_id,
          NEW.contact_id,
          v_direction,
          jsonb_build_object(
              'text', v_message_text,
              'type', 'text',
              'source', v_source
          ),
          v_source,
          v_created_at
      );

      UPDATE public.conversations
      SET last_message_at = v_created_at
      WHERE id = NEW.conversation_id;

      RETURN NEW;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  DROP TRIGGER IF EXISTS trg_mirror_n8n_history_to_chat_messages
    ON public.n8n_chat_histories;

  CREATE TRIGGER trg_mirror_n8n_history_to_chat_messages
  AFTER INSERT ON public.n8n_chat_histories
  FOR EACH ROW
  EXECUTE FUNCTION public.mirror_n8n_history_to_chat_messages();

  INSERT INTO public.chat_messages (
      conversation_id,
      company_id,
      contact_id,
      direction,
      message,
      source,
      created_at
  )
  SELECT
      h.conversation_id,
      h.company_id,
      h.contact_id,
      CASE WHEN COALESCE(h.message->>'type', 'human') = 'human' THEN 'inbound' ELSE 'outbound' END,
      jsonb_build_object(
          'text', COALESCE(h.message->'data'->>'content', h.message->>'content', ''),
          'type', 'text',
          'source', CASE WHEN h.message->>'type' = 'ai' THEN 'ai' ELSE 'n8n' END
      ),
      CASE WHEN h.message->>'type' = 'ai' THEN 'ai' ELSE 'n8n' END,
      COALESCE(h.hora_data_mensagem, now())
  FROM public.n8n_chat_histories h
  WHERE h.conversation_id IS NOT NULL
    AND h.company_id IS NOT NULL
    AND h.contact_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.chat_messages cm
      WHERE cm.conversation_id = h.conversation_id
        AND COALESCE(cm.message->>'text', '') = COALESCE(h.message->'data'->>'content', h.message->>'content', '')
        AND cm.created_at >= (COALESCE(h.hora_data_mensagem, now()) - interval '8 seconds')
        AND cm.created_at <= (COALESCE(h.hora_data_mensagem, now()) + interval '8 seconds')
    );

  CREATE OR REPLACE FUNCTION public.set_contact_stage_by_name(
    p_contact_id UUID,
    p_company_id UUID,
    p_stage_name TEXT
  )
  RETURNS VOID AS $$
  DECLARE
      v_stage_id UUID;
  BEGIN
      SELECT id INTO v_stage_id
      FROM public.crm_stages
      WHERE company_id = p_company_id
        AND name = p_stage_name
      ORDER BY order_index
      LIMIT 1;

      IF v_stage_id IS NOT NULL THEN
          UPDATE public.contacts
          SET stage_id = v_stage_id
          WHERE id = p_contact_id
            AND company_id = p_company_id;
      END IF;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  CREATE OR REPLACE FUNCTION public.sync_contact_stage_from_appointment()
  RETURNS TRIGGER AS $$
  BEGIN
      IF NEW.status = 'scheduled' THEN
          PERFORM public.set_contact_stage_by_name(NEW.contact_id, NEW.company_id, 'AvaliaÃ§Ã£o Agendada');
      ELSIF NEW.status = 'completed' THEN
          PERFORM public.set_contact_stage_by_name(NEW.contact_id, NEW.company_id, 'Em OrÃ§amento');
      ELSIF NEW.status = 'cancelled' THEN
          PERFORM public.set_contact_stage_by_name(NEW.contact_id, NEW.company_id, 'Em Atendimento');
      END IF;

      RETURN NEW;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  DROP TRIGGER IF EXISTS trg_sync_contact_stage_from_appointment
    ON public.appointments;

  CREATE TRIGGER trg_sync_contact_stage_from_appointment
  AFTER INSERT OR UPDATE OF status, contact_id ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_contact_stage_from_appointment();

COMMIT;
