# Mission Control - DentixIA Pro

## 🎯 Objetivo Atual
Sprint de 10 melhorias de UI/UX executadas por Loki Mode em 2026-03-24.
Todas as mudanças são frontend-only, sem alterações de backend ou banco de dados.

---

## 🗺️ Roadmap e Alocação (Fases de Desenvolvimento)

### Fase 1–6: Histórico Anterior (Concluídas)
Escalonamento de Layout, Refinamento de Responsividade, Parceiros, Auth e QA.  
**Status**: ✅ Todas concluídas.

---

## 🆕 Sprint 2026-03-24 — 10 Melhorias de UI/UX

### Arquivos Modificados
| Arquivo | Tarefas |
|---------|---------|
| `src/app/page.tsx` | 1, 2, 3, 4, 5 |
| `src/components/Navbar.tsx` | 6, 7 |
| `src/components/Sidebar.tsx` | 4 |
| `src/components/ClientLayout.tsx` | 7 |
| `src/lib/DrawerContext.tsx` | 7 (novo arquivo) |
| `src/app/simulacoes/page.tsx` | 8, 9 |
| `src/app/simulacoes/resultados/page.tsx` | 10 |

### Tarefas
1. ✅ Removido badge "TECNOLOGIA IA DE PRÓXIMA GERAÇÃO" da home
2. ✅ Removido "Nível Pro Max" do h1 da home
3. ✅ Texto substituído por "Pronto para transformar sorrisos?"
4. ✅ Botão "Ver Tutoriais" removido da home; adicionado ao Sidebar com ícone `BookOpen`
5. ✅ Botão "Iniciar Simulação" ajustado: `h-14 text-lg` (era `h-20 text-xl`)
6. ✅ Navbar mobile: nomes sempre visíveis (não mais opacity-0 no idle)
7. ✅ Drawer lateral mobile (esquerda→dereita) implementado via `DrawerContext`; botão Menu hamburguer na Navbar (última posição)
8. ✅ Perfil removido da Navbar (redundante com Drawer/Sidebar)
9. ✅ Rodapé do Drawer: logos removidas; botão de Logout (Sair da Conta) movido para o rodapé fixo.
10. ✅ Ícones da tela de simulação em azul (`text-blue-500`, `bg-blue-50`)

### Estado Atual
- **Sem regressões conhecidas**: mudanças restritas a UI, sem alteração de lógica ou banco
- **DrawerContext**: novo contexto em `/lib/DrawerContext.tsx` gerencia abertura/fechamento do drawer mobile
- **Compilação**: app rodando em dev mode na porta 3000
