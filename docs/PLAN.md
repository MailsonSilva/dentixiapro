# Plano de Implementação: Configuração do Evolution API e Fluxo n8n DentixiaProCRM

## Objetivo
Configurar a criação de instâncias do Evolution para enviar mensagens diretamente ao webhook do n8n, criar uma tabela no Supabase para gerenciar clientes, e otimizar o fluxo de conversa no n8n para verificar se o contato é um cliente existente antes de processar a memória do chat, garantindo maior fluidez nas respostas.

## Arquitetura e Agentes Envolvidos
Esta orquestração necessita de no mínimo 3 agentes especializados:

1. **`backend-specialist`**: Responsável por alterar a rota de criação de instância da Evolution API e editar o fluxo no n8n.
2. **`database-architect`**: Responsável por modelar e criar a tabela de clientes no Supabase para a verificação rápida.
3. **`test-engineer` / `security-auditor`**: Responsável por validar a integração e verificar os scripts de segurança após a implementação.

## Tarefas (Phase 2 - Pós Aprovação)

### 1. Banco de Dados (Supabase) - `database-architect`
- Criar tabela `clientes` (ou equivalente) no Supabase (projeto atual).
- Colunas sugeridas: `id`, `company_id`, `telefone` (identificador do whatsapp), `nome`, `created_at`.
- Configurar políticas RLS para garantir que a consulta seja segura e indexar o campo de `telefone` para buscas rápidas.

### 2. Backend (Evolution API) - `backend-specialist`
- Arquivo alvo: `app/src/app/api/evolution/create-instance/route.ts`
- Alteração: Adicionar/Substituir o webhook padrão para o webhook do n8n: `https://webhook.vps.webartemodelos.com/webhook/dentixiaprocrm`
- Garantir que a configuração do payload envie os eventos corretamente (`MESSAGES_UPSERT`).

### 3. Automação (n8n) - `backend-specialist`
- Fluxo alvo: `CRM Dentixia Pro` (ID: T6IKNnjijsYA7u77)
- Alteração: Interceptar o gatilho inicial (Webhook). Adicionar um nó do Supabase para verificar pelo número do WhatsApp se o contato já existe na tabela de clientes.
- Lógica de Roteamento (Switch/If): 
  - Se for cliente existente: Segue fluxo normal otimizado.
  - Se for novo cliente: Pode ser cadastrado antes de seguir.
- A verificação deve ocorrer **antes** do nó do Chat Memory / Agent, melhorando a fluidez visual da conversa e o contexto da IA.

### 4. Verificação - `test-engineer`
- Executar linting e checagem de tipos na alteração do backend.
- Testar a criação de instância e validar se o webhook do n8n foi devidamente associado.
- (Opcional) Executar o `security_scan.py` para garantir que nenhuma chave tenha sido exposta.

---
**Status**: Aguardando aprovação do usuário para iniciar a Phase 2 (Implementação Paralela).
