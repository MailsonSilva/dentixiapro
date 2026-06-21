# 🗺️ Mission Control: Estado do Projeto (Project State)

**Última atualização**: 2026-06-21 — Sprint: Auditoria de Segurança, Limpeza e Desativação de Módulos Legados

---

## 1. O Que Mudou (What Changed)

### Sprint Atual (2026-06-21 — Auditoria de Segurança, Limpeza e Desativação de Módulos Legados)

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
