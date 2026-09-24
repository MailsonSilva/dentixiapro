Concluí a investigação dos arquivos sob minha responsabilidade (migrations de RLS/storage, server actions e componentes de simulação). Identifiquei duas vulnerabilidades críticas de isolamento confirmadas com evidência.

---

### ISOLATION-001: Bucket `simulacoes` permanece público e expõe fotos de pacientes via URL
- **Severidade:** CRITICO
- **Arquivo(s):** supabase/migrations/20260702000000_storage_buckets_and_rls.sql:8 e supabase/migrations/20260707000000_security_fixes_rls_and_storage.sql:43
- **Trecho:**
  ```sql
  INSERT INTO storage.buckets (id, name, public)
  VALUES 
    ('dentixia', 'dentixia', true),
    ('simulacoes', 'simulacoes', true),
    ('logoEmpresa', 'logoEmpresa', true)
  ON CONFLICT (id) DO NOTHING;
  ```
  ```sql
  CREATE POLICY "Leitura restrita para simulacoes" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'simulacoes' 
    AND (
      (storage.foldername(name))[1] = auth.uid()::text 
      OR public.is_admin(auth.uid())
    )
  );
  ```
- **Impacto:** O bucket `simulacoes` armazena fotos médicas de pacientes (imagem original e imagem simulada por IA). Ele foi criado com `public = true` e **nunca foi alterado para privado**. A migration de "security fixes" apenas adicionou uma política RLS de SELECT, mas em buckets públicos do Supabase Storage os objetos são servidos diretamente pela URL pública/CDN, sem passar pela RLS. O próprio código da aplicação usa `getPublicUrl()` (`src/lib/simulacoes/actions.ts` e `src/lib/actions/simulacoes.ts`), gerando URLs acessíveis por qualquer pessoa que as obtenha. Isso anula o isolamento entre tenants/usuários e vaza dados sensíveis de saúde (fotos de pacientes) para qualquer um com o link.
- **Recomendacao:** Tornar o bucket privado: `UPDATE storage.buckets SET public = false WHERE id = 'simulacoes';` e passar a usar URLs assinadas (`createSignedUrl`) ou download autenticado via client Supabase. Manter a política RLS como defesa em profundidade para o acesso via Storage API. Revisar também o conteúdo do bucket `logoEmpresa` caso não deva ser intencionalmente público.

---

### ISOLATION-002: Auto-atualização da tabela `usuarios` permite escalar `tipo` para admin e acessar dados de outros tenants
- **Severidade:** CRITICO
- **Arquivo(s):** supabase/migrations/20260701000000_core_users_auth_and_security.sql:41 (política recriada em supabase/migrations/20260707000000_security_fixes_rls_and_storage.sql:30)
- **Trecho:**
  ```sql
  CREATE POLICY "Admins can update all users" 
  ON public.usuarios FOR UPDATE 
  TO authenticated 
  USING (
    auth.uid() = id OR public.is_admin(auth.uid())
  );
  ```
- **Impacto:** A política permite que qualquer usuário autenticado atualize a própria linha (`auth.uid() = id`), sem restrição de colunas e sem `WITH CHECK`. Como o Supabase concede UPDATE sobre as colunas das tabelas do schema `public` ao role `authenticated`, o usuário pode executar `UPDATE usuarios SET tipo = 'admin' WHERE id = auth.uid()`. A função `is_admin()` (SECURITY DEFINER) passa então a retornar `true`, liberando o acesso a dados de todos os usuários/tenants por meio das policies de SELECT de `usuarios`, `simulacoes`, `simulacao_tracking`, `user_company`, `customers` e `subscriptions`. Também permite alterar `trial_ends_at` (burlar paywall) e `is_blocked` (auto-desbloqueio).
- **Recomendacao:** Separar a política de self-update da política de admin e impedir alteração de colunas sensíveis. Ex.: revogar UPDATE nas colunas críticas (`REVOKE UPDATE (tipo, is_blocked, trial_ends_at, commission_rate, referral_code, referred_by_code) ON public.usuarios FROM authenticated;`), adicionar `WITH CHECK` explícito e/ou um trigger que impeça não-admins de alterar `tipo`. A política de admin deve usar apenas `USING (public.is_admin(auth.uid()))` para atualização de terceiros, e a auto-atualização deve ser limitada a campos de perfil (ex.: `nome_completo`, `telefone`, `logo_url`).

---

RELATORIO COMPLETO