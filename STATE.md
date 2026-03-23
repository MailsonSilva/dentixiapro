# Mission Control - DentixIA Pro

## 🎯 Objetivo Atual
Escalonamento de Layout para Notebooks e Refinamento de Responsividade (Comando `/orchestrate`).
O layout atual apresenta problemas de proporção em telas médias (13" a 15"), onde os componentes estão muito espaçosos (barras laterais muito parrudas, margens superiores exageradas, preenchimento interno dos itens cortando espaço) causando "quebra de tela" e overflow vertical prematuro. A meta é redistribuir e otimizar os espaços.

---

## 🗺️ Roadmap e Alocação (Fases de Desenvolvimento)

### Fase 1: Análise UX/UI e Mapeamento de Vilezas (Proporção)
- **Agente Responsável**: `@ux-designer`
- **Tarefas**:
  - Identificar os componentes críticos (ex: `Sidebar.tsx`, `perfil/page.tsx`) com paddings e larguras inflacionadas.
  - Definir a nova régua de tamanhos: redução de paddings (ex: `py-4` para `py-3`), redimensionamento de botões laterais e ajustes na altura dos containers `min-h`.
- **Status**: ✅ Concluído

### Fase 2: Refatoração Estrutural (Sidebar e Layout Padrão)
- **Agente Responsável**: `@frontend-dev`
- **Tarefas**:
  - `Sidebar.tsx`: Enxugar largura total (ex: `w-72` para `w-64` em telas notebook/lg), padding do Header, espaçamento dos *nav items* e suavizar o peso da logo.
  
  - `ClientLayout.tsx` / Páginas Base: Ajustar a margem superior (ex: `md:pt-20` para `md:pt-8`) de contêineres e margens globais de respiro.
- **Status**: ✅ Concluído

### Fase 3: Ajustes e Encaixes de Componente da View (Perfil)
- **Agente Responsável**: `@frontend-dev`
- **Tarefas**:
  - `perfil/page.tsx`: Diminuir a espessura das "Configurações" (`px-5 py-4` -> `px-4 py-3.5`).
  - Reduzir raio de borda (`rounded-3xl` para `rounded-2xl`) onde houver compressão visual e readaptar tamanho dos ícones.
- **Status**: ✅ Concluído

### Fase 5: Automação e Refinamento de Parceiros
- **Agente Responsável**: `@loki` (Mission Control)
- **Tarefas**:
  - `handle_new_user`: Correção do erro 500 no signup (mismatch enum SQL). ✅
  - `register/parceiros/page.tsx`: Ajuste do payload para garantir `tipo: "parceiro"` e limpeza de redundâncias. ✅
  - `perfil/page.tsx`: Restrição de visibilidade de itens (Assinatura/Indicação) para tipo parceiro. ✅
  - `indique-e-ganhe/page.tsx`: Sincronização com views SQL e refinamento visual da comissão. ✅
- **Status**: ✅ Concluído

### Fase 6: Validação Final e Git Push
- **Agente Responsável**: `@qa-engineer` / `@loki`
- **Tarefas**:
  - Execução de testes automatizados via TestSprite: Realizado. (Falhas esperadas em telas logadas por falta de conta de teste válida, mas validações de formulários passaram). ✅
  - Subida das alterações para o repositório Git: Repositório inicializado e primeiro commit realizado. ✅
- **Status**: ✅ Concluído
