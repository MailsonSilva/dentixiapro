# Plan de Ação Loki (loki-mode)

## 1. Arquitetura de Alto Nível e Contexto do Problema
O usuário relatou dois problemas críticos:
1. **"Ao clicar em Home, parece que saiu do sistema"**: A rota `/` (Home) atualmente exibe uma Hero Section que se assemelha a uma Landing Page pública, sem os menus estendidos de um Dashboard tradicional. Isso cria a sensação psicológica de "logout". Para `comum` (Dentistas), o verdadeiro painel de controle são as `Simulações`.
2. **"Layout muito grande em notebooks"**: Mesmo reduzindo para `max-w-md`, os botões e inputs continuam grandes em telas de notebook, ocupando excessivo preenchimento vertical (`py-3`, `text-base`, etc) e fazendo o design parecer "zoom in".

**Tech Stack**: Next.js (App Router), React, Tailwind CSS, Supabase.

## 2. Solução Proposta

### A. Correção da Rota "Home" (Redirecionamento)
Em vez de depender do clique do usuário retornar para a Landing Page falsa (`/`), vamos otimizar o fluxo de navegação para mantê-lo **dentro da aplicação real**:
- **`Sidebar` & `Navbar`**: Alteraremos o botão "Home" para que redirecione automaticamente para `/simulacoes/resultados` (a central real de simulações do dentista) ou removeremos o item duplicado (caso seja desnecessário).
- **`ClientLayout.tsx`**: Inserir uma regra de roteamento forte: se um usuário autenticado (`comum` ou `admin`) acessar a rota `/`, ele será automaticamente empurrado via `router.push('/simulacoes/resultados')`.

### B. Micro-Escala do Layout Global (Tailwind)
Iremos forçar uma redução de aproximadamente 15-20% no tamanho de todos os componentes de interação:
- **Painéis de Login/Auth**: Alterar a diretriz de `max-w-md` (448px) para `max-w-sm` (384px) ou ajustar paddings internos (`p-8` para `p-6`).
- **`Input.tsx`**:
  - `py-3` → `py-2.5`
  - Fontes de `text-sm md:text-base` → Padrão global `text-sm`
  - Ícones decorativos de `size={20}` para `size={18}`
- **`Button.tsx`**:
  - Ajuste de paddings verticais padrão de `py-3.5`/`py-4` para `py-2.5`.
  - Tamanho de fonte reduzido para `text-sm` em CTAs padrões.
- **Telas Internas (`/simulacoes`, `/planos`, `/perfil`)**: Varredura para reduzir botões remanescentes desproporcionais e diminuir títulos de `text-3xl/4xl` para `text-2xl/3xl`.

## 3. Lista de Tarefas (Task List)

- [ ] Aprovar plan.md com o usuário.
- [x] Editar `src/components/ClientLayout.tsx` para interceptar acessos `/` logados e enviar para `/simulacoes/resultados`.
- [x] Atualizar `src/components/Sidebar.tsx` e `src/components/Navbar.tsx` para refletir o comportamento seguro (mudança de `href`).
- [x] Escalar `Input.tsx`: Reduzir padding e text-size.
- [x] Escalar `Button.tsx`: Diminuir paddings verticais e arredondamentos excessivos.
- [x] Reescalar os cards de autenticação (`/login`, `/register`, `/register/parceiros`, `/forgot`, `/redefinir-senha`) para `max-w-sm`.
- [x] Autocorreção: Rodar `npm run build` ao final para testar as dependências visuais.

## 4. Avaliação (Self-Correction)
A garantia consistirá em checar se em visualizações de 13/14 polegadas (notebooks comuns), nenhuma caixa de Auth ultrapassa visualmente 1/3 da tela e os botões comportar-se-ão com aspecto SaaS "clean".
