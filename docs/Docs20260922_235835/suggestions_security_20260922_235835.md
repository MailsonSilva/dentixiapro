# Sugestões de Enriquecimento — SPECsecurity-20260922_235835

> Arquivo persistente de lacunas/sugestões. IDs sequenciais (E1, E2, ...). Status: PENDENTE | APROVADO | REJEITADO | APLICADO.

---

## CRITICO-001 — Bloquear auto-atualização de colunas sensíveis em `usuarios`

- **E1** [PENDENTE] [CRITICO-001] Conflito entre `REVOKE UPDATE (tipo, is_blocked, trial_ends_at, ...)` e a necessidade de admins alterarem essas colunas. O `REVOKE ... FROM authenticated` remove a permissão de UPDATE nas colunas para **todos** os usuários autenticados, inclusive admins. A SPEC não define como o admin continuará alterando `tipo`, `is_blocked` e `trial_ends_at` (ex.: `toggleBlockClientAction` em `admin/actions.ts` e a ação administrativa de CRITICO-004).
  Opcoes: a) manter o REVOKE e expor uma função SQL `SECURITY DEFINER`/RPC para admins; b) não usar REVOKE e confiar apenas em trigger + políticas; c) manter o REVOKE e fazer as escritas administrativas via client com service role.
  Sugestao: opcao a - REVOKE + RPC/função `SECURITY DEFINER` auditável; é a que preserva defesa em profundidade sem abrir UPDATE amplo.

- **E2** [PENDENTE] [CRITICO-001] "Campos de perfil não sensíveis" não está enumerado. A SPEC diz que self-update é permitido para `nome_completo`, `telefone`, `logo_url` "e demais campos não sensíveis", mas não lista as colunas permitidas nem decide sobre `email`, `empresa`, `cpf`, `PIX`.
  Opcoes: a) enumerar explicitamente as colunas permitidas; b) permitir todas exceto a lista revogada; c) definir lista por caso de uso.
  Sugestao: opcao a - enumerar `nome_completo`, `telefone`, `logo_url`, `empresa`, `cpf`, `PIX` e decidir `email` à parte (email provavelmente não deve ser auto-atualizável).

- **E3** [PENDENTE] [CRITICO-001] Escopo do trigger `before_update_usuarios_block_tipo` incompleto. O critério de aceite bloqueia `tipo`, `is_blocked`, `trial_ends_at`, `commission_rate`, `referral_code`, `referred_by_code`, mas o trigger descrito só protege `tipo`. Precisa definir se o trigger cobre todas as colunas sensíveis ou apenas `tipo` (assumindo que as demais ficam protegidas só pelo REVOKE).
  Opcoes: a) trigger cobre todas as colunas sensíveis; b) trigger só para `tipo`, demais via REVOKE; c) trigger para `tipo` e `is_blocked`/`trial_ends_at`.
  Sugestao: opcao a - trigger cobrindo todas as sensíveis, como segunda camada independente do REVOKE.

---

## CRITICO-002 — Autenticação obrigatória em `create-checkout`

- **E4** [PENDENTE] [CRITICO-002] A SPEC só rejeita a anon key como identidade. Precisa também rejeitar a service role key (e qualquer token que não seja JWT de usuário), além de separar o client de service role do client de autenticação.
  Opcoes: a) rejeitar anon e service role keys e criar o client de service role somente após a autorização; b) apenas rejeitar anon key; c) validar o tipo de token via claims.
  Sugestao: opcao a - rejeitar ambos e separar a criação do client de service role.

- **E5** [PENDENTE] [CRITICO-002] `return_url` aceito no corpo do `create-checkout` e usado em `success_url`/`cancel_url` sem validação (open redirect). MEDIO-014 só cobre `create-portal`. O `create-checkout` tem o mesmo vetor e não é tratado.
  Opcoes: a) aplicar a mesma allowlist de `return_url` ao `create-checkout`; b) remover `return_url` do payload e derivar URLs fixas no servidor; c) deixar como está (não recomendado).
  Sugestao: opcao a - unificar a validação de `return_url` nas duas edge functions.

- **E6** [PENDENTE] [CRITICO-002] O `catch` final retorna `err.message` com status 400, vazando detalhes internos (contradiz o critério "sem vazamento de detalhes internos"). Precisa padronizar resposta genérica e logar internamente.
  Opcoes: a) resposta genérica `{ error: "Erro interno" }` (500) e log detalhado; b) manter mensagem detalhada; c) mapear erros conhecidos.
  Sugestao: opcao a - mensagem genérica no cliente, detalhe só em log.

---

## CRITICO-003 — Bucket `simulacoes` privado e URLs assinadas

- **E7** [PENDENTE] [CRITICO-003] Não está definido o que persistir nas colunas `img_original_url`/`img_simulada_url` após o bucket ficar privado. Hoje são URLs públicas permanentes. Com URLs assinadas, elas expiram.
  Opcoes: a) persistir o path e gerar signed URL sob demanda; b) persistir signed URL com expiração e regerar; c) persistir path + gerar URLs no servidor em toda leitura (galeria/resultados).
  Sugestao: opcao c - persistir path e gerar signed URLs nas actions de leitura; evita dados expirados no banco e simplifica migração.

- **E8** [PENDENTE] [CRITICO-003] `expiresIn` das URLs assinadas e o comportamento de renovação/erro na UI não estão definidos (o `.env.example` sugere 3600s, mas não há critério de aceite).
  Opcoes: a) definir expiresIn (ex.: 3600s) e regerar a cada carregamento; b) definir valor maior e cache; c) usar download autenticado.
  Sugestao: opcao a - expiresIn curto (3600s) regerado a cada leitura no servidor.

- **E9** [PENDENTE] [CRITICO-003] Decisão sobre `logoEmpresa` (público vs privado) está aberta ("permanece público apenas se for intencional"). Precisa de decisão explícita e impacto: se privado, `uploadUserLogoAction`, `getUserProfileAction` e `api/perfil/upload-logo` precisam migrar de `getPublicUrl` para signed URL.
  Opcoes: a) manter `logoEmpresa` público (logos não são dados de saúde) e justificar; b) tornar privado e migrar para signed URLs; c) manter público, mas restringir SELECT por nome de arquivo.
  Sugestao: opcao a - manter público com justificativa documentada, desde que logos não contenham dados sensíveis; decidir explicitamente.

---

## CRITICO-004 — Remover auto-declaração de `tipo=parceiro`

- **E10** [PENDENTE] [CRITICO-004] `getClientLayoutDataAction` ainda contém auto-elevação ativa: `if (metaType === 'parceiro' && finalTipo !== 'parceiro') { await supabase.from('usuarios').update({ tipo: 'parceiro' }) }`. A SPEC cita "derivar tipo do banco", mas não explicita a remoção desse bloco, que reabriria a falha.
  Opcoes: a) remover o bloco de auto-elevação por metadata; b) manter apenas leitura; c) condicionar a uma flag administrativa.
  Sugestao: opcao a - remover o update e derivar `tipo` exclusivamente da tabela.

- **E11** [PENDENTE] [CRITICO-004] Fluxo/UX de `register/parceiros` pós-correção não definido. O formulário envia `tipo: "parceiro"` hoje. Precisa definir o que acontece com quem se cadastra como parceiro.
  Opcoes: a) cadastra como `comum` e exibe "aguarde aprovação"; b) cadastra como `comum` e gera solicitação/notificação ao admin; c) remove a rota de parceiro.
  Sugestao: opcao b - cria como `comum` e registra solicitação para aprovação administrativa.

- **E12** [PENDENTE] [CRITICO-004] Valores padrão de `commission_rate`/`commission_model` não estão fechados. A SPEC diz "padrão (10.0, commission_model padrão)", mas não define o valor de `commission_model`.
  Opcoes: a) `10.0` e `one_time`; b) `10.0` e `recurring`; c) `0.0` e `one_time`.
  Sugestao: opcao a - `10.0` e `one_time` (coerente com a migration `20260706000000` para usuário comum).

- **E13** [PENDENTE] [CRITICO-004] Contrato da ação administrativa de elevação não detalhado: quais campos podem ser alterados, validações, registro de auditoria e quem pode chamar.
  Opcoes: a) action protegida por `requireAdminAccess()` que altera `tipo`/`commission_rate`/`commission_model` e grava auditoria; b) apenas `tipo`; c) edge function com service role.
  Sugestao: opcao a - action protegida + auditoria (log de quem elevou quem e quando).

---

## ALTO-001 / ALTO-002 / ALTO-003 — Consolidação de migrations

- **E14** [PENDENTE] [ALTO-001/002/003] Consolidação via edição/remoção de migrations antigas não reaplica em ambientes já migrados e quebra o histórico de migrations do Supabase. Precisa definir que a consolidação ocorre em **nova migration** com `DROP POLICY`/`CREATE OR REPLACE VIEW`, mantendo as antigas intactas como histórico.
  Opcoes: a) nova migration com DROP das duplicatas; b) editar migrations antigas; c) função SQL idempotente.
  Sugestao: opcao a - nova migration com DROP + recriação canônica, sem editar arquivos antigos.

---

## ALTO-004 — Helper centralizado de papel de administrador

- **E15** [PENDENTE] [ALTO-004] Mistura de dois conceitos distintos: papel global de admin vs. autorização de acesso a uma company. `create-portal` hoje permite acesso a qualquer membro de `user_company` (qualquer role), não apenas admin. Aplicar `requireAdminAccess()` ao `create-portal` mudaria o comportamento e bloquearia membros legítimos.
  Opcoes: a) helper com duas funções: `getCurrentUserRole()` (global) e `canAccessCompany(userId, companyId)`; b) exigir admin global no portal; c) manter regra própria no portal.
  Sugestao: opcao a - separar os conceitos e usar `canAccessCompany` no `create-portal`.

- **E16** [PENDENTE] [ALTO-004] Precedência quando `usuarios.tipo` e `user_company.role` divergem não está definida. A SPEC diz "super_admin > admin > demais", mas não especifica a matriz completa (ex.: `tipo=admin` + `role=super_admin`; `tipo=comum` + `role=super_admin`).
  Opcoes: a) maior privilégio entre as duas fontes vence; b) `usuarios.tipo` tem precedência; c) `user_company.role` tem precedência.
  Sugestao: opcao a - maior privilégio vence (documentar matriz completa).

- **E17** [PENDENTE] [ALTO-004] Quais valores de `user_company.role` contam como admin não estão definidos. O schema usa `owner` como default e há divergência atual (`checkAdminAccessAction` só aceita `super_admin`; `getClientLayoutDataAction` aceita `super_admin`; `getUserProfileAction` aceita `admin`/`super_admin`).
  Opcoes: a) apenas `super_admin` em `user_company` é admin global; b) `admin` e `super_admin`; c) `owner`, `admin` e `super_admin`.
  Sugestao: opcao b - `admin` e `super_admin` (documentar e aplicar uniformemente).

---

## MEDIO-001 — IDOR em `getProfileCompanyAction`

- **E18** [PENDENTE] [MEDIO-001] A action tem fallbacks silenciosos (`return userId` quando não há service role/erro) que, após a correção, precisam virar erro explícito. Contrato de retorno também não está definido.
  Opcoes: a) retornar `{ company_id, error }` padronizado e derivar da sessão; b) lançar exceção em erro; c) manter fallback.
  Sugestao: opcao a - derivar da sessão e retornar erro explícito, sem fallback silencioso.

---

## MEDIO-002 — CORS nas edge functions

- **E19** [PENDENTE] [MEDIO-002] Comportamento para requisições sem `Origin` (server-to-server, ex.: chamadas da própria server action) e para preflight `OPTIONS` não definido. Também não define se origem não permitida recebe 403 ou apenas resposta sem header CORS.
  Opcoes: a) permitir sem Origin (não-browser) e bloquear browser com origem fora da allowlist via ausência de ACAO; b) 403 para origem fora da allowlist; c) exigir Origin sempre.
  Sugestao: opcao a - permitir server-to-server (sem Origin) e, para browser, retornar sem `Access-Control-Allow-Origin` quando fora da allowlist.

---

## MEDIO-003 — Autenticar `createCheckoutSessionAction`

- **E20** [PENDENTE] [MEDIO-003] Mecanismo para enviar o token de sessão do usuário não definido. A Server Action roda no servidor; precisa obter o access token via `supabase.auth.getSession()` (Supabase SSR) e revalidar na edge function. Também precisa definir que `company_id`/`email` sejam derivados do usuário no servidor, não do payload do cliente.
  Opcoes: a) obter access_token no servidor e derivar `company_id`/`email` da sessão/tabelas; b) enviar payload do cliente com token; c) usar service role direto na action.
  Sugestao: opcao a - token da sessão + derivação server-side de `company_id`/`email`.

- **E21** [PENDENTE] [MEDIO-003] Critérios de validação de `price_id` não especificados ("lista/planos válidos" é vago). Precisa definir o que é válido.
  Opcoes: a) `price_id` existe em `prices`, `active=true`, produto `active=true` e metadata status ativo; b) apenas existir em `prices`; c) allowlist fixa de IDs.
  Sugestao: opcao a - validar contra `prices`/`products` ativos e metadata de status.

---

## MEDIO-004 — Validação de `uploadUserLogoAction`

- **E22** [PENDENTE] [MEDIO-004] "Base64 inválido rejeitado" é frágil: `Buffer.from(str, "base64")` é leniente e não lança erro para caracteres inválidos. Precisa definir método de validação estrita e o limite exato (antes ou depois da decodificação).
  Opcoes: a) validar regex/roundtrip de base64 + limite de 3MB no buffer decodificado; b) só checar buffer não vazio; c) usar lib de decodificação estrita.
  Sugestao: opcao a - validação estrita + limite de 3MB no buffer decodificado.

- **E23** [PENDENTE] [MEDIO-004] O `mimeType` enviado pelo cliente é usado como fonte de verdade (`allowedMimeTypes.includes(mimeType) ? mimeType : ...`). Precisa derivar o MIME dos magic bytes e ignorar o parâmetro do cliente.
  Opcoes: a) detectar MIME pelos magic bytes e usar o detectado; b) usar o parâmetro após allowlist; c) combinar ambos.
  Sugestao: opcao a - MIME detectado dos magic bytes, ignorando o parâmetro do cliente.

---

## MEDIO-005 — Uploads atômicos em `saveSimulationAction`

- **E24** [PENDENTE] [MEDIO-005] Ordem atômica concreta e limite único de tamanho não definidos. O fluxo Gemini (`gerarSimulacaoNativa`) usa 4MB; a rota de logo usa 3MB. Precisa definir limite único e a sequência exata (upload → insert → compensação vs. insert → upload).
  Opcoes: a) validar magic bytes + limite 4MB, upload sequencial com compensação/limpeza em `catch`; b) insert antes dos uploads com status pendente; c) manter paralelo com limpeza.
  Sugestao: opcao a - limite 4MB único, upload sequencial e compensação no `catch`.

---

## MEDIO-013 — Helper `requireUser()`

- **E25** [PENDENTE] [MEDIO-013] Assinatura única do helper não definida (retorno `{ user, error }` vs. exceção). As actions hoje misturam os dois padrões, então a migração precisa de contrato claro para não quebrar páginas.
  Opcoes: a) `requireUser()` retorna `{ user, error }`; b) lança exceção; c) dois helpers (`getSessionUser` + `requireUser`).
  Sugestao: opcao c - `getSessionUser()` (retorno) + `requireUser()` (exceção) para cobrir os dois padrões atuais.

---

## MEDIO-014 — Open redirect via `return_url` em `create-portal`

- **E26** [PENDENTE] [MEDIO-014] Fallback exato e regras de validação (URL relativa vs absoluta, subdomínios) não definidos. E a mesma validação precisa valer para `create-checkout` (E5).
  Opcoes: a) aceitar apenas URLs absolutas HTTPS cujo hostname esteja na allowlist, fallback `https://app.dentixia.com/perfil`; b) aceitar também relativas; c) forçar sempre URL fixa.
  Sugestao: opcao a - allowlist estrita + fallback fixo, aplicada a `create-portal` e `create-checkout`.

---

## BAIXO-001 — Mensagens genéricas (enumeração)

- **E27** [PENDENTE] [BAIXO-001] A SPEC foca nas páginas (client), mas as Server Actions (`signInWithPasswordAction`, `resetPasswordForEmailAction`, `signUpAction`) também retornam mensagens distintas e são invocáveis diretamente. Precisa padronizar no servidor.
  Opcoes: a) padronizar mensagens nas actions + páginas; b) só nas páginas; c) só nas actions.
  Sugestao: opcao a - padronizar no servidor (source of truth) e simplificar as páginas.

---

## BAIXO-002 — Política de senha forte

- **E28** [PENDENTE] [BAIXO-002] Mínimo ambíguo ("8–12") e validação apenas client-side. Precisa definir valor exato, regra de complexidade e validação server-side no signup/redefinição (e alinhar com a política do Supabase Auth, se configurável).
  Opcoes: a) mínimo 8 + maiúscula/minúscula/número/símbolo, validado no servidor; b) mínimo 10 + 3 de 4 classes; c) manter 6.
  Sugestao: opcao a - mínimo 8 com 4 classes e validação server-side.

---

## BAIXO-004 — Restringir leitura de `system_settings`

- **E29** [PENDENTE] [BAIXO-004] Confirmar que nenhum fluxo anônimo lê `system_settings` antes de restringir a `authenticated`. `getPublicWelcomeVideoUrlAction` é chamada apenas autenticado, mas precisa validar que a página de login/landing não depende de `welcome_video_url` anonimamente.
  Opcoes: a) confirmar e restringir SELECT a `authenticated`; b) manter pública só a chave `welcome_video_url`; c) expor via RPC.
  Sugestao: opcao a - confirmar uso e restringir a `authenticated`.

---

## BAIXO-005 — `middleware.ts`

- **E30** [PENDENTE] [BAIXO-005] Matchers exatos e comportamento para usuário autenticado **não-admin** em `/admin` não definidos (a SPEC só cobre não autenticado). Precisa definir rotas protegidas vs públicas e o código de resposta/redirect para não-admin.
  Opcoes: a) `/admin` exige admin (403/redirect para home); `/perfil` exige autenticação; b) middleware só checa sessão; c) só redireciona não autenticados.
  Sugestao: opcao a - middleware checa sessão e papel para `/admin`, mantendo actions como segunda camada.

---

## BAIXO-008 — Consolidar `handle_new_user()`

- **E31** [PENDENTE] [BAIXO-008] Consolidação deve ocorrer em nova migration (não editar antigas) e incorporar CRITICO-004 (`tipo='comum'`, padrões) e BAIXO-003 (`SET search_path`). A ordem de dependência entre essas features precisa ficar explícita.
  Opcoes: a) nova migration final consolidada que substitui a função e o trigger; b) editar a `20260706000000`; c) duas migrations separadas.
  Sugestao: opcao a - uma nova migration consolidada dependente de CRITICO-004/BAIXO-003.

---

## BAIXO-009 — Código de indicação criptográfico

- **E32** [PENDENTE] [BAIXO-009] Dualidade de formato: `handle_new_user` gera `referral_code` como 8 hex (MD5), enquanto `getReferralDataAction` gera `DT######`. Precisa unificar o formato canônico e decidir quando o código é gerado.
  Opcoes: a) sempre `DT######` gerado no cadastro com `crypto.randomInt` + UNIQUE/retry; b) deixar `referral_code` nulo no cadastro e gerar no primeiro acesso ao indique-e-ganhe; c) manter hex.
  Sugestao: opcao b - gerar `DT######` sob demanda (único ponto de geração) com UNIQUE/retry, evitando dualidade.

---

## BAIXO-011 — Persistir `check_video`

- **E33** [PENDENTE] [BAIXO-011] Existe um estado `dontShowAgain` no `ClientLayout` que não é usado no fechamento do modal. A SPEC manda chamar `setCheckVideoAction(true)` sempre ao fechar; precisa alinhar com o checkbox "não mostrar novamente" (se houver) para não sobrescrever a intenção do usuário.
  Opcoes: a) respeitar `dontShowAgain` e persistir apenas quando marcado; b) sempre persistir `true` ao fechar; c) remover o checkbox.
  Sugestao: opcao a - persistir `check_video` conforme o checkbox/flag de "não mostrar novamente".

---

## BAIXO-012 — Ordem de remoção em `deleteSimulationAction`

- **E34** [PENDENTE] [BAIXO-012] A extração de path usa `url.split('/public/${bucket}/')`. Com bucket privado e URLs assinadas (CRITICO-003), o formato da URL muda e o split quebra. Precisa definir extração robusta de path (ou persistir path separado).
  Opcoes: a) persistir path no banco e usar o path direto; b) parsear signed URL para extrair o path; c) manter split e ajustar regex.
  Sugestao: opcao a - persistir/derivar path separado da URL (alinhado com E7).

---

## BAIXO-013 — Fail-closed em `getClientLayoutDataAction`

- **E35** [PENDENTE] [BAIXO-013] Tratar `statusData === null` como fail-closed é necessário, mas também precisa cobrir `statusData` sem `status_code` e definir a ação de sincronização/criação do perfil antes de liberar acesso.
  Opcoes: a) `trialExpired = true` quando null/undefined e disparar sync do perfil; b) apenas `true` quando null; c) redirecionar para fluxo de cadastro.
  Sugestao: opcao a - fail-closed para null/undefined + sync de perfil antes de liberar.

---

## BAIXO-014 — Restringir leitura de `notifications_history`

- **E36** [PENDENTE] [BAIXO-014] A lógica de público-alvo na action `getUserNotificationsAction` não inclui `subscribers` (apenas `all`, `new_users`, `trial`, `inactive`). A RLS também não consegue replicar facilmente a lógica de trial/subscribers com subqueries. Precisa definir abordagem (RPC vs policy) e corrigir a segmentação.
  Opcoes: a) criar RPC com lógica de autorização e remover SELECT direto para `authenticated`; b) policy com subqueries; c) manter policy + corrigir action.
  Sugestao: opcao a - RPC autoritativa + sem SELECT direto, e incluir `subscribers` na segmentação.

---

## BAIXO-015 — Validar URLs em `salvarSimulacaoConfirmada`

- **E37** [PENDENTE] [BAIXO-015] Com URLs assinadas (CRITICO-003), validar "origem da URL" fica frágil. Melhor mudar o contrato para receber paths/chaves e reconstruir URLs no servidor.
  Opcoes: a) `salvarSimulacaoConfirmada` recebe paths e monta/valida no servidor; b) validar prefixo de domínio/path; c) manter URLs e validar bucket.
  Sugestao: opcao a - receber paths e reconstruir no servidor (mais robusto e alinhado a E7/E34).

---

## Checklist / .env

- **E38** [PENDENTE] [GERAL/.env] Inconsistência de variável do webhook: a SPEC lista `STRIPE_WEBHOOK_SECRET`, mas o código usa `STRIPE_WEBHOOK_SIGNING_SECRET`. Além disso, não há feature dedicada à verificação de assinatura do webhook (apenas item de checklist), embora `stripe-webhook` já implemente verificação manual de HMAC.
  Opcoes: a) padronizar o nome da env e adicionar feature/verificação explícita da assinatura do webhook; b) só corrigir o nome; c) manter como checklist.
  Sugestao: opcao a - padronizar env e documentar/validar a verificação de assinatura como aceite.

---

## Consistência com CRITICO-001 (escritas via client authenticated)

- **E39** [PENDENTE] [CRITICO-001/CRITICO-004] `saveUserPhoneAction` faz `upsert` incluindo `tipo: "comum"` e `trial_ends_at` via client `authenticated`. Após o `REVOKE UPDATE` dessas colunas, esse upsert falhará (permission denied) e quebrará o fluxo de completar cadastro. Precisa ajustar as actions que gravam colunas sensíveis via client comum.
  Opcoes: a) remover `tipo`/`trial_ends_at` do upsert de `saveUserPhoneAction`; b) usar RPC/service role para o auto-sync; c) manter e capturar erro.
  Sugestao: opcao a - remover colunas sensíveis dos upserts de auto-sync e criar perfil sem sobrescrevê-las.

---

## UI / estados de erro com URLs assinadas

- **E40** [PENDENTE] [CRITICO-003/UI] A galeria/resultados renderizam `<img src={url}>` diretamente. Com URLs assinadas que podem expirar/falhar, não há definição de estado de erro/fallback/loading para imagens quebradas ou URL expirada.
  Opcoes: a) gerar signed URLs no servidor a cada leitura e adicionar fallback/estado de erro na UI; b) cachear e aceitar quebra; c) usar download autenticado.
  Sugestao: opcao a - regerar signed URLs no servidor e tratar erro/fallback na UI.
