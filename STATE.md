# 🗺️ Mission Control: Estado do Projeto (Project State)

**Última atualização**: 2026-08-23 — Sprint: Auditoria de Segurança, Migrations e Correções (Vídeo Boas-Vindas & Status de Assinatura)

---

## 1. O Que Mudou (What Changed)

### Sprint Atual (2026-08-23 — Auditoria e Correções de Vídeo & Assinaturas)

- ✅ **Bug: Vídeo de Boas-Vindas não aparecia após login**
  - **Causa**: `ClientLayout.tsx` possuía estados mas não renderizava `<WelcomeVideoModal />` no JSX, e a tabela `system_settings` não possuía migration com RLS para consulta da chave `welcome_video_url`.
  - **Fix**: Renderização de `<WelcomeVideoModal />` integrada globalmente no `ClientLayout.tsx` e criada a migration `20260709000000_fix_system_settings_and_subscriptions.sql` com RLS de leitura pública para configurações.
- ✅ **Bug: Botão "Assinar Agora" no Perfil após pagamento / Tratamento de Trial**
  - **Causa**: Descasamento relacional caso `user_company` estivesse ausente para novos usuários, fazendo a view `verificar_status_usuario` e as actions não localizarem a assinatura ativa, além da UI do `TrialBanner` não respeitar o status de assinante ativo.
  - **Fix**: View `verificar_status_usuario` atualizada com fallback relacional direto `(uc.company_id = s.company_id OR u.id = s.company_id)`, webhook garantindo vínculo em `user_company`, `getUserProfileAction` buscando com fallback duplo e `perfil/page.tsx` exibindo "Ver sua conta" (Portal Stripe) e ocultando o botão "Assinar Agora" para usuários já pagantes/trialing.
- ✅ **Fix de Compilação Turbopack / Vercel Build**:
  - **Causa**: Tag de fechamento `</AnimatePresence>` havia sido omitida na substituição anterior do `ClientLayout.tsx`, gerando erro de parsing JSX no Turbopack (`Unexpected token. Did you mean {'}'}?`).
  - **Fix**: Tag `</AnimatePresence>` devidamente recolocada fechando o modal do Paywall Blocker antes de renderizar o `WelcomeVideoModal`.
  - **CSS Warning Fix**: Corrigido seletor `.py-3.5` para `.py-3\.5` no `globals.css` para conformidade estrita com o parser CSS do Turbopack/LightningCSS.
- ✅ **Consolidação e Limpeza de Migrations (Auditoria Concluída)**:
  - 9 migrations antigas com sobreposições e patches foram consolidadas em **5 migrations essenciais e sem redundâncias**:
    1. `20260701000000_core_users_auth_and_security.sql`: Base de usuários, RLS, is_admin e triggers de consentimento.
    2. `20260702000000_storage_buckets_and_rls.sql`: Buckets `dentixia`, `simulacoes`, `logoEmpresa` e RLS.
    3. `20260703000000_simulacoes_and_tracking.sql`: Simulações (com `cor_utilizada`) e tracking.
    4. `20260704000000_system_settings_and_notifications.sql`: Configurações de sistema (`welcome_video_url`) e histórico de notificações.
    5. `20260705000000_subscriptions_and_status_view.sql`: Vínculo `user_company`, RLS Stripe e view `verificar_status_usuario`.

### Sprint Anterior (2026-08-18 — Correção de Bugs Críticos de Produção)

- ✅ **Bug: Upload de foto de perfil não salvava no bucket `logoEmpresa`**
  - **Causa**: A policy RLS de INSERT usava `storage.foldername(name)[1] = auth.uid()`, mas o arquivo é salvo como `{uid}.{ext}` na **raiz** do bucket. `foldername()` retorna `''` para arquivos na raiz → policy bloqueava silenciosamente.
  - **Fix**: Novas policies usam `split_part(name, '.', 1) = auth.uid()`, suportando o formato `uid.ext`. Aplicado via SQL no Supabase e documentado em `20260707000000_fix_logo_empresa_rls.sql`.

- ✅ **Bug: Webhook Stripe falhando com FK violation (`subscriptions_company_id_fkey`)**
  - **Causa**: Ao restaurar o banco de produção, novos checkouts usam `company_id = user.id`. Se esse `user.id` não existe na tabela `company` (caso de usuários recém-cadastrados), a inserção em `subscriptions` falha por FK constraint.
  - **Fix**: A Edge Function `stripe-webhook` (v5) agora verifica se a `company` existe antes do `upsert`. Se não existir, cria automaticamente um registro mínimo, garantindo que a subscription seja gravada.

- ✅ **Bug: Botão "Assinar Agora" aparecia mesmo após assinatura ativa**
  - **Causa**: Consequência do bug do webhook acima — a subscription nunca era gravada no Supabase, então `temAssinatura = false` e o botão aparecia.
  - **Fix resolvido pelo mesmo deploy** da Edge Function v5. Após um novo checkout bem-sucedido, o botão some automaticamente.

- ✅ **Webhook `stripe-webhook` atualizado para versão 5** — deploy feito via Supabase MCP.

### Sprint Anterior (2026-08-05 — Ajustes de UX/UI no Comparador Antes/Depois & Limpeza de Lints)

- ✅ **Ajustes no Slider e Comparador Antes e Depois**:
  - Redução do tamanho do círculo/manípulo divisório (`w-6 h-6 sm:w-7 sm:h-7`) nos componentes `BeforeAfterSlider.tsx` e `SimulationGallery.tsx`.
  - Otimização das dimensões do contêiner de imagem no mobile (`max-h-[42vh]`, `max-w-xs`).
- ✅ **Correções de Tipagem e Lints**.

### Sprint Anterior (2026-06-21 — Auditoria de Segurança, Limpeza e Desativação de Módulos Legados)

- ✅ **Auditoria de Segurança (Passo 1)**: Isolamento de todas as chamadas ao Supabase em Server Actions.
- ✅ **Mapeamento de Código Morto (Passo 2)**: Mapeamento detalhado de rotas e componentes obsoletos.
- ✅ **Limpeza Estrutural e Remoção Física (Passo 3)**: Exclusão das pastas e rotas legadas.

### Sprint Anterior (2026-06-20 — Liberação de Acesso Admin e Fluxo de Simulações)

- ✅ **Salvamento de Simulações e Galeria** implementado.
- ✅ **Skill de Git/GitHub (git-expert)** criada.

---

## 2. Escopo Ativo do Sistema (4 Módulos)

O DentixiaPro opera estritamente sob 4 módulos ativos:
1. **Início (Home)**: Painel inicial e visão geral do sistema.
2. **Simulações**: Motor de simulações estéticas odontológicas, salvamento de resultados e galeria.
3. **Aulas**: Área de membros e vídeos educativos.
4. **Perfil**: Informações cadastrais, upload de logo e gerenciamento de plano de assinatura.

---

## 3. Estado Atual dos Sistemas

| Sistema | Status | Observação |
|---------|--------|------------|
| **Storage `logoEmpresa`** | ✅ Funcionando | RLS corrigida em 18/08/2026 |
| **Storage `simulacoes`** | ✅ Funcionando | — |
| **Storage `dentixia`** | ✅ Funcionando | — |
| **Webhook Stripe** | ✅ v5 em produção | Auto-cria company se não existir |
| **Checkout / Assinatura** | ✅ Funcionando | Requer checkout novo para propagar sub |
| **Botão "Assinar Agora"** | ✅ Corrigido | Some após subscription gravada |
| **Upload de foto de perfil** | ✅ Corrigido | RLS fix aplicado |
| **View `verificar_status_usuario`** | ✅ Funcionando | Inclui status trialing/active |

## 4. O Que Está Quebrado (What's Broken)

- ✅ **Segurança**: RLS habilitado e nenhuma chamada Supabase feita diretamente pelo cliente.
- ✅ **Storage**: Policies do bucket `logoEmpresa` corrigidas.
- ✅ **Webhook**: FK violation resolvido com auto-create de company.
- ⚠️ **Erro `event loop` no `create-checkout`**: Erro transiente de compatibilidade Deno (`runMicrotasks not supported`). Não impede o checkout em si — monitorar se persistir.


---

## 1. O Que Mudou (What Changed)

### Sprint Atual (2026-08-05 — Ajustes de UX/UI no Comparador Antes/Depois & Limpeza de Lints)

- ✅ **Ajustes no Slider e Comparador Antes e Depois**:
  - Redução do tamanho do círculo/manípulo divisório (`w-6 h-6 sm:w-7 sm:h-7`) nos componentes `BeforeAfterSlider.tsx` e `SimulationGallery.tsx` para um visual mais elegante e refinado.
  - Otimização das dimensões do contêiner de imagem no mobile (`max-h-[42vh]`, `max-w-xs`), impedindo que imagens fiquem desproporcionalmente grandes em telas móveis.
- ✅ **Correções de Tipagem e Lints**:
  - Remoção de imports não utilizados (`User`, `History`) nos arquivos `SimulationGallery.tsx` e `src/app/simulacoes/page.tsx`.
  - Tratamento de exceções com tipagem estrita (`err: unknown` com `instanceof Error`) em `SimulationGallery.tsx`.
  - Inclusão de supressões organizadas de avisos ESLint para elementos `<img>` de origem remota.

### Sprint Anterior (2026-06-21 — Auditoria de Segurança, Limpeza e Desativação de Módulos Legados)

- ✅ **Auditoria de Segurança (Passo 1)**:
  - Isolamento de todas as chamadas ao Supabase em Server Actions em `src/lib/auth/actions.ts`, `src/lib/planos/actions.ts`, `src/lib/indique-e-ganhe/actions.ts` e `src/lib/perfil/actions.ts`.
  - Banimento completo de chamadas diretas ou inicialização do Supabase Client em Client Components.
  - Correção no `.gitignore` de merge conflicts e correção do bug de redirecionamento de senha inválida `/reset-password` para `/redefinir-senha` no `src/app/forgot/page.tsx` e middleware `src/proxy.ts`.
- ✅ **Mapeamento de Código Morto (Passo 2)**:
  - Mapeamento detalhado de rotas e componentes obsoletos de CRM, Agenda, WhatsApp/Evolution API, Clientes, Procedimentos.
- ✅ **Limpeza Estrutural e Remoção Física (Passo 3)**:
  - Exclusão das pastas e rotas legadas em `src/app/configuracoes`, `src/components/agenda`, `src/components/clientes`, `src/components/crm`, `src/components/mensagens`, `src/components/procedimentos`, `src/lib/agenda`, `src/lib/clientes` (arquivos neutralizados) e `src/pages`.

### Sprint Anterior (2026-06-20 — Liberação de Acesso Admin e Fluxo de Simulações)

- ✅ **Skill de Git/GitHub (git-expert)**: Criada nova Agent Skill em `.agent/skills/git-expert/SKILL.md` para padronizar e assegurar o fluxo de versionamento.
- ✅ **Salvamento de Simulações e Galeria**:
  - Implementado utilitário `supabaseServer.ts` para gestão segura de sessão/cookies no Next.js 15.
  - Atualizada Server Action `saveSimulationAction` para uploads no storage e salvamento no banco com UUIDs.
  - Criada Server Action `deleteSimulationAction` e queries dinâmicas no servidor.
  - Convertida a página `/simulacoes/resultados` para Server Component.
- ⏳ **Migrações Supabase Pendentes de Deploy**:
  - Migração de status de usuário admin (`20260620210200_update_view_status_admin.sql`).
  - Migração de criação do bucket `simulacoes` (`20260620223253_create_simulacoes_bucket_and_rls.sql`).

### Sprint Anterior (2026-04-11 — Documentação Exaustiva)

- ✅ **Engenharia Reversa Concluída**: Análise profunda do ecossistema e estruturação dos documentos do projeto em `/docs`.
- ✅ **Criação da pasta `/docs`**: Contendo `ARCHITECTURE.md`, `FRONTEND.md`, `BACKEND_API.md`, `WORKFLOWS_N8N.md`, e `BUSINESS_RULES.md`.

---

## 2. Escopo Ativo do Sistema (4 Módulos)

O DentixiaPro foi simplificado e agora opera estritamente sob 4 módulos ativos:
1. **Início (Home)**: Painel inicial e visão geral do sistema.
2. **Simulações**: Motor de simulações estéticas odontológicas, salvamento de resultados e galeria.
3. **Aulas**: Área de membros e vídeos educativos.
4. **Perfil**: Informações cadastrais do profissional, upload de logo personalizado e gerenciamento de plano de assinatura.

---

## 3. O Que Está Quebrado (What's Broken)

- ✅ **Segurança**: RLS habilitado e nenhuma chamada Supabase feita diretamente pelo cliente.
- ✅ **Acessos**: Redirecionamento de senha corrigido e integrado com middleware.
- ✅ **Compilação**: Sem erros de TypeScript nos módulos ativos após a remoção dos módulos legados.
