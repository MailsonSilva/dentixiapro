Analisei os arquivos sob minha responsabilidade e identifiquei as seguintes duplicações reais (blocos com mais de 10 linhas similares, lógica repetida e violações de DRY). Segue o relatório.

---

### DUPLICATION-001: Políticas RLS de `usuarios` duplicadas em duas migrations
- **Severidade:** ALTO
- **Arquivo(s):** supabase/migrations/20260701000000_core_users_auth_and_security.sql:28-46 e supabase/migrations/20260707000000_security_fixes_rls_and_storage.sql:25-38
- **Trecho:**
  ```sql
  -- 20260701000000
  CREATE POLICY "Admins can read all users"
  ON public.usuarios FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR public.is_admin(auth.uid())
  );

  CREATE POLICY "Admins can update all users"
  ON public.usuarios FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id OR public.is_admin(auth.uid())
  );

  -- 20260707000000 (idêntico)
  CREATE POLICY "Admins can read all users"
  ON public.usuarios FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR public.is_admin(auth.uid())
  );

  CREATE POLICY "Admins can update all users"
  ON public.usuarios FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id OR public.is_admin(auth.uid())
  );
  ```
- **Impacto:** Lógica de isolamento de tenants/segurança replicada em dois pontos. Correções futuras de RLS podem ser aplicadas em apenas uma migration e esquecidas na outra, deixando a tabela `usuarios` exposta ou com política inconsistente entre ambientes. Como a migration de segurança posterior recria as mesmas políticas, qualquer ajuste de regra de acesso fica frágil.
- **Recomendacao:** Centralizar a criação das políticas em uma única migration base e, nas migrations posteriores, apenas fazer `DROP`/`CREATE` quando a regra realmente mudar. Alternativamente, criar uma função SQL única (`apply_usuarios_rls_policies`) e reutilizá-la.

---

### DUPLICATION-002: Políticas RLS de `simulacoes` duplicadas em duas migrations
- **Severidade:** ALTO
- **Arquivo(s):** supabase/migrations/20260703000000_simulacoes_and_tracking.sql:35-55 e supabase/migrations/20260707000000_security_fixes_rls_and_storage.sql:53-73
- **Trecho:**
  ```sql
  -- 20260703000000
  CREATE POLICY "Admins can read all simulacoes"
  ON public.simulacoes FOR SELECT
  TO authenticated
  USING (
    usuario_id = auth.uid() OR public.is_admin(auth.uid())
  );

  CREATE POLICY "Users can delete own simulacoes"
  ON public.simulacoes FOR DELETE
  TO authenticated
  USING (
    usuario_id = auth.uid() OR public.is_admin(auth.uid())
  );

  -- 20260707000000 (recria as mesmas duas políticas)
  CREATE POLICY "Admins can read all simulacoes"
  ON public.simulacoes FOR SELECT
  TO authenticated
  USING (
    usuario_id = auth.uid() OR public.is_admin(auth.uid())
  );

  CREATE POLICY "Users can delete own simulacoes"
  ON public.simulacoes FOR DELETE
  TO authenticated
  USING (
    usuario_id = auth.uid() OR public.is_admin(auth.uid())
  );
  ```
- **Impacto:** Regras de acesso a imagens/simulações de pacientes (dados sensíveis) duplicadas. Divergência entre as duas versões pode causar permissão excessiva (leitura/deleção de simulações de outros usuários) ou bloqueio indevido, com risco direto à privacidade dos pacientes.
- **Recomendacao:** Manter a definição das políticas em um único arquivo de migração e remover a recriação redundante na migration de segurança; se for necessário alterar, alterar a política existente (ex.: `CREATE OR REPLACE POLICY` não existe no Postgres, então usar `DROP` + `CREATE` apenas quando a condição muda).

---

### DUPLICATION-003: View `verificar_status_usuario` inteiramente duplicada em duas migrations
- **Severidade:** ALTO
- **Arquivo(s):** supabase/migrations/20260705000000_subscriptions_and_status_view.sql:58-116 e supabase/migrations/20260707000000_security_fixes_rls_and_storage.sql:76-135
- **Trecho:**
  ```sql
  -- 20260705000000
  CREATE OR REPLACE VIEW public.verificar_status_usuario AS
   SELECT u.id AS user_id,
      COALESCE((uc.company_id)::text, (u.id)::text, 'novo_usuario'::text) AS company_id,
      ...
      WHERE (u.id = auth.uid());

  -- 20260707000000 (mesma view, ~50 linhas idênticas, apenas para refletir is_admin)
  CREATE OR REPLACE VIEW public.verificar_status_usuario AS
   SELECT u.id AS user_id,
      COALESCE((uc.company_id)::text, (u.id)::text, 'novo_usuario'::text) AS company_id,
      ...
      WHERE (u.id = auth.uid());
  ```
- **Impacto:** A view decide `status_code`/`dias_restantes` (liberação de acesso ao app e paywall). Ter a mesma regra de negócio/semântica de acesso em dois lugares aumenta o risco de a versão "antiga" ser usada como referência em manutenção, causando divergência entre o que libera o trial e o que a aplicação espera. Correção em uma cópia pode não ser refletida na outra.
- **Recomendacao:** Manter uma única definição da view (de preferência na migration mais recente) e eliminar a cópia anterior. Para alterações futuras, executar `CREATE OR REPLACE VIEW` apenas no local canônico.

---

### DUPLICATION-004: Resolução de papel de administrador replicada em múltiplas actions
- **Severidade:** ALTO
- **Arquivo(s):** src/lib/admin/actions.ts:97-132, src/lib/auth/actions.ts:118-145, src/lib/perfil/actions.ts:52-75, supabase/functions/create-portal/index.ts:69-92
- **Trecho:**
  ```typescript
  // admin/actions.ts - checkAdminAccessAction
  const { data: usuarioData, error: uError } = await supabase
    .from("usuarios").select("tipo").eq("id", user.id).maybeSingle();
  if (!uError && usuarioData) {
    const tipo = (usuarioData.tipo || "").toLowerCase();
    if (tipo === "admin" || tipo === "super_admin") {
      return { isAdmin: true, userId: user.id, error: null };
    }
  }
  const { data: ucData } = await supabase
    .from("user_company").select("role").eq("user_id", user.id).eq("active", true).maybeSingle();
  if (ucData && ucData.role === "super_admin") {
    return { isAdmin: true, userId: user.id, error: null };
  }

  // auth/actions.ts - getClientLayoutDataAction
  const uTipo = (usuarioData?.tipo || "").toLowerCase();
  const ucRole = (ucData?.role || "").toLowerCase();
  const isSuperAdmin = uTipo === 'super_admin' || ucRole === 'super_admin';
  const isAdmin = isSuperAdmin || uTipo === 'admin';

  // perfil/actions.ts - getUserProfileAction
  const userRole = (uTipo === 'admin' || uTipo === 'super_admin')
    ? uTipo
    : (ucRole === 'admin' || ucRole === 'super_admin' ? ucRole : (ucRole || uTipo || null));

  // supabase/functions/create-portal/index.ts
  const userTipo = (userData?.tipo || "").toLowerCase();
  if (userTipo === "admin" || userTipo === "super_admin") {
    hasCompanyAccess = true;
  }
  ```
- **Impacto:** A definição de quem é admin está espalhada por 4 implementações com regras ligeiramente diferentes (umas verificam `user_company.role = 'super_admin'`, outras aceitam `admin` em `user_company`, outras só `usuarios.tipo`). Se uma regra de segurança mudar, é fácil corrigir apenas um arquivo e deixar outro validando permissão incorretamente — abrindo brecha de acesso indevido ao painel admin ou ao portal de cobrança.
- **Recomendacao:** Criar um helper único (ex.: `getCurrentUserRole()` / `requireAdminAccess()` em `src/lib/auth/roles.ts`) que consulte `usuarios.tipo` + `user_company.role` de forma centralizada e reutilizá-lo em todas as actions e na Edge Function.

---

### DUPLICATION-005: `AdminNotificationsTab` e `AdminNotificationsModal` são cópias quase integrais
- **Severidade:** MEDIO
- **Arquivo(s):** src/components/admin/AdminNotificationsTab.tsx:1-350 e src/components/admin/AdminNotificationsModal.tsx:1-380
- **Trecho:**
  ```typescript
  // AdminNotificationsTab.tsx
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<NotificationCategory>("comum");
  const [targetAudience, setTargetAudience] = useState<NotificationTargetAudience>("all");
  // ... cálculo de audiência, fetchHistory, handleOpenConfirm, handleSendNotification
  const categories = [
    { id: "comum", label: "Comum / Geral", icon: Info, ... },
    { id: "aviso", label: "Aviso Importante", ... },
  ];
  const audiences = [
    { id: "all", label: "Todos os Usuários", ... },
    { id: "new_users", label: "Novos Usuários", ... },
  ];

  // AdminNotificationsModal.tsx (mesma lógica, mesmos estados, mesmas listas)
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<NotificationCategory>("comum");
  const [targetAudience, setTargetAudience] = useState<NotificationTargetAudience>("all");
  const categories = [
    { id: "comum", label: "Comum / Geral", icon: Info, ... },
    { id: "aviso", label: "Aviso Importante", ... },
  ];
  ```
- **Impacto:** Dois componentes com a mesma regra de disparo de notificações (validação de título 60 chars, segmentos, cálculo de destinatários, histórico, modal de confirmação). Alterações de regra de negócio (ex.: novo segmento ou limite de título) precisam ser feitas em dois lugares; risco de comportamento divergente entre a aba admin e o modal.
- **Recomendacao:** Extrair a lógica de formulário/disparo/histórico para um componente único (ex.: `NotificationsCenter`) e usar apenas um wrapper de apresentação (aba ou modal), evitando manter duas implementações em paralelo.

---

### DUPLICATION-006: Páginas `register` e `register/parceiros` compartilham formulário, máscara e modais legais copiados
- **Severidade:** MEDIO
- **Arquivo(s):** src/app/register/page.tsx:46-600 e src/app/register/parceiros/page.tsx:40-480
- **Trecho:**
  ```typescript
  // register/page.tsx
  const handleWhatsappChange = (e) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
    let masked = digits;
    if (digits.length > 2) masked = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length > 7) {
      const body = digits.length === 11
        ? `${digits.slice(2, 7)}-${digits.slice(7)}`
        : `${digits.slice(2, 6)}-${digits.slice(6)}`;
      masked = `(${digits.slice(0, 2)}) ${body}`;
    }
    setWhatsapp(masked);
  };

  // register/parceiros/page.tsx (idêntico)
  const handleWhatsappChange = (e) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
    let masked = digits;
    if (digits.length > 2) masked = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length > 7) {
      const body = digits.length === 11
        ? `${digits.slice(2, 7)}-${digits.slice(7)}`
        : `${digits.slice(2, 6)}-${digits.slice(6)}`;
      masked = `(${digits.slice(0, 2)}) ${body}`;
    }
    setWhatsapp(masked);
  };
  ```
  O modal de **Política de Privacidade** (~100 linhas) também está copiado integralmente nos dois arquivos.
- **Impacto:** Fluxo de cadastro duplicado (campos, validação de senha/termos e modais legais). A LGPD exige que os textos de privacidade/termos estejam consistentes; hoje qualquer atualização legal precisa ser feita em duas páginas, com alto risco de ficarem divergentes.
- **Recomendacao:** Criar componentes compartilhados (`RegistrationForm`, `PrivacyPolicyModal`, `TermsModal`) parametrizados por `tipo` (`comum`/`parceiro`) e reutilizá-los nas duas rotas.

---

### DUPLICATION-007: Upload de logo implementado em action e em route handler com a mesma lógica
- **Severidade:** MEDIO
- **Arquivo(s):** src/lib/perfil/actions.ts:175-233 e src/app/api/perfil/upload-logo/route.ts:11-95
- **Trecho:**
  ```typescript
  // perfil/actions.ts - uploadUserLogoAction
  const allowedExtensions = ["png", "jpg", "jpeg", "webp", "gif"];
  const sanitizedExt = (fileExt || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!sanitizedExt || !allowedExtensions.includes(sanitizedExt)) {
    return { error: "Extensão de imagem inválida...", url: null };
  }
  const path = `${user.id}.${sanitizedExt}`;
  const buffer = Buffer.from(base64Data, "base64");
  await supabase.storage.from("logoEmpresa").upload(path, buffer, { upsert: true, ... });
  await supabase.from("usuarios").update({ logo_url: publicUrl }).eq("id", user.id);

  // app/api/perfil/upload-logo/route.ts
  const MAX_SIZE = 3 * 1024 * 1024;
  if (file.size > MAX_SIZE) { ... }
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) { ... }
  const path = `${user.id}.${ext}`;
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  await supabase.storage.from("logoEmpresa").upload(path, fileBuffer, { upsert: true, ... });
  await supabase.from("usuarios").update({ logo_url: publicUrl }).eq("id", user.id);
  ```
- **Impacto:** Dois caminhos de upload para o mesmo recurso (`logoEmpresa`) com validações diferentes (a action valida extensão e aceita base64; a rota valida tamanho/MIME). Isso pode permitir que uma validação mais fraca seja explorada (ex.: tipos ou tamanhos não cobertos) e dificulta auditoria do que realmente é aceito no bucket.
- **Recomendacao:** Manter apenas um ponto de upload (preferencialmente a server action) e fazer a página consumir essa action, removendo o route handler ou fazendo-o delegar à mesma função de serviço compartilhada.

---

### DUPLICATION-008: Persistência de simulação e conversão de base64 duplicadas entre actions
- **Severidade:** MEDIO
- **Arquivo(s):** src/lib/simulacoes/actions.ts:7-16 e 24-95, src/lib/actions/simulacoes.ts:287-345
- **Trecho:**
  ```typescript
  // simulacoes/actions.ts - saveSimulationAction
  const bufferOriginal = base64ToBuffer(imgOriginalBase64);
  const bufferSimulado = base64ToBuffer(imgSimuladaBase64);
  // ... uploads e depois:
  await supabaseServer.from("simulacoes").insert({
    usuario_id: userId,
    procedimento: procedure,
    img_original_url: originalUrl,
    img_simulada_url: simuladaUrl,
    nome_paciente: patientName,
    cor_utilizada: colorHex,
  });

  // lib/actions/simulacoes.ts - salvarSimulacaoConfirmada
  const { error: dbError } = await supabase.from("simulacoes").insert({
    usuario_id: user.id,
    procedimento: procedimento,
    img_original_url: urlOriginal,
    img_simulada_url: urlSimulada,
    nome_paciente: nomePaciente.trim(),
    cor_utilizada: corUtilizada,
  });
  ```
- **Impacto:** Dois fluxos de gravação em `simulacoes` com campos idênticos e comportamentos distintos (um incrementa `total_salvas` via RPC, o outro não). Isso já gera inconsistência de métricas e cria dois lugares para manter a mesma regra de persistência. A função `base64ToBuffer` (actions.ts) também replica a conversão inline existente em `perfil/actions.ts`.
- **Recomendacao:** Unificar em uma única função de persistência (`saveSimulationRecord`) usada pelos dois fluxos, centralizando validação de campos, insert e incremento de estatísticas.

---

### DUPLICATION-009: Padrão de guarda de autenticação copiado em diversas server actions
- **Severidade:** MEDIO
- **Arquivo(s):** src/lib/auth/actions.ts:6-10, 43-45, 143-145, src/lib/perfil/actions.ts:35-40, 146-150, 177-182, src/lib/planos/actions.ts:41-44, src/lib/indique-e-ganhe/actions.ts:8-12, src/lib/simulacoes/queries.ts:15-20, src/lib/actions/simulacoes.ts:78-86 e 300-305, src/lib/admin/actions.ts:100-106 e 527-533
- **Trecho:**
  ```typescript
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Não autenticado", data: null };
  }
  ```
- **Impacto:** O guarda de autenticação está replicado em mais de 10 ações de servidor com pequenas variações (algumas lançam exceção, outras retornam `error`, mensagens diferentes). É o tipo de lógica de segurança que, se precisar mudar (ex.: tratamento de sessão expirada, log de tentativa, bloqueio de usuário), precisará ser alterada em todos os pontos; a inconsistência pode fazer com que uma action continue aceitando chamadas sem o mesmo rigor.
- **Recomendacao:** Criar um helper centralizado `requireUser()` / `getSessionUser()` em `src/lib/auth/` que retorne o usuário autenticado ou um erro padronizado, e substituir os blocos repetidos em todas as actions.

---

### DUPLICATION-010: Máscara de telefone/WhatsApp duplicada em quatro componentes
- **Severidade:** BAIXO
- **Arquivo(s):** src/components/ClientLayout.tsx:206-218, src/app/register/page.tsx:52-66, src/app/register/parceiros/page.tsx:36-50, src/app/perfil/page.tsx:530-538
- **Trecho:**
  ```typescript
  const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
  let masked = digits;
  if (digits.length > 2) masked = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length > 7) {
    const body = digits.length === 11
      ? `${digits.slice(2, 7)}-${digits.slice(7)}`
      : `${digits.slice(2, 6)}-${digits.slice(6)}`;
    masked = `(${digits.slice(0, 2)}) ${body}`;
  }
  ```
- **Impacto:** Código utilitário repetido, com variações (a versão de `perfil` adiciona um passo extra para 11 dígitos que produz máscara inconsistente). Dificulta padronizar o formato aceito para WhatsApp em toda a aplicação.
- **Recomendacao:** Extrair `maskPhone(value: string): string` para `src/lib/utils.ts` (ou módulo de formatação) e reutilizar nos quatro pontos.

---

### DUPLICATION-011: Condições idênticas nas políticas de storage `logoEmpresa` (INSERT/UPDATE/DELETE)
- **Severidade:** BAIXO
- **Arquivo(s):** supabase/migrations/20260702000000_storage_buckets_and_rls.sql:61-105
- **Trecho:**
  ```sql
  -- Logo INSERT proprio usuario
  WITH CHECK (
    bucket_id = 'logoEmpresa'
    AND auth.role() = 'authenticated'
    AND (
      split_part(name, '.', 1) = auth.uid()::text
      OR
      (storage.foldername(name))[1] = auth.uid()::text
    )
  );

  -- Logo UPDATE proprio usuario (mesma condição)
  USING (
    bucket_id = 'logoEmpresa'
    AND auth.role() = 'authenticated'
    AND (
      split_part(name, '.', 1) = auth.uid()::text
      OR
      (storage.foldername(name))[1] = auth.uid()::text
    )
  );

  -- Logo DELETE proprio usuario (mesma condição)
  USING (
    bucket_id = 'logoEmpresa'
    AND auth.role() = 'authenticated'
    AND (
      split_part(name, '.', 1) = auth.uid()::text
      OR
      (storage.foldername(name))[1] = auth.uid()::text
    )
  );
  ```
- **Impacto:** A mesma regra de propriedade de arquivo é repetida três vezes no mesmo arquivo. Uma correção de segurança (ex.: permitir admins removerem logos) precisaria ser replicada manualmente nas três políticas, com risco de esquecimento.
- **Recomendacao:** Criar uma função SQL auxiliar (ex.: `public.can_access_logo_object(name text)`) que encapsule a condição e referenciá-la nas três políticas.

---

### DUPLICATION-012: `handle_new_user()` redefinida com lógica de consentimento e lookup de e-mail duplicada
- **Severidade:** BAIXO
- **Arquivo(s):** supabase/migrations/20260701000000_core_users_auth_and_security.sql:70-133 e supabase/migrations/20260706000000_cleanup_and_referral_fix.sql:30-112
- **Trecho:**
  ```sql
  -- 20260701000000
  SELECT id INTO existing_user_id FROM public.usuarios WHERE email = new.email LIMIT 1;
  IF existing_user_id IS NULL THEN
    INSERT INTO public.usuarios (...) VALUES (...);
    existing_user_id := new.id;
  END IF;
  SELECT EXISTS(SELECT 1 FROM public.consentimentos WHERE user_id = existing_user_id) INTO has_consent;
  IF NOT has_consent THEN
    INSERT INTO public.consentimentos (user_id, aceitou_em, versao_politica) VALUES (existing_user_id, now(), '1.0');
  END IF;

  -- 20260706000000 (mesma lógica de busca por e-mail + garantia de consentimento)
  SELECT id INTO existing_user_id FROM public.usuarios WHERE email = new.email LIMIT 1;
  IF existing_user_id IS NULL THEN
    INSERT INTO public.usuarios (...) VALUES (...);
    existing_user_id := new.id;
  END IF;
  SELECT EXISTS(SELECT 1 FROM public.consentimentos WHERE user_id = existing_user_id) INTO has_consent;
  IF NOT has_consent THEN
    INSERT INTO public.consentimentos (user_id, aceitou_em, versao_politica) VALUES (existing_user_id, now(), '1.0');
  END IF;
  ```
- **Impacto:** A função de trigger `handle_new_user` é redefinida por completo com a mesma base de lógica. A existência de duas versões históricas grandes dificulta entender qual é a regra vigente de criação de usuário/consentimento e aumenta a chance de manutenção na versão errada.
- **Recomendacao:** Consolidar a definição final de `handle_new_user()` em uma única migration e remover a duplicação da versão anterior (ou reduzir a segunda a um `CREATE OR REPLACE` que altere apenas os trechos realmente novos, reutilizando funções auxiliares para consentimento).

---

RELATORIO COMPLETO