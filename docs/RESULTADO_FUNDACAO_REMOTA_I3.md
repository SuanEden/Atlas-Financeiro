# I3 — fundação privada inicial aplicada

**Atualização posterior:** o usuário concluiu a alteração de Exposed schemas e o agente confirmou somente `api` exposto, com anônimo e schemas privados negados. [Verificação atual](VERIFICACAO_DATA_API_I3.md). A seção final abaixo preserva a proposta anterior; não repetir essa configuração.

Executado em 27/10/2026, após autorização específica do usuário para a fundação inicial e a conta pré-cadastrada no projeto existente. Base local anterior: `e2b416c7ce2db9197fa070087b693691d18dc540`, branch `codex/incremento-3-local-foundation`.

## Projeto e conta conferidos antes da escrita

`get_project` confirmou o projeto existente `atlas-financeiro-i3`, ativo em São Paulo; `get_organization` confirmou plano Free. Migrações remotas vazias e schemas Atlas ausentes antes da aplicação.

O UUID atual coincidiu exatamente com `.private/i3-admin/autorizacao-alvo.json`, preparado no checkpoint anterior e ignorado pelo Git. SQL confirmou um único usuário, email confirmado, não anônimo, sem login registrado; uma única identidade Email, cujo endereço corresponde ao de `auth.users`, e nenhuma identidade Google. A comparação de endereço retornou somente booleano, sem ler/transcrever o email para o chat/Git. A seleção não usou nome do GitHub, nome da organização ou email inferido. O recibo administrativo original de criação não existe nesta VM; a evidência disponível é o registro privado preparado e a conferência exata do cadastro preservado.

GET público de Auth antes e depois: `disable_signup: true`, nenhum método retornado habilitado. Google, Email e entrada anônima permaneceram desligados. Não houve tentativa de cadastro ou login.

## Alterações executadas

1. Aplicado exclusivamente o conteúdo inalterado de [`20261026164923_i3_private_foundation.sql`](../supabase/migrations/20261026164923_i3_private_foundation.sql), SHA-256 `47c2e7fff68d4bd340330f1e08538234c4990e2830089081d5e18c433996935f`, via `apply_migration`.
2. A ferramenta remota registrou versão **`20261027152920`**, nome `i3_private_foundation`. Essa versão foi gerada pelo serviço e difere do prefixo do arquivo local; o conteúdo aprovado é o mesmo. Não renomear/reaplicar automaticamente o arquivo nem usar `db push` para conciliar esse histórico. Na retomada, conferir esta correspondência por leitura.
3. Após conferir fundação presente, ausência de protocolo posterior, autorização ainda vazia e sete tabelas privadas vazias, executado [`i3-authorize-existing-user.sql`](../scripts/sql/i3-authorize-existing-user.sql) com UUID privado vinculado dentro da mesma transação. Conferência posterior: **1 autorização, ativa, para o UUID exato esperado**.

Nenhum usuário, identidade Google, dado financeiro, serviço, branch de banco, assinatura, trial, complemento pago ou publicação foi criado. A migração transacional posterior não foi aplicada. A configuração de exposição HTTP não foi alterada. Nenhuma chave administrativa ou segredo OAuth foi solicitado/usado; ferramentas conectadas forneceram o acesso administrativo já autorizado.

## Permissões e isolamento observados

Catálogo do PostgreSQL hospedado confirmou:

- Oito tabelas com RLS ativo: sete em `atlas_private` e `atlas_security.app_access`.
- `authenticated` possui SELECT sujeito a RLS, sem INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER nessas tabelas. `anon` não possui SELECT nem USAGE nos três schemas Atlas.
- Papéis `anon` e `authenticated` sem superuser ou bypass de RLS.
- Única função do schema `api`: `i3_readiness`, `SECURITY INVOKER`, execução concedida a `authenticated` e negada a `anon`. A resposta autorizada informa escrita financeira desabilitada.

[`i3-verify-foundation.sql`](../scripts/sql/i3-verify-foundation.sql) foi executado administrativamente no banco hospedado com papéis reais e claims de identidade **simulados**, sem criar usuários de teste ou registros financeiros. As **12 verificações retornaram true**:

| Verificação | Resultado |
|---|---|
| Conta esperada acessa readiness com escrita financeira desligada | Aprovado |
| Conta esperada vê exatamente sua autorização ativa | Aprovado |
| Leitura das sete tabelas financeiras encontra zero registros | Aprovado |
| Tentativa de autoalterar autorização | Negada, SQLSTATE 42501 |
| Tentativas de INSERT, UPDATE e DELETE financeiros | Três negativas, SQLSTATE 42501 |
| Papel authenticated sem identidade | Readiness negado; autorização e tabelas sem linhas |
| Papel authenticated com outro UUID sintético não cadastrado | Readiness negado; autorização e tabelas sem linhas |
| Papel anon | Readiness e leituras de autorização/finanças negados |

O script não altera autorizações/grants ou dados persistentes. Tentativas negadas são capturadas em subtransações; sucesso inesperado causaria exceção e rollback da verificação. Somente booleanos foram retornados, sem UUID, email, token ou valores financeiros.

GETs HTTP com chave publicável para os perfis `atlas_private`, `atlas_security` e `api` retornaram **406 / PGRST106**. O gateway informou schemas expostos `public, graphql_public`. Assim, os schemas privados não estão expostos; `api` também não está disponível ao aplicativo ainda. Não confundir ausência de exposição com conclusão do teste de um JWT autorizado pela API.

Inventário final: um usuário confirmado, nenhuma entrada registrada/identidade Google, uma autorização ativa e **zero registros nas sete tabelas privadas**.

## Advisors e limites da prova

Security advisor retornou somente aviso `auth_leaked_password_protection` (WARN): proteção contra senhas vazadas desabilitada. Não foi alterada; entrada por Email está desligada. Não houve aviso de RLS/grants nas estruturas criadas. Performance advisor retornou três informações `unused_index` em tabelas recém-criadas/vazias; índices preservados, sem alteração de esquema fora do escopo.

São testes reais do PostgreSQL hospedado, com identidades simuladas administrativamente; **não são login Google, validação de assinatura JWT, revogação de sessão real, concorrência independente ou dois aparelhos**. Não houve teste com dados financeiros de outro usuário, porque não foram criados usuários/dados adicionais. O bloqueio da linha real de autorização por outro UUID e as políticas/grants foram conferidos. I3 continua incompleto.

Aplicativo, dependências e migrações locais não mudaram. O fluxo local completo aprovado no checkpoint anterior não foi repetido: a validação pertinente desta etapa foi a aplicação remota, o catálogo, as 12 verificações e as negativas HTTP. Só código SQL administrativo de verificação e documentação sanitizada entram neste checkpoint.

## Próxima etapa proposta, ainda não executada

Preparar a conexão restrita do aplicativo com o servidor antes de Google. A configuração concreta seguinte é mudar **somente `Exposed schemas` da Data API de `public, graphql_public` para `api`**, no mesmo projeto. Preservar demais campos e métodos de entrada; nunca adicionar `atlas_private`, `atlas_security` ou `auth` à lista exposta. A única função disponível nessa fase será readiness, com escrita financeira desligada e autorização por UUID.

Essa é uma configuração remota adicional e precisa de aprovação própria. O conector atual não oferece um comando dedicado de configuração da Data API; a execução proposta é pelo campo do painel, sem senha/chave no chat e sem configurar um parâmetro de papel por suposição. Antes de salvar, conferir o projeto e o valor mostrado. Depois, verificar que perfis privados continuam recusados e que chamada anônima de readiness é negada; teste com sessão assinada da conta esperada fica para o login Google autorizado separadamente. Não abrir escrita nem aplicar o protocolo posterior por consequência dessa configuração.
