---
name: mobile-ux-stitch
description: Diretrizes de UX/UI mobile, extração de Design DNA com Google Stitch MCP a partir de prints e geração de tokens visuais.
---

# Skill: Mobile UX & Google Stitch Integration

Esta skill capacita o agente a atuar como designer e engenheiro de interface mobile.

## 1. Fluxo de Extração com Google Stitch MCP
Quando existirem capturas ou imagens em `_references/screens/`:
1. Inspecione as referências via tool `google_stitch_mcp` com a ação `extract_design_context`.
2. Salve os valores extraídos em `_specs/design-tokens.json` no formato padrão W3C (cores, raios de borda, espaçamentos e fontes).

## 2. Ergonomia Mobile e Regra dos 4 Estados
- **Touch Target**: Área clicável mínima de 48x48 dp.
- **Thumb Zone**: Ações críticas posicionadas no terço inferior da tela.
- **Os 4 Estados de Tela Obrigatórios**:
  - `LoadingState`: Shimmer skeletons contextuais.
  - `EmptyState`: Mensagem amigável com botão de ação direta.
  - `ErrorState`: Mensagem clara em pt-BR e botão de retentativa.
  - `SuccessState`: Renderização fluida e performática dos dados.
