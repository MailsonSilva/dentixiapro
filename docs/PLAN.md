# Plano de Orquestração: Correção da Câmera e Inversão de Foto (DentixIA Pro)

## Objetivo
Corrigir a abertura da câmera e o espelhamento/inversão de lados da foto durante o processo de simulação de tratamento dental, garantindo a fidelidade anatômica (lado direito e esquerdo corretos).

## Agentes Envolvidos (Mínimo 3)
1. **`project-planner`**: Mapeamento do fluxo de captura, requisitos clínicos de orientação dental e plano de execução.
2. **`frontend-specialist`**: Implementação do componente `CameraCaptureModal.tsx` com WebRTC, alternância de câmera e botão de inverter/espelhar imagem.
3. **`test-engineer`**: Validação de regressão, linting e testes de manipulação de imagem via canvas.

---

## Fases da Execução

### Fase 1: Planejamento (Concluída)
- Diagnóstico da abertura de câmera (Desktop vs Mobile).
- Identificação da inversão por espelhamento em câmeras frontais.
- Criação da especificação do modal de câmera e ferramenta de rotação/flip horizontal.

### Fase 2: Implementação (Pós-Aprovação)
1. Criar `CameraCaptureModal.tsx`:
   - Stream WebRTC direto (`video` + `canvas`).
   - Guia visual de sorriso para fotos odontológicas.
   - Opção de troca de câmera (frontal/traseira).
   - Tela de confirmação com botão de "Inverter Lados (Espelhar)" e "Tirar Novamente".
2. Atualizar `app/src/app/simulacoes/page.tsx`:
   - Integrar o `CameraCaptureModal`.
   - Adicionar botão de "Inverter Lados" diretamente no card de preview de imagem selecionada (útil para fotos da galeria ou nativas).
   - Manipulação de imagem via Canvas para atualizar tanto a pré-visualização quanto o `File` enviado para a IA.
3. Validação:
   - Executar testes de linting e validação de código.

---
**Status**: Aguardando aprovação do usuário para iniciar a implementação.
