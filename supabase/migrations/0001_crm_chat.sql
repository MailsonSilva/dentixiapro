-- Migrations para o CRM Kanban e Central de Mensagens Multi-Tenant

-- Extensão para UUIDs (se não existir)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. communication_channels
CREATE TABLE IF NOT EXISTS public.communication_channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('whatsapp', 'instagram', 'webchat')),
    identifier TEXT NOT NULL, -- instance name da Evolution ou fone
    name TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.communication_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view channels inside their company" ON public.communication_channels
    FOR SELECT USING (
        company_id IN (
            SELECT uc.company_id FROM public.user_company uc WHERE uc.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage channels inside their company" ON public.communication_channels
    FOR ALL USING (
        company_id IN (
            SELECT uc.company_id FROM public.user_company uc 
            WHERE uc.user_id = auth.uid() AND uc.role IN ('admin', 'super_admin')
        )
    );


-- 2. crm_stages
CREATE TABLE IF NOT EXISTS public.crm_stages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT,
    order_index INTEGER DEFAULT 0,
    is_default BOOLEAN DEFAULT false
);

ALTER TABLE public.crm_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view stages inside their company" ON public.crm_stages
    FOR SELECT USING (
        company_id IN (
            SELECT uc.company_id FROM public.user_company uc WHERE uc.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage stages inside their company" ON public.crm_stages
    FOR ALL USING (
        company_id IN (
            SELECT uc.company_id FROM public.user_company uc 
            WHERE uc.user_id = auth.uid() AND uc.role IN ('admin', 'super_admin')
        )
    );

-- Populate default stages via function / trigger on new company or manual insertion
-- (Left for application layer if not done globally).


-- 3. contacts update
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS stage_id UUID REFERENCES public.crm_stages(id) ON DELETE SET NULL;


-- 4. procedures
CREATE TABLE IF NOT EXISTS public.procedures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.procedures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage procedures inside their company" ON public.procedures
    FOR ALL USING (
        company_id IN (
            SELECT uc.company_id FROM public.user_company uc WHERE uc.user_id = auth.uid()
        )
    );


-- 5. conversations
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    channel_id UUID NOT NULL REFERENCES public.communication_channels(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    last_message_at TIMESTAMPTZ DEFAULT now(),
    status TEXT DEFAULT 'active'
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage conversations inside their company" ON public.conversations
    FOR ALL USING (
        company_id IN (
            SELECT uc.company_id FROM public.user_company uc WHERE uc.user_id = auth.uid()
        )
    );


-- 6. messages
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    message JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage messages inside their company" ON public.messages
    FOR ALL USING (
        company_id IN (
            SELECT uc.company_id FROM public.user_company uc WHERE uc.user_id = auth.uid()
        )
    );
