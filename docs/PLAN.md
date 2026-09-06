# Plano de Orquestração: Remoção de Botões de Inverter Foto e Redução Mínima aos Botões Essenciais

## Objetivo
Remover todos os botões de inverter/espelhar a foto (tanto no modal de captura quanto no preview da página de simulações), mantendo estritamente apenas os botões essenciais:
1. **Captura:** Disparo de foto (Shutter).
2. **Troca de Câmera:** Alternar entre câmera dianteira e traseira.
3. **Controle básico:** Fechar (X) e botões de confirmação pós-disparo ("Tirar Outra" / "Usar Foto").

## Agentes Envolvidos (Mínimo 3)
1. **`project-planner`**: Mapeamento e limpeza dos botões não necessários.
2. **`frontend-specialist`**: Remoção do botão de inverter em `CameraCaptureModal.tsx` e em `app/src/app/simulacoes/page.tsx`.
3. **`test-engineer`**: Validação de integridade do fluxo de captura direta sem opções extras.

---

## Detalhamento das Alterações:
1. **`CameraCaptureModal.tsx`:**
   - Remover botão "Inverter" e a função `handleFlipCaptured`.
   - Manter apenas: Troca de câmera (dianteira/traseira), Disparo, Fechar (X), "Tirar Outra" e "Usar Foto".
2. **`simulacoes/page.tsx`:**
   - Remover botão "Inverter Lados" do card de preview.
   - Manter apenas a foto e o botão de remover/fechar.

---
**Status**: Aguardando aprovação do usuário para executar.
