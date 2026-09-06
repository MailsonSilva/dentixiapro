# Plano de Orquestração: Simplificação Total da Câmera (Sem Máscara/Poluição Visual) e Não-Inversão

## Objetivo
Remover completamente as máscaras, retículos, linhas guia, badges e opções poluídas do visor da câmera, deixando a tela 100% limpa, objetiva e focada apenas no que importa: **abrir a câmera em tela cheia/vertical e tirar a foto sem inverter os lados**.

## Agentes Envolvidos (Mínimo 3)
1. **`project-planner`**: Redesenho do fluxo para remoção de ruído visual e garantia de não-inversão no disparo.
2. **`frontend-specialist`**: Limpeza completa do `CameraCaptureModal.tsx` (remoção da máscara oval, retículo de sorriso, badges e textos decorativos) mantendo apenas o visor limpo, botão de disparo, botão de alternar câmera e revisão simples.
3. **`test-engineer`**: Validação de fidelidade da imagem capturada sem inversão e verificação de integridade de código.

---

## O que será feito:
1. **Remover Máscara e Poluição Visual (`CameraCaptureModal.tsx`):**
   - Eliminar a guia oval de rosto, retículo de sorriso, linha vertical central e badges/textos informativos.
   - O visor exibirá apenas a imagem límpida da câmera em tempo real.
   - Controles mínimos:
     - Fechar (X).
     - Alternar câmera frontal/traseira (apenas se houver mais de uma).
     - Botão circular de disparo no rodapé.
   - Pós-captura (Revisão): Apenas foto, botão de confirmar e botão de tirar novamente (mais botão simples caso queira inverter).
2. **Garantir Não-Inversão da Foto:**
   - Garantir que a foto capturada preserve a orientação física real exata (lado direito permanece no lado direito).

---
**Status**: Aguardando aprovação do usuário para executar.
