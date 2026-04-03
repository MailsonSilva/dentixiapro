-- ============================================================
-- Migração M-003: CRM + Agenda Refinement
-- DentixiaPro · 2026-04-02
-- ============================================================

-- Extensão UUID (garantia)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ────────────────────────────────────────────────────────────
-- 1. ALTER TABLE contacts — Novos campos clínicos
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS address    TEXT,
  ADD COLUMN IF NOT EXISTS birth_date DATE;


-- ────────────────────────────────────────────────────────────
-- 2. CREATE TABLE procedure_catalog
--    NULL company_id = global/sistema (is_system = true)
--    NOT NULL company_id = personalizado da clínica
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.procedure_catalog (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id   UUID        REFERENCES public.company(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  duration_min INTEGER     NOT NULL DEFAULT 60,
  is_system    BOOLEAN     NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.procedure_catalog ENABLE ROW LEVEL SECURITY;

-- Usuários veem procedimentos do sistema (globais) + da sua empresa
CREATE POLICY "Users can view system and company procedures"
  ON public.procedure_catalog FOR SELECT
  USING (
    is_system = true
    OR company_id IN (
      SELECT company_id FROM public.user_company WHERE user_id = auth.uid()
    )
  );

-- Usuários só gerenciam procedimentos personalizados da própria empresa
CREATE POLICY "Users can manage their company procedures"
  ON public.procedure_catalog FOR INSERT
  WITH CHECK (
    is_system = false AND
    company_id IN (
      SELECT company_id FROM public.user_company WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their company procedures"
  ON public.procedure_catalog FOR UPDATE
  USING (
    is_system = false AND
    company_id IN (
      SELECT company_id FROM public.user_company WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their company procedures"
  ON public.procedure_catalog FOR DELETE
  USING (
    is_system = false AND
    company_id IN (
      SELECT company_id FROM public.user_company WHERE user_id = auth.uid()
    )
  );

-- Seed: procedimentos do sistema (company_id NULL)
INSERT INTO public.procedure_catalog (name, duration_min, is_system)
VALUES
  ('Avaliação',     30,  true),
  ('Limpeza',       60,  true),
  ('Clareamento',   90,  true),
  ('Ortodontia',    60,  true),
  ('Implante',     120,  true),
  ('Canal',         90,  true),
  ('Extração',      45,  true),
  ('Restauração',   45,  true),
  ('Prótese',       60,  true),
  ('Outros',        60,  true)
ON CONFLICT DO NOTHING;


-- ────────────────────────────────────────────────────────────
-- 3. CREATE TABLE procedure_records — Histórico por paciente
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.procedure_records (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id     UUID        NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  contact_id     UUID        NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  catalog_id     UUID        REFERENCES public.procedure_catalog(id) ON DELETE SET NULL,
  procedure_name TEXT        NOT NULL,
  performed_at   DATE        NOT NULL,
  status         TEXT        NOT NULL DEFAULT 'realizado'
                             CHECK (status IN ('realizado', 'cancelado', 'pendente')),
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.procedure_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage procedure records inside their company"
  ON public.procedure_records FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM public.user_company WHERE user_id = auth.uid()
    )
  );

-- Índice de busca por paciente + data
CREATE INDEX IF NOT EXISTS idx_proc_records_contact
  ON public.procedure_records (contact_id, performed_at DESC);


-- ────────────────────────────────────────────────────────────
-- 4. ALTER TABLE appointments — catalog_id + anti-duplicação
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS catalog_id UUID REFERENCES public.procedure_catalog(id) ON DELETE SET NULL;

-- Índice único: impede dois agendamentos ativos no mesmo horário para a mesma empresa
-- (funciona como salvaguarda para race conditions, a camada de aplicação faz a verificação amigável)
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_no_double_booking
  ON public.appointments (company_id, start_time)
  WHERE (status IS DISTINCT FROM 'cancelled');
