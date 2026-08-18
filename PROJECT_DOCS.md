# DentixiaPro App Documentation

This document outlines the current state and architecture of the DentixiaPro application.

## Overview

DentixiaPro is a SaaS platform for dental simulations powered by AI. It provides authentication, billing via Stripe, dental image simulations via Google Gemini, and partner referral management.

**Location:** `d:\m_fer\Documents\DaLua Apps\SISTEMAS\PRODUCAO\DentixiaPro\app`  
**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS, Supabase (PostgreSQL + Auth + Storage + Edge Functions), Stripe.

## Architecture

The system uses a robust **RBAC (Role-Based Access Control) Multi-Tenant Architecture**. 

*   **Tenant Binding:** All domains are strictly bound to a `company_id`.
*   **User Roles (Global):** Stored in `usuarios.tipo` (`comum`, `parceiro`, `super_admin`).
*   **Company Roles:** Stored in `user_company.role` (`admin`, `manager`, `user`).
*   **Security Policies (RLS):** Data access is governed by Supabase Row Level Security using functions like `can_access_company()`, `is_admin_of()`, and `is_super_admin()`.

*For deep architectural details, see [ARCHITECTURE.md](ARCHITECTURE.md).*

## Directory Structure

```
DentixiaPro/                          ← raiz do projeto
  app/                                ← aplicação Next.js (trabalhar aqui)
    .env.local                        ← variáveis de ambiente locais
    next.config.ts                    ← config Next.js (remotePatterns Supabase aqui!)
    src/
      app/                            ← rotas Next.js (App Router)
      components/                     ← componentes React reutilizáveis
      lib/
        auth/actions.ts               ← Server Actions de autenticação
        images.ts                     ← registry central de imagens (public/)
    supabase/                         ← CLI Supabase (executar de app/)
      functions/                      ← Edge Functions (stripe-webhook, create-portal, create-checkout)
      migrations/                     ← Migrations SQL
    public/                           ← assets estáticos (logo.png, logo-icon.png, etc)
  GUIA_IMPLANTACAO_TESTE_SUPABASE_STRIPE.md  ← guia completo de deploy
```

> [!IMPORTANT]
> **NÃO há pasta `supabase/` na raiz** — a pasta ativa é `app/supabase/`. Sempre execute `supabase` CLI de dentro de `app/`.

## Post-Deploy Configuration (CRÍTICO)

> Após qualquer troca de projeto Supabase, é **obrigatório** configurar:

1. **Site URL** → `Authentication > URL Configuration` no painel Supabase  
   ⚠️ Se ficar como `http://localhost:3000`, emails de confirmação e recuperação de senha redirecionam para localhost!

2. **Redirect URLs** → Adicionar:
   - `https://dentixiapro.vercel.app/**`
   - `http://localhost:3000/**`

3. **Google OAuth Provider** → `Authentication > Providers > Google`  
   Requer Client ID + Client Secret do Google Cloud Console  
   Callback URI: `https://<PROJECT_REF>.supabase.co/auth/v1/callback`

4. **`next.config.ts` → `remotePatterns`** → Atualizar hostname do Supabase  
   (causa falha silenciosa de imagens na Vercel se apontar para projeto antigo)

5. **Variáveis Vercel** → `Settings > Environment Variables` → Atualizar todas as chaves

6. **Chaves Stripe** → `STRIPE_SECRET_KEY` = `sk_test_...` | `STRIPE_WEBHOOK_SECRET` = `whsec_...`

---

## Recent Features & Core Workflows

1.  **Hybrid Chat AI (Mensagens):** Integrates with Evolution API and n8n to provide a seamless chatbot experience where human agents can take over, pausing the AI automatically. It differentiates between AI messages and human agent messages dynamically in real-time.
2.  **Scheduling via n8n:** N8n automation handles complex scheduling scenarios by factoring in clinic business hours and checking existing slots directly.
3.  **Simulation & Autocomplete:** Implements an advanced UI for client search predicting results from the `contacts` table, ensuring proper patient logging.
4.  **Vídeo de Boas-Vindas Vertical (Admin & Todos os Usuários Comuns):** O vídeo do YouTube cadastrado pelo Admin (`system_settings.welcome_video_url`) é distribuído publicamente para todos os usuários comuns ao entrarem no sistema. Exibido em modal de proporção vertical 1080x1920 (9:16) ocupando ~80% da altura da tela (`h-[80vh]`), contendo botões estilizados de confirmação "Já assisti a este vídeo" que persistem em `usuarios.check_video`.

## Clean Up Notes
Unnecessary debug scripts (`check_supabase*.mjs`, `query.mjs`, `query.ts`, `eslint_report.json`) have been removed from the root to maintain a clean workspace. Database migrations have been properly organized into `supabase/migrations/`.

## Spec-Driven Decisions (April 2026)

*   **Procedure Unification:** All logic for listing, checking, and validating procedures across components (Calendar, Scheduling, History) MUST use a global single source of truth for the CRUD of Procedures (e.g., `ProcedureGrid` / `useProcedures` hook).
*   **Business Hours Constraints:** Calendar processing must strictly respect 'Horário de Funcionamento' settings on both frontend (UI disablement like cross-hatching) and backend API validation. No appointments should be allowed outside the designated business hours.
*   **UI Structure:** Multi-item configurations (like adding procedures) must utilize full-width responsive grids instead of fixed mobile-like widths to leverage desktop space efficiently.
