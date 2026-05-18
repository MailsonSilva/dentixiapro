CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    telefone TEXT NOT NULL,
    nome TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clientes_telefone ON public.clientes (telefone);

-- Adicionar políticas RLS básicas
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" 
    ON public.clientes FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Enable insert access for authenticated users" 
    ON public.clientes FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" 
    ON public.clientes FOR UPDATE
    TO authenticated 
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable delete access for authenticated users" 
    ON public.clientes FOR DELETE 
    TO authenticated 
    USING (true);
