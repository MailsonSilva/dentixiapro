# ADR-001: Isolamento de Supabase em Server Actions

## Status
Accepted (2026-06-21)

## Context
Client Components estavam fazendo chamadas diretas ao Supabase, expondo a `anon_key` e permitindo manipulação de queries via DevTools. Mesmo com RLS, a superfície de ataque era desnecessariamente ampla.

## Decision
Toda interação com o Supabase (queries, mutations, storage) deve ser feita exclusivamente via Server Actions (`"use server"`). Client Components recebem apenas dados serializados como props ou via chamadas às actions.

## Consequences
- **Positivo:** Chaves e queries ficam no servidor. Superfície de ataque reduzida drasticamente.
- **Positivo:** Validação de negócio no servidor antes de qualquer operação.
- **Negativo:** Ligeiro aumento de latência em operações que antes eram diretas.
- **Negativo:** Mais boilerplate (criar action + chamar action em vez de query direta).

---

# ADR-002: Pipeline de Simulação IA via Server Action Nativa

## Status
Accepted (2026-06-20) — Supersedes n8n-based pipeline

## Context
O pipeline original usava n8n como intermediário para chamar a API do Gemini, adicionando complexidade operacional (manter instância n8n, webhooks, retries) e latência extra por hop adicional.

## Decision
Migrar o pipeline para uma única Server Action (`gerarSimulacaoNativa`) que executa: validação → upload original → chamada Gemini API → upload resultado → incremento de stats. Sem intermediários.

## Consequences
- **Positivo:** Eliminação do n8n como dependência operacional.
- **Positivo:** Menor latência (single hop server → Gemini).
- **Positivo:** Debugging simplificado (uma function, um log stream).
- **Negativo:** Perda da flexibilidade visual do n8n para fluxos complexos futuros.

---

# ADR-003: Consolidação de Migrations

## Status
Accepted (2026-08-23)

## Context
9 migrations com sobreposições, patches e redundâncias acumuladas ao longo de sprints. Difícil entender o schema final a partir das migrations individuais.

## Decision
Consolidar em 5 migrations essenciais, idempotentes e sem redundâncias, cobrindo: users, storage, simulacoes, settings e subscriptions.

## Consequences
- **Positivo:** Schema legível e auditável em 5 arquivos.
- **Positivo:** `IF NOT EXISTS` e `DROP POLICY IF EXISTS` tornam as migrations re-executáveis.
- **Negativo:** Histórico granular das mudanças perdido (mitigado pelo git log).

---

# ADR-004: Defense in Depth — Filtro de usuario_id no Código

## Status
Accepted (2026-08-23)

## Context
A policy RLS de `simulacoes` permite que admins (`is_admin()`) leiam todos os registros. Isso é correto para o painel admin, mas a UI de usuário comum na galeria `/simulacoes/resultados` usava `select("*")` sem filtro, confiando apenas no RLS — que para admins/parceiros retorna tudo.

## Decision
Adicionar filtro explícito `.eq("usuario_id", user.id)` em toda query de interface do usuário, independentemente do RLS. O RLS continua como segunda camada de defesa.

## Consequences
- **Positivo:** Isolamento garantido mesmo para contas com privilégios elevados.
- **Positivo:** Defense in depth: duas camadas independentes de proteção.
- **Negativo:** Duplicação lógica (filtro no código + policy no banco). Aceitável pelo ganho de segurança.
