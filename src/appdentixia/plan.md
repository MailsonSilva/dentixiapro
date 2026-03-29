# DentixiaPro - Implementation Plan

Este é o plano principal guiado pelo fluxo operacional do **Loki-Mode** atuando como Diretor Técnico do time de Agentes IA.

## Roadmap Base
1. **Fix de Usabilidade**: Resolver o erro da página de `/configuracoes` criando o arquivo e um hub de configurações.
2. **Setup do Supabase DB**: Criação da tabela de Appointments (Agenda) aplicando o standard "Multi-Tenant" Row Level Security (RLS) dependente do campo `company_id`.
3. **Página de Clientes (CRM - Contacts)**: Criação de um Layout limpo, Grid de Usuários/Contatos nativos da `public.contacts`. Side-Panel para Visualização Cronológica das Mensagens n8n (`messages`) e procedimentos passados.
4. **Página de Agenda (Appointments)**: Grade Semanal ou Diária manipulando objetos de tempo da consulta da base, permitindo marcação manual nos blocos vazios com busca inteligente ao DB de Contatos.

Qualquer alteração ou novo bug deve interromper o fluxo e ser adicionado ao registro do `STATE.md`.
