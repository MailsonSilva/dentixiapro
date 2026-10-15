---
name: spec-discovery
description: Conduz a entrevista de produto inicial, define requisitos de negócio e gera o PRD estruturado em _specs/prd.md com diagramas conceituais Archify.
---

# Skill: Descoberta de Produto e PRD

Esta skill orienta o agente `product_architect` na formalização de escopo e estratégias técnicas antes do início do código.

## 1. Processo de Entrevista de Produto
O agente deve formular perguntas curtas e diretas ao desenvolvedor, cobrindo:
1. **Dor Central**: Qual gargalo o usuário enfrenta sem esse software?
2. **Alvos do Projeto (Targets)**: O projeto terá App Mobile, Painel Web e/ou Landing Page?
3. **Decisão de Persistência**: A solução precisa de banco 100% local (ex: SQLite), sincronização em nuvem ou API externa?
4. **Métrica de Sucesso (North Star Metric)**: O que valida comercialmente o produto no curto prazo?

## 2. Geração do PRD
- Copie o modelo de `_specs/prd-template.md` para `_specs/prd.md`.
- Preencha com linguagem objetiva em pt-BR.
- Registre o ticket inicial no `ai-memory` marcando os targets ativos.
