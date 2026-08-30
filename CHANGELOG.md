# Changelog

Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

## [2.2.1] - 2026-08-23

### Fixed
- **Vazamento de dados entre usuários na galeria de simulações** — `getSimulationsAction` retornava simulações de todos os usuários (bypass via policy RLS de admin). Adicionado filtro `.eq("usuario_id", user.id)` tanto no SELECT quanto no DELETE.
- **Delete sem isolamento estrito** — `deleteSimulationAction` agora inclui `.eq("usuario_id", user.id)` na cláusula de deleção como camada adicional de segurança.

### Security
- Hardening de isolamento multi-tenant na camada de Server Actions (defense in depth além do RLS).

---

## [2.2.0] - 2026-08-23

### Fixed
- **Bug: Vídeo de Boas-Vindas não aparecia após login** — `ClientLayout.tsx` não renderizava `<WelcomeVideoModal />` no JSX.
- **Bug: Botão "Assinar Agora" aparecia após pagamento** — View `verificar_status_usuario` atualizada com fallback relacional duplo.
- **Fix de compilação Turbopack** — Tag `</AnimatePresence>` restaurada e CSS Warning corrigido.

### Changed
- **Migrations consolidadas**: 9 migrations antigas → 5 migrations limpas e sem redundâncias.
  1. `20260701` — Core users, auth e security
  2. `20260702` — Storage buckets e RLS
  3. `20260703` — Simulações e tracking
  4. `20260704` — System settings e notificações
  5. `20260705` — Subscriptions e status view

---

## [2.1.0] - 2026-08-18

### Fixed
- **Upload de foto de perfil** — Policy RLS do bucket `logoEmpresa` corrigida para suportar formato `uid.ext` na raiz.
- **Webhook Stripe FK violation** — Edge Function v5 auto-cria `company` se não existir antes do upsert de subscription.
- **Botão "Assinar Agora" persistente** — Resolvido pelo deploy do webhook v5.

---

## [2.0.0] - 2026-08-05

### Changed
- Slider comparativo antes/depois com dimensões otimizadas para mobile.
- Correções de tipagem estrita e lint cleanup.

---

## [1.0.0] - 2026-06-21

### Added
- Auditoria de segurança: isolamento de Supabase em Server Actions.
- Mapeamento e remoção de código morto (CRM, Agenda, WhatsApp legado).
- Salvamento de simulações e galeria com BeforeAfterSlider.
- Skill de Git/GitHub para padronização de fluxo.

### Removed
- Rotas e componentes legados: configuracoes, agenda, clientes, CRM, mensagens, procedimentos.
