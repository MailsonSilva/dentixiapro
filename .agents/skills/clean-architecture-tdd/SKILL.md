---
name: clean-architecture-tdd
description: Práticas de Test-Driven Development (Red-Green-Refactor), desacoplamento de domínio e criação de suítes de teste de alta velocidade.
---

# Skill: Clean Architecture & Disciplina TDD

Esta skill dita o comportamento dos subagentes `tdd_tester`, `mobile_builder` e `qa_validator`.

## 1. Protocolo Red-Green-Refactor
1. **Fase Vermelha (RED)**:
   - Lê a spec da feature em `_specs/features/*.md`.
   - Cria testes unitários ou de widgets que cobrem os critérios de aceitação.
   - Executa a suíte e valida que ela **FALHOU** pelos motivos corretos.
2. **Fase Verde (GREEN)**:
   - Escreve apenas o código estritamente necessário para fazer os testes passarem.
3. **Fase de Refatoração (REFACTOR)**:
   - Limpeza de nomes, tipagem estrita e reexecução dos testes para garantir que tudo continua verde.

## 2. Isolamento de Domínio
- O domínio é composto por regras puras de negócio, livre de frameworks de UI ou dependências externas.
- Testes de banco de dados devem ser executados em memória para resposta instantânea.
