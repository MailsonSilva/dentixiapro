# DentixIA Pro

Plataforma SaaS de simulações odontológicas com IA para clínicas e dentistas. Gera antes/depois fotorrealistas usando Google Gemini, gerencia assinaturas via Stripe e opera sob RBAC multi-tenant com Supabase.

## Quick Start

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.local.example .env.local
# Preencher: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
#            GEMINI_API_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET

# 3. Rodar servidor de desenvolvimento
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## Features

- **Simulações IA** — Geração de antes/depois fotorrealista (Facetas, Clareamento, Implantes) via Google Gemini
- **Galeria de Resultados** — Histórico com slider comparativo antes/depois
- **Autenticação** — Email/senha + Google OAuth via Supabase Auth
- **Assinaturas Stripe** — Checkout, portal do cliente e webhook automatizado
- **Painel Admin** — Dashboard com métricas de uso, usuários e simulações
- **Programa de Parceiros** — Indicação com código referral e comissionamento
- **Vídeo de Boas-Vindas** — Modal de onboarding configurável pelo admin
- **Segurança RLS** — Row Level Security no Supabase com isolamento por `usuario_id`

## Tech Stack

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| **Framework** | Next.js (App Router) | 16.x |
| **Linguagem** | TypeScript | 5.x |
| **UI** | React + Framer Motion | 19.x |
| **Estilo** | Tailwind CSS | 4.x |
| **Backend** | Supabase (PostgreSQL + Auth + Storage + Edge Functions) | — |
| **Pagamentos** | Stripe (Checkout + Webhooks) | 20.x |
| **IA** | Google Gemini (Interactions API) | v1beta |
| **Testes** | Vitest + Testing Library | 4.x |

## Architecture

```
src/
├── app/                          # Rotas Next.js (App Router)
│   ├── admin/                    # Painel administrativo
│   ├── simulacoes/               # Motor de simulações IA
│   │   ├── page.tsx              # Fluxo: dicas → procedimento → upload → resultado
│   │   └── resultados/page.tsx   # Galeria (Server Component)
│   ├── perfil/                   # Perfil do usuário e assinatura
│   ├── planos/                   # Página de planos/pricing
│   ├── login/ | register/       # Autenticação
│   └── api/auth/callback/        # OAuth callback
│
├── components/
│   ├── ClientLayout.tsx          # Layout global (auth guard, paywall, sidebar)
│   ├── simulacoes/               # BeforeAfterSlider, ColorPicker, SimulationGallery
│   ├── admin/                    # Componentes do painel admin
│   └── ui/                       # Design system (Button, Card, Input, etc.)
│
├── lib/
│   ├── auth/actions.ts           # Server Actions: login, signup, OAuth
│   ├── simulacoes/
│   │   ├── actions.ts            # Server Actions: save, delete simulação
│   │   └── queries.ts            # Server Queries: listagem filtrada por usuário
│   ├── actions/simulacoes.ts     # Pipeline IA: upload → Gemini → storage → DB
│   ├── admin/actions.ts          # Server Actions: dashboard, métricas
│   ├── perfil/actions.ts         # Server Actions: perfil, logo, assinatura
│   ├── planos/actions.ts         # Server Actions: planos e preços
│   ├── supabaseServer.ts         # Client SSR (cookies-based)
│   └── supabase.ts               # Client Browser
│
supabase/
├── functions/
│   ├── create-checkout/          # Edge Function: Stripe Checkout Session
│   ├── create-portal/            # Edge Function: Stripe Customer Portal
│   └── stripe-webhook/           # Edge Function: Webhook handler (v5)
└── migrations/
    ├── 20260701_core_users.sql   # Usuários, RLS, is_admin, trigger
    ├── 20260702_storage.sql      # Buckets e RLS
    ├── 20260703_simulacoes.sql   # Simulações e tracking
    ├── 20260704_settings.sql     # System settings e notificações
    └── 20260705_subscriptions.sql # Assinaturas, user_company, view status
```

### Segurança

- **RLS (Row Level Security)** habilitado em todas as tabelas
- **Isolamento por `usuario_id`** — Cada usuário só vê seus próprios dados
- **Admin bypass** controlado via `public.is_admin(auth.uid())`
- **Server Actions** — Nenhuma chamada Supabase direta em Client Components
- **Edge Functions** usam `SUPABASE_SERVICE_ROLE_KEY` (server-side only)

## Configuration

| Variável | Descrição | Obrigatória |
|----------|-----------|:-----------:|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública Supabase | ✅ |
| `GEMINI_API_KEY` | Chave da API Google Gemini | ✅ |
| `STRIPE_SECRET_KEY` | Chave secreta Stripe (`sk_test_...` ou `sk_live_...`) | ✅ |
| `STRIPE_WEBHOOK_SECRET` | Secret do webhook Stripe (`whsec_...`) | ✅ |

### Post-Deploy Checklist

1. **Supabase → Authentication → URL Configuration** — Atualizar Site URL (produção)
2. **Supabase → Redirect URLs** — Adicionar domínio de produção (`https://app.dentixia.com/**`)
3. **Google OAuth** — Configurar Client ID/Secret no provider Google do Supabase
4. **`next.config.ts`** — Atualizar `remotePatterns` com hostname do Supabase
5. **Vercel → Environment Variables** — Todas as chaves acima
6. **Supabase → Edge Functions → Secrets** — `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

## API Reference

### Server Actions (Simulações)

| Action | Arquivo | Descrição |
|--------|---------|-----------|
| `gerarSimulacaoNativa(formData)` | `lib/actions/simulacoes.ts` | Pipeline completo: validação → upload → Gemini AI → storage → DB |
| `salvarSimulacaoConfirmada(...)` | `lib/actions/simulacoes.ts` | Salva simulação confirmada com nome do paciente |
| `getSimulationsAction()` | `lib/simulacoes/queries.ts` | Lista simulações do usuário autenticado |
| `deleteSimulationAction(id)` | `lib/simulacoes/actions.ts` | Exclui simulação (com verificação de propriedade) |

### Edge Functions (Stripe)

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/functions/v1/create-checkout` | POST | Cria sessão de Checkout Stripe |
| `/functions/v1/create-portal` | POST | Cria sessão do Customer Portal |
| `/functions/v1/stripe-webhook` | POST | Recebe eventos do Stripe (v5) |

### Autenticação

| Action | Descrição |
|--------|-----------|
| `signInWithPasswordAction(email, pwd)` | Login com email/senha |
| `signInWithGoogleAction(origin)` | Login OAuth Google |
| `signUpAction(payload)` | Cadastro com dados completos |
| `signOutAction()` | Logout |
| `sendPasswordResetAction(email)` | Reset de senha |

## Scripts

```bash
npm run dev      # Servidor de desenvolvimento (webpack)
npm run build    # Build de produção
npm run start    # Servidor de produção
npm run lint     # ESLint
```

## Documentation

- [PROJECT_DOCS.md](./PROJECT_DOCS.md) — Documentação técnica detalhada
- [STATE.md](./STATE.md) — Estado atual do projeto e histórico de sprints
- [SPEC.md](./SPEC.md) — Especificação de procedimentos e calendário
- [GUIA_IMPLANTACAO.md](../GUIA_IMPLANTACAO_TESTE_SUPABASE_STRIPE.md) — Guia completo de deploy

## License

Proprietary — DaLua Apps © 2026
