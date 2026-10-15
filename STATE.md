# 🗺️ Mission Control: Estado do Projeto (Project State)

**Última atualização**: 2026-10-15 — Sprint: Guia Definitivo de Deploy, Ativação do Middleware Next.js, SEO e Limpeza de Dead Code

---

## 1. O Que Mudou (What Changed)

### Sprint Atual (2026-10-15 — Deploy Guide Oficial, Middleware Next.js, SEO & Hardening)

- ✅ **Ativação do Middleware Oficial Next.js**:
  - `src/proxy.ts` não era reconhecido pelo Next.js. Implementado `src/middleware.ts` com tipagem oficial `export async function middleware(request: NextRequest)`.
  - Liberadas rotas públicas regulatórias `/termos` e `/privacidade` sem necessidade de login.
  - Matcher ajustado para interceptar rotas de autenticação e redirecionar usuários logados automaticamente.
  - `src/proxy.ts` mantido como re-export por retrocompatibilidade com marcação `@deprecated`.

- ✅ **Resiliência do Webhook do Stripe**:
  - `supabase/functions/stripe-webhook/index.ts` atualizado para ler `STRIPE_WEBHOOK_SIGNING_SECRET` ou `STRIPE_WEBHOOK_SECRET` com fallback automático.

- ✅ **Next.js Images Wildcard**:
  - `next.config.ts` ajustado com `**.supabase.co` para compatibilidade com qualquer instância Supabase em staging/produção.

- ✅ **SEO, Robôs e Sitemap**:
  - Criados `src/app/robots.ts` e `src/app/sitemap.ts` para indexação estruturada das páginas públicas e proteção de rotas privadas.
  - Metadados aprimorados em `src/app/layout.tsx` (OpenGraph, Twitter Cards, Viewport).

- ✅ **Guia Definitivo de Deploy (`docs/DEPLOY_GUIDE.md`)**:
  - Criado manual passo a passo de implantação cobrindo Supabase, Stripe, Gemini AI, Vercel e Smoke Tests de ponta a ponta.
  - Corrigido link quebrado no `README.md` e atualizada a matriz de variáveis de ambiente (`SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`).

- ✅ **Testes Automatizados e Higienização**:
  - Adicionado script `npm test` no `package.json`.
  - Atualizados testes de `ClientLayout.test.tsx` com mocks de Server Actions.
  - Removidos arquivos mortos de debug (`diff.txt`, `log.txt`, etc.) e pastas residuais.

### Sprint Anterior (2026-08-30 — Correções Críticas de Pagamento, Customers e Permissão Admin)

- ✅ **Auditoria de Duplicação e Tabela Customers**:
  - **Identificado**: As assinaturas e empresas aparentando duplicidade correspondiam a 2 checkouts distintos no Stripe (`sub_1U9wNMHp4Yp60Bp8MMnwsSL3` cancelada e `sub_1U9wUxHp4Yp60Bp8lFA5vSY5` ativa).
  - **Tabela `customers` vazia**: `create-checkout` tentava inserir em `customers` antes de persistir o registro em `company`, violando a Foreign Key `customers_company_id_fkey`. Corrigido garantindo `company.upsert` prévio no `create-checkout` e sincronização no `manageSubscription` do webhook.
  - **Vínculo Restaurado**: Usuário `5b219520-029b-479e-a8a5-917eda417593` vinculado ao `stripe_customer_id: cus_VAH2te2kGsNfBZ`.

- ✅ **Bug: Usuário Comum visualizando Menu Admin**:
  - **Causa**: Ao salvar o vínculo de pagamento em `user_company`, o webhook definia o papel do usuário como `'admin'` (ou `'owner'`). A action `getClientLayoutDataAction` e `checkAdminAccessAction` tratavam qualquer `user_company.role === 'admin'` como Administrador Global do Sistema DentixIA.
  - **Fix**:
    1. Ajustado o papel padrão no webhook para `role: 'user'` em `user_company`.
    2. Atualizado o registro do usuário `5b219520-029b-479e-a8a5-917eda417593` para `role = 'user'`.
    3. Refatoradas as actions `getClientLayoutDataAction` e `checkAdminAccessAction` para validar acesso administrativo **estritamente via `usuarios.tipo IN ('admin', 'super_admin')`**, impedindo que qualquer papel interno de tenant libere o menu Admin global.

- ✅ **Desacoplamento de Comissões e Metadados no Stripe**:
  - Removido processamento de comissões de dentro do webhook (`stripe-webhook`). Todas as regras de indicação e comissão agora operam nativamente no banco de dados via views (`view_parceiro_lista_indicados`, `view_parceiro_header`), cruzando `usuarios.referred_by_code` e `usuarios.referral_code`.

- ✅ **Saldo Residual de Período de Teste (Regra 3)**:
  - `create-checkout` calcula o saldo restante do trial (`trial_ends_at > now()`) e injeta `trial_end` no Stripe Checkout para que o usuário não seja debitado até o fim do período de teste.

- ✅ **Deploy das Edge Functions**:
  - `stripe-webhook` v8 (ACTIVE)
  - `create-checkout` v7 (ACTIVE)
  - `create-portal` v6 (ACTIVE)

---

## 2. Escopo Ativo do Sistema (4 Módulos)

1. **Início (Home)**: Painel inicial e visão geral do sistema.
2. **Simulações**: Motor de simulações estéticas odontológicas, salvamento de resultados e galeria.
3. **Aulas**: Área de membros e vídeos educativos.
4. **Perfil**: Informações cadastrais, upload de logo e gerenciamento de plano de assinatura.

---

## 3. Estado Atual dos Sistemas

| Sistema | Status | Observação |
|---|---|---|
| **Webhook Stripe** | ✅ v8 em produção | Sincroniza assinaturas, clientes e empresas via upsert limpo |
| **Checkout Stripe** | ✅ v7 em produção | Compatível com Deno 2 (`npm:stripe`) e suporte a `trial_end` |
| **Portal Stripe** | ✅ v6 em produção | Gerenciamento de faturas e cartões |
| **Tabela `customers`** | ✅ Sincronizada | FK garantida com auto-criação de company |
| **Permissões Admin** | ✅ Corrigido | Apenas `usuarios.tipo IN ('admin', 'super_admin')` |
| **Indicação / Referral** | ✅ No Banco de Dados | Trigger `handle_new_user` grava `referral_code` e `referred_by_code` |
| **View `verificar_status_usuario`** | ✅ Ativa | Status 3 (Acesso Liberado) para usuários pagantes |
