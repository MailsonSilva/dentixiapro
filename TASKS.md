# Kanban de Implantação (TASKS)

## Fase 1: Arquitetura e Estado Básico (Backend Specialist)
- [x] Criar o hook unificado `useProcedures.ts` contendo lógica base de Server Actions (List, Create, Update, Delete).
- [x] Atualizar o esquema/tipagem global para suportar a busca e validação correta de Business Hours em `lib/agenda/actions.ts`.
- [x] Implementar as verificações RLS/regras no Backend para bloquear marcação de agendamentos fora de Horário.

## Fase 2: Componentização de Procedimentos (Frontend Specialist)
- [x] Desenvolver Componente Global (`ProcedureGrid.tsx`) formatado em grid 2 colunas com layout de Mini-cards de detalhes.
- [x] Substituir interface antiga no Modal de Agendamentos (`AppointmentModal.tsx`) para usar o componente global e consumi-lo da Context/Hook apropriada.
- [x] Substituir listagem do Histórico do Cliente pelo componente global read-only ou reaproveitável.
- [x] Aplicar no filtro de Calendário e Simulações.

## Fase 3: Regras Visuais de Calendário (Frontend Specialist)
- [x] Modificar `CalendarGrid.tsx` e `AgendaSidebar.tsx` para passar Propriedade `isOpen` ou `isBusinessHour` por bloco de horário analisado.
- [x] Configurar estilização em células bloqueadas: fundo diferenciado (listrado hachurado), cursor de negação e travamento do evento de click `onClick`.
- [x] Unificar consumo de Horários (puxar da tela de Configurações para validar contra as datas renderizadas no Grid).

## Fase 4: Refinamento e Finalização (Orchestrator)
- [x] Implementar Checklist elegante na Sidebar removendo cards excessivos.
- [x] Padronizar visual de dias inativos com gradientes diagonais modernos.
- [x] Garantir propagação de `companyId` para evitar catálogos vazios em multi-tenant.
- [x] Atualizar documentação de estado (`STATE.md`).
- [x] Verificação final de estabilidade.
