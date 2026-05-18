-- Função para o N8N inserir mensagens recebidas e garantir a existência da conversa
CREATE OR REPLACE FUNCTION public.n8n_insert_incoming_message(
    p_company_id UUID,
    p_contact_id UUID,
    p_message_text TEXT,
    p_phone TEXT
) RETURNS VOID AS $$
DECLARE
    v_conversation_id UUID;
    v_channel_id UUID;
BEGIN
    -- Tenta encontrar a conversa mais recente desse contato
    SELECT id INTO v_conversation_id
    FROM public.conversations
    WHERE contact_id = p_contact_id
      AND company_id = p_company_id
    ORDER BY last_message_at DESC
    LIMIT 1;

    -- Se não existir conversa, precisamos criar uma.
    -- Vamos pegar o primeiro canal do tipo whatsapp da empresa como fallback.
    IF v_conversation_id IS NULL THEN
        SELECT id INTO v_channel_id 
        FROM public.communication_channels 
        WHERE company_id = p_company_id AND type = 'whatsapp' AND active = true 
        LIMIT 1;
        
        IF v_channel_id IS NOT NULL THEN
            INSERT INTO public.conversations (company_id, contact_id, channel_id, status)
            VALUES (p_company_id, p_contact_id, v_channel_id, 'active')
            RETURNING id INTO v_conversation_id;
        END IF;
    END IF;

    -- Se conseguimos a conversation_id, insere a mensagem na fast_lane
    IF v_conversation_id IS NOT NULL THEN
        INSERT INTO public.chat_messages (
            conversation_id, company_id, contact_id, direction, message, source
        ) VALUES (
            v_conversation_id, p_company_id, p_contact_id, 'inbound', 
            jsonb_build_object('text', p_message_text, 'type', 'text', 'source', 'human'),
            'evolution'
        );
        
        UPDATE public.conversations SET last_message_at = now() WHERE id = v_conversation_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
