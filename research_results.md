# 🧠 Brainstorm: Análise e Mapeamento de Procedimentos e Horários

## Contexto
O objetivo desta análise é mapear todos os arquivos no código atual da aplicação DentixiaPro onde o termo "procedimentos" é utilizado, abrangendo áreas como agendamento, filtros e histórico do cliente. Além disso, precisamos identificar onde o calendário processa e renderiza as configurações de "horário de funcionamento" ou "business hours" da clínica/profissional. Este mapeamento é fundamental para entender o fluxo de dados em preparação para futuras melhorias na arquitetura.

---

## 📍 Mapeamento: Uso de "Procedimentos"

Arquivos responsáveis pelo uso de procedimentos em agendamentos, filtros e histórico:

### 1. Histórico do Cliente
- `src/components/clientes/ProcedureHistory.tsx`
  Responsável por listar e gerenciar a interface do histórico de procedimentos efetuados em um cliente.
- `src/lib/clientes/queries.ts` e `src/lib/clientes/actions.ts`
  Responsáveis pela lógica de acesso e escrita no banco de dados relacionada ao histórico de procedimentos do cliente.

### 2. Agendamento
- `src/components/agenda/AppointmentModal.tsx`
  Modal de criação e edição de agendamentos, onde procedimentos específicos são selecionados (agendamento).
- `src/lib/agenda/queries.ts` e `src/lib/agenda/actions.ts`
  Lógica de busca e salvamento dos agendamentos no banco, interligados aos procedimentos marcados.
- `src/app/agenda/page.tsx`
  Página principal de agendamento que importa as ações e modalidades de procedimentos para criação da reserva.

### 3. Filtros e Simulações
- `src/app/simulacoes/resultados/page.tsx`
  Interface que aplica lógica de cruzamento de procedimentos para simular cenários de resultados.
- `src/lib/simulacoes/actions.ts`
  Ações de banco de dados executando filtros baseados em procedimentos.

---

## 📍 Mapeamento: Processamento de Horários no Calendário

Arquivos onde o sistema de calendário processa os horários de funcionamento (Business Hours / Horário Comercial):

### 1. Configuração Global
- `src/app/configuracoes/page.tsx`
  A página onde o usuário define o perfil da empresa/clínica, inserindo na interface o horário de funcionamento padrão que reflete no calendário.

### 2. Processamento e Interface do Calendário
- `src/components/agenda/CalendarGrid.tsx`
  O componente que desenha a grade de horários da agenda. Ele deve levar em consideração as limitações de tempo e desenhar blocos com base nos horários de funcionamento.
- `src/components/agenda/AgendaSidebar.tsx`
  Utilizado em conjunto com o calendário, potencialmente filtrando ou limitando horários disponíveis para alocação.
- `src/lib/agenda/actions.ts`
  Valida se um horário recém agendado respeita os horários de funcionamento permitidos.

---

## 💡 Próximos Passos (Recomendação)

Com base neste levantamento rápido, se o objetivo for modificar a lógica de verificação de horários na agenda para garantir que não existam agendamentos fora de expediente, a ação de maior impacto seria revisar a validação em **`src/lib/agenda/actions.ts`**, além da restrição visual no **`src/components/agenda/AppointmentModal.tsx`**.
