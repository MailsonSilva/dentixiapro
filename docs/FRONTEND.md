# 🖥️ FRONTEND.md — DentixIA Pro

> **Versão:** 4.0.0 | **Atualizado:** 2026-04-11

---

## 🎨 Design System

### Tokens de Cor (globals.css)

| Token CSS | Valor | Uso |
|---|---|---|
| `--primary` | `#0F50A6` | Cor principal da marca (azul) |
| `--primary-glow` | `#11A0D9` | Azul claro para gradientes |
| `--primary-light` | `#11A0D9` | Alias do glow |
| `--primary-cyan` | `#11B4D9` | Cyan para destaques |
| `--accent` | `#F19642` | Laranja para CTAs secundários |
| `--secondary-bg` | `#f1f5f9` | Background padrão das páginas |
| `--card-bg` | `rgba(255,255,255,0.7)` | Fundo de cards com glassmorphism |
| `--glass-border` | `rgba(255,255,255,0.4)` | Borda dos cards vidro |

### Tipografia

| Font | Pesos | Variável | Uso |
|---|---|---|---|
| **Inter** | 100–900 | `--font-inter` | Corpo do texto, UI |
| **Poppins** | 400, 600, 700 | `--font-poppins` | Títulos e destaques |

### Classes Utilitárias Globais

| Classe | Descrição |
|---|---|
| `.glass-card` | Glassmorphism: blur(16px), bordas translúcidas, shadow suave |
| `.text-gradient` | Gradiente animado do primary ao cyan (8s loop) |
| `.btn-primary` | Botão primário com shine hover effect e active:scale-95 |
| `.animate-float` | Float vertical 6s infinito (para elements decorativos) |
| `.scrollbar-hide` | Remove scrollbar visível (mobile-safe) |

### Bordas (Sistema "Pro Max")

- Padrão geral: `rounded-lg` (8px) para inputs e botões
- Cards de módulo: `rounded-xl` (12px)
- Modais: `rounded-xl` / `rounded-t-[32px]` sm:above
- Indicadores: `rounded-md` (6px)

---

## 🗂️ Mapa de Rotas (App Router)

| Rota | Arquivo | Acesso | Descrição |
|---|---|---|---|
| `/` | `app/page.tsx` | Público | Landing page |
| `/login` | `app/login/` | Público | Autenticação |
| `/register` | `app/register/` | Público | Cadastro |
| `/forgot` | `app/forgot/` | Público | Reset de senha |
| `/redefinir-senha` | `app/redefinir-senha/` | Auth | Definir nova senha |
| `/agenda` | `app/agenda/page.tsx` | Auth (comum) | Calendário de agendamentos |
| `/clientes` | `app/clientes/` | Auth (comum) | Gestão de pacientes |
| `/crm` | `app/crm/` | Auth (comum) | Kanban CRM |
| `/mensagens` | `app/mensagens/` | Auth (comum) | Central de mensagens |
| `/simulacoes/resultados` | `app/simulacoes/` | Auth (comum) | Simulações AI |
| `/configuracoes` | `app/configuracoes/page.tsx` | Auth (comum) | Perfil + configurações |
| `/configuracoes/integracoes` | `app/configuracoes/integracoes/` | Auth (admin) | Evolution API / n8n |
| `/planos` | `app/planos/` | Público | Tabela de preços + Stripe |
| `/aulas` | `app/aulas/` | Auth | Tutoriais em vídeo |
| `/parceiros` | `app/parceiros/` | Auth (parceiro) | Dashboard de afiliados |
| `/indique-e-ganhe` | `app/indique-e-ganhe/` | Auth | Programa de indicação |
| `/perfil` | `app/perfil/` | Auth | Perfil público do usuário |
| `/termos` | `app/termos/` | Público | Termos de uso |
| `/privacidade` | `app/privacidade/` | Público | Política de privacidade |

---

## 🧩 Componentes Core

### ClientLayout.tsx
**Responsabilidade:** Orquestradora de layout autenticado. Envolve todo o app.

**Props:** `{ children: ReactNode }`

**Contextos Providos:**
- `SidebarProvider` — estado open/closed do sidebar desktop
- `DrawerProvider` — estado open/closed do drawer mobile
- `NotificationProvider` — sistema de toasts (sonner)

**Lógica de Acesso:**
```
checkAccess() → verifica auth → tipo (parceiro vs comum) → role → trial status
```

**Paywall Overlay:** Exibido quando `trialExpired === true` — bloqueia toda a UI com z-index 9999, oferece redirecionamento para `/planos`.

**Rotas Fullscreen (sem sidebar):** `/planos`

---

### Sidebar.tsx
**Responsabilidade:** Navegação principal desktop (≥ md).

**Props:** `{ type: 'comum' | 'parceiro' }`

**Itens de Navegação (usuário comum):**
- Página Inicial (`/`)
- Agenda (`/agenda`)
- Clientes (`/clientes`)
- Simulações (`/simulacoes/resultados`)
- CRM (`/crm`)
- Mensagens (`/mensagens`)
- Configurações (`/configuracoes`)

**Itens de Navegação (parceiro):**
- Dashboard (`/parceiros`)
- Indique e Ganhe (`/indique-e-ganhe`)
- Perfil (`/perfil`)

---

### Navbar.tsx
**Responsabilidade:** Topbar mobile com hambúrguer, logo e ações rápidas.

**Aciona:** `DrawerContext.openDrawer()` ao clicar no hambúrguer.

---

### MobileDrawer (dentro de ClientLayout.tsx)
**Responsabilidade:** Drawer lateral mobile (slide-in from left).

**Animação:** Spring `{ damping: 25, stiffness: 300 }` via Framer Motion.

**Badge de Role:** Exibe "Administrador" / "Gerente" / "Usuário" com cores semânticas.

---

## 📅 Módulo: Agenda

### Arquitetura de Componentes

```
agenda/page.tsx (Orquestrador)
├── AgendaSidebar.tsx
│   ├── Filtro de Procedimentos (checklist)
│   └── Mini-Calendário (grid 7 colunas)
├── CalendarGrid.tsx
│   └── AppointmentCard.tsx (draggable)
├── AppointmentModal.tsx (create/edit)
└── AppointmentDetailModal.tsx (detalhes + ações)
```

### Estado Global da Agenda (agenda/page.tsx)

| State | Tipo | Descrição |
|---|---|---|
| `currentDate` | `Date` | Mês/ano exibido no calendário |
| `appointments` | `Appointment[]` | Agendamentos do mês atual |
| `contacts` | `Contact[]` | Lista de pacientes para o seletor |
| `companyId` | `string` | Tenant atual (carregado via auth) |
| `selectedFilters` | `string[]` | Nomes de procedimentos filtrados |
| `businessHours` | `any[]` | Config de expediente por dia |
| `procedures` | `ProcedureCatalogItem[]` | Catálogo de procedimentos |
| `isModalOpen` | `boolean` | Controle do modal create/edit |
| `editingAppointment` | `Appointment \| null` | Agendamento em edição |
| `defaultDate` | `string` | Data pré-preenchida no modal |
| `conflictError` | `string \| null` | Mensagem de erro de conflito |
| `detailApp` | `Appointment \| null` | Agendamento no modal de detalhes |
| `isDetailOpen` | `boolean` | Controle do modal de detalhes |

### Fluxo de Fetch (fetchData)

```typescript
// Dependências: [currentDate, companyId, notify]
// Guard: if (!companyId) return
Promise.all([
  getAppointments(start, end),      // filtra por range do mês
  getCalendarContacts(),             // todos os contatos
  getCompanyBusinessHours(companyId), // expediente
  getProcedureCatalog(companyId)     // catálogo de proc
])
```

**Auto-select:** Na primeira carga, todos os procedimentos são automaticamente selecionados como filtros ativos.

---

### AgendaSidebar.tsx

**Props:**
```typescript
interface AgendaSidebarProps {
  currentDate: Date;
  setCurrentDate: (d: Date) => void;
  selectedFilters: string[];
  onToggleFilter: (name: string) => void;
  onDayClick: (day: Date) => void;
  businessHours?: any[];
  procedures?: ProcedureCatalogItem[];
}
```

**Seção: Filtro de Procedimentos**
- Toggle individual por procedimento
- Botão "Todos" / "Limpar" para seleção em massa (`handleToggleAll`)
- Exibe duração (`duration_min`) à direita de cada item
- Ícone `SlidersHorizontal` no cabeçalho

**Seção: Mini-Calendário**
- Grid 7 colunas (Seg a Dom, semana começa na Segunda)
- Dias bloqueados: `cursor-not-allowed` + padrão diagonal via `inline-style`
- Dias passados: `line-through` + `cursor-not-allowed`
- Dia atual: badge `bg-primary text-white`
- Legenda "Dia fechado" exibida quando `businessHours` configurado
- Dias sem expediente: `disabled` nativo (sem clique, sem drag)

**Lógica de Dia Clicável:**
```typescript
const isClickable = isBusinessDay && isCurrMonth && !isPast;
```

---

### CalendarGrid.tsx

**Props:**
```typescript
{
  currentDate, calendarDays, appointments, selectedFilters,
  onPrevMonth, onNextMonth, onToday, onDayClick,
  onAppointmentOpen, onDropOnDay, businessHours
}
```

**Features:**
- Visualização mensal (5–6 semanas)
- Drag & Drop: `draggable` em `AppointmentCard`, `onDragOver` e `onDrop` nas células
- Dias fechados: ícone `BanIcon` + padrão diagonal mais denso — sem clique/drop
- Paleta de cores determinística: hash do nome do procedimento → índice de cor fixo (elimina re-renders)
- Labels de dia da semana abreviados: `Seg, Ter, Qua, Qui, Sex, Sáb, Dom`

**Filtro de Appointments:**
```typescript
// Apenas mostra agendamentos cujo procedure_name está em selectedFilters
appointments.filter(a => selectedFilters.includes(a.procedure_name))
```

---

### AppointmentModal.tsx

**Modo:** Create (editingAppointment = null) ou Edit (editingAppointment preenchido).

**Campos do Formulário:**
- **Contato** — seletor pesquisável (filtra contacts por nome)
- **Procedimento** — select do catálogo (popula `catalogId` e `durationMin`)
- **Data** — date input (pré-preenchida com o dia clicado)
- **Horário** — time input
- **Duração** — número em minutos (opcional, default: 60)

**Erros:**
- `conflictError` — exibido em banner vermelho dentro do modal
- Erros de horário fora do expediente → `conflictError` (mensagem descritiva)

---

### AppointmentDetailModal.tsx

**Exibe:** Dados completos do agendamento (paciente, procedimento, data/hora, status).

**Ações:**
- ✅ Marcar como Concluído → `updateAppointmentStatusAction(id, 'completed')`
- ✏️ Editar → abre `AppointmentModal` com `editingAppointment` preenchido
- ❌ Cancelar → `deleteAppointmentAction(id)` (soft-delete: status = 'cancelled')

---

### AppointmentCard.tsx

**Responsabilidade:** Card arrastável na grade mensal.

**Drag:** `draggable={true}` + `onDragStart` salvando `appointmentId` em `dataTransfer`.

**Cor:** Determinada pelo hash do `procedure_name` (paleta fixada, não muda entre renders).

---

## 🏥 Módulo: Configurações

### Seções do Perfil (configuracoes/page.tsx)

| Seção | Ação | Componente |
|---|---|---|
| Avatar + Logo | Upload para Supabase Storage (`logoEmpresa`) | `handleLogoUpload` |
| Editar Perfil | Modal com fields: nome, telefone, empresa, CPF, PIX | Modal + formulário |
| Assinatura | Stripe Customer Portal (`create-portal` Edge Fn) | `handleOpenPortal` |
| Procedimentos | CRUD via `ProcedureGrid` | Modal `sm:max-w-4xl` |
| Horários de Funcionamento | Config business_hours por dia | Modal com toggles por dia |
| Integrações | Navegação para `/configuracoes/integracoes` | `SettingsRow` |
| Indique e Ganhe | Navegação para `/indique-e-ganhe` | `SettingsRow` |
| Suporte | Link WhatsApp | `window.open` |
| Logout | `supabase.auth.signOut()` → `/login` | `SettingsRow danger` |

**TrialBanner:** Exibido apenas para usuários `tipo='comum'`:
- `status_code=3, dias_restantes=999` → oculto (assinatura ativa)
- `status_code=3, dias_restantes>0` → banner verde (trial ativo)
- `status_code=3, dias_restantes<=2` → banner âmbar (urgente)
- `status_code≠3` → banner vermelho (trial expirado) com CTA para /planos

---

## 🧩 Componentes UI Primitivos

### Input.tsx (`components/ui/Input.tsx`)
- Suporta: `label`, `icon`, `disabled`, `placeholder`, `value`, `onChange`
- Estilo: bordas `rounded-lg`, foco com `ring-2 ring-primary/10`

### Button.tsx (`components/ui/Button.tsx`)
- Variantes implícitas via className
- Base: `btn-primary` do design system ou custom classes

### Card.tsx (`components/ui/Card.tsx`)
- Wrapper com `glass-card` ou style padrão

---

## 🧩 ProcedureGrid.tsx (Compartilhado)

**Path:** `components/procedimentos/ProcedureGrid.tsx`

**Props:**
```typescript
{
  layout: 'list' | 'grid';
  procedures: ProcedureCatalogItem[];
  onDelete?: (id: string) => Promise<void>;
  onEdit?: (proc: ProcedureCatalogItem) => void;
}
```

**Usado em:**
- `configuracoes/page.tsx` — catálogo de procedimentos da clínica (layout: `grid`)
- `clientes/` — histórico de procedimentos do paciente (layout: `list`)

**Design:**
- Layout grid: cards em grade responsiva
- Botões de ação (editar/deletar) visíveis apenas no hover (`group-hover:opacity-100`)
- Procedimentos do sistema (`is_system=true`) — sem botão de delete

---

## 🔁 Contextos Globais

| Contexto | Arquivo | Estado | Uso |
|---|---|---|---|
| `NotificationContext` | `lib/NotificationContext.tsx` | `notify(title, message, type)` | Toasts via Sonner |
| `SidebarContext` | `lib/SidebarContext.tsx` | `sidebarOpen, toggleSidebar` | Desktop sidebar state |
| `DrawerContext` | `lib/DrawerContext.tsx` | `drawerOpen, openDrawer, closeDrawer` | Mobile drawer state |

---

## 📱 Responsividade

| Breakpoint | Comportamento |
|---|---|
| `< md` (mobile) | Sidebar escondida; Navbar + MobileDrawer ativo; padding-bottom 24 (espaço p/ tab bar) |
| `≥ md` (tablet+) | Sidebar visível; Navbar oculta; layout `flex-row` |
| `≥ lg` (desktop) | `AgendaSidebar` de 240px visível; máximo de colunas no grid |

**Agenda Sidebar:** `hidden lg:flex` — só visível em ≥ lg.

**Bottom safe-area:** `pb-24 md:pb-8` no `<main>` para evitar sobreposição com tab bar iOS/Android.

**Exceção:** `/mensagens` usa `h-full` sem padding extra (full-height chat).

---

## ✨ Animações e Micro-interações

| Elemento | Animação | Implementação |
|---|---|---|
| `.text-gradient` | Gradiente deslizante | `@keyframes gradient-flow` 8s |
| `.btn-primary` | Shine no hover (translateX shimmer) | `::after` pseudo-element |
| `.animate-float` | Float vertical | `@keyframes float` 6s |
| Modais | Slide-up + fade | `framer-motion` initial/animate/exit |
| MobileDrawer | Slide-in da esquerda | Spring `damping=25, stiffness=300` |
| SettingsRow | Translate hover (`group-hover:translate-x-0.5`) | Tailwind transition |
| Botões | `active:scale-95`, `hover:-translate-y-0.5` | Tailwind transition |
| TrialBanner | Fade+slide-up na entrada | `framer-motion` initial `{opacity:0, y:-8}` |
