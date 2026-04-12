# Documento de Design (DESIGN)

## 1. Layout UI/UX de Procedimentos (Configurações / Modal)
- **Card de 'Adicionar Procedimentos':**
  - Remover restrições de largura fixa (ex: `max-w-md`), estendendo para ocupar largura total da tela/container.
  - Utilizar contêiner responsivo `w-full` com padding adaptado.
- **Lista de Procedimentos:**
  - Evoluir o design de "lista comum" (List view) para "Grid view".
  - Exibição em duas colunas fixas ou dinâmicas (`grid-cols-1 md:grid-cols-2`).
  - Cada item deve ser renderizado como um Card menor, facilitando o enquadramento de informações como Nome, Preço, Duração e Ações (Editar/Excluir).

## 2. UI do Calendário (Expediente)
- **Horários Bloqueados:**
  - Aplicação de classes semânticas nas células inativas (ex: `bg-muted` ou `bg-gray-100 dark:bg-gray-800`).
  - Aplicação de CSS extra como pontilhados ou listrados (`bg-[repeating-linear-gradient(...)]` ou similar) se o design premium exigir.
  - Alterar o cursor (`cursor-not-allowed`) e opacidade (`opacity-50`) nos horários onde o status `isOpen` derivado das configurações seja falso.

## 3. Padrão Global de UI UI-UX Pro Max
- Manter aderência aos novos padrões *Premium*: botões arredondados, contrastes adequados para darkMode/lightMode, transições suaves (micro-animações `transition-all duration-200`) e coerência nas fontes.
