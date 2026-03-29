# 🏗️ Arquitetura RBAC Multi-Tenant — DentixIA Pro

**Versão:** 2.0 | **Data:** 2026-03-27 | **Status:** ✅ Implementado

---

## 📌 Conceito Central

```
company_id = TENANT
```
Todos os dados de domínio pertencem à **empresa** (`company_id`). Usuários acessam dados via `user_company`.

---

## 👤 Tipos de Usuário (tabela `usuarios.tipo`)

| Tipo | Enum | Descrição |
|------|------|-----------|
| `comum` | `tipo_usuario` | Dentista/cliente SaaS padrão |
| `parceiro` | `tipo_usuario` | Parceiro do programa de indicação |
| `super_admin` | `tipo_usuario` | Dev/plataforma — acesso irrestrito |
| `admin` *(legado)* | `tipo_usuario` | Não usar em novos cadastros — ver `app_role` |

---

## 🏢 Roles por Empresa (`user_company.role`)

| Role | Enum `app_role` | Permissões |
|------|----------------|-----------|
| `admin` | ✅ | Tudo: CRM, billing, usuários, configurações |
| `manager` | ✅ | CRM completo, sem billing e sem gerenciar usuários |
| `user` | ✅ | Criar/visualizar CRM; sem deleção crítica |

---

## 🔐 Camadas de Segurança

### Camada 1 — `can_access_company(company_id)` (acesso básico ao tenant)
```sql
-- Qualquer membro ativo da empresa OU super_admin
SELECT EXISTS (
  SELECT 1 FROM user_company
  WHERE user_id = auth.uid()
    AND company_id = p_company_id
    AND active = true
) OR is_super_admin();
```
> Usado em: SELECT, INSERT, UPDATE de simulacoes, contacts, activities

### Camada 2 — `is_admin_of(company_id)` (operações críticas)
```sql
-- Somente admin da empresa OU super_admin
SELECT EXISTS (
  SELECT 1 FROM user_company
  WHERE user_id = auth.uid()
    AND company_id = p_company_id
    AND role = 'admin' AND active = true
) OR is_super_admin();
```
> Usado em: DELETE de simulacoes/contacts, UPDATE de company, gerenciar members

### Camada 3 — `is_super_admin()` (bypass total)
```sql
SELECT EXISTS (
  SELECT 1 FROM usuarios
  WHERE id = auth.uid() AND tipo = 'super_admin'
);
```
> Bypass em todas as RLS policies. Usar apenas para roles de plataforma.

---

## 📊 Funções Públicas (RBAC API)

| Função | Retorno | Uso |
|--------|---------|-----|
| `is_super_admin()` | `BOOLEAN` | Verifica bypass total |
| `get_user_role_in_company(uuid)` | `app_role` | Role do user na empresa |
| `is_admin_of(uuid)` | `BOOLEAN` | Verifica admin ou super_admin |
| `can_access_company(uuid)` | `BOOLEAN` | Base de acesso ao tenant |
| `setup_company_admin(company_id, user_id?)` | `void` | RPC de onboarding |

---

## 🗂️ Matriz de Permissões RLS

| Tabela | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| `simulacoes` | any member | any member | any member | admin/manager |
| `contacts` | any member | any member | any member | admin/manager |
| `activities` | any member | any member | — | — |
| `company` | member | authenticated | admin only | — |
| `user_company` | own + admin | self + admin | self + admin | admin only |
| `usuarios` | own + colleagues | — | own only | — |

> `super_admin` bypassa todas as regras acima via `is_super_admin()`.

---

## 🔄 Fluxos de Negócio

### Onboarding (Dentista cria conta)
```
1. auth.signUp() → cria auth.user
2. trigger handle_new_user() → cria usuarios{}
3. INSERT INTO company (name, ...) → cria empresa
4. RPC setup_company_admin(company_id) → vincula como admin em user_company
```

### Adicionar Funcionário
```
1. admin chama RPC ou INSERT INTO user_company
   {user_id, company_id, role: 'user' | 'manager'}
2. RLS permite: is_admin_of(company_id) = TRUE
```

### Proteção de Admin Único
```
Trigger trg_prevent_last_admin → prevent_last_admin_removal()
• Bloqueia DELETE do último admin
• Bloqueia UPDATE de role do último admin
• Lança EXCEPTION 'company_must_have_admin'
```

---

## 📱 View para Frontend

```typescript
// Empresas e roles do usuário logado
const { data } = await supabase.from('v_my_companies').select('*');
// Retorna: company_id, company_name, role, trial_ends_at, permissions

// Verificar role do usuário em empresa específica
const { data } = await supabase.rpc('get_user_role_in_company', {
  p_company_id: 'uuid-da-empresa'
});
// Retorna: 'admin' | 'manager' | 'user' | null
```

---

## ⚠️ Regras para Novas Features

Antes de criar qualquer funcionalidade, responda:

1. **`company_id`?** → Qual empresa possui este dado?
2. **Quem acessa?** → `can_access_company()` ou `is_admin_of()`?
3. **Qual role executa?** → `user`, `manager` ou `admin`?
4. **Auditoria?** → Inserir em `activities` com `created_by`?

---

## 🚫 Regras de Segurança

- ❌ **Nunca** usar `service_role` no frontend
- ❌ **Nunca** filtrar dados sem passar por RLS
- ❌ **Nunca** criar tabela de domínio sem `company_id NOT NULL`
- ✅ **Sempre** usar `can_access_company()` como base das RLS
- ✅ **Sempre** declarar `SET search_path = public` em funções SECURITY DEFINER
