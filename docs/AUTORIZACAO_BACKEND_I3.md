# I3 — autorização da conta antes de Google

Preparado em 27/10/2026 após recuperar `40e31a6bad4a31587b0c41d5049598b098ecbd50` da branch `codex/incremento-3-local-foundation`. **Nenhuma alteração remota deste procedimento foi autorizada ou executada.**

## Estado efetivamente consultado

- Projeto existente `atlas-financeiro-i3`: ativo, São Paulo; organização no plano Free. Não recriar, restaurar, criar branch de banco ou mudar faturamento.
- `auth.users`: 1 usuário, 1 confirmado, 0 anônimos, 0 com login registrado. `auth.identities`: 1 identidade `email`, nenhuma Google. Inventário agregado; depois, UUID único conferido por leitura e registrado somente em `.private/i3-admin/autorizacao-alvo.json`, ignorado pelo Git. Email não consultado.
- Nenhum schema `api`, `atlas_security` ou `atlas_private`; lista de migrações remotas vazia. Portanto `app_access` e a autorização financeira do Atlas ainda não existem no servidor.
- Nenhuma relação de tabela/view em `public`; extensão `pg_graphql` ausente. Privilégios padrão amplos encontrados são específicos de `public`; não foram encontrados defaults globais para `anon`/`authenticated` na consulta.
- GET de Auth com chave publicável: cadastro fechado e todos os métodos retornados desligados, inclusive Email, Google e anônimo. Nenhuma tentativa de cadastro ou login.
- Os dois endereços locais foram aceitos pelo usuário conforme seu relato de continuidade. A captura anterior não está disponível; não se afirma nova inspeção visual nem verificação administrativa dos valores salvos. O GET público não retorna Site URL, Redirect URLs ou vinculação manual.
- `pg_settings` e configurações de papel não retornaram parâmetros `pgrst`. Isso **não comprova** a lista efetiva de schemas expostos. GET da raiz REST com chave publicável retornou 401 exigindo chave secreta; nenhuma chave administrativa foi solicitada para contornar isso. Revisão do gateway permanece pendente.

## Uma próxima alteração concreta, sujeita à aprovação

No mesmo projeto, instalar **somente** a fundação privada e conceder autorização ativa ao UUID exato do usuário já pré-cadastrado. Não executar ainda o protocolo transacional nem configurar exposição HTTP.

Artefatos para revisão:

1. [`20261026164923_i3_private_foundation.sql`](../supabase/migrations/20261026164923_i3_private_foundation.sql), já existente e inalterado. SHA-256: `47c2e7fff68d4bd340330f1e08538234c4990e2830089081d5e18c433996935f`. Cria três schemas, sete tabelas privadas financeiras/de protocolo, `app_access`, constraints, triggers, RLS e readiness. Concede leitura própria autorizada; não concede DML financeiro ao cliente. Readiness retorna `financialWritesEnabled: false`.
2. [`i3-authorize-existing-user.sql`](../scripts/sql/i3-authorize-existing-user.sql), transação administrativa separada. Exige UUID vinculado privadamente, único cadastro confirmado, não anônimo, sem login e somente identidade Email. Insere uma autorização ativa; repetição já ativa não altera o registro. Recusa revogação existente, outro inventário e protocolo posterior. Não cria usuário, senha, identidade Google ou dado financeiro.

O segundo arquivo usa `current_setting('atlas_i3.expected_user_id')`. Sem vinculação explícita ele falha; não escolhe a conta por posição ou email. O UUID real foi lido administrativamente e conferido com o inventário do pré-cadastro único preservado; o registro privado prepara a vinculação, sem transcrição no Git/chat. Não inferir identidade pelo GitHub. Revalidar antes de executar. Se a identidade se tornar ambígua, parar a concessão e pedir conferência privada no painel. Esse registro local pode desaparecer com a VM; nesse caso, recuperar por nova leitura e conferir novamente, nunca pelo Git.

Esta aprovação proposta abrange a primeira migração, a concessão única e sua conferência. Google, protocolo `20261026171659_i3_transaction_protocol.sql`, abertura de escrita, configuração da Data API, `.env` real, publicação e piloto continuam separados. Não há criação de serviço, trial, mudança de plano ou complemento pago no procedimento.

## Execução depois da aprovação

1. Reconsultar projeto/plano, Auth, contagens, schemas e migrações. Se houve interrupção, conferir antes de repetir: migração existente não deve ser reaplicada; divergência de estrutura exige revisão.
2. Conferir checksum e aplicar exclusivamente a primeira migração via ferramenta de migrações, para manter histórico. Não usar `db push` nem enviar a pasta inteira. A segunda migração concede DML privado às RPCs invoker e exige revisão separada do gateway; não é necessária para esta preparação.
3. Conferir o inventário e o UUID exato contra o registro privado, sem expor dados pessoais. Injetar `select set_config('atlas_i3.expected_user_id', <UUID_PRIVADO>, true);` imediatamente depois do `begin;` do script administrativo, na mesma requisição/transação. O placeholder não é SQL para executar literalmente. Não salvar UUID operacional no artefato público nem confiar em uma configuração de sessão anterior.
4. Executar uma única vez e conferir por SELECT: exatamente uma autorização ativa para o UUID esperado, RLS ligada, grants sem DML financeiro ao cliente e todas as sete tabelas privadas vazias. Confirmar novamente Google desligado. Preservar resultado técnico sanitizado no GitHub.
5. Se a fundação concluir e a concessão falhar, registrar esse estado parcial. Não remover schemas ou repetir criação de usuário; a autorização deve continuar fechada até diagnosticar. Falha de resposta requer nova leitura antes de tentar qualquer escrita.

Reversão de acesso, se necessária, é desativar `app_access.active` para o UUID esperado, após avaliar a autorização aplicável à correção. Não apagar usuário, ledger ou schemas. O script recusa reativação automática de um registro revogado.

## Validação e limites

O procedimento foi exercitado com **10 testes locais PGlite**, identidades sintéticas: vinculação ausente/errada, inventário divergente, repetição, revogação, protocolo posterior, RLS, impossibilidade de autoativação e escrita financeira desabilitada. Typecheck aprovado. Não houve execução deste script no projeto hospedado.

A base recuperada passou em `npm ci` e `npm run check`: 191 testes aprovados/1 ignorado, build/typecheck, 24 de navegador e 3 PWA. O helper administrativo existente passou em 11 testes sem requisição real. Os 10 testes novos foram executados separadamente depois do fluxo completo; não apresentar esse fluxo como reexecutado com eles.

PGlite usa PostgreSQL embarcado com `auth.uid()`/papéis simulados, sem JWT real, PostgREST ou conexões independentes. Estas provas não concluem I3. Ativação de Google depende ainda de aprovação própria e revisão da configuração HTTP; sincronização física, concorrência e recuperação do recorte continuam pendentes.

Fontes oficiais consultadas: [schemas personalizados](https://supabase.com/docs/guides/api/using-custom-schemas), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) e [changelog](https://supabase.com/changelog). Criar um schema não configura automaticamente sua exposição; o exemplo genérico de grants amplos da documentação não deve ser copiado para o Atlas.
