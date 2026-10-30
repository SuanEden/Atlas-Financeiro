# Fontes oficiais para o planejamento de I3

Consulta em 26/10/2026. Pesquisa documental, sem inspeção de contas ou serviços reais. As decisões do [plano](PLANO_INCREMENTO_3.md) são propostas do projeto; as fontes fundamentam comportamentos e limites, não comprovam uma implementação inexistente.

## Identidade e autorização

| Fonte | Informação usada e limite |
|---|---|
| [Supabase — General configuration](https://supabase.com/docs/guides/auth/general-configuration) | Cadastro pode ser desativado para permitir apenas usuários existentes; login anônimo e vinculação manual são configurações separadas. |
| [Supabase — Google](https://supabase.com/docs/guides/auth/social-sign-in/auth-google) | Cliente Google Web, credenciais no provedor, escopos básicos e retorno via Supabase. Primeiro vínculo com cadastro fechado precisa de prova no projeto escolhido. |
| [Supabase — Identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking) | Vinculação automática de identidades com email verificado. Não implica autorização financeira nem torna o UUID local de I2 um usuário Auth. |
| [Supabase — Admin createUser](https://supabase.com/docs/reference/javascript/auth-admin-createuser) | Pré-provisionamento confirmado é administrativo; credenciais privilegiadas não podem ser usadas no navegador público. |
| [Supabase — PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow) | Troca de código vinculada ao contexto iniciador; código tem uso/validade limitados. Usar SDK oficial e testar callback/repetição. |
| [Supabase — Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls) | Retornos precisam estar permitidos; preferir caminhos exatos de produção. Curingas de preview não são necessários ao Atlas pessoal. |
| [Google — App audience](https://support.google.com/cloud/answer/15549945?hl=en) | Há exceção de Testing para autenticação com escopos básicos: lista de test users e a regra genérica de sete dias não podem ser tratadas como proteção universal. |
| [Google — Setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid) | Configuração de cliente/branding e origens. A conta pessoal escolhida e suas restrições Workspace ainda precisam ser verificadas. |
| [Supabase — SignOut](https://supabase.com/docs/guides/auth/signout) | JavaScript usa escopo global por padrão; o plano escolhe saída local explícita. Access tokens já emitidos permanecem válidos até expirar, mesmo com refresh revogado. |
| [Supabase — RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) e [API](https://supabase.com/docs/guides/api/securing-your-api) | Grants e políticas são camadas distintas. Autorizar por UUID/propriedade e acesso ativo; não depender de metadata editável, defaults ou interface. |

## Persistência e mudanças de plataforma

- [PostgreSQL — Explicit locking](https://www.postgresql.org/docs/current/explicit-locking.html): locks de linha permanecem até término da transação. O contador transacional por proprietário é uma escolha do plano a provar por concorrência, não recurso automático de sincronização do Supabase.
- [PostgreSQL — Sequences](https://www.postgresql.org/docs/current/functions-sequence.html): sequências não fornecem por si só o contrato de cursor seguro requerido. Não confundir ordem de alocação com confirmação das transações.
- [Supabase Changelog](https://supabase.com/changelog.md): índice consultado. A leitura pelo navegador retornou tipo Markdown não suportado; o índice foi lido por requisição HTTP somente de leitura. Nenhum comando de configuração foi usado.
- [Grants/Data API — 28/04/2026](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically): mudança de defaults com cronograma incluindo 30/10/2026; tabelas antigas conservam grants. Conferir estado real na implementação; novos defaults não substituem revisão de permissões.
- [TLS — comunicado de 12/10/2026](https://supabase.com/changelog/cbc-tls-ciphers-deprecated): retirada de cifras antigas anunciada a partir de 10/11/2026. Conferir sistema/navegador Android atualizado no teste físico, sem recomendar redução de segurança.
- [PostgreSQL 15.19/17.11 — 25/09/2026](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes): mudanças em extensões e operadores. Registrar a versão instalada e não presumir que PostgreSQL `/current/` é a versão do projeto Supabase. I3 não necessita extensões de árvore, operadores customizados ou criptografia PGP legada.

## Custo e recuperação

- [Supabase Pricing](https://supabase.com/pricing): quadro Free e disponibilidade de recursos, cotas de banco, Auth e tráfego. Não garante manutenção das condições nem a elegibilidade da conta real.
- [Supabase Billing FAQ](https://supabase.com/docs/guides/platform/billing-faq): plano por organização, limites de projetos compartilhados e restrições por uso/faturamento. Não criar organizações extras para contornar cotas.
- [Supabase Project Pausing](https://supabase.com/docs/guides/platform/free-project-pausing): pausa por pouca atividade e janela atual de retomada; não usar tráfego artificial ou upgrade para encobrir o limite do plano.
- [Supabase Database Backups](https://supabase.com/docs/guides/platform/backups): backup automático dos planos pagos não é garantia do Free; exportações externas e ensaio de recuperação são necessários.
- [Cloudflare Pages Limits](https://developers.cloudflare.com/pages/platform/limits/): builds, arquivos e tamanho. Integração Git pode publicar em pushes; precisa de controle de branches e autorização separada antes de existir.
- [Cloudflare Pages Pricing](https://developers.cloudflare.com/pages/functions/pricing/): requisições de ativos estáticos são gratuitas quando não invocam Functions; funções seguem Workers. O plano mantém somente frontend estático.
- [Google Codelab — Sign in with Google](https://codelabs.developers.google.com/codelabs/sign-in-with-google-button): o roteiro oficial descreve conta/projeto gratuitos para configurar sign-in. Não comprova ausência de cartão/trial em todo fluxo de conta, nem autoriza APIs pagas ou reproduzir exemplos que registram tokens em console.

O detalhamento operacional e as medidas para evitar cobrança estão em [CUSTOS_E_LIMITES.md](CUSTOS_E_LIMITES.md). Todas as condições devem ser reconsultadas antes do provisionamento futuro.

## Salvamento documental sem solicitar publicação

[Cloudflare — GitHub integration](https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/) documenta o prefixo `[CF-Pages-Skip]` para omitir um deploy da integração. [GitHub — Skipping workflow runs](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/skip-workflow-runs) documenta `[skip ci]` para eventos usuais de push/PR. Ambos serão usados no checkpoint exclusivamente documental, na branch existente. Não substituem a revisão de integrações: outros gatilhos não são abrangidos por toda anotação, e não foi criada/conectada hospedagem nesta tarefa.
