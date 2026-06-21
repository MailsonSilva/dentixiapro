# 🗺️ Mission Control: Estado do Projeto (Project State)

**Última atualização**: 2026-06-20 — Sprint: Liberação de Acesso Admin no Supabase

---

## 1. O Que Mudou (What Changed)

### Sprint Atual (2026-06-20 — Liberação de Acesso Admin e Fluxo de Simulações)

- ✅ **Skill de Git/GitHub (git-expert)**: Criada nova Agent Skill em `.agent/skills/git-expert/SKILL.md` para padronizar e assegurar o fluxo de versionamento com revisões (`status`, `diff`), commits semânticos em PT-BR e proibição estrita de force push.
- ✅ **Salvamento de Simulações e Galeria**:
  - Implementado utilitário `supabaseServer.ts` para gestão segura de sessão/cookies do usuário no Next.js 15.
  - Atualizada Server Action `saveSimulationAction` para obter o `user_id` de forma segura no servidor, gerando paths únicos com UUID v4 para salvar as imagens no bucket `simulacoes`.
  - Criada nova Server Action `deleteSimulationAction` permitindo exclusão segura e limpeza de imagens no storage.
  - Criadas queries seguras no servidor em `queries.ts`.
  - Convertida a página `/simulacoes/resultados` para Server Component, passando dados dinâmicos para o componente cliente interativo `SimulationGallery` (que lida com buscas, exclusão com feedback de toasts e modal de comparação com ReactCompareSlider).
- ⏳ **Migração de View de Status Criada**: Criada migração local `20260620210200_update_view_status_admin.sql` para atualizar a view `public.verificar_status_usuario` liberando acesso total ao perfil `admin` (`status_code = 3`, `dias_restantes = 999`, `descricao = 'Acesso Liberado (Admin).'`). O deploy em Produção está pendente via `supabase db push`.
- ⏳ **Migração do Bucket 'simulacoes' Criada**: Criada migração local `20260620223253_create_simulacoes_bucket_and_rls.sql` para criar o bucket `simulacoes` no storage do Supabase e configurar as políticas de Row Level Security (RLS) para uploads/deleções seguras. O deploy está pendente via `supabase db push`.

### Sprint Anterior (2026-04-11 — Documentação Exaustiva)

- ✅ **Engenharia Reversa Concluída**: Analisado todo o código-fonte (App Router, Supabase, Migrations, Actions, Hooks, Components).
- ✅ **Criação da pasta `/docs`**: Gerada toda a documentação técnica consolidando informações vitais em um só lugar.
- ✅ **`ARCHITECTURE.md`**: Visão Macro, ecossistema, stack, modelo multi-tenant, segurança RLS e variáveis de ambiente.
- ✅ **`FRONTEND.md`**: Mapeamento completo do Design System "Pro Max", contextos globais, responsividade, componentes-chave e rotas.
- ✅ **`BACKEND_API.md`**: Schema exaustivo do banco de dados completo (tabelas, triggers, RLS), Edge Functions, e Next.js API Routes.
- ✅ **`WORKFLOWS_N8N.md`**: Documentação detalhada dos fluxos de AI chatbot, triggers do CRM e sincronização bidirecional.
- ✅ **`BUSINESS_RULES.md`**: Consolidado o "Cérebro" do sistema contendo 13 regras de ouro inquebráveis (Multi-tenancy, Trial/Paywall, Agenda DB, Procedimentos).

### Sprint Atual (2026-04-11 — Orquestração UI/UX Pro Max)

#### Bug Fix Crítico
- ✅ **`agenda/page.tsx`**: Corrigido bug onde `companyId` não estava nas dependências do `useCallback` do `fetchData`. Isso causava que `businessHours` e `procedures` **não carregavam** na primeira renderização após login. Agora o `fetchData` guarda corretamente a dependência e a chamada às APIs só ocorre quando `companyId` está disponível (guard interno `if (!companyId) return`).

#### Design System — Sem Bordas Excessivamente Arredondadas
- ✅ **`globals.css`**: Reduzido raio de bordas globais:
  - `glass-card`: `rounded-3xl` → `rounded-xl`
  - `.btn-primary`: `rounded-2xl` → `rounded-lg`
  - Input global: `rounded-xl` → `rounded-lg`
- ✅ **`AppointmentModal.tsx`**: Container `rounded-3xl` → `rounded-xl`, todos os botões e inputs `rounded-lg/md`
- ✅ **`AppointmentDetailModal.tsx`**: `rounded-3xl` → `rounded-xl`, elementos internos `rounded-lg`

#### AgendaSidebar — Melhorias UX Pro Max
- ✅ **Lista de Procedimentos Restaurada e Melhorada**:
  - Cabeçalho da seção com ícone `SlidersHorizontal` e label "Filtros"
  - Botão "Todos / Limpar" para seleção rápida em massa
  - Exibe duração de cada procedimento (`90m`) à direita do nome
  - Bordas `rounded-md` consistentes com novo sistema
- ✅ **Mini-Calendário Melhorado**:
  - Células usam `button` (semântico, acessível) ao invés de `div`
  - Dias fechados: `cursor-not-allowed` + padrão diagonal via inline style
  - `disabled` nativo para dias fora do expediente e fora do mês
  - Legenda visual de "Dia fechado" quando `businessHours` disponível
  - Navegação com ícone hover destacado

#### CalendarGrid — Melhorias Visuais
- ✅ **Paleta de Procedimentos Determinística**: Hash da string do nome mapeia para cor fixada
  — elimina o problema de cores mudando entre re-renders
- ✅ **Header mais compacto** e profissional com `rounded-md` nos botões de navegação
- ✅ **Dias Fechados**: exibe ícone `BanIcon` no canto superior direito + padrão diagonal mais denso
- ✅ **Hover restrito**: dias fechados não recebem events de drag & drop nem clique
- ✅ **Labels de dias da semana**: abreviadas (`Seg, Ter...`) para mais espaço

#### ProcedureGrid — Refinamento
- ✅ Padding reduzido (`px-3 py-2.5` ao invés de `p-4`)
- ✅ Botões de ação visíveis apenas no hover via `group-hover:opacity-100`
- ✅ Border `rounded-lg` em todo o componente
- ✅ Indicador ativo: linha vertical esquerda `w-0.5` ao invés de `w-1`

---

## 2. O Que Está Quebrado (What's Broken)

- ✅ **Agenda**: 100% funcional e testada. Sem erros TS nos arquivos da agenda.
- ✅ **`clientes/page.tsx`**: Erros de TS corrigidos (adicionada tipagem `ContactItem` estrita).
- ✅ **`KanbanCard.tsx`**: Erro TS corrigido no drag handler (`(e: any)` cast para bypass do framer-motion native events conflito).

---

## 3. Arquitetura da Agenda (Componentes)

| Arquivo | Responsabilidade |
|---|---|
| `app/agenda/page.tsx` | Orquestrador: estado, fetch, handlers |
| `components/agenda/AgendaSidebar.tsx` | Mini-cal + filtro de procedimentos |
| `components/agenda/CalendarGrid.tsx` | Grade mensal com drag & drop |
| `components/agenda/AppointmentCard.tsx` | Card arrastável de agendamento |
| `components/agenda/AppointmentModal.tsx` | Modal criar/editar agendamento |
| `components/agenda/AppointmentDetailModal.tsx` | Modal detalhes + ações rápidas |
| `components/procedimentos/ProcedureGrid.tsx` | Lista reutilizável de procedimentos |
| `lib/agenda/queries.ts` | Queries Supabase: appointments, procedures, businessHours |
| `lib/agenda/actions.ts` | Server Actions: CRUD de agendamentos |
| `hooks/useProcedures.ts` | Hook CRUD de procedimentos (página de config) |

---

## 4. Funcionalidades Críticas da Agenda

- **Filtro por Procedimento**: sidebar exibe lista dinâmica do catálogo; filtro ativo/inativo afeta `CalendarGrid`
- **Dias Bloqueados**: `businessHours` determina `is_open` por `day_of_week`; dias fechados = sem clique, sem drag, visual de listrado diagonal + ícone
- **Drag & Drop**: arrastar card entre dias; conflito → abre modal pré-preenchido
- **Multi-tenant**: `companyId` propagado para todas as queries (`RLS` Supabase)
