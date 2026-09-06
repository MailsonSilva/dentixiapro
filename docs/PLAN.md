# Plano de Orquestração: Captura Vertical em Alta Definição (Formato Retrato Facial)

## Objetivo
Transformar a captura da câmera de formato horizontal/reduzido para **formato vertical (retrato/face)**, preenchendo a tela e garantindo que o rosto do paciente ocupe o destaque vertical sem bordas laterais vazias nem imagem apequenada no centro.

## Agentes Envolvidos (Mínimo 3)
1. **`project-planner`**: Estruturação dos cálculos de enquadramento vertical (center-crop proporcional) e arquitetura da interface retrato.
2. **`frontend-specialist`**: Adaptação do `CameraCaptureModal.tsx` para layout vertical (altura expandida, guia oval facial + sorriso, corte no Canvas 3:4/vertical) e ampliação do preview na tela de simulações.
3. **`test-engineer`**: Validação de responsividade mobile/desktop, testes de corte de canvas em diferentes resoluções de câmera (1080p, 720p, 4K) e verificação do espelhamento.

---

## Detalhamento das Alterações

### 1. `CameraCaptureModal.tsx`
- **Viewport Vertical (Retrato):** O modal passará a usar altura vertical expandida (`h-[85vh]`, proporção de tela retrato) com o vídeo preenchendo a vertical (`object-cover`).
- **Guia Facial Completa:** Substituir o retângulo genérico por uma guia anatômica vertical contendo:
  - Contorno oval facial (topo da cabeça até queixo).
  - Linha vertical mediana (simetria facial).
  - Retículo destacado para o arco do sorriso.
- **Center-Crop Vertical no Canvas:**
  - Em webcams ou celulares com stream horizontal nativo (16:9 ou 4:3), o Canvas calculará o corte central vertical (proporção retrato 3:4), capturando exatamente a porção visível do rosto em alta resolução.
  - O resultado final será um arquivo JPEG vertical onde o rosto e o sorriso preenchem a foto com definição máxima.

### 2. `simulacoes/page.tsx`
- **Preview Vertical Ampliado:**
  - Ajustar o container de upload e preview para formato vertical (altura ampliada de 220px para ~400px+), permitindo visualizar os detalhes do rosto e dos dentes com clareza clínica.

---
**Status**: Aguardando aprovação do usuário para executar a Fase 2 (Implementação).
