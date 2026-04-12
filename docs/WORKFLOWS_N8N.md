# ⚙️ WORKFLOWS_N8N.md — DentixIA Pro

> **Versão:** 4.0.0 | **Atualizado:** 2026-04-11
>
> Documentação das automações n8n que orquestram o chatbot de IA e sincronizam dados com o CRM.

---

## 🔌 Infraestrutura

| Item | Valor |
|---|---|
| **Servidor n8n** | VPS auto-hospedado |
| **Base URL Webhooks** | `https://webhook.vps.webartemodelos.com` |
| **Webhook CRM (server)** | `/webhook/dentixiaprocrm` → `N8N_WEBHOOK_URL` |
| **Webhook Chat (client)** | `/webhook/dentixiapro` → `NEXT_PUBLIC_N8N_WEBHOOK_URL` |
| **Banco Supabase** | `setwhujbophxwzighcge.supabase.co` |
| **Evolution API** | `https://api.vps.webartemodelos.com` |

---

## 🤖 Fluxo 1: AI Chatbot WhatsApp (Principal)

### Gatilho
**Tipo:** Webhook Evolution API (mensagem recebida no WhatsApp)

**Quando Ativa:** Sempre que um paciente envia mensagem via WhatsApp para qualquer número da clínica conectado à Evolution API.

### Nós Principais

```
[Webhook Evolution] 
  → [Filtrar Mensagem] (ignorar mensagens do próprio bot/status)
  → [Buscar Contato no Supabase] (por telefone)
  → [Criar Contato se não existir] (INSERT contacts)
  → [Buscar Histórico de Conversa] (SELECT n8n_chat_histories)
  → [Construir Contexto] (histórico + dados da clínica)
  → [Chamar AI Model] (LLM: GPT / Gemini / Claude)
  → [Salvar Resposta] (INSERT n8n_chat_histories com session_id = contact_id)
    → trigger ENRICH auto-preenche conversation_id + company_id
  → [Enviar Resposta] (Evolution API: /message/sendText/{instance})
```

### Lógica de Contexto
O n8n injeta no prompt do AI:
- **Histórico da conversa** (últimas N mensagens do `n8n_chat_histories` para o `session_id`)
- **Dados da clínica** (nome, horários, procedimentos disponíveis)
- **Dados do paciente** (nome, histórico de procedimentos se existir)

### Integração com Supabase (Memória)
- `session_id` = `contact_id` (UUID do contato)
- Toda mensagem salva em `n8n_chat_histories`
- O trigger `trg_enrich_n8n_chat_histories` auto-vincula à conversa correta
- **Supabase Realtime** publica o evento → frontend atualiza automaticamente

---

## 🔄 Fluxo 2: Toggle Bot (Ligar/Desligar IA)

### Gatilho
**Tipo:** Webhook HTTP (chamado pelo frontend via `/api/chat/toggle-bot`)

**Quando Ativa:** Quando o operador da clínica liga ou desliga o bot de IA em uma conversa específica.

### Nós Principais
```
[Webhook /toggle-bot]
  → [Verificar enabled: true/false]
  → [UPDATE Supabase] (company_integrations ou conversations: bot_enabled)
  → [Notificar n8n] (se necessário, atualizar flag interna do fluxo do chatbot)
  → [Retornar status]
```

### Comportamento
- **Bot OFF:** O n8n ignora mensagens da conversa específica, permitindo atendimento humano
- **Bot ON:** O n8n retoma o processamento automático

---

## 📥 Fluxo 3: Sync CRM (Servidor)

### Gatilho
**Tipo:** Webhook HTTP chamado pelo app Next.js (server-side)

**URL:** `N8N_WEBHOOK_URL` = `/webhook/dentixiaprocrm`

**Quando Ativa:** Eventos do CRM que precisam de automação:
- Novo contato criado
- Mudança de estágio no Kanban
- Agendamento criado

### Nós Principais
```
[Webhook CRM]
  → [Identificar tipo de evento] (by event_type field)
  → [Branch: novo_contato / stage_change / appointment_created]
  
  Ramo "novo_contato":
    → [Enviar mensagem de boas-vindas] (Evolution API)
    
  Ramo "stage_change":
    → [Notificar responsável] (WhatsApp interno ou e-mail)
    
  Ramo "appointment_created":
    → [Enviar confirmação ao paciente] (WhatsApp)
    → [Agendar lembrete] (n8n schedule node: D-1 do agendamento)
```

---

## ⏰ Fluxo 4: Lembrete de Consulta (Scheduled)

### Gatilho
**Tipo:** Schedule (n8n Cron) — Executa diariamente às 09:00h

**Quando Ativa:** Todo dia de manhã, para enviar lembretes das consultas do dia seguinte.

### Nós Principais
```
[Cron 09:00 diário]
  → [SELECT appointments] (Supabase: start_time BETWEEN tomorrow 00:00 AND tomorrow 23:59, status='scheduled')
  → [Loop em cada agendamento]
    → [Buscar contato] (contacts JOIN appointments)
    → [Template mensagem] (personalizado com nome do paciente, hora, procedimento)
    → [Evolution API: sendText] (para o WhatsApp do contato)
    → [Marcar lembrete enviado] (UPDATE appointments ou registrar em activities)
```

---

## 🔑 Variáveis n8n (Credentials)

| Variável | Onde Configurar | Uso |
|---|---|---|
| `SUPABASE_URL` | n8n Credentials | URL do Supabase |
| `SUPABASE_SERVICE_KEY` | n8n Credentials | ⚠️ Service Role para leitura irrestrita |
| `EVOLUTION_API_URL` | n8n Credentials | URL da Evolution API |
| `EVOLUTION_API_KEY` | n8n Credentials | Global API Key |
| `OPENAI_API_KEY` (ou `GOOGLE_API_KEY`) | n8n Credentials | Modelo de IA do chatbot |

> **Segurança:** As credenciais n8n são armazenadas criptografadas no servidor n8n, não expostas no repositório.

---

## 🗂️ Tabelas Chave do n8n no Supabase

| Tabela | Criada por | Propósito |
|---|---|---|
| `n8n_chat_histories` | n8n (auto) | Histórico de conversa (memória do AI) |
| `conversations` | App | Conversa ativa por contato/canal |
| `communication_channels` | App | Instâncias WhatsApp por empresa |

**Fluxo de dados:**
```
Evolution API → n8n → INSERT n8n_chat_histories (session_id = contact_id)
    → trigger ENRICH → preenche company_id + conversation_id
    → Supabase Realtime → push para UI (sem polling)
    → App frontend atualiza a lista de mensagens
```

---

## 📡 Webhook de Entrada (Evolution → n8n)

A Evolution API é configurada para enviar eventos para o n8n via:
```
POST https://webhook.vps.webartemodelos.com/webhook/{instance_name}/messages-upsert
```

**Payload de exemplo:**
```json
{
  "event": "messages.upsert",
  "instance": "clinica_xyz",
  "data": {
    "key": { "remoteJid": "5511999999999@s.whatsapp.net" },
    "messageType": "conversation",
    "message": {
      "conversation": "Olá, quero agendar uma consulta"
    },
    "pushName": "João Silva"
  }
}
```

O n8n extrai o telefone, busca/cria o contato, processa com AI e responde.

---

## 🔍 Debug e Logs

- **Logs n8n:** dashboard do servidor n8n → execuções recentes
- **Logs Supabase:** `supabase.get_logs('realtime')` e `supabase.get_logs('postgres')`
- **Logs Evolution API:** dashboard da instância → logs de mensagens
- **Erro comum:** `session_id` inválido (não UUID) → trigger ENRICH ignora o enrichment e retorna `NEW` sem vínculos
