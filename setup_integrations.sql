-- ==============================================================================
-- 🚀  MIGRAÇÃO DENTIXIA PRO: INTEGRAÇÕES (N8N, WHATSAPP, ETC)
-- ==============================================================================
-- Você pode colar este SQL inteiro e executar no "SQL Editor" do Supabase Dashboard.

-- 1. Criação da Tabela
CREATE TABLE IF NOT EXISTS public.company_integrations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  provider text NOT NULL, -- Exemplo: 'whatsapp', 'n8n', 'gmail'
  is_active boolean DEFAULT false,
  credentials jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  -- Garante que cada empresa tenha só uma entrada por provedor
  UNIQUE(company_id, provider)
);

-- 2. Ativar Row Level Security (RLS)
ALTER TABLE public.company_integrations ENABLE ROW LEVEL SECURITY;

-- 3. Criar Políticas de Segurança (Para Acesso de Administradores/Usuários)
-- Permite leitura de integrações apenas para os membros pertencentes a empresa
CREATE POLICY "Visualizar integrações da própria empresa" 
ON public.company_integrations 
FOR SELECT 
USING (
  company_id IN (
    SELECT company_id FROM public.user_company WHERE user_id = auth.uid()
  )
);

-- Permitir Inserção (Criar Instância de Configuração)
CREATE POLICY "Adicionar novas integrações na empresa" 
ON public.company_integrations 
FOR INSERT 
WITH CHECK (
  company_id IN (
    SELECT company_id FROM public.user_company WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
  )
);

-- Permitir Atualização (ex: Ligar/Desligar Toggle e Atualizar Chaves da API)
CREATE POLICY "Atualizar integrações da própria empresa" 
ON public.company_integrations 
FOR UPDATE 
USING (
  company_id IN (
    SELECT company_id FROM public.user_company WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
  )
);

-- Permitir Deletar (Excluir integração)
CREATE POLICY "Deletar integrações da empresa" 
ON public.company_integrations 
FOR DELETE 
USING (
  company_id IN (
    SELECT company_id FROM public.user_company WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
  )
);

-- 4. Função Automática que Popula as Integrações Default sempre que uma empresa nova nascer (Opcional, mas Útil)
-- Se você quiser, quando uma empresa for gerada, automaticamente injetados provedores "falsos" desligados:

CREATE OR REPLACE FUNCTION public.handle_new_company_integrations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.company_integrations (company_id, provider, is_active)
  VALUES 
    (NEW.id, 'whatsapp', false),
    (NEW.id, 'evolution_api', false),
    (NEW.id, 'n8n_automation', false),
    (NEW.id, 'gmail', false);
  RETURN NEW;
END;
$$;

-- Remova o Trigger se não existir um prévio para recriar (Evita erro).
DROP TRIGGER IF EXISTS trigger_new_company_integrations ON public.company;
CREATE TRIGGER trigger_new_company_integrations
  AFTER INSERT ON public.company
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_company_integrations();
