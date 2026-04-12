# 📋 BUSINESS_RULES.md — DentixIA Pro

> **Versão:** 4.0.0 | **Atualizado:** 2026-04-11
>
> O "Cérebro" do sistema. Esta é a verdade única de todas as regras de negócio implementadas.

---

## 🏢 BR-01: Multi-Tenancy (Isolamento de Dados)

**Regra:** Todo dado de domínio pertence exclusivamente a uma empresa (`company_id`).

**Implementação:**
- Toda tabela de domínio tem `company_id NOT NULL`
- RLS (Row Level Security) habilitado em todas as tabelas de domínio
- Queries de app sempre filtram por `company_id` implicitamente via RLS
- `supabase.from('contacts').select('*')` retorna APENAS os contatos da empresa do usuário logado

**Violação:** Criar tabela sem `company_id` ou fazer query sem RLS é uma violação crítica de segurança.

---

## 👤 BR-02: Tipos de Usuário e Roles

**Regra:** Existe distinção entre o *tipo global* do usuário e sua *role na empresa*.

### Tipos Globais (tabela `usuarios.tipo`)
| Tipo | Acesso |
|---|---|
| `comum` | Usuário SaaS padrão — acessa o sistema via `user_company.role` |
| `parceiro` | Afiliado — área restrita: `/parceiros`, `/indique-e-ganhe`, `/perfil` apenas |
| `super_admin` | Dev/plataforma — bypass total em toda RLS |

### Roles na Empresa (`user_company.role`)
| Role | Permissões |
|---|---|
| `admin` | Tudo: billing, usuários, configurações, deleção, integrações |
| `manager` | CRM completo; sem gerenciar usuários e sem billing |
| `user` | Criar/visualizar dados; sem deleção de contatos/simulações |

**Admin tem acesso total sem verificação de trial.**
Manager e User passam pela verificação de trial/assinatura.

---

## 🔒 BR-03: Proteção do Último Admin

**Regra:** Uma empresa NUNCA pode ficar sem pelo menos um `admin` ativo.

**Implementação:** Trigger `trg_prevent_last_admin` → `prevent_last_admin_removal()`

**Comportamento:**
- `DELETE FROM user_company WHERE role='admin'` do último admin → `EXCEPTION 'company_must_have_admin'`
- `UPDATE user_company SET role='user'` do último admin → `EXCEPTION 'company_must_have_admin'`
- Erro aparece para o usuário via toast de erro

---

## 💳 BR-04: Controle de Acesso por Assinatura (Trial/Paywall)

**Regra:** Usuários `comum` com role `manager` ou `user` precisam de assinatura ativa para acessar o sistema.

**Implementação:** `ClientLayout.tsx → checkAccess()`

**Estados possíveis (via `verificar_status_usuario`):**
| `status_code` | `dias_restantes` | Estado | Comportamento |
|---|---|---|---|
| 3 | 999 | Assinatura paga ativa | Acesso total, sem banner |
| 3 | > 0 | Trial ativo | Acesso total + banner de aviso |
| 3 | ≤ 2 | Trial urgente | Acesso total + banner âmbar urgente |
| ≠ 3 | 0 | Trial expirado | Paywall overlay (z-index 9999) |

**Exceções sem verificação de trial:**
- Rotas de autenticação (`/login`, `/register`, `/forgot`)
- Página `/planos` (para poder assinar)
- Admin da empresa (sempre tem acesso)

**Trial padrão:** 7 dias (mencionado no copy do Paywall).

---

## 📅 BR-05: Regras do Calendário de Agendamentos

### BR-05.1: Dias de Funcionamento
**Regra:** Não é permitido agendar em dias marcados como fechados (`is_open = false` em `company_business_hours`).

**Implementação:**
- **UI (preventiva):** Dias fechados ficam com padrão diagonal, `disabled=true`, sem clique e sem drag & drop
- **Backend (defensiva):** `checkBusinessHours()` em `actions.ts` — lança erro antes do INSERT se `is_open = false`

**Mensagem:** `"A clínica encontra-se fechada neste dia da semana."`

### BR-05.2: Horário de Expediente
**Regra:** Agendamentos não podem começar antes da abertura nem terminar após o fechamento.

**Implementação:** `checkBusinessHours()` compara `HH:mm` do horário com `open_time` e `close_time`.

**Mensagem:** `"O horário escolhido (HH:mm - HH:mm) está fora do expediente (HH:mm - HH:mm)."`

**Fallback:** Se `company_business_hours` não estiver configurado, agendamento é PERMITIDO (retrocompatibilidade).

### BR-05.3: Anti-Double-Booking (Duplo Agendamento)
**Regra:** Dois agendamentos ativos NÃO podem ter o mesmo `start_time` na mesma empresa.

**Implementação Dupla (defence in depth):**
1. **App layer:** `checkConflict()` verifica antes do INSERT
2. **DB layer:** `UNIQUE INDEX idx_appointments_no_double_booking ON (company_id, start_time) WHERE status != 'cancelled'`

**Mensagem:** `"Já existe um agendamento neste horário. Escolha outro horário."`

**No Drag & Drop:** Conflito retorna `{ status: 'conflict' }` → abre modal de edição com nova data pré-preenchida (não lança erro).

### BR-05.4: Soft-Delete de Agendamentos
**Regra:** Agendamentos NÃO são deletados fisicamente — são marcados como `status = 'cancelled'`.

**Implementação:** `deleteAppointmentAction()` → `UPDATE appointments SET status = 'cancelled'`

**Por quê:** Preserva histórico, não quebra o UNIQUE INDEX (agendamentos cancelados são excluídos da unicidade).

### BR-05.5: Preservação de Horário no Drag & Drop
**Regra:** Ao arrastar um agendamento para outro dia, o horário (`HH:mm`) e duração são preservados.

**Implementação:** `updateAppointmentDateAction()` usa `format(oldStart, 'HH:mm')` via date-fns para extrair o horário em timezone local (não UTC).

**Bug corrigido:** `toISOString().substring(11,16)` causava desvio de +3h para fuso UTC-3 (Brasil). Corrigido usando `format()` do date-fns.

---

## 🏥 BR-06: Catálogo de Procedimentos

### BR-06.1: Procedimentos do Sistema vs. Personalizados
**Regra:** Existem dois tipos de procedimento:
- **Sistema** (`is_system = true`, `company_id = NULL`): Globais, imutáveis, visíveis para todos
- **Personalizados** (`is_system = false`, `company_id = UUID`): Da empresa, editáveis pelo admin

**RLS:** Usuários veem ambos; só podem gerenciar (INSERT/UPDATE/DELETE) os da própria empresa com `is_system = false`.

**Procedimentos do Sistema (seed):**
Avaliação (30'), Limpeza (60'), Clareamento (90'), Ortodontia (60'), Implante (120'), Canal (90'), Extração (45'), Restauração (45'), Prótese (60'), Outros (60')

### BR-06.2: Unicidade de Catálogo (CRUD Centralizado)
**Regra:** O catálogo de procedimentos é gerenciado EM UM ÚNICO LOCAL e propagado para todos os módulos.

**Tabela única:** `procedure_catalog`

**Módulos que consomem:**
- `/agenda` — filtro de procedimentos na sidebar + seletor no modal de agendamento
- `/configuracoes` — CRUD completo via `ProcedureGrid`
- `/clientes` — histórico de procedimentos por paciente
- `AppointmentModal` — seletor que popula `procedure_name` e `duration_min`

**Regra de proteção:**
- Procedimentos do sistema não podem ser editados ou deletados (verificação em `useProcedures.ts`)
- Mensagem: `"Não é possível alterar/excluir procedimentos do sistema."`

### BR-06.3: Snapshot do Nome no Agendamento
**Regra:** `appointments.procedure_name` armazena o nome do procedimento no momento do agendamento.

**Por quê:** Se o procedimento for renomeado ou deletado do catálogo, o histórico de agendamentos não é afetado.

**`catalog_id`:** Referência opcional ao catálogo (pode ser `NULL` se o procedimento foi deletado — `ON DELETE SET NULL`).

---

## 📱 BR-07: Roteamento por Tipo de Usuário

**Regra:** O tipo global do usuário determina sua área de acesso no sistema.

| Tipo | Redirecionamento Padrão | Rotas Acessíveis |
|---|---|---|
| `comum` | `/` (landing) | Todas as rotas autenticadas |
| `parceiro` | `/parceiros` | `/parceiros`, `/indique-e-ganhe`, `/perfil`, `/redefinir-senha` |
| `super_admin` | `/` | Tudo (bypass RLS) |

**Sincronização:** Se `auth.user_metadata.tipo === 'parceiro'` mas `usuarios.tipo !== 'parceiro'`, o sistema corrige automaticamente via UPDATE.

---

## 💬 BR-08: Sistema de Mensagens Multi-Canal

### BR-08.1: Fonte Única de Verdade
**Regra:** `n8n_chat_histories` é a tabela OFICIAL de mensagens. A tabela `messages` antiga foi removida (migração M-006).

### BR-08.2: Vinculação Automática (Trigger ENRICH)
**Regra:** Mensagens do n8n são vinculadas ao contato, empresa e conversa automaticamente via trigger — sem intervenção manual.

**Trigger:** `trg_enrich_n8n_chat_histories` (BEFORE INSERT)

**Lógica:**
1. `session_id` → cast para UUID → `contact_id`
2. Busca `company_id` via `contacts`
3. Busca ou cria `conversation_id` via `conversations`
4. Preenche os campos no `NEW` antes de gravar

### BR-08.3: Realtime obrigatório
**Regra:** A UI de mensagens NÃO faz polling. Depende exclusivamente do Supabase Realtime.

**Implementação:** `n8n_chat_histories` publicada em `supabase_realtime`.

### BR-08.4: Toggle do Bot
**Regra:** O operador pode desligar o bot por conversa — assume o controle manualmente.

---

## 🔗 BR-09: Integrações por Empresa

**Regra:** Cada empresa tem sua própria configuração de integrações em `company_integrations`.

**Provedores:** `whatsapp`, `evolution_api`, `n8n_automation`, `gmail`

**Acesso:** Apenas `admin` pode gerenciar (INSERT/UPDATE/DELETE em `company_integrations`).

**Criação automática:** Quando uma empresa é criada, o trigger `trigger_new_company_integrations` insere entradas com `is_active = false` para todos os provedores.

---

## 💰 BR-10: Billing via Stripe

**Regra:** Gestão de assinatura exclusivamente via Portal do Stripe (não pelo sistema).

**Fluxo:** Usuário clica "Minha Assinatura" → Edge Function `create-portal` → redireciona para Stripe.

**Integração:** Edge Function usa `SUPABASE_SERVICE_ROLE_KEY` para buscar o `stripe_customer_id` da empresa.

**Visibilidade:** Botão "Minha Assinatura" aparece apenas para `tipo='comum'` E `status_code === 3` (tem assinatura, mesmo que trial).

---

## 📋 BR-11: Perfil e Logo

**Regra:** Logo da empresa é salvo no bucket `logoEmpresa` com path `{user_id}.{ext}`.

**Validação:** Máximo 2MB. `upsert: true` — sobrescreve logo anterior sem criar duplicatas.

**Campos imutáveis pelo usuário:** `email` (campo desabilitado no formulário — requer suporte para alterar).

**Campos mutáveis:** `nome_completo`, `telefone`, `empresa`, `cpf`, `PIX`

---

## 🔑 BR-12: Segurança de Credenciais

| Regra | Detalhe |
|---|---|
| `service_role` no client-side | ❌ PROIBIDO |
| `evolution_api_key` exposta | ❌ PROIBIDO — usar apenas em Route Handlers server-side |
| `anon_key` no client-side | ✅ Permitido — é publishable key |
| Proxy para APIs externas | ✅ Sempre via Next.js Route Handlers (`/api/evolution/*`) |
| Dados multi-tenant sem RLS | ❌ PROIBIDO |

---

## 🗂️ BR-13: Convenções de Nomenclatura

| Item | Padrão | Exemplo |
|---|---|---|
| Tabelas | `snake_case` singular ou plural | `procedure_catalog`, `appointments` |
| IDs | UUID v4 | `uuid_generate_v4()` |
| Status (appointments) | lowercase string | `'scheduled'`, `'completed'`, `'cancelled'` |
| Status (procedure_records) | lowercase PT | `'realizado'`, `'cancelado'`, `'pendente'` |
| Dias da semana | 0=Dom, 1=Seg, ..., 6=Sáb | `day_of_week = 0` é domingo |
| Timestamps | ISO 8601 UTC | `start_time: "2026-04-11T13:00:00.000Z"` |
| Horários de expediente | `HH:mm:ss` | `open_time: "09:00:00"` |
