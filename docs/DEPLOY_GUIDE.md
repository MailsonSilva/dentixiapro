# 🚀 Guia Definitivo de Implantação e Deploy — DentixIA Pro

> **Versão:** 2.2.1 | **Status:** ✅ Produção | **Stack:** Next.js 16 (App Router), React 19, Supabase (PostgreSQL + Auth + Storage + Edge Functions), Stripe, Google Gemini AI, Tailwind CSS 4.

Este documento é o manual oficial de implantação de ponta a ponta para colocar o **DentixIA Pro** em produção ou em ambientes de homologação/staging.

---

## 📋 Sumário
1. [Visão Geral da Arquitetura](#1-visão-geral-da-arquitetura)
2. [Matriz de Variáveis de Ambiente](#2-matriz-de-variáveis-de-ambiente)
3. [Configuração do Supabase](#3-configuração-do-supabase)
4. [Deploy das Supabase Edge Functions](#4-deploy-das-supabase-edge-functions)
5. [Configuração do Stripe](#5-configuração-do-stripe)
6. [Configuração do Google Gemini AI](#6-configuração-do-google-gemini-ai)
7. [Deploy da Aplicação na Vercel](#7-deploy-da-aplicação-na-vercel)
8. [Checklist e Smoke Tests Pós-Deploy](#8-checklist-e-smoke-tests-pós-deploy)
9. [Troubleshooting e Diagnóstico](#9-troubleshooting-e-diagnóstico)

---

## 1. Visão Geral da Arquitetura

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENTE (Web / PWA Mobile)                      │
│                  Next.js 16 · React 19 · Framer Motion                 │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS
                     ┌──────────────▼─────────────┐
                     │           Vercel           │
                     │    Next.js Edge Middleware  │
                     │    SSR + Server Actions    │
                     └──────────────┬─────────────┘
                                    │
       ┌────────────────────────────┼───────────────────────────┐
       ▼                            ▼                           ▼
┌──────────────┐          ┌───────────────────┐       ┌──────────────────┐
│   Supabase   │          │  Stripe Gateway   │       │  Google Gemini   │
│  PostgreSQL  │          │  Checkout Sessions│       │ Interactions API │
│  Auth (SSR)  │          │  Customer Portal  │       │  Edição Clínica  │
│  Storage RLS │          │  Webhooks         │       │  Fotorrealista   │
│Edge Functions│          └─────────┬─────────┘       └──────────────────┘
└──────▲───────┘                    │ Webhook Event
       └────────────────────────────┘ (via Edge Function)
```

---

## 2. Matriz de Variáveis de Ambiente

As variáveis devem ser configuradas na plataforma de hospedagem do frontend (**Vercel**) e no cofre de segredos do Supabase (**Supabase Secrets**).

### A. Frontend (Vercel / Next.js)

| Variável | Escopo | Descrição | Exemplo |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Público | URL raiz da API do Supabase | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Público | Chave pública anônima do Supabase | `eyJhbGciOi...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Privado | Chave administrativa (bypassa RLS) | `eyJhbGciOi...` |
| `NEXT_PUBLIC_APP_URL` | Público | URL canônica de produção | `https://app.dentixia.com.br` |
| `GEMINI_API_KEY` | Privado | Chave da API Google Gemini | `AIzaSy...` |
| `STRIPE_SECRET_KEY` | Privado | Chave secreta da API do Stripe | `sk_live_...` (ou `sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Privado | Chave de assinatura do webhook Stripe | `whsec_...` |

### B. Supabase Edge Functions (Supabase Secrets)

| Segredo | Obrigatório | Descrição |
|---|:---:|---|
| `STRIPE_SECRET_KEY` | ✅ | Chave secreta do Stripe (`sk_live_...` ou `sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | ✅ | Secret de validação de assinatura (`whsec_...`) |
| `STRIPE_WEBHOOK_SIGNING_SECRET` | ⚪ | Alias aceito alternativamente pelo webhook |
| `SUPABASE_URL` | Automático | Injetado nativamente pelo runtime do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Automático | Injetado nativamente pelo runtime do Supabase |
| `SUPABASE_ANON_KEY` | Automático | Injetado nativamente pelo runtime do Supabase |

---

## 3. Configuração do Supabase

### Passo 3.1: Executar as Migrações do Banco de Dados
Acesse o **SQL Editor** no painel do Supabase ou utilize a CLI do Supabase (`supabase db push`). Execute os arquivos SQL contidos na pasta `supabase/migrations/` rigorosamente na seguinte ordem:

1. `20260701000000_core_users_auth_and_security.sql` — Tabelas `usuarios`, enum `tipo_usuario`, triggers de signup e isolamento RLS.
2. `20260702000000_storage_buckets_and_rls.sql` — Buckets `simulacoes` e `dentixia`, com políticas de upload restritas.
3. `20260703000000_simulacoes_and_tracking.sql` — Tabela `simulacoes`, tracking de métricas e RPC atômica `increment_simulation_stat`.
4. `20260704000000_system_settings_and_notifications.sql` — Notificações in-app, vídeo de boas-vindas e configurações do admin.
5. `20260705000000_subscriptions_and_status_view.sql` — Tabelas do Stripe (`customers`, `products`, `prices`, `subscriptions`, `user_company`) e a view mestra `verificar_status_usuario`.
6. `20260706000000_cleanup_and_referral_fix.sql` — Motor de afiliados/indicações e correções de integridade.
7. `20260707000000_security_fixes_rls_and_storage.sql` — Blindagem estrita de `is_admin()`, RLS de imagens médicas e atualização da view de status.

### Passo 3.2: Configurar o Supabase Authentication & Login Social (Google OAuth)

1. **Configuração de URLs do Supabase:**
   - Acesse **Authentication → URL Configuration** no painel do Supabase.
   - **Site URL:** Defina como a URL oficial do app: `https://app.dentixia.com.br` (ou `http://localhost:3000` em desenvolvimento).
   - **Redirect URLs:** Adicione:
     - `https://app.dentixia.com.br/**`
     - `https://app.dentixia.com.br/api/auth/callback`
     - `https://*.vercel.app/**` (para deploys de preview)
     - `http://localhost:3000/**`
     - `http://localhost:3000/api/auth/callback`

2. **Configuração do Google Cloud Console (Para o Botão "Entrar com Google"):**
   - Acesse o [Google Cloud Console](https://console.cloud.google.com/).
   - Selecione ou crie um projeto (ex: `DentixIA Pro`).
   - Vá em **APIs & Services (APIs e Serviços) → OAuth consent screen (Tela de consentimento OAuth)**:
     - Tipo de usuário: **External (Externo)**.
     - Preencha o nome do app (`DentixIA Pro`), e-mail de suporte e dados do desenvolvedor.
     - Em **Scopes (Escopos)**, garanta que os escopos `.../auth/userinfo.email` e `.../auth/userinfo.profile` estejam selecionados.
   - Vá em **Credentials (Credenciais) → Create Credentials (Criar Credenciais) → OAuth Client ID**:
     - Application type: **Web application (Aplicativo da Web)**.
     - Name: `DentixIA Auth Supabase`.
     - **Authorized redirect URIs (URIs de redirecionamento autorizadas):**
       - Insira a URL de callback do Supabase: `https://<SEU_PROJECT_REF>.supabase.co/auth/v1/callback`
       *(Você encontra essa URL no painel do Supabase em Authentication → Providers → Google)*.
     - Clique em **Create (Criar)** e copie o **Client ID** e o **Client Secret**.

3. **Ativação no Painel do Supabase:**
   - No painel do Supabase, acesse **Authentication → Providers → Google**.
   - Alterne o interruptor para **Enable Google provider (Ativado)**.
   - Cole o **Client ID** e o **Client Secret** obtidos no Google Cloud.
   - Salve as alterações (**Save**).

4. **Como o fluxo funciona na aplicação:**
   - O botão "Entrar com o Google" na tela de login chama a Server Action `signInWithGoogleAction(origin)` (`src/lib/auth/actions.ts`), que dispara `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: '${origin}/api/auth/callback' } })`.
   - O Google redireciona de volta para `/api/auth/callback` (`src/app/api/auth/callback/route.ts`).
   - A rota de callback troca o código de autorização pela sessão oficial via cookies seguros SSR, faz a sincronização automática do nome e foto do usuário na tabela `public.usuarios` e concede 7 dias de trial caso seja o primeiro acesso.

### Passo 3.3: Storage Buckets
Verifique em **Storage** no painel do Supabase se os dois buckets foram criados:
- `simulacoes` — Bucket restrito/privado para fotos originais e simulações com RLS por pasta de usuário.
- `dentixia` — Bucket público para logos, avatares e assets do sistema.

---

## 4. Deploy das Supabase Edge Functions

As Edge Functions executam no runtime Deno do Supabase e processam operações críticas do Stripe com `SUPABASE_SERVICE_ROLE_KEY`.

### Passo 4.1: Instalar e Autenticar a CLI do Supabase
```bash
# Instalar a CLI (se ainda não possuir)
npm install -g supabase

# Fazer login com seu token de acesso da conta Supabase
supabase login

# Vincular ao projeto de produção
supabase link --project-ref <SEU_PROJECT_REF>
```

### Passo 4.2: Configurar os Segredos nas Edge Functions
```bash
supabase secrets set STRIPE_SECRET_KEY="sk_live_..." STRIPE_WEBHOOK_SECRET="whsec_..."
```

### Passo 4.3: Fazer Deploy das 3 Edge Functions
```bash
# 1. Função de criação de checkout Stripe
supabase functions deploy create-checkout --no-verify-jwt

# 2. Função de criação do portal do cliente Stripe
supabase functions deploy create-portal --no-verify-jwt

# 3. Função de webhook do Stripe
supabase functions deploy stripe-webhook --no-verify-jwt
```
> **Nota:** `--no-verify-jwt` é obrigatório no `stripe-webhook` pois as requisições vêm diretamente dos servidores do Stripe com assinatura HMAC (`Stripe-Signature`).

---

## 5. Configuração do Stripe

### Passo 5.1: Criação de Produtos e Preços (Planos)
Para que os planos apareçam na página `/planos`, os produtos e preços no Stripe precisam ter metadados específicos que o sistema filtra:

1. No **Stripe Dashboard → Catálogo de Produtos → Adicionar Produto**:
   - **Nome:** Ex.: `Plano Mensal DentixIA`
   - **Descrição:** Acesso completo com simulações ilimitadas.
   - **Preço:** R$ 197,00 (Recorrente / Mensal)
   - **Metadados do Produto (Metadata):**
     - Chave: `status` | Valor: `ativo`
   - **Metadados do Preço (Price Metadata):**
     - Chave: `status` | Valor: `ativo`
2. Crie também o plano anual:
   - **Nome:** Ex.: `Plano Anual DentixIA`
   - **Preço:** R$ 1.970,00 (Recorrente / Anual)
   - **Metadados do Produto (Metadata):**
     - Chave: `status` | Valor: `ativo`
   - **Metadados do Preço (Price Metadata):**
     - Chave: `status` | Valor: `ativo`

> ⚠️ **ATENÇÃO CRÍTICA:** O backend (`getPlansAction`) filtra estritamente produtos e preços cujo campo `metadata.status` seja igual a `"ativo"`. Se esse metadado não for preenchido no Stripe, a tela de planos exibirá mensagem de catálogo vazio.

### Passo 5.2: Configuração do Webhook no Stripe
1. No painel do Stripe, acesse **Desenvolvedores → Webhooks → Adicionar endpoint**.
2. **URL do endpoint:**
   `https://<SEU_PROJECT_REF>.supabase.co/functions/v1/stripe-webhook`
3. **Versão da API:** Selecione a versão estável mais recente.
4. **Eventos a ouvir:**
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `product.created`
   - `product.updated`
   - `price.created`
   - `price.updated`
5. Clique em **Adicionar endpoint**.
6. Copie o **Segredo de assinatura** (`whsec_...`) e atualize os segredos:
   - No Supabase: `supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_..."`
   - Na Vercel: Variável `STRIPE_WEBHOOK_SECRET`

### Passo 5.3: Configurar o Stripe Customer Portal
1. No Stripe Dashboard, acesse **Configurações → Portal do Cliente**.
2. Ative:
   - Atualizar dados de pagamento (cartão de crédito).
   - Cancelar assinaturas (imediatamente ou no fim do período).
   - Histórico de faturas e recibos.
3. Defina a URL de retorno padrão como: `https://app.dentixia.com.br/perfil`.

---

## 6. Configuração do Google Gemini AI

O motor de simulações odontológicas opera via Server Action nativa (`src/lib/actions/simulacoes.ts`) consumindo a API multimodal do Google Gemini.

1. Acesse o [Google AI Studio](https://aistudio.google.com/).
2. Crie ou selecione um projeto do Google Cloud.
3. Gere uma nova API Key.
4. Adicione essa chave nas variáveis de ambiente da Vercel com o nome:
   `GEMINI_API_KEY=AIzaSy...`
5. **Verificação de Quota:** Certifique-se de que o projeto tenha faturação ativa no Google Cloud caso pretenda operar em alta escala sem sofrer limitação de taxa (Rate Limit / 429).

---

## 7. Deploy da Aplicação na Vercel

### Passo 7.1: Importar Repositório
1. Acesse [vercel.com](https://vercel.com) e clique em **Add New → Project**.
2. Selecione o repositório `dentixiapro`.
3. Framework Preset: **Next.js** (detectado automaticamente).
4. Root Directory: `./` (raiz).

### Passo 7.2: Configurar Variáveis de Ambiente
Na seção **Environment Variables**, insira todas as chaves listadas na seção 2.A:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `GEMINI_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

### Passo 7.3: Deploy e Domínio
1. Clique em **Deploy**. O build executará `next build`.
2. Após a conclusão bem-sucedida, vá em **Settings → Domains** e adicione seu domínio de produção:
   - Exemplo: `app.dentixia.com.br`
3. Configure os apontamentos de DNS (CNAME ou A Record) no seu provedor de domínio conforme indicado pela Vercel.

---

## 8. Checklist e Smoke Tests Pós-Deploy

Execute o roteiro de testes de fumaça abaixo imediatamente após a publicação:

- [ ] **1. Autenticação e Roteamento**
  - Crie uma conta nova com email/senha em `/register`.
  - Verifique se a conta ganha 7 dias de trial automaticamente (ver na tela inicial ou em `/perfil`).
  - Faça logout e teste o login social via Google.
  - Acesse deslogado `/simulacoes` e certifique-se de que é redirecionado para `/login`.

- [ ] **2. Motor de Simulação IA**
  - Acesse `/simulacoes`.
  - Escolha o procedimento (ex: "Facetas"), a cor (ex: "BL1") e faça upload ou tire uma foto frontal clara dos dentes.
  - Clique em **Gerar Simulação**.
  - O slider antes/depois deve carregar a imagem renderizada com o corte interativo funcionando perfeitamente.
  - Salve a simulação com o nome de um paciente de teste e confirme a listagem em `/simulacoes/resultados`.

- [ ] **3. Catálogo de Planos e Checkout**
  - Acesse `/planos`.
  - Verifique se os planos cadastrados no Stripe aparecem com os preços formatados em R$.
  - Clique em **Assinar** no plano desejado.
  - Verifique se você é redirecionado para o Stripe Checkout oficial.

- [ ] **4. Webhook e Liberação de Status**
  - No modo teste do Stripe, conclua um pagamento usando os cartões de teste (`4242 4242...`).
  - Verifique nos logs da Edge Function (`supabase functions logs stripe-webhook`) se o evento `customer.subscription.created` foi recebido com status 200.
  - Recarregue o app e confirme se a view `verificar_status_usuario` retorna `status_code = 3` (Acesso Liberado).

- [ ] **5. Painel Administrativo (RBAC)**
  - Entre com a conta de usuário comum e confirme que `/admin` é bloqueado e redireciona para a home.
  - Defina `tipo = 'admin'` para sua conta no Supabase SQL Editor (`UPDATE usuarios SET tipo = 'admin' WHERE email = '...';`).
  - Acesse `/admin` e verifique se as métricas de simulações, usuários e financeiro são exibidas.

- [ ] **6. Portal do Assinante**
  - Acesse `/perfil` e clique em **Gerenciar Assinatura**.
  - O Stripe Customer Portal deve abrir permitindo visualizar a fatura.

---

## 9. Troubleshooting e Diagnóstico

### Erro: "Falha na API Gemini Interactions (400 ou 403)"
- **Causa:** `GEMINI_API_KEY` incorreta ou expirada.
- **Solução:** Obtenha uma nova chave no Google AI Studio e atualize nas variáveis da Vercel. Lembre-se de promover um Redeploy na Vercel para propagar a variável no servidor de Server Actions.

### Erro: "Planos não aparecem na tela /planos"
- **Causa:** O produto ou o preço no Stripe não possui o metadado `status: ativo`.
- **Solução:** No Stripe Dashboard, edite o Produto e adicione em Metadata `status = ativo`. Em seguida, edite o Preço associado e adicione também em Metadata `status = ativo`.

### Erro: "Invalid Signature no Stripe Webhook (400)"
- **Causa:** O segredo do webhook (`STRIPE_WEBHOOK_SECRET`) configurado no Supabase não bate com o secret gerado pelo endpoint cadastrado no Stripe.
- **Solução:** Copie o secret `whsec_...` do webhook cadastrado no Stripe e execute `supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_..."`.

### Erro: "Refresh token not found no navegador"
- **Causa:** Usuário deslogado no Supabase Auth enquanto cookies antigos persistiram no navegador.
- **Solução:** O `src/middleware.ts` do DentixIA Pro possui interceptor nativo que limpa cookies `sb-*` automaticamente e redireciona limpo para `/login`. Se persistir, limpe os cookies do domínio no navegador.

### Imagens quebradas no slider ou avatares do Google
- **Causa:** Hostname não listado no `remotePatterns` do `next.config.ts`.
- **Solução:** O arquivo `next.config.ts` já está configurado com wildcard `**.supabase.co` e `lh3.googleusercontent.com`. Certifique-se de que seu bucket de storage Supabase está acessível.
