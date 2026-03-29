# 🗺️ Mission Control: Estado do Projeto (Project State)

**Última atualização**: 2026-03-29 — Sprint 3: Ajustes Finais Chat IA Híbrido

---

## 1. O Que Mudou (What Changed)

### Sprint Atual (2026-03-29 — Tarde/Sprint 3)
#### Backend — Migration + Trigger + Webhook
- ✅ **Trigger `trg_mirror_ai_to_messages` reforçado**:
  - Agora espelha **TANTAS as mensagens `ai` quanto as `human`** vindas do n8n para a tela do usuário.
  - Implementada lógica de **Deduplicação (Dedup)** de 3 minutos para evitar que o webhook do Next e o n8n_chat_histories insiram em duplicidade a mesma fala do cliente na UI.
- ✅ **Webhook do Next.js (`/api/evolution/webhook/route.ts`)**:
  - Toda captura de mensagem agora embute `source: "human"` no JSON original da mensagem.
  - Se o dono da clínica responder pelo celular/WhatsApp nativo (`fromMe: true`), a mensagem vai pro banco como `outbound` com `source: "human"` e entra direto na UI via Realtime.

#### Frontend — `src/app/mensagens/page.tsx`
- ✅ **Ícones UI removidos a pedido**: 
  - Ícone de anexo (Paperclip) fora do chat input.
  - Ícone do telefone (Ligar) fora do chat header superior.
- ✅ **Exibição Híbrida Inteligente**: 
  - O distintivo "Maria IA" *somente* renderiza quando a mensagem é `outbound` E tem `source === "ai"`. Se o humano atendente envia, a mensagem aparece limpa e natural.

---

## 2. O Que Está Quebrado (What's Broken)
- Aparentemente nenhum bug impeditivo (100% stable).

---

## 3. Fluxo Híbrido Definitivo (Visão End-to-End)

```
[1] CLIENTE ENVIA MSG → Evolution API → Webhook (Next) → Salva "inbound", source:"human"
   ↳ Realtime engatilha: aparece no frontend na hora
   ↳ Next.js repassa pro n8n → n8n salva em n8n_chat_histories 
   ↳ Trigger da n8n bloqueia duplicação graças ao DEDUP!

[2] MARIA IA RESPONDE → n8n gera mensagem → salva "ai" em n8n_chat_histories
   ↳ Trigger engatilha: intercepta "ai" → cria "outbound", source:"ai"
   ↳ Realtime engatilha: aparece no frontend na hora com distintivo 🤖 "Maria IA"

[3] ATENDENTE HUMANO (Painel) → digita e envia → Evolution API dispara pra pessoa
   ↳ Bot sendo posicionado OFF / ON manualmente controla retransmissões futuras

[4] HUMANO RESPONDE PELO CELULAR (Fora do painel) → Evolution captura (fromMe: true)
   ↳ Webhook (Next) pega o fromMe = true → Salva "outbound", source:"human"
   ↳ Realtime engatilha: aparece no frontend instantaneamente sem distinção de robô.
```

---

## 4. Próximos Passos e Delegação

- [ ] **Integração de Mídia**: N8N + painel Dentixia para enviar/receber áudio.
- [ ] **CRM Status Automatizado**: Evoluir para que a IA da Dentixia troque o card no kanban do CRM baseado na resposta do usuário.
