-- ==============================================================================
-- 🚀  MIGRAÇÃO DENTIXIA PRO: CORREÇÃO DE SEGURANÇA E POLÍTICAS RLS MULTI-TENANT
-- ==============================================================================
-- Esta migração resolve os problemas críticos de isolamento multi-tenant
-- identificados na auditoria de segurança do Passo 1.
-- ==============================================================================

BEGIN;

  -- ────────────────────────────────────────────────────────────
  -- 1. CORREÇÃO DA TABELA public.clientes
  -- ────────────────────────────────────────────────────────────
  -- A tabela clientes possuía políticas com USING (true) para authenticated,
  -- expondo todos os clientes para qualquer usuário logado na plataforma.
  -- Agora aplicamos isolamento estrito por empresa (company_id).
  
  -- Garantir RLS habilitado
  ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

  -- Dropar políticas abertas antigas
  DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.clientes;
  DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.clientes;
  DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.clientes;
  DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.clientes;

  -- Criar novas políticas multi-tenant adequadas
  CREATE POLICY "Users can view clients inside their company" 
    ON public.clientes FOR SELECT 
    USING (
      company_id IN (
        SELECT uc.company_id FROM public.user_company uc WHERE uc.user_id = auth.uid()
      )
    );

  CREATE POLICY "Users can insert clients inside their company" 
    ON public.clientes FOR INSERT 
    WITH CHECK (
      company_id IN (
        SELECT uc.company_id FROM public.user_company uc WHERE uc.user_id = auth.uid()
      )
    );

  CREATE POLICY "Users can update clients inside their company" 
    ON public.clientes FOR UPDATE
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

  CREATE POLICY "Admins/Managers can delete clients inside their company" 
    ON public.clientes FOR DELETE 
    USING (
      company_id IN (
        SELECT uc.company_id FROM public.user_company uc 
        WHERE uc.user_id = auth.uid() AND uc.role IN ('admin', 'super_admin', 'manager')
      )
    );


  -- ────────────────────────────────────────────────────────────
  -- 2. CORREÇÃO DA TABELA public.n8n_chat_histories
  -- ────────────────────────────────────────────────────────────
  -- A tabela n8n_chat_histories não possuía políticas RLS nem RLS habilitado.
  -- Habilitamos e aplicamos isolamento por empresa (company_id).

  -- Habilitar RLS
  ALTER TABLE public.n8n_chat_histories ENABLE ROW LEVEL SECURITY;

  -- Dropar possíveis políticas pré-existentes
  DROP POLICY IF EXISTS "Users can manage chat histories inside their company" ON public.n8n_chat_histories;

  -- Criar políticas multi-tenant estritas
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

COMMIT;
