# I3 — roteiro completo dos campos Google OAuth

**Marco posterior:** primeiro login Google real confirmado no UUID pré-cadastrado, sem conta duplicada ou dados financeiros. [Evidência e teste seguinte](RESULTADO_PRIMEIRO_LOGIN_I3.md). Não repetir criação de cliente, configuração de provedor ou pré-cadastro.

**Resultado atual — 27/10/2026:** usuário salvou e GET confirmou somente Google habilitado, cadastro fechado e bloqueio financeiro preservado. [Evidência e próximo login](PRIMEIRO_LOGIN_GOOGLE_I3.md). Não repetir preenchimento/ativação. Client ID/Secret/JSON fornecidos na conversa não integram arquivos ou Git. Tela local de teste preparada somente por variáveis no processo; OAuth interceptado em QA, sem login real. Próxima ação para aprovação é vincular a identidade Google ao mesmo usuário por primeiro login pessoal.

**Autorização atual — 27/10/2026:** usuário respondeu `vamos` à proposta específica de configurar/habilitar somente o Google com o cliente existente, mantendo cadastro público e escrita financeira desligados. Autorização vigente; não pedir novamente. A leitura imediatamente posterior ainda mostrou Google e todos os métodos retornados desligados. Projeto ativo/Free, conta/autorização única exata preservada, zero logins/identidades Google e sete tabelas privadas vazias. **Salvamento no painel ainda não realizado ou confirmado.** Conector sem comando de configuração do provedor: usuário preencherá os campos e salvará diretamente no painel oficial, sem segredo no chat. Próxima ação do agente após conclusão: leituras de verificação, sem repetir ativação ou criar usuário.

**Estado atual após Data API em 27/10/2026:** fundação inicial, autorização única e exposição somente `api` já foram concluídas e verificadas. [Evidência](VERIFICACAO_DATA_API_I3.md). O cliente Google existente deve ser reutilizado. Próxima proposta é habilitar apenas o provedor Google no Supabase com os campos da seção 5, após autorização específica; ainda não habilitado. Preservar cadastro fechado, outros métodos, vinculação manual e escrita financeira desligados. O aplicativo remoto segue disabled; preparar a ativação do provedor não comprova login nem autoriza configurar a integração real local/publicação por consequência.

Preparado em 27/10/2026 a pedido do usuário, que solicitou todos os campos juntos. **Roteiro não equivale a configuração executada.** Na preparação inicial, a captura mostrava Auth Platform ainda não configurada; o marco posterior está descrito a seguir. Projeto Google sem conta de faturamento conforme relato, Supabase existente e usuário pré-cadastrado preservados. [Estado externo](CONFIGURACAO_EXTERNA_I3.md).

**Marco posterior e decisão vigente:** captura confirmou cliente OAuth criado e incluiu segredo ativo. A substituição foi recomendada, mas o usuário recusou explicitamente e pediu continuidade com o segredo atual. Não repetir a exigência/confirmação de troca nem tratá-la como bloqueio geral. Nenhuma rotação/revogação ocorreu ou foi presumida. Valor/identificadores não transcritos para este roteiro e não solicitar segredos pelo chat. [Recomendação de substituição registrada](https://support.google.com/cloud/answer/15549257?hl=en). Próxima etapa autorizada como orientação: preparar URLs de retorno no Supabase; ativação segue condicionada à revisão técnica da autorização do UUID/backend e às autorizações de alteração remota combinadas.

Este documento contém placeholders. Obter a URL real pelo conector, identificando o projeto Supabase existente pelo nome, antes de preencher os valores operacionais privadamente. Não versionar email, referências operacionais, Client ID ou Client Secret reais. O agente não aplicou configurações remotas nesta preparação.

## Alteração autorizada e pendente de salvamento — somente Google no Supabase

Preparada após a conferência da Data API e agora especificamente autorizada. **Ainda sem execução/salvamento comprovados.** Usar o projeto Supabase existente e o cliente Web Google já criado. O conector atual não oferece configuração do provedor; preencher diretamente no painel oficial, sem enviar valores ao chat.

| Campo no provedor Google | Valor proposto após aprovação |
|---|---|
| Enable Sign in with Google | Ligado no formulário desta etapa já autorizada. |
| Client IDs | ID do cliente Web existente, copiado privadamente do Google. |
| Client Secret | Segredo do mesmo cliente, inserido diretamente no painel Supabase. |
| Skip nonce checks, se aparecer | Desligado. |
| Allow users without an email, se aparecer | Desligado. |

Antes de salvar, conferir que o callback mostrado no provedor corresponde ao retorno Google → Supabase do cliente existente; os dois retornos da seção 5 continuam distintos. Preservar cadastro público, Email/OTP, anônimo, vinculação manual e demais provedores desligados. Salvar somente a configuração Google aprovada; não habilitar OAuth Server, criar outro cliente/projeto, adicionar escopos, mexer em faturamento, aplicar SQL ou publicar.

Após o salvamento autorizado, verificar por leitura que somente Google passou a habilitado, cadastro continua fechado, usuário/UUID/autorização permanecem únicos, nenhuma identidade Google existe antes do primeiro login e readiness mantém escrita financeira falsa. Isso verifica configuração, sem declarar o primeiro vínculo ou um JWT real aprovados. O teste de entrada no aplicativo requer preparar separadamente a integração local; o app ainda está em disabled.

Fonte oficial reconsultada para esta proposta: [Google no Supabase](https://supabase.com/docs/guides/auth/social-sign-in/auth-google). As seções abaixo preservam os campos e o histórico da criação já realizada; não repetir criação.

## 1. Assistente inicial — Vamos começar

| Campo | Preenchimento |
|---|---|
| Nome do app | Atlas Financeiro |
| Email de suporte | Email próprio disponível no menu da conta administrativa Google Cloud, monitorado pelo usuário. Pode diferir da conta escolhida para entrar no Atlas; não inferir autorização de login a partir dele. |
| Público-alvo | Externo; projeto sem organização Workspace. |
| Informações de contato | Email monitorado pelo usuário, preenchido somente no Google. |
| Política de dados | Ler; marcar concordância somente se o usuário concordar. |

Após revisar essas escolhas, o próprio usuário pode concluir o assistente com Continuar/Criar, aplicando essa configuração concreta. Não inclui produção, faturamento, trial, APIs adicionais, provedor Supabase ou publicação do app.

## 2. Público-alvo e Branding

Público-alvo: manter Em teste e incluir somente a conta Google já escolhida como usuário de teste, preenchida privadamente. Não publicar em produção nesta etapa. Os escopos básicos têm exceção às restrições de usuários de teste; essa lista não é a barreira que protege o Atlas. Cadastro fechado, autorização por UUID e políticas do servidor continuam obrigatórios.

Branding: nome Atlas Financeiro; logo e URLs de página inicial/privacidade/termos podem permanecer vazios se opcionais no teste, pois não existe site público aprovado. Não inventar URLs. Se for exigido um campo que não possa ser preenchido com dados reais autorizados, conferir antes de salvar.

Domínio autorizado do retorno Supabase, se solicitado: `<referencia-supabase>.supabase.co`, somente hostname, sem `https://` ou caminho. A lista pública de sufixos contém `supabase.co`; o hostname do projeto é o domínio privado correspondente. Não cadastrar `localhost`/IP no campo de domínios, nem tentar verificar propriedade do domínio do provedor. Exigência de verificação deve ser revisada antes de prosseguir; não comprar domínio ou contratar custom domain para resolver este teste.

## 3. Acesso a dados

Somente os escopos de identidade básicos requeridos pelo Supabase:

```text
openid
https://www.googleapis.com/auth/userinfo.email
https://www.googleapis.com/auth/userinfo.profile
```

Não adicionar Drive, Gmail, agenda, contatos ou permissões financeiras. Selecionar/atualizar/salvar apenas esse conjunto; não ativar serviços Google Cloud/Identity Platform por consequência.

## 4. Clientes — Criar cliente

| Campo | Valor |
|---|---|
| Tipo de aplicativo | Aplicativo da Web |
| Nome | Atlas Financeiro Web I3 |
| Cliente para agente de IA, se aparecer | Desmarcado; Atlas é aplicação interativa comum. |
| Origem JavaScript autorizada | `http://127.0.0.1:5173` |
| URI de redirecionamento autorizada | `https://<referencia-supabase>.supabase.co/auth/v1/callback` |

Usar o projeto Google já criado, sem criar outro. Aplicativo PWA em navegador usa cliente Web; não criar clientes Android/iOS/Desktop nesta etapa. Google admite HTTP/IP de loopback nas regras locais de origem. O callback Google aponta ao Supabase hospedado; não usar o endereço do frontend nesse campo. Não há Supabase local em Docker/porta 54321 nesta integração.

Ao confirmar Criar, guardar Client ID e Client Secret privadamente, por exemplo em gerenciador de senhas existente sob controle do usuário. O segredo completo só é exibido/baixado no momento da criação. Não enviar captura da janela de segredo, não copiar ao chat/Git/`.env` do frontend e não configurar serviço pago para guardá-lo. O segredo Google é distinto da chave administrativa Supabase utilizada anteriormente. Não habilitar cobrança/trial ou escopos adicionais.

## 5. Supabase — referência para etapa posterior, não ativar agora

Antes de ativar Google, revisar e preparar a autorização ativa do UUID pré-cadastrado e o backend de integração, com autorizações específicas para alterações remotas. O app verifica identidade Google e readiness por RPC; os artefatos SQL locais ainda não equivalem a backend hospedado pronto. Modo remoto continua disabled. Não testar login como se I3 estivesse pronto.

| Local/campo | Valor futuro |
|---|---|
| Authentication → URL Configuration → Site URL | `http://127.0.0.1:5173` |
| Redirect URLs | `http://127.0.0.1:5173/auth/callback` (entrada exata, sem curinga) |
| Sign In / Providers → Google → Client IDs | Client ID Web gerado pelo Google. |
| Google → Client Secret | Segredo Google, inserido diretamente no painel seguro Supabase. |
| Habilitação de Google | Manter desligada nesta preparação; ativação será etapa própria após revisão. |
| Pular verificação de nonce, se aparecer | Desligado. |
| Permitir usuários sem email, se aparecer | Desligado. |

Cadastro público, login anônimo, vinculação manual, Email/OTP e demais provedores seguem desligados. Não habilitar OAuth Server/OAuth Apps do Supabase, SAML ou login organizacional; não são o provedor Google desta integração. Não abrir cadastro público para contornar falha de vínculo.

Os dois retornos são distintos: Google → Supabase usa `/auth/v1/callback`; Supabase → frontend usa `/auth/callback`. O código atual calcula o segundo a partir da origem do navegador. Estes valores são do teste local no computador, não uma URL de acesso do celular. HTTPS público, produção, outros dispositivos e piloto exigem etapas/autorização próprias.

## 6. Conferência posterior e fontes

Quando o usuário terminar a parte Google, confirmar somente os estados salvos e existência do cliente, sem solicitar segredo no chat ou presumir ativação Supabase. Guardar dados operacionais em procedimento privado e atualizar os checkpoints públicos sanitizados. Ainda faltam primeiro vínculo preservando UUID, testes negativos, autorização do servidor, JWT/API e dois dispositivos.

Fontes consultadas em 27/10/2026:

- [Assistente e consentimento Google](https://developers.google.com/workspace/guides/configure-oauth-consent).
- [Suporte, contato e tipo de público](https://support.google.com/cloud/answer/15544987).
- [Público e exceção dos escopos básicos](https://support.google.com/cloud/answer/15549945).
- [Branding e domínios](https://support.google.com/cloud/answer/15549049).
- [Clientes, origens de loopback e segredo exibido uma vez](https://support.google.com/cloud/answer/15549257).
- [Lista pública de sufixos](https://publicsuffix.org/list/public_suffix_list.dat).
- [Login Google no Supabase](https://supabase.com/docs/guides/auth/social-sign-in/auth-google).
- [Retornos do Supabase](https://supabase.com/docs/guides/auth/redirect-urls).

Origem/porta e callback do frontend conferidos em README, configuração Vite e `app/src/auth/supabase-adapter.ts`. Preparação documental sem alterações de código, `.env` real ou configuração remota; nenhum teste de OAuth declarado aprovado.
