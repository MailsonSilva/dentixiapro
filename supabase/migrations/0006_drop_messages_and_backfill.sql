-- ==============================================================================
-- 🚀  MIGRAÇÃO DENTIXIA PRO: LIMPEZA E REDIRECIONAMENTO TOTAL (N8N NATIVO)
-- ==============================================================================
-- 1. DROPAR TABELA OBSOLETA (A nova central é n8n_chat_histories)
DROP TABLE IF EXISTS public.messages CASCADE;

-- 2. GARANTIR HABILITAÇÃO DO REALTIME CORRETAMENTE NA TABELA N8N
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
  NULL;
END;
$$;

-- 3. GARANTIR QUE UPDATE E DELETE MANDEM O PAYLOAD COMPLETO PRO REACT (OPCIONAL MAS RECOMENDADO)
ALTER TABLE public.n8n_chat_histories REPLICA IDENTITY FULL;

-- 4. RETROATIVO: BACKFILL DOS DADOS EXISTENTES!
-- Se você já tinha mensagens antigas na n8n_chat_histories que não tinham company_id nem conversation_id!
DO $$
DECLARE
    rec RECORD;
    v_contact_id UUID;
    v_company_id UUID;
    v_conversation_id UUID;
    v_channel_id UUID;
BEGIN
    FOR rec IN SELECT * FROM public.n8n_chat_histories WHERE company_id IS NULL LOOP
        BEGIN
            v_contact_id := rec.session_id::UUID;
        EXCEPTION WHEN invalid_text_representation THEN
            CONTINUE; -- ignora linhas q n tem UUID valido
        END;

        SELECT company_id INTO v_company_id FROM public.contacts WHERE id = v_contact_id;
        
        IF v_company_id IS NOT NULL THEN
            SELECT id INTO v_conversation_id FROM public.conversations WHERE contact_id = v_contact_id ORDER BY created_at DESC LIMIT 1;
            
            IF v_conversation_id IS NULL THEN
                SELECT id INTO v_channel_id FROM public.communication_channels WHERE company_id = v_company_id AND active = true LIMIT 1;
                IF v_channel_id IS NULL THEN
                    INSERT INTO public.communication_channels (company_id, type, identifier, name)
                    VALUES (v_company_id, 'whatsapp', 'default_channel', 'Canal Principal') RETURNING id INTO v_channel_id;
                END IF;

                INSERT INTO public.conversations (company_id, contact_id, channel_id, status)
                VALUES (v_company_id, v_contact_id, v_channel_id, 'active') RETURNING id INTO v_conversation_id;
            END IF;

            UPDATE public.n8n_chat_histories 
            SET contact_id = v_contact_id, company_id = v_company_id, conversation_id = v_conversation_id 
            WHERE id = rec.id;
        END IF;
    END LOOP;
END;
$$;
