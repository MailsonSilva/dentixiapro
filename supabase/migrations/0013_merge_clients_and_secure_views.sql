-- ==============================================================================
-- 🚀  MIGRAÇÃO DENTIXIA PRO: FUSÃO DE TABELAS E BLINDAGEM DE VIEWS UNRESTRICTED
-- ==============================================================================
-- Esta migração resolve os problemas estruturais de redundância da tabela clientes
-- e corrige o vazamento de dados de nível crítico nas views users e organizations.
-- ==============================================================================

BEGIN;

  -- ────────────────────────────────────────────────────────────
  -- 1. FUSÃO DA TABELA public.clientes NA public.contacts
  -- ────────────────────────────────────────────────────────────
  
  -- Copiar registros existentes de clientes para contacts para não perder dados
  -- A tabela de produção clientes possui user_id e criado_em, fazemos JOIN com user_company
  -- para obter o company_id associado de forma íntegra.
  INSERT INTO public.contacts (name, phone, email, company_id)
  SELECT c.nome, c.telefone, c.email, uc.company_id
  FROM public.clientes c
  JOIN public.user_company uc ON c.user_id = uc.user_id
  ON CONFLICT DO NOTHING;

  -- Dropar permanentemente a tabela redundante clientes
  DROP TABLE IF EXISTS public.clientes CASCADE;


  -- ────────────────────────────────────────────────────────────
  -- 2. GARANTIR RLS HABILITADO EM public.n8n_chat_histories
  -- ────────────────────────────────────────────────────────────
  ALTER TABLE public.n8n_chat_histories ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Users can manage chat histories inside their company" ON public.n8n_chat_histories;

  CREATE POLICY "Users can manage chat histories inside their company" 
    ON public.n8n_chat_histories FOR ALL
    USING (
      company_id IN (
        SELECT uc.company_id FROM public.user_company uc WHERE uc.user_id = auth.uid()
      )
    )
    WITH CHECK (
      company_id IN (
        SELECT uc.company_id FROM public.user_company uc WHERE uc.user_id = auth.uid()
      )
    );


  -- ────────────────────────────────────────────────────────────
  -- 3. BLINDAGEM DE SEGURANÇA NA VIEW public.users
  -- ────────────────────────────────────────────────────────────
  -- Recriamos a view aplicando restrição estrita por empresa (company_id)
  -- baseada no relacionamento user_company do usuário logado (auth.uid()).
  
  CREATE OR REPLACE VIEW public.users AS
  SELECT u.id,
         u.nome_completo AS nome,
         u.email,
         (uc.role)::text AS role,
         uc.company_id AS organization_id
  FROM public.usuarios u
  LEFT JOIN public.user_company uc ON u.id = uc.user_id
  WHERE uc.company_id IN (
      SELECT company_id FROM public.user_company WHERE user_id = auth.uid()
  ) OR u.id = auth.uid() OR is_super_admin();


  -- ────────────────────────────────────────────────────────────
  -- 4. BLINDAGEM DE SEGURANÇA NA VIEW public.organizations
  -- ────────────────────────────────────────────────────────────
  -- Recriamos a view aplicando restrição estrita por empresa (company_id)
  -- baseada no relacionamento user_company do usuário logado (auth.uid()).
  
  CREATE OR REPLACE VIEW public.organizations AS
  SELECT id,
         name AS nome,
         lower(regexp_replace(name, '[^a-zA-Z0-9]+'::text, '-'::text, 'g'::text)) AS slug
  FROM public.company
  WHERE id IN (
      SELECT company_id FROM public.user_company WHERE user_id = auth.uid()
  ) OR is_super_admin();

COMMIT;
