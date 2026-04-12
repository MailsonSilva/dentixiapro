# 🔌 BACKEND_API.md — DentixIA Pro

> **Versão:** 4.0.0 | **Atualizado:** 2026-04-11
>
> Backend = Supabase (PostgreSQL + RLS + Auth) + Next.js Route Handlers + Edge Functions

---

## 🗄️ Schema do Banco de Dados

### Tabelas Principais

#### `usuarios`
Perfil do usuário autenticado. Criado via trigger no signup.

| Coluna | Tipo | Constraints | Descrição |
|---|---|---|---|
| `id` | UUID | PK, FK auth.users | ID do usuário (Auth) |
| `nome_completo` | TEXT | | Nome do usuário |
| `email` | TEXT | | E-mail |
| `telefone` | TEXT | | Telefone com máscara |
| `empresa` | TEXT | | Nome da clínica |
| `cpf` | TEXT | | CPF formatado |
| `PIX` | TEXT | | Chave PIX |
| `logo_url` | TEXT | | URL pública do logo (Storage) |
| `tipo` | `tipo_usuario` ENUM | `NOT NULL` | `'comum'` \| `'parceiro'` \| `'super_admin'` \| `'admin'` |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | |

---

#### `company`
Empresa/clínica. Um usuário pode ser membro de mais de uma.

| Coluna | Tipo | Constraints | Descrição |
|---|---|---|---|
| `id` | UUID | PK | ID da empresa (tenant) |
| `name` | TEXT | NOT NULL | Nome da clínica |
| `trial_ends_at` | TIMESTAMPTZ | | Data fim do trial |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | |

**Trigger:** `trigger_new_company_integrations` — Após INSERT, cria entradas default em `company_integrations` para whatsapp, evolution_api, n8n_automation, gmail.

---

#### `user_company`
Tabela de associação: usuário ↔ empresa + role.

| Coluna | Tipo | Constraints | Descrição |
|---|---|---|---|
| `id` | UUID | PK | |
| `user_id` | UUID | FK usuarios.id | |
| `company_id` | UUID | FK company.id | |
| `role` | `app_role` ENUM | NOT NULL | `'admin'` \| `'manager'` \| `'user'` |
| `active` | BOOLEAN | DEFAULT true | Membership ativa |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | |

**Trigger:** `trg_prevent_last_admin` → `prevent_last_admin_removal()` — Bloqueia DELETE/UPDATE do último admin de uma empresa. Lança `EXCEPTION 'company_must_have_admin'`.

---

#### `contacts`
Pacientes/clientes de uma empresa.

| Coluna | Tipo | Constraints | Descrição |
|---|---|---|---|
| `id` | UUID | PK | |
| `company_id` | UUID | FK company.id, NOT NULL | Tenant |
| `name` | TEXT | NOT NULL | Nome do paciente |
| `phone` | TEXT | | Telefone |
| `email` | TEXT | | E-mail |
| `address` | TEXT | *(M-003)* | Endereço |
| `birth_date` | DATE | *(M-003)* | Data de nascimento |
| `stage_id` | UUID | FK crm_stages.id | Estágio no CRM Kanban |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | |

---

#### `appointments`
Agendamentos da agenda.

| Coluna | Tipo | Constraints | Descrição |
|---|---|---|---|
| `id` | UUID | PK | |
| `company_id` | UUID | FK company.id, NOT NULL | Tenant |
| `contact_id` | UUID | FK contacts.id, NOT NULL | Paciente |
| `start_time` | TIMESTAMPTZ | NOT NULL | Início do atendimento |
| `end_time` | TIMESTAMPTZ | NOT NULL | Fim do atendimento |
| `procedure_name` | TEXT | NOT NULL | Nome do procedimento (snapshot) |
| `catalog_id` | UUID | FK procedure_catalog.id, NULL | Referência ao catálogo *(M-003)* |
| `status` | TEXT | NOT NULL | `'scheduled'` \| `'completed'` \| `'cancelled'` |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | |

**Índice único:** `idx_appointments_no_double_booking`
```sql
UNIQUE ON (company_id, start_time) WHERE (status IS DISTINCT FROM 'cancelled')
```
Previne double-booking mesmo em race conditions.

---

#### `procedure_catalog`
Catálogo de procedimentos. Compartilhado entre sistema e empresa.

| Coluna | Tipo | Constraints | Descrição |
|---|---|---|---|
| `id` | UUID | PK | |
| `company_id` | UUID | FK company.id, NULL | NULL = procedimento do sistema |
| `name` | TEXT | NOT NULL | Nome do procedimento |
| `duration_min` | INTEGER | NOT NULL, DEFAULT 60 | Duração em minutos |
| `is_system` | BOOLEAN | NOT NULL, DEFAULT false | true = global, imutável |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | |

**Seed (is_system = true):** Avaliação(30'), Limpeza(60'), Clareamento(90'), Ortodontia(60'), Implante(120'), Canal(90'), Extração(45'), Restauração(45'), Prótese(60'), Outros(60').

**RLS:**
- SELECT: `is_system = true` OR membro da empresa
- INSERT/UPDATE/DELETE: somente registros da empresa (`is_system = false`)

---

#### `procedure_records`
Histórico de procedimentos realizados por paciente.

| Coluna | Tipo | Constraints | Descrição |
|---|---|---|---|
| `id` | UUID | PK | |
| `company_id` | UUID | FK company.id, NOT NULL | |
| `contact_id` | UUID | FK contacts.id, NOT NULL | |
| `catalog_id` | UUID | FK procedure_catalog.id, NULL | |
| `procedure_name` | TEXT | NOT NULL | Snapshot do nome |
| `performed_at` | DATE | NOT NULL | Data de realização |
| `status` | TEXT | CHECK | `'realizado'` \| `'cancelado'` \| `'pendente'` |
| `notes` | TEXT | | Observações |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | |

**Índice:** `idx_proc_records_contact ON (contact_id, performed_at DESC)`

---

#### `company_business_hours`
Horário de funcionamento da empresa, por dia da semana.

| Coluna | Tipo | Constraints | Descrição |
|---|---|---|---|
| `id` | UUID | PK | |
| `company_id` | UUID | FK company.id, NOT NULL | |
| `day_of_week` | INTEGER | NOT NULL | 0=Dom, 1=Seg, …, 6=Sáb |
| `is_open` | BOOLEAN | NOT NULL | false = dia fechado |
| `open_time` | TIME | | Horário de abertura |
| `close_time` | TIME | | Horário de fechamento |

---

#### `crm_stages`
Estágios do Kanban CRM por empresa.

| Coluna | Tipo | Constraints | Descrição |
|---|---|---|---|
| `id` | UUID | PK | |
| `company_id` | UUID | FK company.id, NOT NULL | |
| `name` | TEXT | NOT NULL | Nome do estágio |
| `color` | TEXT | | Cor hex |
| `order_index` | INTEGER | DEFAULT 0 | Posição do estágio |
| `is_default` | BOOLEAN | DEFAULT false | Estágio padrão para novos contatos |

---

#### `communication_channels`
Canais de comunicação da empresa (WhatsApp, Instagram, Webchat).

| Coluna | Tipo | Constraints | Descrição |
|---|---|---|---|
| `id` | UUID | PK | |
| `company_id` | UUID | FK company.id, NOT NULL | |
| `type` | TEXT | CHECK | `'whatsapp'` \| `'instagram'` \| `'webchat'` |
| `identifier` | TEXT | NOT NULL | Instance name da Evolution API ou telefone |
| `name` | TEXT | | Nome amigável do canal |
| `active` | BOOLEAN | DEFAULT true | Canal ativo |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | |

---

#### `conversations`
Conversa entre empresa e contato através de um canal.

| Coluna | Tipo | Constraints | Descrição |
|---|---|---|---|
| `id` | UUID | PK | |
| `company_id` | UUID | FK company.id, NOT NULL | |
| `contact_id` | UUID | FK contacts.id, NOT NULL | |
| `channel_id` | UUID | FK communication_channels.id, NOT NULL | |
| `status` | TEXT | DEFAULT 'active' | Estado da conversa |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | |
| `last_message_at` | TIMESTAMPTZ | DEFAULT now() | Atualizado em cada mensagem |

---

#### `n8n_chat_histories`
Tabela nativa do n8n, adaptada para o CRM. Fonte oficial de mensagens.

| Coluna | Tipo | Constraints | Descrição |
|---|---|---|---|
| `id` | SERIAL/UUID | PK | |
| `session_id` | TEXT | | UUID do contato (enviado pelo n8n) |
| `message` | JSONB | | Objeto da mensagem |
| `created_at` | TIMESTAMPTZ | | |
| `conversation_id` | UUID | FK conversations.id *(M-005)* | |
| `company_id` | UUID | FK company.id *(M-005)* | |
| `contact_id` | UUID | FK contacts.id *(M-005)* | |

**Trigger:** `trg_enrich_n8n_chat_histories` (BEFORE INSERT)
→ `enrich_n8n_chat_histories()` — Auto-preenche `contact_id`, `company_id`, `conversation_id` a partir do `session_id`.

**Realtime:** Tabela publicada em `supabase_realtime` — o frontend recebe novos msgs sem polling.

---

#### `company_integrations`
Configuração de integrações por empresa.

| Coluna | Tipo | Constraints | Descrição |
|---|---|---|---|
| `id` | UUID | PK | |
| `company_id` | UUID | FK company.id, NOT NULL | |
| `provider` | TEXT | NOT NULL | `'whatsapp'` \| `'evolution_api'` \| `'n8n_automation'` \| `'gmail'` |
| `is_active` | BOOLEAN | DEFAULT false | Integração ligada |
| `credentials` | JSONB | DEFAULT `{}` | Chaves/config da integração |
| `created_at` | TIMESTAMPTZ | | |
| `updated_at` | TIMESTAMPTZ | | |

**UNIQUE:** `(company_id, provider)` — Uma entrada por provedor por empresa.

---

## 🔧 Data Layer: Lib Functions

### `lib/agenda/queries.ts`

| Função | Parâmetros | Retorno | Descrição |
|---|---|---|---|
| `getAppointments` | `start, end: string (ISO)` | `Appointment[]` | Agendamentos do intervalo, exclui `cancelled` |
| `getAppointmentById` | `id: string` | `Appointment \| null` | Agendamento individual com contato |
| `getCalendarContacts` | — | `Contact[]` | Todos contatos da empresa, ordenados por nome |
| `getProcedureCatalog` | `companyId?: string` | `ProcedureCatalogItem[]` | Sistema + empresa, ordenados por `is_system DESC, name` |
| `getCompanyBusinessHours` | `companyId: string` | `any[]` | Horários por dia, ordenado por `day_of_week` |

**Query de Appointments:**
```typescript
supabase.from('appointments')
  .select('id, company_id, contact_id, start_time, end_time, procedure_name, catalog_id, status, contacts!contact_id (id, name, phone, email)')
  .gte('start_time', start).lte('start_time', end)
  .neq('status', 'cancelled')
```

---

### `lib/agenda/actions.ts`

#### `checkBusinessHours(companyId, startTime, endTime)`
Valida se o horário está dentro do expediente da empresa.

**Lógica:**
1. Busca `company_business_hours` para o `day_of_week` do `startTime`
2. Se não configurado → **permite** (retrocompatibilidade)
3. Se `is_open = false` → throws `"A clínica encontra-se fechada neste dia da semana."`
4. Compara `HH:mm` do startTime/endTime com `open_time`/`close_time`
5. Se fora → throws com horário formatado (ex: `"O horário escolhido (08:00 - 09:30) está fora do expediente (09:00 - 18:00)."`)

#### `checkConflict(companyId, startTime, excludeId?)`
Verifica double-booking na camada de aplicação.

```typescript
// Query: busca agendamento ativo no mesmo horário (exceto `excludeId`)
.eq('company_id', companyId)
.eq('start_time', startTime.toISOString())
.neq('status', 'cancelled')
```

Retorna `boolean`. A segunda linha de defesa é o `UNIQUE INDEX` no banco.

#### `createAppointmentAction(payload)`
1. `parseISO(date + time)` → `startTime`
2. `addMinutes(startTime, durationMin ?? 60)` → `endTime`
3. `checkBusinessHours()` (throws se inválido)
4. `checkConflict()` (throws se conflito)
5. `INSERT appointments` → retorna o novo registro

#### `updateAppointmentAction(id, payload)`
Igual ao create, com `checkConflict(excludeId = id)` e `UPDATE appointments`.

#### `updateAppointmentDateAction(id, newDate, companyId)`
Usado pelo Drag & Drop.

1. Busca o agendamento atual para obter `start_time` e `end_time`
2. Calcula `duration` em ms
3. **FIX de timezone:** usa `format(oldStart, 'HH:mm')` (date-fns, respeita local) em vez de `toISOString().substring(11,16)` (que causava desvio UTC-3)
4. Reconstrói `newStart` e `newEnd`
5. `checkBusinessHours()` (throws se dia fechado)
6. `checkConflict()` → retorna `{ status: 'conflict' }` (não throws)
7. Se ok → `UPDATE appointments`

**Retorno:** `DropResult = { status: 'success' } | { status: 'conflict' }`

No conflict → frontend abre o modal de edição com data nova pré-preenchida.

#### `updateAppointmentStatusAction(id, status)`
UPDATE simples do campo `status`.

#### `deleteAppointmentAction(id)`
**Soft-delete:** UPDATE `status = 'cancelled'` (nunca DELETE físico).

---

## 🌐 Next.js Route Handlers (API Routes)

### `GET /api/evolution/instances`
Proxy para `GET {EVOLUTION_API_URL}/instance/fetchInstances`.

**Auth:** header `apikey: EVOLUTION_GLOBAL_API_KEY` (server-side).

**Finalidade:** Listar instâncias WhatsApp existentes do servidor.

---

### `POST /api/evolution/create-instance`
Proxy para `POST {EVOLUTION_API_URL}/instance/create`.

**Body:** `{ instanceName, token?, ... }`

---

### `DELETE /api/evolution/delete-instance/[instance]`
Proxy para `DELETE {EVOLUTION_API_URL}/instance/delete/{instance}`.

---

### `POST /api/evolution/logout-instance/[instance]`
Desconectar instância WhatsApp.

---

### `POST /api/evolution/message`
Enviar mensagem pelo canal WhatsApp.

---

### `POST /api/evolution/webhook`
Receber webhooks da Evolution API (mensagens recebidas).

---

### `POST /api/chat/toggle-bot`
Liga/desliga o bot de IA via Toggle na UI de mensagens.

**Body:** `{ conversationId, companyId, enabled: boolean }`

**Ação:** Atualiza flag no Supabase e/ou notifica o n8n.

---

## ☁️ Edge Functions Supabase

### `create-portal`

**Rota:** `{SUPABASE_URL}/functions/v1/create-portal`

**Método:** POST

**Auth:** `Authorization: Bearer {ANON_KEY}` + `apikey: {ANON_KEY}`

**Body:**
```json
{
  "company_id": "uuid",
  "return_url": "https://app.dentixia.com/perfil"
}
```

**Processamento:**
1. Verifica `company_id` e busca `stripe_customer_id` da empresa
2. Chama `stripe.billingPortal.sessions.create({ customer, return_url })`
3. Retorna `{ url: "https://billing.stripe.com/..." }`

---

## 📊 Views Supabase

### `verificar_status_usuario`
View (ou função) que retorna o status de assinatura do usuário atual.

| Coluna | Tipo | Descrição |
|---|---|---|
| `status_code` | INTEGER | `3` = acesso ok \| `2` = trial expirado |
| `descricao` | TEXT | Descrição legível |
| `dias_restantes` | INTEGER | `999` = assinatura paga \| `>0` = trial ativo \| `0` = expirado |

**Uso:** `SELECT * FROM verificar_status_usuario` (filtra pelo `auth.uid()` via RLS).

### `v_my_companies`
View que retorna as empresas e roles do usuário logado.

| Coluna | Tipo | Descrição |
|---|---|---|
| `company_id` | UUID | ID da empresa |
| `company_name` | TEXT | Nome |
| `role` | `app_role` | Role do usuário |
| `trial_ends_at` | TIMESTAMPTZ | Fim do trial |
| `permissions` | JSONB | Permissões derivadas |

---

## 📦 Storage Buckets

| Bucket | Acesso | Conteúdo |
|---|---|---|
| `logoEmpresa` | Público | Logos das clínicas (path: `{user_id}.{ext}`) |

**Upload path:** `{user_id}.{ext}` com `upsert: true` (substitui logo anterior).

**Validação:** máximo 2MB, qualquer tipo de imagem.

---

## 🔄 Migrations Versionadas

| Arquivo | Data | O Que Faz |
|---|---|---|
| `0001_crm_chat.sql` | 2026-03 | CRM Kanban (stages, procedures), Mensagens (channels, conversations, messages) |
| `0002_simulacoes_schema_update.sql` | | Atualização do schema de simulações |
| `0003_crm_agenda_refinement.sql` | 2026-04-02 | `procedure_catalog`, `procedure_records`, `catalog_id` em appointments, UNIQUE INDEX double-booking, campos clínicos em contacts |
| `0004_fix_chat_replication_and_realtime.sql` | | Fix de replicação + Realtime para mensagens |
| `0005_n8n_chat_histories_columns.sql` | | Integração `n8n_chat_histories` como tabela oficial de mensagens, trigger ENRICH |
| `0006_drop_messages_and_backfill.sql` | | Remoção da tabela antiga `messages`, migração de dados |
| `0007_drop_obsolete_functions.sql` | | Limpeza de funções obsoletas |
| `setup_integrations.sql` | | `company_integrations`, RLS, trigger auto-populate em nova empresa |

---

## 🔗 Integrações Externas: APIs

### Evolution API

**Base URL:** `EVOLUTION_API_URL` (server-side only)

**Autenticação:** `apikey` header com `EVOLUTION_GLOBAL_API_KEY`

**Endpoints Utilizados:**
```
GET  /instance/fetchInstances           → listar instâncias
POST /instance/create                   → criar nova instância WA  
DEL  /instance/delete/{instance}        → deletar instância
POST /instance/logout/{instance}        → desconectar instância
POST /message/sendText/{instance}       → enviar mensagem
POST /webhook/set/{instance}            → configurar webhook
```

---

### n8n Webhooks

| Webhook | Env Key | Uso |
|---|---|---|
| Chat público | `NEXT_PUBLIC_N8N_WEBHOOK_URL` | Chat via `/mensagens` |
| CRM automações | `N8N_WEBHOOK_URL` | Triggers do CRM (server-side) |

O n8n salva histórico em `n8n_chat_histories` usando o `contact_id` como `session_id`.
