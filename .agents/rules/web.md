# Diretrizes Técnicas para Desenvolvimento Web e Landing Pages (Next.js / React)

Este guia estabelece os padrões de arquitetura, ergonomia de componentes, performance de renderização (Core Web Vitals) e boas práticas de conversão para aplicações em `apps/web/` e `apps/landing/`.

---

## 1. Arquitetura de Software e Estrutura de Diretórios
Adotamos o padrão modular com Next.js (App Router) e TypeScript estrito:

```text
apps/[web|landing]/
├── app/                   # Rotas, Layouts e Server Actions (App Router)
│   ├── (auth)/            # Rotas autenticadas agrupadas
│   ├── api/               # Route Handlers para webhooks/integrações
│   ├── layout.tsx         # Layout raiz com fontes e metadados globais
│   └── page.tsx           # Ponto de entrada da aplicação/landing
├── components/            # Componentes visuais reutilizáveis
│   ├── ui/                # Componentes atômicos e primitivos (Design System / Tailwind)
│   └── shared/            # Componentes compostos entre páginas
├── lib/                   # Utilitários, clientes de dados e conexões
└── types/                 # Interfaces e tipos globais TypeScript
```

---

## 2. Paradigma Server-First (RSC) e Gestão de Estado
1. **Server Components por Padrão**:
   - Todo componente deve ser renderizado no servidor por padrão (`React Server Component`).
   - A diretiva `'use client'` deve ser restrita exclusivamente às folhas da árvore de componentes que exigem interatividade imediata (event listeners, hooks como `useState`/`useEffect` ou APIs de navegador).
2. **Data Fetching Direto no Servidor**:
   - Evite carregar dados primários através de `useEffect` no cliente. Busque os dados diretamente em Server Components assíncronos (`async/await`) para eliminar cascatas (*waterfalls*).
3. **Mutações Seguras via Server Actions**:
   - Formulários e ações de escrita devem priorizar **Server Actions** tipadas com validação de schema (ex.: Zod).

---

## 3. Performance Web e Core Web Vitals (Padrões de Engenharia)
Inspirado nas diretrizes de alta performance de Addy Osmani:
1. **Otimização de Carregamento de Recursos**:
   - Imagens devem obrigatoriamente utilizar o componente `next/image` com dimensões explícitas (`width` e `height`) ou propriedade `fill`, prevenindo CLS (Cumulative Layout Shift).
   - A imagem principal da primeira dobra (*Hero Image*) deve conter a propriedade `priority` para otimizar o LCP (Largest Contentful Paint).
2. **Fontes Locais e Zero Layout Shift**:
   - Carregue fontes via `next/font` com estratégia de swap automático.
3. **Eliminação de Código Não Utilizado**:
   - Importe ícones e módulos de forma granular (ex.: `lucide-react` com imports individuais).

---

## 4. Landing Pages de Alta Conversão e SEO (`apps/landing`)
1. **Metadados e Open Graph Dinâmicos**:
   - Todo layout ou página pública deve declarar o objeto `metadata` completo: `title`, `description`, `openGraph` (com imagem de preview de 1200x630px) e `robots`.
2. **Semântica HTML e Acessibilidade (a11y)**:
   - Respeite rigorosamente a hierarquia de títulos: apenas um único `<h1>` por página, seguido de `<h2>` e `<h3>`.
   - Contraste de cores conforme as diretrizes WCAG AA.
3. **Seções Obrigatórias de Conversão**:
   - **Above the Fold**: Proposta de valor clara, subtítulo de reforço e CTA principal.
   - **Prova Social / Demonstração**: Demonstração visual do valor gerado ou depoimentos.
   - **Tabela de Preços / Planos**: Comparativo direto e transparente.
   - **FAQ com Acordeão**: Quebra das principais objeções antes da compra.
