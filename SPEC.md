# Documento de Especificação (SPEC)

## 1. Visão Geral
Este documento especifica a nova arquitetura e comportamento para a gestão de Procedimentos e regras de Calendário (Horários de Funcionamento) dentro do DentixiaPro, garantindo uma fonte única de verdade e consolidando a lógica de negócios e UI.

## 2. Unificação de Procedimentos (Core Logic)
- **Problema Atual:** Lógica fragmentada de seleção e validação de procedimentos entre o Agendamento, Filtro de Calendário e Histórico do Cliente.
- **Nova Solução:** 
  - Criação de um Componente Global `ProcedureManager` e/ou um Hook `useProcedures` para abstrair toda a lógica de estado e interface relacionada aos procedimentos.
  - O componente fornecerá suporte a CRUD completo (Adicionar, Editar, Excluir) conectado com Supabase.
  - Todos os componentes que necessitarem de exibição ou manipulação de procedimentos consumirão essa mesma fonte (Histórico, Agendamentos e Filtros).

## 3. Regras de Negócio (Calendário e Horário Comercial)
- **Problema Atual:** Descompasso de validação onde horários fora de expediente não são rigorosamente bloqueados no frontend / backend.
- **Nova Solução:**
  - O calendário consumirá os dados globais de `Horário de Funcionamento` (salvos em `configuracoes`).
  - O bloqueio de seleção (`disabled`) e visual nos dias e janelas de horário fora de expediente.
  - A API (`backend/actions`) validará estritamente qualquer push de novo agendamento, abortando com erro adequado caso viole o expediente configurado.

## 4. Sub-agentes Recomendados
- **Frontend Specialist (`@frontend-specialist`)**: Para refatorar layouts, aplicar Grid, e ajustar as cores condicionais do Calendário bloqueado.
- **Backend Specialist (`@backend-specialist`)**: Para centralizar a lógica CRUD nos Actions e integrar forte validação nas transações de agendamento.
