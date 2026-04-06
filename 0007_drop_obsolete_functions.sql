-- ==============================================================================
-- 🚀  MIGRAÇÃO DENTIXIA PRO: LIMPEZA DE FUNÇÕES OBSOLETAS
-- ==============================================================================

BEGIN;

  -- Como a tabela 'messages' foi excluída, as funções que tentavam inserir nela 
  -- agora vão causar erros ('relation "messages" does not exist') se continuarem ativas.
  -- Vamos dropar a function (e também o trigger vinculado a ela, caso ainda exista na memoria)
  
  DROP FUNCTION IF EXISTS public.mirror_ai_response_to_messages() CASCADE;
  
  -- Também garantir que a de sincronização antiga não sobrou
  DROP FUNCTION IF EXISTS public.sync_n8n_chat_to_messages() CASCADE;

COMMIT;
