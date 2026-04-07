-- Supabase Migration
-- Adds "nome_paciente" to the simulacoes table as required by the simulation refinement workflow.

ALTER TABLE public.simulacoes 
ADD COLUMN IF NOT EXISTS nome_paciente text;
