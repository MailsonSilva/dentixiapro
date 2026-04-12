# 🏗️ ARCHITECTURE.md — DentixIA Pro

> **Versão:** 4.0.0 | **Atualizado:** 2026-04-11 | **Status:** ✅ Produção

---

## 📌 Visão Geral do Ecossistema

DentixIA Pro é um **SaaS multi-tenant** para gestão de clínicas odontológicas. A plataforma combina um frontend Next.js com backend Supabase (PostgreSQL + RLS), automações via n8n e integrações WhatsApp via Evolution API.

```
┌────────────────────────────────────────────────────────────────┐
│                        CLIENTE (Browser)                       │
│                Next.js 16 · React 19 · TailwindCSS 4           │
└──────────────────────┬─────────────────────────────────────────┘
                       │ HTTPS
          ┌────────────▼────────────┐
          │   Vercel / Self-hosted  │
          │   Next.js App Router    │
          │   (SSR + Client-side)   │
          └────────┬────────────────┘
                   │
       ┌───────────┼────────────────────┐
       ▼           ▼                    ▼
┌─────────┐ ┌─────────────┐   ┌────────────────┐
│Supabase │ │ Evolution   │   │    n8n Cloud   │
│(BaaS)   │ │ API (WA)    │   │  (Automações)  │
│Auth     │ │             │   │                │
│Database │ │WhatsApp     │   │ AI Chatbot     │
│Storage  │ │Channels     │   │ CRM Triggers   │
│Realtime │ └─────────────┘   └────────────────┘
│Edge Fn  │
└─────────┘
```

---

## 🧩 Stack Tecnológica

| Camada | Tecnologia | Versão |
|---|---|---|
| **Framework** | Next.js (App Router) | 16.1.6 |
| **Runtime** | React | 19.2.3 |
| **Linguagem** | TypeScript | ^5 |
| **Estilização** | TailwindCSS | v4 |
| **Animações** | Framer Motion | ^12 |
| **Ícones** | Lucide React | ^0.577 |
| **Datas** | date-fns | ^4.1 |
| **Toasts** | Sonner | ^2.0 |
| **BaaS** | Supabase (PostgreSQL) | ^2.99 |
| **Auth** | Supabase Auth (SSR) | ^0.9 |
| **Pagamentos** | Stripe | ^20 |
| **Testes** | Vitest + Testing Library | ^4.1 / ^16 |
| **WhatsApp** | Evolution API | (self-hosted) |
| **Automação** | n8n | (cloud/VPS) |

---

## 🏢 Modelo Multi-Tenant

```
Tenant = company_id (UUID)
```

- **Toda tabela de domínio** possui `company_id NOT NULL`.
- O acesso é isolado via **Row Level Security (RLS)** do Supabase.
- O usuário pertence a uma empresa através da tabela `user_company`.

### Hierarquia de Usuários

```
super_admin  →  Bypass total (plataforma/dev)
     │
     └─── company ─── admin    (Tudo: billing, usuários, configurações)
                  ├── manager  (CRM completo, sem billing/gerenciar usuários)
                  └── user     (Criar/visualizar, sem deleção crítica)

Paralelo:
     parceiro  →  Área restrita de afiliados/indicadores
```

---

## 🔐 Camadas de Segurança RLS

### Funções Públicas RBAC

| Função SQL | Retorno | Quando Usar |
|---|---|---|
| `is_super_admin()` | `BOOLEAN` | Bypass total da RLS |
| `can_access_company(uuid)` | `BOOLEAN` | Acesso básico ao tenant |
| `is_admin_of(uuid)` | `BOOLEAN` | Operações críticas (DELETE, config) |
| `get_user_role_in_company(uuid)` | `app_role` | Consultar role atual |
| `setup_company_admin(company_id, user_id?)` | `void` | Onboarding: vincular admin |

### Matriz de Permissões

| Tabela | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `appointments` | any member | any member | any member | soft-cancel |
| `procedure_catalog` | member + system | member | member (não-system) | member (não-system) |
| `contacts` | any member | any member | any member | admin/manager |
| `simulacoes` | any member | any member | any member | admin/manager |
| `company_integrations` | any member | admin only | admin only | admin only |
| `company` | member | authenticated | admin only | — |
| `user_company` | own + admin | self + admin | self + admin | admin only |

---

## 🔄 Fluxos Principais

### 1. Onboarding
```
auth.signUp() 
  → trigger handle_new_user() → cria usuarios{}
  → INSERT company → cria clínica
  → RPC setup_company_admin() → vincula como admin em user_company
  → trigger handle_new_company_integrations() → cria entradas default em company_integrations
```

### 2. Verificação de Acesso (ClientLayout)
```
pathname muda
  → supabase.auth.getUser()
  → SELECT usuarios.tipo
  → if "parceiro" → redirecionar para /parceiros
  → if "comum" → SELECT user_company.role
    → if admin → acesso total
    → if manager/user → SELECT verificar_status_usuario
      → status_code === 3 → acesso ok
      → status_code !== 3 → Paywall (bloqueio via overlay)
```

### 3. Agendamento
```
Usuário clica em dia → AppointmentModal
  → createAppointmentAction()
    → checkBusinessHours() → valida expediente
    → checkConflict() → valida double-booking (app layer)
    → INSERT appointments
    → DB: UNIQUE INDEX previne race condition
```

### 4. Mensagens (n8n + Evolution API)
```
Mensagem WhatsApp recebida
  → Evolution API webhook → n8n
  → n8n processa + salva em n8n_chat_histories (session_id = contact_id)
  → trigger enrich_n8n_chat_histories()
    → resolve contact_id, company_id, conversation_id
    → UPDATE conversations.last_message_at
  → Supabase Realtime notifica o frontend
  → UI atualiza automaticamente (sem polling)
```

---

## 📁 Estrutura de Diretórios

```
app/
├── src/
│   ├── app/                    # Next.js App Router (rotas)
│   │   ├── agenda/             # Módulo: Calendário de agendamentos
│   │   ├── clientes/           # Módulo: Gestão de pacientes
│   │   ├── configuracoes/      # Módulo: Perfil, integrations, procedimentos
│   │   │   └── integracoes/    # Sub-rota: Evolution API + n8n
│   │   ├── crm/                # Módulo: Kanban CRM
│   │   ├── mensagens/          # Módulo: Central de mensagens
│   │   ├── simulacoes/         # Módulo: AI Smile Simulation
│   │   ├── planos/             # Módulo: Planos e pagamentos (Stripe)
│   │   ├── parceiros/          # Módulo: Dashboard parceiros
│   │   ├── indique-e-ganhe/    # Módulo: Programa de indicação
│   │   ├── api/                # Route Handlers (Next.js API)
│   │   │   ├── chat/           # Chat toggle-bot
│   │   │   └── evolution/      # Proxy Evolution API
│   │   ├── layout.tsx          # Root Layout (providers)
│   │   └── globals.css         # Design System CSS
│   ├── components/             # Componentes React reutilizáveis
│   │   ├── agenda/             # Componentes do calendário
│   │   ├── clientes/           # Componentes de pacientes
│   │   ├── crm/                # Componentes do Kanban
│   │   ├── mensagens/          # Componentes de mensagens
│   │   ├── procedimentos/      # ProcedureGrid (reutilizável)
│   │   ├── simulacoes/         # Componentes de simulação
│   │   ├── ui/                 # Primitivos: Button, Card, Input
│   │   ├── ClientLayout.tsx    # Layout autenticado (auth + sidebar)
│   │   ├── Navbar.tsx          # Topbar mobile
│   │   └── Sidebar.tsx         # Sidebar desktop
│   ├── lib/                    # Utilitários e data layer
│   │   ├── agenda/             # queries.ts + actions.ts
│   │   ├── clientes/           # queries + actions de pacientes
│   │   ├── crm/                # queries + actions do CRM
│   │   ├── mensagens/          # queries + actions de chat
│   │   ├── DrawerContext.tsx   # Contexto: drawer mobile
│   │   ├── NotificationContext.tsx  # Contexto: toasts
│   │   ├── SidebarContext.tsx  # Contexto: sidebar state
│   │   ├── supabase.ts         # Browser client Supabase
│   │   └── utils.ts            # cn() helper (clsx + TW merge)
│   └── hooks/
│       └── useProcedures.ts    # Hook CRUD procedimentos
├── supabase/
│   └── migrations/             # SQL migrations versionadas
├── public/                     # Assets estáticos
├── .env.local                  # Variáveis de ambiente
├── next.config.ts              # Configuração Next.js
└── tailwind.config (inline)    # Config TailwindCSS v4
```

---

## 🌐 Variáveis de Ambiente

| Variável | Escopo | Descrição |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Chave pública Supabase (publishable) |
| `NEXT_PUBLIC_N8N_WEBHOOK_URL` | Client | Webhook n8n para chat público |
| `N8N_WEBHOOK_URL` | Server only | Webhook n8n para CRM (server-side) |
| `EVOLUTION_API_URL` | Server only | URL base da Evolution API |
| `EVOLUTION_GLOBAL_API_KEY` | Server only | Chave global da Evolution API |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | ⚠️ Chave admin Supabase (Edge Functions) |

> **Regra crítica:** `SUPABASE_SERVICE_ROLE_KEY` nunca deve ser exposta ao client-side.

---

## 📦 Edge Functions Supabase

| Função | Método | Descrição |
|---|---|---|
| `create-portal` | POST | Cria sessão no Stripe Customer Portal |

**Chamada:**
```typescript
fetch(`${NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-portal`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${ANON_KEY}` },
  body: JSON.stringify({ company_id, return_url })
})
```

---

## 🔗 Integrações Externas

| Serviço | URL | Tipo | Finalidade |
|---|---|---|---|
| **Supabase** | `setwhujbophxwzighcge.supabase.co` | BaaS | DB, Auth, Storage, Realtime |
| **Evolution API** | `api.vps.webartemodelos.com` | WhatsApp | Instâncias WA por empresa |
| **n8n** | `webhook.vps.webartemodelos.com` | Automação | AI chatbot, CRM sync |
| **Stripe** | (via Edge Function) | Pagamento | Assinaturas e portal billing |
| **Google Fonts** | (Inter + Poppins) | CDN | Tipografia |

---

## ⚙️ Scripts NPM

| Script | Comando | Uso |
|---|---|---|
| `dev` | `next dev --webpack` | Desenvolvimento local |
| `build` | `next build` | Build de produção |
| `start` | `next start` | Servidor de produção |
| `lint` | `eslint` | Verificar qualidade do código |

---

## 🚫 Regras de Ouro da Arquitetura

1. **Nunca** usar `service_role` no client-side
2. **Sempre** propagar `company_id` em todas as queries (multi-tenant)
3. **Sempre** usar RLS como última linha de defesa
4. **Nunca** criar tabela de domínio sem `company_id NOT NULL`
5. **Sempre** verificar `businessHours` antes de aceitar agendamento
6. **Procedimentos**: lógica centralizada em `procedure_catalog` — nunca duplicar em tabelas separadas
