# I3 — exposição restrita da Data API conferida

Em 27/10/2026, após receber o roteiro completo, o usuário informou ter salvado a alteração específica de Exposed schemas no projeto existente `atlas-financeiro-i3`. Conferência independente realizada a partir do checkpoint `f71f190bc2f5d9c34890cc25f408aa64e00ae0f7`, na branch I3.

## Estado observado

- Projeto existente ativo em São Paulo, organização no plano Free.
- Somente a migração remota `20261027152920 / i3_private_foundation`; protocolo transacional posterior ausente.
- A Data API informa **somente `api`** como schema exposto. A configuração foi salva pelo usuário; o agente não executou nova alteração de configuração remota.
- Cadastro público fechado; todos os métodos de entrada retornados desligados, incluindo Google, Email e anônimo.
- Um usuário confirmado, nenhum login registrado ou identidade Google. Autorização ativa única coincide exatamente com o UUID do registro privado; UUID/email não transcritos.
- RLS ativo nas oito tabelas, nenhum privilégio de DML de cliente nas tabelas privadas/autorização. Sete tabelas privadas vazias.
- Única função de `api`: `i3_readiness`, invoker, execução permitida a authenticated e negada a anon.

## Requisições de verificação

Requisições usaram somente a chave publicável existente. Seu valor não integra este documento. Cabeçalho de seleção: Accept-Profile em GET e Content-Profile em POST. Nenhum token de usuário ou segredo administrativo/OAuth foi solicitado.

| Verificação | Método e alvo relativo a `/rest/v1/` | Resultado |
|---|---|---|
| Lista efetiva de schemas | GET `accounts?select=id&limit=1`, perfil sintético inexistente | 406/PGRST106; hint informa somente `api` |
| Schema financeiro privado | GET `accounts?select=id&limit=1`, perfil `atlas_private` | 406/PGRST106 |
| Schema de autorização privado | GET `app_access?select=active&limit=1`, perfil `atlas_security` | 406/PGRST106 |
| Schema público anterior removido | GET `accounts?select=id&limit=1`, perfil `public` | 406/PGRST106 |
| Schema GraphQL anterior removido | GET `graphql`, perfil `graphql_public` | 406/PGRST106 |
| Readiness sem login | POST `rpc/i3_readiness`, perfil `api`, corpo `{}` | 401/42501: permission denied for schema api |

GET `/auth/v1/settings`: 200, `disable_signup: true`, nenhum método habilitado. A chamada POST acima é uma função de leitura, sem gravação financeira; sua execução anônima foi negada pela permissão do schema. Não foi chamada RPC de escrita, feita tentativa de login/cadastro ou alterado grant para fazer o teste passar.

Nova chamada SQL de readiness com papel authenticated e UUID esperado **simulado administrativamente** confirmou `protocolVersion: 1` e `financialWritesEnabled: false`. O teste altera apenas o contexto de sessão durante a leitura; não cria usuário, autorização ou dado financeiro. Essa identidade simulada não comprova assinatura JWT nem primeiro login Google.

## Resultado e limites

Configuração aprovada na prática pelo salvamento do usuário e confirmada por comportamento HTTP: apenas `api` exposto, acesso anônimo negado e schemas privados preservados. O bloqueio financeiro e a autorização anterior permanecem válidos. [Validação anterior da fundação e dos papéis](RESULTADO_FUNDACAO_REMOTA_I3.md).

Aplicativo, dependências e SQL de migração não mudaram. A suíte local anterior não foi repetida; os checks pertinentes desta etapa foram HTTP, catálogo e leitura de readiness no banco hospedado. Nenhum serviço, recurso pago, publicação ou `.env` real foi criado. I3 permanece incompleto, especialmente login/JWT real, protocolo/escrita, concorrência e dois dispositivos.

## Próxima etapa preparada, ainda sem execução

Habilitar somente o provedor Google no projeto existente, usando o cliente Web já criado. [Roteiro preparado](ROTEIRO_GOOGLE_OAUTH_I3.md). A configuração deve usar Client ID/Secret diretamente no painel, callback Google → Supabase correto e retorno exato ao frontend. Cadastro público, Email, anônimo, vinculação manual, opções de relaxamento de nonce/email e escrita financeira permanecem desligados. Sem recriar projetos/clientes, adicionar escopos de Gmail/Drive, mudar faturamento ou publicar.

**Google deve permanecer desligado até autorização específica.** O pedido anterior do usuário determinou esse limite; concluir a Data API não autoriza ativar Auth. A etapa seguinte proposta abrange apenas o provedor, não a segunda migração, abertura financeira, publicação ou piloto. O modo remoto do aplicativo continua disabled; habilitar o provedor não inicia automaticamente um login real.
