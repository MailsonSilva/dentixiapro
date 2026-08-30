# API Reference — DentixIA Pro

Documentação completa das Server Actions e Edge Functions disponíveis.

---

## 1. Autenticação (`src/lib/auth/actions.ts`)

### `getCurrentUserAction()`

Retorna o usuário autenticado na sessão atual.

**Response:**
- `{ user: User, error: null }` — Sucesso
- `{ user: null, error: string }` — Não autenticado

---

### `signInWithPasswordAction(email, password)`

Login com email e senha.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| email | string | Yes | Email do usuário |
| password | string | Yes | Senha |

**Response:**
- `{ data: AuthData, error: null }` — Sucesso
- `{ data: null, error: string }` — Credenciais inválidas

---

### `signInWithGoogleAction(origin)`

Inicia fluxo OAuth com Google.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| origin | string | Yes | URL base para callback (`window.location.origin`) |

**Response:**
- `{ data: { url: string }, error: null }` — Redirect URL do Google

---

### `signUpAction(payload)`

Cadastro de novo usuário.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| payload.email | string | Yes | Email |
| payload.password | string | Yes | Senha (min 6 chars) |
| payload.optionsData.nome_completo | string | Yes | Nome completo |
| payload.optionsData.whatsapp | string | Yes | WhatsApp |
| payload.optionsData.user_referredbycode | string \| null | No | Código de indicação |
| payload.optionsData.tipo | "comum" \| "parceiro" | Yes | Tipo de conta |

---

### `signOutAction()`

Logout do usuário.

---

### `sendPasswordResetAction(email)`

Envia email de redefinição de senha.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| email | string | Yes | Email cadastrado |

---

## 2. Simulações — Pipeline IA (`src/lib/actions/simulacoes.ts`)

### `gerarSimulacaoNativa(formData)`

Pipeline completo: validação → upload original → Gemini AI → upload resultado → DB.

**Parameters (FormData):**
| Key | Type | Required | Description |
|-----|------|----------|-------------|
| imagem | File | Yes | Foto do paciente (JPG/PNG, max 4MB) |
| tipoTratamento | string | Yes | `"clareamento"`, `"faceta"`, `"implante_total"`, `"implante_parcial"` |
| corSelecionada | string | Yes | ID da cor dental (ex: `"BL1"`, `"A1"`) |

**Response:**
```typescript
interface ResultadoSimulacao {
  success: boolean;
  urlSimulada?: string;   // URL pública da imagem gerada
  urlOriginal?: string;   // URL pública da foto original
  error?: string;
}
```

**Errors:**
- `"Usuário não autenticado."` — Sessão inválida
- `"Tipo de tratamento inválido."` — tipoTratamento não reconhecido
- `"A imagem é muito grande."` — Arquivo > 4MB
- `"Formato inválido."` — Não é JPG/PNG
- `"Chave da API Gemini não configurada."` — GEMINI_API_KEY ausente

---

### `salvarSimulacaoConfirmada(nomePaciente, procedimento, urlOriginal, urlSimulada, corUtilizada)`

Salva uma simulação confirmada no banco de dados.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| nomePaciente | string | Yes | Nome do paciente |
| procedimento | string | Yes | Tipo de procedimento |
| urlOriginal | string | Yes | URL da imagem original |
| urlSimulada | string | Yes | URL da imagem simulada |
| corUtilizada | string | Yes | Cor dental utilizada |

**Response:**
- `{ success: true }` — Salvo com sucesso
- `{ success: false, error: string }` — Erro

---

## 3. Simulações — Queries & CRUD (`src/lib/simulacoes/`)

### `getSimulationsAction()` — `queries.ts`

Lista todas as simulações salvas do usuário autenticado.

**Response:** `Simulacao[]`

```typescript
interface Simulacao {
  id: number;
  created_at: string;
  usuario_id: string;
  procedimento: string;
  img_original_url: string;
  img_simulada_url: string;
  nome_paciente: string;
  cor_utilizada: string;
  company_id?: string;
  contact_id?: string | null;
}
```

> **Segurança:** Filtrado por `usuario_id = auth.uid()` no servidor.

---

### `deleteSimulationAction(id)` — `actions.ts`

Exclui uma simulação e suas imagens do storage.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | number | Yes | ID da simulação |

**Throws:**
- `"Usuário não autenticado."` — Sem sessão
- `"Simulação não encontrada."` — ID inexistente
- `"Não autorizado."` — Simulação pertence a outro usuário

> **Segurança:** Verifica propriedade (`usuario_id === user.id`) antes de deletar. DELETE inclui cláusula `.eq("usuario_id", user.id)`.

---

## 4. Edge Functions (Supabase/Deno)

### `POST /functions/v1/create-checkout`

Cria sessão de Checkout do Stripe.

**Headers:**
- `Authorization: Bearer <SUPABASE_ANON_KEY>`
- `Content-Type: application/json`

**Body:**
```json
{
  "price_id": "price_xxx",
  "email": "user@email.com",
  "company_id": "uuid",
  "return_url": "https://app.dentixia.com/perfil",
  "name": "Nome",
  "cpf": "123.456.789-00",
  "phone": "+5511999999999",
  "referral_code": "ABC123",
  "address": {
    "line1": "Rua X, 123",
    "city": "São Paulo",
    "postal_code": "01001-000",
    "state": "SP"
  }
}
```

**Response:**
- 200: `{ "url": "https://checkout.stripe.com/..." }`
- 400: `{ "error": "mensagem" }`

---

### `POST /functions/v1/create-portal`

Cria sessão do Customer Portal Stripe para gerenciar assinatura.

**Body:**
```json
{
  "company_id": "uuid"
}
```

**Response:**
- 200: `{ "url": "https://billing.stripe.com/..." }`

---

### `POST /functions/v1/stripe-webhook`

Recebe e processa eventos do Stripe (webhook). Configurado no dashboard Stripe.

**Events processados:**
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

---

## 5. Database Schema (Tabelas Principais)

| Tabela | Descrição | RLS |
|--------|-----------|-----|
| `usuarios` | Perfil do usuário (nome, email, tipo, trial) | ✅ |
| `simulacoes` | Simulações salvas (imagens, procedimento, cor) | ✅ |
| `simulacao_tracking` | Métricas de uso (acerto, erro, refeita, salva) | ✅ |
| `subscriptions` | Assinaturas Stripe | ✅ |
| `customers` | Vínculo company ↔ Stripe Customer | ✅ |
| `user_company` | Vínculo user ↔ company (role) | ✅ |
| `company` | Empresa/clínica | ✅ |
| `system_settings` | Configurações globais (welcome_video_url) | ✅ |
| `consentimentos` | LGPD consent tracking | ✅ |

### Views
| View | Descrição |
|------|-----------|
| `verificar_status_usuario` | Status consolidado: trial, assinatura, bloqueio |
