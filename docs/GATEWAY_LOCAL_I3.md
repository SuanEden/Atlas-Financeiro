# I3 — JWT e operações HTTP em gateway local real

Validado em 27/10/2026, após registrar a [conferência pessoal real](CONFERENCIA_AUTENTICADA_I3.md) no checkpoint `9c34872e817963706617ae2105cc0b6cd7308127`. Nenhum teste desta etapa alterou ou utilizou dados/credenciais do projeto hospedado.

## Ambiente e isolamento

Ferramenta de desenvolvimento em [tools/i3-postgres](../tools/i3-postgres/README.md). PostgreSQL nativo 17.10, **PostgREST oficial 16.5**, ambos em portas temporárias de 127.0.0.1. Sem Docker, serviço registrado, usuário de sistema novo, configuração de faturamento ou publicação.

O instalador fixa a release oficial Windows x64 e confere SHA-256 `17f595b0d8dd37473d0231417dea07c5ac9f791282ff5b017fae51ff29e5de2f` antes de extrair. Binário e zip ficam em node_modules/.cache, ignorados pelo Git. Nenhum instalador global ou script remoto é executado.

O cluster é criado exclusivamente pelo teste; a conexão tem host/porta fixados pelo processo e confere seu próprio data_directory/versão. Não aceita DATABASE_URL ou destino remoto por variável. Cliente/gateway não herdam configurações PG ou credenciais de serviços: o subprocesso recebe somente variáveis básicas do Windows e configuração sintética explícita.

Criados papéis SQL locais anon/authenticated e authenticator LOGIN NOINHERIT, sem superuser/bypass. O gateway valida JWT HMAC-SHA256 com segredo aleatório apenas na memória/ambiente do subprocesso; tokens, segredo e headers não são registrados ou versionados. Usuários de teste são UUIDs aleatórios locais, sem email, conta Google ou dados de especificações privadas.

Auth.uid é um shim de teste que lê o sub legado ou JSON de claims aplicado pelo PostgREST. A assinatura, expiração, audiência e troca de papel são executadas pelo gateway real, não por uma resposta HTTP mock. Todas as migrações existentes são aplicadas somente ao cluster de teste; o gate é habilitado temporariamente apenas nos casos sintéticos locais e restaurado em finally. Nenhuma credencial do Atlas real entra nesse caminho.

## Resultados observados

Primeira execução de `npm run test:all`: **22 aprovados** (10 de concorrência existentes +12 iniciais de gateway). Após acrescentar o caso de sub ausente/papel privilegiado, `npm run test:gateway`: **13 aprovados**. Os dez casos de concorrência passaram com o bootstrap compartilhado novo; não apresentar como uma execução única de 23 quando as evidências foram essas duas chamadas.

| Caso de gateway | Resultado |
|---|---|
| Authenticator mínimo | LOGIN sem INHERIT/superuser/bypass; gate false inicialmente |
| Proprietário com JWT assinado | Readiness/pull 200; comando válido negado pelo gate com 403/42501 |
| Sem token | Três RPCs negadas com 401 |
| Assinatura falsa, expirado, audiência errada e nbf futuro | Quatro variantes recusadas com 401 |
| Cadastrado sem autorização ou com active false | Três RPCs recusadas com 403 |
| Sem sub ou papel postgres não concedido | Acesso recusado; assinatura não concede papel arbitrário |
| Revogação no banco com o mesmo JWT válido | Acesso passa de 200 a 403 e volta a 200 ao restaurar autorização local |
| Schemas privados/public/GraphQL, escrita direta e helper privado | Perfis 406; tabela/SQL genérico inexistentes na API, 404 |
| Gravação/replay/divergência | Commit local com recibo único; repetição idêntica e divergência 400/22023 |
| Isolamento por dono | Feed de outro usuário vazio; envelope com dono forjado rejeitado |
| Duas escritas HTTP concorrentes | Revisões únicas 1/2, dois recibos e feed ordenado |
| Falha diferida de meia transferência | 400/23514, sem agregado/recibo parcial ou lacuna de revisão |
| Revogação enquanto a chamada HTTP espera lock | Espera confirmada no PostgreSQL, comando com JWT ainda válido recusado sem gravação |

Setup e scripts passaram em node --check. Gateway e clusters próprios foram encerrados após as execuções; nenhum processo PostgreSQL preexistente ou servidor pessoal 5173 foi interrompido. Diagnósticos/dados sintéticos temporários permanecem fora do Git; sem exclusão recursiva de caminhos calculados.

O bootstrap nativo foi extraído para um módulo compartilhado e o conjunto de concorrência o reutiliza. Dependências/lockfile e código de app não mudaram; a suíte app anterior (211/1 ignorado, 24 navegador/3 PWA) não foi repetida, pois essa alteração é isolada na ferramenta. Após staging, o teste de privacidade passou com **2 aprovados/1 ignorado**, este ainda dependente do manifesto privado original ausente. Revisão dos arquivos preparados sem credenciais, valores de conta ou binários.

SELECT final no projeto hospedado reconfirmou um usuário, uma identidade Google, uma autorização ativa, gate false e zero registros nas nove tabelas privadas. A chave/token real nunca foi usada no gateway local.

## O que esta prova não afirma

É PostgreSQL + PostgREST reais **locais**, com Auth/users sintéticos e JWT HS256 de teste. Não é Google/GoTrue local completo, mesma versão/distribuição PostgREST hospedada, JWKS/rotação de chaves do provedor ou prova de todos os algoritmos. Os testes reais de Google/readiness/pull/recusa já possuem evidência própria; não misturar os dois ambientes.

Os commits financeiros HTTP desta suite pertencem apenas aos bancos locais descartáveis. O servidor Atlas continua com gate false, cadastro fechado e sem dados financeiros. Esses resultados não autorizam associação, piloto, escrita remota ou publicação, nem comprovam recuperação operacional, proteção de versões/arquivamento, PWA autenticada física ou dois aparelhos. I3 continua incompleto.

Fontes primárias: [release oficial 16.5](https://github.com/PostgREST/postgrest/releases/tag/v16.5), [configuração](https://docs.postgrest.org/en/stable/references/configuration.html), [validação JWT e papéis](https://docs.postgrest.org/en/stable/references/auth.html). A release e o digest do asset foram conferidos na API pública oficial do GitHub antes do download.
