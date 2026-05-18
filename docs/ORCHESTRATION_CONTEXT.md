# ORCHESTRATION_CONTEXT - DentixIA Pro

Atualizado em 2026-05-17.

## MCPs

Nesta sessao, `list_mcp_resources` e `list_mcp_resource_templates` nao retornaram recursos. Portanto, a verificacao de n8n/Supabase foi feita pelo codigo local, migracoes SQL e documentacao existente do projeto.

## Workflow n8n

Workflow informado pelo usuario: `T6IKNnjijsYA7u77`.

Contrato recomendado para o workflow:

1. Evolution chama o webhook do app Next.js primeiro.
2. O app cria/acha contato, conversa e insere a mensagem imediatamente em `chat_messages`.
3. O app encaminha o payload bruto para o n8n quando `bot_enabled` permite.
4. O n8n usa `n8n_chat_histories` somente como memoria/contexto da IA.
5. Respostas do n8n em `n8n_chat_histories` sao espelhadas para `chat_messages` pelo trigger `trg_mirror_n8n_history_to_chat_messages`.

## Mensagens

`chat_messages` e a tabela rapida da UI:

- `message.type = text`: renderiza bolha normal.
- `message.type = audio`: renderiza bolha de audio com player quando `media_url` existir.
- `delivery_status`: `sending`, `sent`, `received`, `failed`.
- `source`: `app`, `evolution`, `ai`, `n8n`.

`n8n_chat_histories` permanece separado para memoria do agente. Isso evita depender do ciclo completo do n8n para a tela de mensagens.

## Audio

Audio recebido pelo Evolution e armazenado em `chat_messages.message`:

```json
{
  "text": "Audio recebido",
  "type": "audio",
  "source": "human",
  "media_url": "...",
  "mimetype": "audio/ogg; codecs=opus",
  "seconds": 12,
  "ptt": true
}
```

Se o payload nao tiver URL publica, a UI mostra que o audio foi salvo sem player publico. O n8n/Evolution pode transcrever e salvar texto depois, se o workflow `T6IKNnjijsYA7u77` tiver esse passo.

## Kanban

O status do contato acompanha marcacoes da agenda:

- `scheduled` -> estagio `Avaliacao Agendada`
- `completed` -> estagio `Em Orcamento`
- `cancelled` -> estagio `Em Atendimento`

A migracao `0008_chat_messages_fast_lane.sql` inclui trigger para que isso tambem funcione quando o agendamento vier do n8n/Supabase direto.

## UI

- Sidebar principal inicia recolhida.
- Submenus iniciam fechados.
- Detalhe do paciente em Clientes mostra cadastro, agendamentos recentes, conversas recentes e procedimentos.
