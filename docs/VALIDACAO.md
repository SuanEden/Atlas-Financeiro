# Validação — I3 local e histórico de I1/I2

## Recarga relatada e página de conferência autenticada — 27/10/2026

Usuário transcreveu mensagem de login verificado/envio bloqueado após recarga do protocolo; isso não comprova todos os controles ou captura independente de JWT/tráfego. SELECTs preservaram usuário/UUID/autorização únicos, gate false e nove tabelas privadas vazias. Nenhuma mudança remota nesta etapa.

Página manual de desenvolvimento adicionada em app/tests, sem import na entrada de produção, exigindo DEV/loopback. Usa portas/SDK existente, exige sessão válida e gate false, verifica pull vazio do mesmo dono e tenta somente `{protocolVersion:0}`, inválido mesmo em mudança concorrente do gate. Recusa de acesso exigida; sessão/rede falha e sucesso inesperado não passam. Sem store, associação, token exportado, valor privado renderizado ou comando financeiro válido. Dez unitários novos e typecheck aprovados.

Playwright/Edge isolado, Browser plugin ausente, 1280×900/390×844: título/URL/conteúdo, sem overlay/overflow, clique e resultados aprovados com sessão/respostas sintéticas interceptadas. Sem erros inesperados; 403 previsto da negativa classificado separadamente. Capturas inspecionadas fora do Git. Locator inicial afetado por codificação do pipe PowerShell corrigido; classificação do 403 refinada; nenhuma falha de app nesses dois ajustes da QA. Build não contém a página/diretório tests. [Evidência, limites e execução pessoal ainda pendente](CONFERENCIA_AUTENTICADA_I3.md).

Check completo reexecutado com ATLAS_BROWSER_TEST_PORT=5174 e modo disabled: **211 aprovados/1 ignorado, typecheck/build, 24 navegador, 3 PWA**. O ignorado depende do manifesto privado original ausente. Porta pessoal 5173 preservada. Não há nova migração/dependência ou alteração remota; teste assinado do usuário ainda pendente.

## Protocolo remoto com gate false, índice e regressão completa — 27/10/2026

Autorizado prosseguimento pelo usuário; preflight projeto ativo/Free, fundação única, mesmo UUID/autorização, cadastro fechado/Google exclusivo, API somente api e tabelas vazias. Aplicado protocolo original inalterado (remoto `20261027163903`). Advisor apontou FK sem índice em incorporated_operations; migração local gerada pela CLI, validada nativamente e aplicada como `20261027164301`, sem alterar gate/dados/grants. Histórico e checksums em [RESULTADO_PROTOCOLO_REMOTO_I3.md](RESULTADO_PROTOCOLO_REMOTO_I3.md).

Catálogo: onze tabelas com RLS, três RPCs invoker, INSERT interno autenticado nas nove privadas e UPDATE somente revision em sync_heads, sem DML nos controles e sem privilégios anônimos. Papéis sem login/superuser/bypass. Script novo `i3-verify-protocol-disabled.sql`: **24 verificações true** no banco hospedado, com identidade simulada e sem inserir seed. Proprietário lê readiness false/pull vazio e apply é negada pelo gate; autoativação/autoautorização/cursor inválido e identidades ausentes/estranhas/anônimas recusados. Inventário final: mesmo usuário/Google/autorização, nove tabelas privadas vazias, gate false e índice válido.

HTTP anônimo nas três RPCs: 401/42501. Perfis privados: 406/PGRST106, somente api exposto. GET Auth permanece cadastro fechado/somente Google. Advisor de FK resolvido; quatro INFO de índices sem uso e WARN anterior de proteção de senhas vazadas mantidos, sem contratação ou ativação de recursos.

Ferramenta nativa atualizada para carregar todas as migrações e conferir também os 24 checks com gate false: **10 testes aprovados**. `ATLAS_BROWSER_TEST_PORT=5174`, modo de teste disabled, `npm run check`: **201 aprovados/1 ignorado, build/typecheck, 24 navegador, 3 PWA**. O ignorado depende do manifesto privado original ausente. Browser plugin ausente, Playwright/Edge isolado; servidor pessoal 5173 preservado e preview 4173 encerrado após testes. Ajuste de config/teste usa origem configurada e strictPort; nenhum componente/código financeiro/dependência do app alterado. Clusters nativos próprios encerrados.

Não confundir claims simulados com JWT real nem declarar escrita, associação, recuperação operacional ou dois aparelhos aprovados. Sem novo serviço, cobrança, dado financeiro ou publicação. Próxima observação pessoal: recarga autenticada mantendo envio bloqueado.

## Recarga/reentrada, recusa e concorrência independente — 27/10/2026

Usuário confirmou o roteiro F5 bloqueado/nova entrada; interface validada por relato. SELECTs reconfirmaram usuário/UUID/autorização originais e identidade Google única, sete tabelas vazias; GET cadastro fechado/somente Google. Outra conta controlada tentou entrar em janela anônima e recebeu erro seguro. Inventário posterior permaneceu igual. Logs somente agregados em janela de vinte minutos: duas ocorrências de Signups not allowed for this instance; não são contagem de tentativas/pessoas. Sem tokens, email ou conteúdo bruto extraídos.

Nova ferramenta isolada em `tools/i3-postgres`, binários Windows PostgreSQL 17.10 e driver pg fixados com lockfile, sem mudar app/dependências/SQL existentes. `npm test`: **10 aprovados**, conexões TCP/PIDs independentes e contenção por pg_blocking_pids, cobrindo idempotência, serialização, rollback/feed, estornos, constraint diferida, limite de paginação e revogação na espera. Primeira execução falhou no startup por pipe herdado, antes dos testes; stdio/cleanup corrigidos e nova execução aprovada. Clusters próprios encerrados, inclusive o da tentativa inicial, sem tocar PostgreSQL preexistente ou excluir diretórios.

`node --check` do runner aprovado. Após preparar os arquivos para commit, `npx vitest run tests/project-privacy.test.ts`: **2 aprovados/1 ignorado**, o ignorado ainda depende do manifesto privado original ausente. Dependências/binários e dados temporários excluídos do Git; revisão dos arquivos preparados não encontrou credenciais ou dados de conta.

[Relatório e limites](CONCORRENCIA_E_ACESSO_I3.md). Auth.uid é simulado nesse banco local; não é Supabase 17.11/gateway/JWT, carga ou dois aparelhos. Suítes anteriores do aplicativo não repetidas, pois código/dependências dele não mudaram. Segunda migração remota preparada com checksum e gate false, **não aplicada/autorizada ainda**. Nenhuma nova configuração, abertura financeira, serviço externo ou publicação.

## Aviso de bloqueio após saída relatado — 27/10/2026

Usuário informou pedido de entrada Google e aviso de acesso local bloqueado/pendências preservadas. Evidência de renderização por relato textual, sem acesso do agente ao perfil pessoal. F5, desaparecimento do controle Sair e nova entrada não foram informados; não marcar persistência ou reautenticação como aprovadas. Nenhuma consulta remota adicional, teste de token, alteração de código/configuração ou suíte repetida. [Continuidade](RESULTADO_PRIMEIRO_LOGIN_I3.md).

## Primeiro Google real no UUID pré-cadastrado — 27/10/2026

Usuário informou mensagem de login verificado/envio aguardando liberação e controles Entrar/Sair. Consultas somente de leitura: **1 usuário, mesmo UUID esperado, conta confirmada/não anônima, login registrado, 1 identidade Google no UUID correto, 0 em outro usuário**, autorização ativa única preservada. Oito tabelas com RLS, zero DML de cliente e sete tabelas privadas vazias; protocolo posterior ausente. Projeto ativo; GET Auth cadastro fechado/somente Google. HTTP reconfirmou API somente `api`, privado 406/PGRST106 e readiness anônimo 401/42501.

[Relatório e limites](RESULTADO_PRIMEIRO_LOGIN_I3.md). A evidência real combina registros do servidor com texto da interface fornecido pelo usuário; o adaptador só publica sucesso depois de verificar usuário/identidade e readiness. Não houve captura independente de tráfego autenticado, extração de token/código ou automação do perfil pessoal. Não equiparar essa prova à matriz inteira de JWT/isolamento/sessão. Associação não executada, escrita bloqueada. Próximo teste proposto: sair/recarregar/entrar novamente. Sem mudanças de código/dependências/migrações, suíte local não repetida e nenhuma alteração remota pelo agente.

## Google exclusivo confirmado e tela de login preparada — 27/10/2026

GET Auth após PRONTO: 200, `disable_signup: true`, somente Google true. Projeto ativo/Free e migração inicial única. SQL confirmou mesmo UUID/autorização, um usuário confirmado, zero logins/identidades Google, oito tabelas com RLS, zero grants DML ao cliente e sete tabelas privadas vazias. Readiness com identidade simulada permanece versão 1/escrita falsa. HTTP privado 406/PGRST106 e readiness anônimo 401/42501.

Preparação local somente por variáveis no processo Vite em `127.0.0.1:5173`, sem `.env` real ou mudança do padrão disabled. Primeira chamada npm/PowerShell perdeu flags e falhou antes de iniciar; CLI Vite local direta iniciou corretamente. Browser plugin ausente: Playwright/Edge isolado, 1280×900 e 390×844, título/URL/conteúdo/botão corretos, sem overlay, console limpo e sem overflow; capturas temporárias inspecionadas, sem controles de associação. Clique interceptado antes do servidor conferiu Google, callback exato e PKCE S256, sem iniciar login remoto ou receber token/código. [Relatório QA e limites](PRIMEIRO_LOGIN_GOOGLE_I3.md).

Sem alteração de código/dependências/migrações e sem suíte completa repetida. Credenciais fornecidas na conversa não foram copiadas para arquivos/Git ou usadas pelo agente. Primeiro login/JWT real ainda pendentes; próxima ação deve preservar UUID e bloqueio financeiro. Nenhum serviço pago/publicação ou operação financeira executados.

## Prévia após autorização somente Google — 27/10/2026

Usuário respondeu `vamos` à ativação específica de Google já proposta. `get_project`/organização reconfirmaram projeto existente ativo/Free. GET Auth: 200, `disable_signup: true`, Google false e nenhum método retornado habilitado. SQL confirmou um usuário, autorização única ativa para o UUID privado exato, zero logins/identidades Google, protocolo posterior ausente e sete tabelas privadas vazias. Uma consulta SELECT inicial falhou por sintaxe; corrigida e repetida somente a leitura, sem escrita remota.

[Roteiro autorizado](ROTEIRO_GOOGLE_OAUTH_I3.md) pronto; salvamento ainda depende do usuário no painel, porque o conector não oferece configuração do provedor. Nenhuma credencial OAuth obtida, ativação/login, alteração de banco, recurso pago ou publicação pelo agente. Somente documentação sanitizada alterada; suíte local anterior não repetida. Não confundir autorização concedida com provedor já habilitado.

## Data API somente api e negativas HTTP — 27/10/2026

Após relato de salvamento pelo usuário, verificações HTTP com chave publicável existente: somente `api` na lista efetiva, por 406/PGRST106 em perfil sintético inexistente. Perfis `atlas_private`, `atlas_security`, `public` e `graphql_public` igualmente recusados com 406/PGRST106. POST `{}` a `/rest/v1/rpc/i3_readiness`, Content-Profile `api`, sem sessão: **401/42501, permission denied for schema api**. GET Auth: 200, cadastro fechado, nenhum método habilitado.

Projeto ativo/Free reconfirmado, migração única anterior preservada. SQL confirmou autorização única para UUID privado esperado, oito tabelas com RLS, zero grants DML ao cliente, sete tabelas vazias e única RPC invoker sem EXECUTE anônimo. Readiness por SQL/identidade esperada simulada: versão 1, escrita financeira falsa. Um usuário confirmado, nenhum login/identidade Google. Sem valores privados nos registros públicos.

[Relatório e limites](VERIFICACAO_DATA_API_I3.md). São negativas HTTP reais e contexto de identidade simulado somente na leitura SQL; não login Google/JWT real. Aplicativo/dependências/migrações locais inalterados; suíte local não repetida. Nenhuma configuração remota adicional, nova concessão, serviço, recurso pago ou publicação pelo agente. Próxima proposta Google aguarda autorização específica.

## Fundação remota aplicada e permissões verificadas — 27/10/2026

- Execução especificamente autorizada pelo usuário. Projeto existente ativo/Free e UUID exato conferidos contra registro privado; SQL confirmou correspondência da identidade Email com o cadastro, retornando somente booleano. Sem inferência por nome de GitHub/organização.
- Aplicada exclusivamente a primeira fundação, checksum inalterado. Histórico remoto contém somente `20261027152920 / i3_private_foundation`, versão gerada pela ferramenta para o conteúdo do arquivo local `20261026164923`. Concessão administrativa posterior: uma autorização ativa para o UUID esperado. Não reaplicar automaticamente por diferença de prefixo.
- Oito tabelas com RLS, papéis de cliente sem superuser/bypass, sem DML nas tabelas privadas/autorização e sem USAGE/SELECT ao anônimo. Única RPC `api.i3_readiness`, invoker, sem EXECUTE ao anônimo. Protocolo posterior ausente.
- Executado novo script administrativo `scripts/sql/i3-verify-foundation.sql` no PostgreSQL hospedado: **12 verificações aprovadas**, cobrindo readiness desligado, linha exata autorizada, sete tabelas vazias, autoautorização/DML recusados, identidade ausente/estranha e anônimo negados. Papéis reais com claims simulados administrativamente; não JWT/Google real. Nenhum usuário de teste ou dado financeiro criado.
- GETs HTTP com chave publicável aos perfis `atlas_private`, `atlas_security`, `api`: **406/PGRST106**, schemas efetivamente expostos informados como `public, graphql_public`. Essa configuração não foi alterada. GET Auth antes/depois: cadastro fechado, nenhum método habilitado. Inventário final: um usuário confirmado, zero logins/Google e uma autorização ativa; sete tabelas financeiras vazias.
- Advisors: segurança somente WARN de proteção de senhas vazadas desligada; desempenho três INFO de índices ainda não usados. Nenhuma correção/configuração adicional executada.
- Sem alteração de aplicativo/dependências/migrações locais; fluxo local completo anterior não repetido. Validação desta etapa: consultas reais, negativas de permissões, inventário e HTTP. Sem pagamento, serviço novo ou publicação.

[Relatório completo, limitações e próxima configuração sujeita à aprovação](RESULTADO_FUNDACAO_REMOTA_I3.md). I3 continua incompleto.

## Recuperação, inventário real e autorização preparada — 27/10/2026

- Branch I3 recuperada a partir do HEAD remoto `40e31a6bad4a31587b0c41d5049598b098ecbd50`, inicialmente limpa. Sem reset, merge ou force push.
- Leituras Supabase: projeto ativo/Free; 1 usuário confirmado, 0 anônimos, 0 logins registrados; 1 identidade Email, nenhuma Google. Schemas Atlas ausentes e lista de migrações vazia. Nenhuma relação em `public`, extensão GraphQL ausente, defaults de clientes encontrados específicos de `public`. Configuração efetiva de schemas HTTP não verificada pelos parâmetros SQL; raiz REST com chave publicável retornou 401 pedindo chave secreta, sem contorno administrativo.
- GET público de Auth: cadastro fechado, todos os métodos retornados desligados. URLs aceitas por relato do usuário, sem acesso à captura anterior ou nova comprovação de salvamento. Sem cadastro/login ou escrita remota.
- `npm ci --no-audit --no-fund` e `npm run check` aprovados na base recuperada: **191 testes/1 ignorado, 24 navegador, 3 PWA**, typecheck/build. O ignorado depende do manifesto privado antigo ausente. Avisos esperados de cores e bloqueio de arquivo fora da raiz não impediram o fluxo.
- `node --test scripts/i3-user-admin.test.mjs`: **11 aprovados**, sem executar o helper administrativo real.
- Novo procedimento SQL de autorização preparado, sem migração existente alterada. `npx vitest run tests/authorization-preparation.test.ts`: **10 aprovados**; `npm run typecheck` aprovado depois da inclusão. O check completo acima precedeu esses novos testes; sem alteração do aplicativo distribuído.
- UUID do único pré-cadastro conferido por leitura administrativa e mantido somente em registro privado ignorado pelo Git; email não consultado, nenhum segredo obtido. `git check-ignore` confirmou a exclusão. Uma falha local de parsing da resposta ocorreu antes do registro; consulta somente de leitura repetida com parsing corrigido, sem qualquer requisição de escrita.

[Artefatos, precondições e proposta para aprovação](AUTORIZACAO_BACKEND_I3.md). Testes SQL em PGlite com papéis/identidades simulados; sem JWT, gateway, concorrência independente ou dois dispositivos físicos. Nenhuma concessão real criada, provedor ativado, projeto recriado, cobrança habilitada ou publicação executada. I3 incompleto.

## Decisão do usuário e preparação dos retornos — 27/10/2026

Usuário recusou a troca do segredo e pediu continuidade, sem evidência de rotação/revogação; decisão registrada sem manter a troca como exigência geral. `get_project_url` reconfirmou alvo Supabase. Código atual calcula retorno `/auth/callback` pela origem; proposta de Site URL `http://127.0.0.1:5173` e Redirect URL exata correspondente preparada para salvamento pelo usuário, sem execução ou comprovação do estado salvo. GET público atual: `disable_signup: true`, Google/Email/anônimo `false`. [Registro](CONFIGURACAO_EXTERNA_I3.md). Sem uso/transcrição de segredo, alteração remota pelo agente ou teste de login. Código inalterado; testes não repetidos para o checkpoint documental.

## Cliente OAuth observado e credencial exposta — 27/10/2026

Captura mostra criação de cliente Google e segredo ativo legível. Criação observada por captura; callbacks, origens, tipo/nome, escopos e lista de testes não verificados. Credencial tratada como exposta: substituição no mesmo cliente com desativação do segredo anterior proposta conforme fonte oficial, mas não executada pelo agente nem confirmada pelo usuário. Valor/identificadores/sufixos/hash/imagem não transcritos em arquivos, pesquisas, comandos ou Git. [Registro e próxima ação](CONFIGURACAO_EXTERNA_I3.md).

`get_project` reconfirmou o projeto Supabase existente ativo. GET público de settings: `disable_signup: true`, Google/Email/anônimo e todos os métodos retornados `false`. SELECT agregado: **1 usuário, 1 email confirmado, 0 identidades Google**. Sem login, uso do segredo exposto ou alteração remota pelo agente; nenhuma prova de revogação/rotação declarada. Código inalterado; testes locais não repetidos para o checkpoint documental.

## Roteiro completo Google OAuth — 27/10/2026

Captura mostrou Auth Platform ainda não configurada. A pedido do usuário, preparado [roteiro de todos os campos](ROTEIRO_GOOGLE_OAUTH_I3.md), sem pedir uma captura por campo. Fontes primárias atuais Google/Supabase consultadas para assistente, público, escopos, clientes, loopback, branding e armazenamento do segredo exibido uma única vez. `get_project_url` reconfirmou URL operacional; porta/origem e `/auth/callback` conferidos no código, sem alterar configuração. Lista pública de sufixos confirmou `supabase.co`; domínio do projeto tratado conforme regra de domínio privado, sem alegar propriedade/verificação.

Roteiro sanitizado com placeholders; sem email/UUID/Client ID/Secret reais. Nenhuma configuração Google/Supabase ou `.env` real aplicada, nenhum login OAuth testado. Gate de autorização do UUID/backend mantido antes da ativação do provedor. Código inalterado; testes não repetidos para a preparação documental.

## Vínculo de faturamento Google conforme relato — 27/10/2026

Usuário informou texto explícito após consulta do projeto Google: `Este projeto não tem uma conta de faturamento`. Evidência de relato específico do painel, sem API independente; vínculo ausente naquele momento conforme relato. Não é inspeção de cartões/contas de pagamento ou garantia de gratuidade de outros serviços. [Registro e próxima preparação de Auth](CONFIGURACAO_EXTERNA_I3.md). Nenhuma configuração OAuth, pagamento/trial ou cliente Google executados pelo agente. Código inalterado; testes não repetidos para o checkpoint documental.

## Criação Google observada por captura — 27/10/2026

Usuário enviou configurações do novo projeto `Atlas Financeiro`; nome/identificador correspondem ao formulário preparado, com número de projeto e Nenhuma organização visíveis. Evidência de criação pelo usuário via captura, sem consulta independente à API Google. A seção Conta de faturamento está cortada: vínculo não verificado, custo/configuração de faturamento não presumidos. Próxima etapa é leitura desse trecho antes de OAuth. [Registro](CONFIGURACAO_EXTERNA_I3.md). Captura/IDs fora do Git; nenhum cliente OAuth, serviço pago ou faturamento configurados pelo agente. Código inalterado; testes não repetidos para este checkpoint documental.

## Formulário de projeto Google preparado — 27/10/2026

Captura mostra nome `Atlas Financeiro`, identificador gerado, organização/recurso pai Nenhuma organização, aviso de oito projetos restantes e botão Criar. Não há campo de faturamento visível; nenhum pagamento/trial foi autorizado. Proposta limitada à criação desse projeto após concordância do usuário, manifestada pela própria ação Criar na interface. Ainda sem evidência de criação ou faturamento real pós-criação. [Registro e condição de custo zero](CONFIGURACAO_EXTERNA_I3.md). Código inalterado, testes não repetidos; captura e identificador operacional fora do Git.

## Lista de projetos Google — 27/10/2026

Capturas do usuário: aba Todos com quatro projetos preexistentes, busca Atlas sem resultados no contexto selecionado. Não identifica projeto Google do Atlas nem autoriza reutilização/criação. Próxima etapa é preparar formulário Novo projeto, nome sugerido `Atlas Financeiro`, sem clicar Criar; conferir dados/faturamento antes de autorização específica. [Registro e fontes oficiais](CONFIGURACAO_EXTERNA_I3.md). Nenhuma alteração Google ou de faturamento, código inalterado e testes não repetidos para este checkpoint documental. Capturas e nomes/IDs de terceiros fora do Git.

## Captura inicial do Google Cloud — 27/10/2026

Usuário enviou captura da página inicial do console Google Cloud, com projeto preexistente não identificado como Atlas e oferta de trial/crédito. Não comprova configuração OAuth, conta Google de login escolhida, situação de faturamento ou existência de projeto Google adequado ao Atlas. Próxima ação é inventário visual de projetos, somente leitura. [Registro e limites](CONFIGURACAO_EXTERNA_I3.md). Nenhuma criação/configuração Google executada; captura, nomes/IDs externos e dados da conta não versionados. Código inalterado; testes não repetidos para este checkpoint documental.

## Pré-cadastro administrativo real — 27/10/2026

Após autorização específica e entrada privada local da credencial, helper retornou `USUARIO_CRIADO_E_CONFERIDO`: precondições de Auth/inventário, uma chamada createUser sem senha/convite, listagem e getUserById. Recibo comparado ao alvo privado: projeto/conta corretos, UUID válido e email confirmado. Captura do usuário mostra a mensagem de sucesso, sem valor de credencial. Não houve retry de POST nem segunda criação; entradas inválidas anteriores pararam antes de rede/marcador.

Consulta remota agregada independente confirmou **1 usuário, 1 email confirmado, 0 anônimos, 0 usuários com login realizado, 0 identidades Google**. Campo de senha não vazio: **1**, embora pedido tenha omitido senha. Fonte oficial de adminUserCreate gera senha aleatória quando omitida; resultado compatível, sem leitura de hash ou senha e sem alteração posterior. Não alegar campo de senha vazio. GET público: cadastro fechado, Email/anônimo/Google e todos os métodos retornados desabilitados. Projeto ativo/Free reconfirmados na retomada. [Fontes, resultado e limites](CONFIGURACAO_EXTERNA_I3.md).

Evidência real restrita ao pré-cadastro administrativo e leituras. Não comprova primeiro vínculo/login Google, autorização financeira, JWT/PostgREST, schema próprio, concorrência, sync ou dois aparelhos. Nenhuma migração, SQL de alteração, publicação ou dado financeiro remoto. Email/UUID/credencial fora do Git. Código do app inalterado; 11 testes locais do helper aprovados conforme abaixo, sem repetir suíte financeira/navegador.

## Retomada e diagnóstico local de credencial — 27/10/2026

Projeto ativo e Free reconfirmados; leitura agregada retornou zero usuários, zero emails confirmados e zero usuários com senha. Janela anterior fechada, sem marcador/recibo. Capturas posteriores mostraram erro de formato e depois diagnóstico específico de Publishable, ambos antes de inicializar SDK/requisições; valores ocultos, sem segredo em registro técnico. Resultados sanitizados de falhas anteriores arquivados privadamente antes de reabrir, sem apagar marcador. Criação remota ainda não comprovada.

`node --test scripts/i3-user-admin.test.mjs`: **11 aprovados**. Novos casos: espaços externos, classificação de Secret key/legado service_role, recusa de Publishable, anon, valores mascarados e formatos inválidos sem revelar entrada. JWT local apenas classificado; assinatura/privilégios serão verificados pelo serviço. `node --check`, parser PowerShell e `git diff --check` aprovados. Nenhum teste de transporte administrativo hospedado aprovado por esses resultados. [Estado e próxima entrada privada](CONFIGURACAO_EXTERNA_I3.md). App inalterado; suíte financeira/navegador não repetida.

## Execução privada com menor interação — 27/10/2026

Wrapper ampliado com `-AlvoPrivado` (alvo operacional ignorado, sem chave) e `-SalvarResultado` (somente estado/horário privados). Nove testes Node novamente aprovados; parser PowerShell aprovado. Teste real PowerShell não interativo recusou alvo privado ausente antes de entrada de chave ou rede. `git check-ignore` confirmou exclusão dos arquivos de alvo/resultado. Processo/Explorer na mesma sessão Windows interativa; uma única janela foi iniciada. Última conferência local: janela ativa, sem tentativa/recibo. Não comprova criação nem integração administrativa ainda. [Escopo autorizado e retomada](PRE_CADASTRO_ADMIN_I3.md). Nenhuma chave lida pelo agente, nenhum segredo em argumentos/logs/Git; testes de app não repetidos, pois app não mudou.

## Autorização de pré-cadastro e reconsulta — 27/10/2026

Usuário autorizou especificamente um único cadastro confirmado, sem senha/convite, no projeto existente. `get_project`: mesmo projeto ativo; `get_organization`: `free` / `tier_free`; SELECT agregado somente de leitura em `auth.users`: **zero usuários**. Nenhuma chave administrativa obtida, execução interativa, janela iniciada ou criação realizada. Política PowerShell consultada por leitura: LocalMachine RemoteSigned, demais escopos Undefined; sem alterações de política. [Próxima entrada privada e limites](PRE_CADASTRO_ADMIN_I3.md). Código inalterado desde os nove testes locais abaixo; testes não repetidos para este checkpoint documental.

## Helper administrativo local de pré-cadastro — 27/10/2026

Identidade escolhida; email real ausente dos arquivos. `node --test scripts/i3-user-admin.test.mjs`: **9 aprovados**, com IO administrativo simulado e CLI real apenas rejeitando credencial sintética inválida antes de acessar a rede. Verificados: prévia sem escrita; payload exato sem senha/convite; bloqueios por inventário não vazio, configurações abertas/incompletas, entrada inválida e falha inicial/marcador; uma única tentativa sem retry após resultado incerto; verificação de identidade/confirmação e falha do recibo privado; saída sem valores privados.

`node --check` aprovado. Parser PowerShell sem erros sintáticos; wrapper não executado interativamente. SDK fixado local carregado sem inicializar cliente. `git check-ignore` confirmou exclusão de `.private/i3-admin/tentativa.json` e `usuario.json`, sem criar esses arquivos. [Procedimento e limites](PRE_CADASTRO_ADMIN_I3.md). Nenhuma credencial administrativa ou criação remota; testes não comprovam SDK/gateway administrativo hospedado. Arquivos novos ficam fora de `app/`; dependências, aplicativo e migrações não mudaram. Suíte financeira/navegador não repetida nesta preparação isolada.

## Inspeção de criação sem senha — 27/10/2026

Captura do formulário: Email, Password e Auto confirm user marcado. Código público oficial de CreateUserModal exige senha não vazia; documentação de `auth.admin.createUser` inclui exemplo com email confirmado e sem senha. [Fontes e decisão](CONFIGURACAO_EXTERNA_I3.md). Isso valida a existência documental de alternativa administrativa, sem comprovar execução no projeto hospedado ou primeiro vínculo Google. Não houve submissão pelo agente, nova contagem, credencial administrativa ou criação de usuário. Escolha privada da identidade ainda pendente. Código local inalterado; suíte não repetida para este checkpoint documental.

## Contagem de usuários por leitura agregada — 27/10/2026

Usuário informou que atualizar o painel não mudou a divergência. `get_project` reconfirmou o projeto existente. `execute_sql`, somente com `select count(*)::text as total_usuarios from auth.users;`, retornou `"0"`. Inventário exato naquele momento: zero usuários. Não foram lidos dados individuais ou credenciais; nenhum DDL, DML, migração ou configuração foi executado. A estimativa visual de 10 não corresponde à contagem observada, sem causa diagnosticada para o rodapé. [Registro e próxima inspeção do formulário](CONFIGURACAO_EXTERNA_I3.md).

Este é o primeiro SELECT remoto documentado nesta sequência, distinto de aplicar alterações remotas. Não é teste de cadastro/login ou autorização. Código inalterado; suíte local não repetida para o checkpoint documental sanitizado. Nenhum usuário criado, provedor habilitado ou publicação realizada pelo agente.

## Inventário visual de usuários — 27/10/2026

Captura do usuário, no projeto correto: nenhuma linha na lista, busca aparentemente vazia e mensagem `No users in your project`, com `Total: 10 users (estimated)` no rodapé. Inventário inconclusivo; estimativa não foi tratada como contagem real nem ausência de linhas como prova definitiva de ausência de usuários. Orientar atualização da lista e nova conferência. [Registro](CONFIGURACAO_EXTERNA_I3.md). Sem nova consulta administrativa, SQL remoto ou alteração de usuários pelo agente. Somente documentação sanitizada; captura/dados da conta não versionados, código inalterado e testes locais não repetidos.

## Confirmação individual de vinculação manual — 27/10/2026

Usuário confirmou afirmativamente que `Allow manual linking` está desligado no painel. Evidência classificada como relato específico do usuário, sem captura ou consulta administrativa independente. Nenhuma nova leitura/alteração remota ou teste de cadastro/login nesta etapa. Próxima ação guiada é inventário visual da existência de usuários, sem dados pessoais no chat ou criação/alteração. [Registro](CONFIGURACAO_EXTERNA_I3.md). Código inalterado; testes locais não repetidos para este checkpoint documental.

## Email desativado confirmado — 27/10/2026

`get_project` reconfirmou o projeto existente. Após relato de conclusão da etapa Email, GET público de Auth settings com URL distinta e `Cache-Control: no-cache`: `disable_signup: true`, todos os valores retornados em `external` como `false`, incluindo Email, Google, telefone e entrada anônima. Configuração pública informa cadastro fechado e Email desativado. Vinculação manual não consta na resposta; confirmação individual do painel ainda pendente. Não houve tentativa de cadastro/login, leitura de usuários ou alteração de Auth pelo agente. [Registro](CONFIGURACAO_EXTERNA_I3.md).

Checkpoint somente documental; código inalterado e suíte local não repetida. Sem SQL remoto, publicação, novos recursos ou custos pelo agente. Integração real e I3 continuam incompletos.

## Cadastro fechado após correção do formulário — 27/10/2026

Após segundo relato de conclusão do usuário, `get_project` reconfirmou o projeto existente. GET público de Auth settings com URL distinta e `Cache-Control: no-cache`: `disable_signup: true`, `external.anonymous_users: false`, `external.email: true`, `external.google: false`. Configuração pública informa cadastro fechado e entrada anônima desabilitada. Vinculação manual não consta na resposta; confirmação individual no painel e verificação independente ainda pendentes. Não foram tentados cadastro ou login. [Registro e próxima etapa Email](CONFIGURACAO_EXTERNA_I3.md).

Somente leituras remotas pelo agente e atualização documental sanitizada. Código inalterado, suíte local não repetida; resultados locais aprovados abaixo permanecem referentes à execução anterior. Email ainda não foi desabilitado; Google, SQL remoto, usuários e publicação não foram configurados pelo agente.

## Reconsulta após relato de conclusão do formulário — 27/10/2026

Projeto existente reconfirmado com `get_project`. Duas leituras públicas de Auth settings, após o relato de conclusão do usuário: `disable_signup: false`, `external.anonymous_users: true`, `external.email: true`, `external.google: false`. A segunda requisição usou URL distinta e `Cache-Control: no-cache`. Cadastro público ainda aberto e entrada anônima habilitada; a etapa não passou na conferência. Vinculação manual ausente da resposta e não verificada. [Detalhes e próxima ação](CONFIGURACAO_EXTERNA_I3.md).

Nenhuma tentativa de cadastro/login ou alteração remota pelo agente. Somente documentação técnica sanitizada alterada; suíte local não foi repetida, pois o código não mudou desde a execução aprovada abaixo. Não avançar para Email/Google antes de corrigir e conferir este formulário.

## Recuperação e leitura de Auth — 27/10/2026

- `git fetch origin`, checkout da branch I3 e igualdade de HEAD com `git ls-remote`: `300098a7c59b41f7cbc972cda91a74753c93317b`, sem commit posterior na branch no momento da recuperação. Diretório inicialmente limpo; sem reset, force push ou merge.
- Leituras Supabase: projeto existente ativo em São Paulo, organização `free` / `tier_free`. GET público de Auth settings com chave publicável ativa: `disable_signup: false`, `external.email: true`, Google/anônimo/telefone e demais provedores retornados `false`. Vinculação manual ausente da resposta e não verificada. Sem credencial administrativa, login, tentativa de cadastro, SQL remoto ou alteração de configuração. [Registro detalhado](CONFIGURACAO_EXTERNA_I3.md).
- Node 22.13.0/npm 10.9.2. `npm ci`: 70 pacotes adicionados, 71 auditados, zero vulnerabilidades reportadas. Nenhuma atualização de dependência ou lockfile.
- `npm run check` concluído com código 0 nesta VM: **191 aprovados/1 ignorado** em 16 arquivos Vitest, **typecheck/build aprovados**, **24 testes de navegador** e **3 de PWA**. O teste privado do manifesto histórico continua ignorado pelo motivo já documentado. Testes sintéticos não comprovam Google real, JWT/PostgREST, concorrência independente ou dois aparelhos.
- Browser plugin not available; executada a suíte Playwright/Edge já versionada, desktop 1280×900 e celular emulado 390×844, em `http://127.0.0.1:5173` e PWA em `http://127.0.0.1:4173`. Nenhuma alteração de interface ou nova inspeção visual manual foi realizada. Avisos `NO_COLOR`/`FORCE_COLOR` do runner e recusa deliberada de arquivo fora da raiz Vite não causaram falha.

Este checkpoint altera somente documentação técnica sanitizada. O modo remoto continua desabilitado; cadastro fechado e desativação de Email continuam pendentes de execução pelo usuário, confirmação e nova leitura. Plano Free não equivale a inspeção de cartão ou garantia de gratuidade permanente. Nenhuma publicação, pagamento/trial ou piloto foi executado.

## Inventário externo confirmado — 26/10/2026

Após criação pessoal pelo usuário, `list_projects` confirmou `atlas-financeiro-i3`, região `sa-east-1`, estado `ACTIVE_HEALTHY`; `get_organization` confirmou `plan: free` e `tier: tier_free`. Somente leitura; não foram inspecionados métodos de pagamento, Auth, usuários ou schema nem aplicadas migrações/configurações. Não é teste de integração. Código inalterado; a suíte não foi reexecutada para este checkpoint documental. Dados operacionais privados/segredos não integram o registro. Detalhes em [CONFIGURACAO_EXTERNA_I3.md](CONFIGURACAO_EXTERNA_I3.md).

## Resultado vigente — interface de sessão e cópia I3 — 26/10/2026

Após a ligação da interface e correção das falhas de armazenamento no bloqueio, `npm run check` concluiu integralmente nesta VM: **191 aprovados/1 ignorado**, em 16 arquivos Vitest, **typecheck/build aprovados**, **24 testes de navegador** e **3 PWA**. Os totais seguintes são históricos. Os 27 testes adicionados depois da recuperação são 5 de política, 12 do adaptador e 10 do controlador; os testes de motor foram ampliados para guardar conflito resolvido e exportar sua evidência.

| Fronteira/caso | Evidência observada |
|---|---|
| Aplicação recuperada | `34b6566`: 164/1 ignorado, com falha de compilação real identificada; diagnóstico em `3885cc4`. Não foi tratado como entrega funcional. |
| Sessão/controlador + banco | PGlite/fake-indexeddb com identidade simulada: associação, origem preservada, retomada após commit perdido, namespace por conta, expiração/offline, readiness falso, revogação e bloqueio mesmo com falha de armazenamento. |
| UI de acesso | Playwright/Edge: título/URL, conteúdo não vazio, ausência de overlay, console sem erros relevantes; associação exige confirmação. Snapshot financeiro desaparece ao sair, inclusive por segunda aba, e permanece bloqueado após recarga. |
| Pendência e reentrada | Conta sintética criada na UI; Auth desconectado/expirado; recarga mantém projeção e pendência; logout não apaga; reentrada permite confirmação pelo transporte sintético, sem efeito duplicado. |
| Cópia I3 | JSON baixado pelo navegador com cursor, proveniência, base confirmada, projeção, recibos e pendência; sem tokens. Teste SQL/motor inclui conflito e tentativa resolvida preservados. Importador I2 recusa o formato. Não houve teste de restauração I3. |
| Regressão I1/I2 | 20 cenários de navegador anteriores preservados. PWA de produção local: offline/outbox, recuperação mínima I2 e atualização após fechar abas, sem perder dados. |
| Bundle | Busca por identificadores de `auth-browser-entry`, fixture de sessão, fake-indexeddb e PGlite sem correspondências em `app/dist`; testes não integram a aplicação. Modo de integração desabilitado por padrão. |

Ambiente: `http://127.0.0.1:5173` no desenvolvimento e `http://127.0.0.1:4173` para PWA; Edge 1280×900 e 390×844. Browser plugin indisponível, usado Playwright versionado. Capturas de sessão/bloqueio desktop/celular salvas e inspecionadas em `%TEMP%`, fora do Git. Para futuras sessões de revisão interativa, o Browser plugin é opcional; não é necessário para executar esta suíte.

Falhas intermediárias: dois seletores do novo teste usavam nomes diferentes dos botões reais; foram corrigidos sem retries ou skips. A inspeção visual mostrou botão Google sem contraste por variáveis CSS fora do shell; a tela passou a herdar o tema e as capturas seguintes mostraram texto/ação legíveis. A revisão de erros também encontrou bloqueio em memória que podia não ser publicado se `localStorage` falhasse durante troca/revogação; corrigido e comprovado com dois testes de falha injetada. O fluxo completo foi reexecutado depois dessas mudanças.

Os testes de Auth no navegador substituem a entrada por um módulo exclusivo de teste com identidade/transporte sintéticos. **Não são Google real, JWT/PostgREST, concorrência entre conexões, PWA autenticada real ou dois aparelhos.** O `psql` e Docker não foram encontrados nesta VM. Limites/pendências em [STATUS_I3_LOCAL.md](STATUS_I3_LOCAL.md). Nenhum serviço externo, OAuth real, SQL remoto, deploy, pagamento/trial, piloto ou dado financeiro pessoal foi usado. I3 permanece incompleto.

## Lote de sessão/controlador depois da recuperação — 26/10/2026

`npm run check` concluído integralmente nesta VM: **189 aprovados/1 ignorado**, 16 arquivos Vitest, typecheck/build, **20 testes Edge** e **3 PWA**. Os 25 novos testes são 5 da política de sessão, 12 do adaptador/configuração/callback e 8 do controlador com PGlite/fake-indexeddb. O teste privado de manifesto continua ignorado pelo motivo histórico; nenhum teste obrigatório de Auth foi declarado como aprovado por essa omissão.

Cobertos: associação explícita sem alterar a origem, retomada por mesmo identificador após commit/resposta perdida/recarga, origem alterada bloqueando ativação, expiração com leitura/gravação offline e envio bloqueado, logout offline persistido com pendência, evento/token e resposta de verificação atrasados sem desbloqueio, conta diferente sem herdar associação, readiness falso e acesso revogado. O SDK é simulado nos testes do adaptador, e as identidades/RLS do banco são simuladas como nos testes recuperados. Não comprova OAuth hospedado, gateway ou dois aparelhos. A interface de I2 ainda não usa esse controlador neste lote.

Documentação oficial consultada: [PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow), [getUser](https://supabase.com/docs/reference/javascript/auth-getuser), [signOut](https://supabase.com/docs/reference/javascript/auth-signout) e changelog em 26/10/2026. A mudança recente de TLS refere-se a clientes antigos; não muda a API usada aqui. Nenhum serviço/configuração real foi acessado.

## Revalidação da recuperação — 26/10/2026

Em `34b6566`, após `npm ci`, `npm run check` passou nos 164 testes/1 ignorado e falhou no typecheck (9 erros de Auth/controlador). Os 16 testes de protocolo SQL e 12 do motor recuperados passaram novamente nesta VM. Build e PWA não foram executados pelo fluxo interrompido. [Diagnóstico e limites](RECUPERACAO_I3.md). Os resultados seguintes pertencem aos checkpoints anteriores.

`npm run test:browser` foi executado separadamente no código recuperado: **20 aprovados**, desktop/celular emulado no Edge. Isso verifica a interface local I2/recuperação mínima, que ainda não importa Auth/controlador. Browser indisponível entre as ferramentas desta sessão; usado o Playwright já versionado. Não comprova login ou proteção visual de logout.

## Checkpoint inicial de I3 — 26/10/2026

Branch `codex/incremento-3-local-foundation`. Node 22.13.0/npm 10.9.2 no Windows. Após atualização do lockfile, `npm ci` concluiu com 62 pacotes auditados e zero vulnerabilidades conhecidas reportadas. `npm run check` concluiu integralmente:

| Verificação | Resultado observado |
|---|---|
| Unitários e persistência local | 129 aprovados. Incluem os 115 de I2 e 14 novos de recuperação mínima. |
| SQL embarcado | 7 aprovados em PGlite 0.5.12; migração executada de arquivo, papéis/identidade simulados. |
| Total Vitest | 11 arquivos; 136 aprovados e 1 ignorado. |
| Typecheck/build | Aprovados. CLI/PGlite/fixtures não entram no bundle da aplicação. |
| Navegador | 20 aprovados no Edge: 14 de I2 e 6 novos, desktop 1280×900/celular emulado 390×844. |
| PWA de produção | 3 aprovados: offline/outbox I2, recuperação mínima offline seguida de nova operação/exportação, atualização de worker preservando dados. |

Recuperação: arquivo sintético com saldo inicial de centavos não redondos, previstos/realizados, edição por estorno/substituição, transferência/estorno e cancelamento. Exportação realmente baixada → perfil novo → prévia sem gravação → confirmação → reabertura → nova exportação. Conteúdo financeiro/outbox exato, origem intacta, IDs preservados e repetição sem novas inserções. Foram recusados versão desconhecida, contagem, proprietário, dinheiro numérico, referência, ID duplicado, payload divergente, tipo incorreto, meia transferência, campo desconhecido e destino divergente. Falha final da outbox provocou rollback, tanto em fake-indexeddb quanto no IndexedDB nativo. Falha no ponteiro ativo e repetição segura foram testadas unitariamente.

SQL: dois proprietários sintéticos com mesmos IDs financeiros leem somente suas próprias linhas; sem acesso ativo/revogado e papel anônimo não obtêm dados; cliente não pode ativar a si próprio, escrever finanças/cursor/recibo nem invocar helpers internos. Transferência incompleta reverte a carga inteira; ledger não permite update/delete; FK de proprietário é recusada; soma de centavos permanece exata. `api.i3_readiness()` informa escrita desabilitada. **Não há RPC financeira implementada.**

Browser plugin not available; usados Playwright e Edge já instalados. Identidade/título da página, conteúdo não vazio, ausência de overlay, console e ações de seleção/recuperação/reabertura foram conferidos. Capturas desktop/celular foram salvas no diretório temporário do sistema e inspecionadas, fora do Git. Não houve teste Android físico, leitor de tela, Safari ou Firefox.

Falhas intermediárias corrigidas: seletores Playwright de `status` ambíguos foram limitados ao painel de recuperação; tipagem do UUID sintético e opcional `baseURL` corrigidas antes do fluxo final completo. Nenhuma falha financeira foi ocultada com retry ou skip.

Limites desta evidência: PGlite é PostgreSQL embarcado de conexão única, com `auth.users`/`auth.uid()`/papéis simulados. Não prova JWT, PostgREST, configuração dos schemas expostos, advisors, Supabase completo ou concorrência entre conexões. A CLI 2.122.0 apenas gerou arquivo de migração local. Nenhum serviço, OAuth, SQL remoto, deploy ou piloto foi executado. Login/associação/sessão autenticada/sync real continuam pendentes, e I3 não foi concluído.

Os quatro originais privados foram localizados e lidos no Drive. O manifesto inicial de 24/10 permanece ausente: o teste de igualdade dos bytes históricos continua ignorado, sem substituição por hashes novos. As demais barreiras de Git/servidor continuam aprovadas.

## Histórico de validação de I1/I2

O restante deste documento preserva a evidência da entrega anterior; afirmações de ausência de importador/SQL executado/originais na VM referem-se àquela revisão de I2, não substituem o checkpoint de I3 acima.

Validação executada em 26/10/2026, no Windows, com Node.js 22.13.0 e npm 10.9.2. As dependências foram instaladas a partir de `app/package-lock.json` por `npm ci`; a auditoria do npm informou zero vulnerabilidades conhecidas naquele momento.

## Comandos e resultados

Executados a partir de `app/`:

| Comando | Resultado observado |
|---|---|
| `npm run typecheck` | Concluído sem erros. |
| `npm test` | 9 arquivos aprovados; 116 testes enumerados, 115 aprovados e 1 ignorado pela ausência do manifesto privado. |
| `npm run build` | Concluído; build Vite estático gerado sem sourcemaps. |
| `npm run test:browser` | 14 testes aprovados em Edge, nos perfis desktop e móvel. |
| `npm run test:pwa` | Build de produção e 2 cenários aprovados: gravação offline com outbox e atualização do worker com preservação dos dados. |
| `npm run check` | Fluxo sequencial completo aprovado: unitários, typecheck/build, navegador e PWA offline. |

Uma execução em cache frio revelou que a descoberta tardia do Dexie pelo Vite podia recarregar a página durante o `page.evaluate` do primeiro perfil. O caso foi reproduzido, e `vite.config.ts` passou a pré-otimizar o Dexie na inicialização. A validação final inclui execução sem cache prévio e repetições da suíte. `npm run check` serializa unitários, build, navegador de desenvolvimento e PWA de produção.

## Evidências cobertas

- Entrada brasileira convertida como texto, formatação BRL exata, negativos/formatos inválidos e limites.
- Casos de referência: `50,00 − 18,00 = 32,00`; `13,00 + 6,82 + 29,99 = 49,81`; `186,62 + 36,30 = 222,92`; `775,08 + 428,63 = 1.203,71`.
- Soma acima de `Number.MAX_SAFE_INTEGER`, preservação de um centavo, rateio com resto e arredondamento em pontos-base.
- JSON versionado com centavos positivos e negativos em strings canônicas; rejeição de números JSON e campos desconhecidos.
- Reabertura do IndexedDB mantendo `bigint`, tanto em `fake-indexeddb` quanto no navegador real.
- Rollback de falha na última coleção, preservando o estado anterior, em `fake-indexeddb` e no IndexedDB nativo.
- Isolamento de bases por proprietário, rejeição de propriedade misturada, referências ausentes e IDs duplicados.
- Previsões não alteram caixa; saldo inicial é ajuste e não renda; transferências exigem duas contrapartidas opostas e não mudam o patrimônio total.
- Datas de competência, pagamento e liquidação são distintas; liquidação parcial não reconhece o total como pago.
- O servidor de desenvolvimento restringe sua raiz a `app/`, recusa nomes privados e não serve `.git`, `.private`, `.env` ou documentos originais. O bundle não contém dados financeiros pessoais conhecidos.
- Conta com saldo inicial e categoria criadas pela interface; despesa de `R$ 18,00` sobre `R$ 50,00` resulta em `R$ 32,00` e permanece após recarga.
- Correção de `R$ 18,00` para `R$ 20,00` cria original, estorno e substituição; o saldo passa a `R$ 30,00` sem apagar o histórico.
- Transferência e respectivo estorno preservam as duas contrapartidas e o patrimônio total; reserva simples usa conta `reserved`.
- Operação financeira e outbox sofrem commit ou rollback juntas, inclusive quando a escrita final na outbox falha.
- Backup baixado no navegador contém manifesto, centavos em strings e operações pendentes; a interface deixa explícito que restauração ainda não existe.
- PWA de produção registra service worker, reabre offline e mantém os dados financeiros persistidos no IndexedDB.

## Limitações reais

- Os testes de interface usam Edge/Chromium no Windows: desktop 1280×900 e celular emulado 390×844. Não houve aparelho Android físico, instalação pela interface do Chrome Android, teclado Android real, leitor de tela, Safari ou Firefox. O manifesto e os PNGs 192/512 foram conferidos; isso não comprova instalação em todo aparelho.
- Dashboard filtra o fluxo pelo mês financeiro atual, sem seletor de período/conta/categoria nesta interface. A regressão usa fevereiro e os unitários cobrem meses de 28, 29, 30 e 31 dias; cálculos de domínio preservam limites inclusivos. Não há previsão de saldo futuro apresentada como disponível.
- Não se executou o ciclo exportar → restaurar → comparar: importação, prévia, substituição e gerações pertencem a I4. I2 não aceita arquivos de entrada nem modifica a base a partir de arquivos.

- O teste de igualdade/hashes dos quatro documentos privados está ignorado porque o manifesto e os originais não existem nesta VM. Exclusão do Git e não exposição continuam aprovadas.
- O SQL foi somente revisado como artefato de referência; não houve PostgreSQL, Supabase, RLS ou RPC em execução.
- Google OAuth, usuário pré-cadastrado, cadastro desativado, conta não autorizada e usuário autenticado sem autorização são testes obrigatórios futuros, não executados.
- Não houve teste de autenticação, sincronização remota, restauração completa, gerações, deploy ou serviços externos, pois permanecem fora dos Incrementos 1 e 2.

## Revisão complementar de I2 — 26/10/2026

Continuação na branch existente `codex/incremento-2-local-finance`, a partir de `35e6a4e`, com worktree inicialmente limpo. `main` ainda continha I1. Nenhuma alteração anterior foi descartada. Browser plugin not available; foi usado o Playwright já instalado com Edge. Não foram adicionadas dependências.

Fluxo principal sob teste: primeiro uso vazio → conta/categoria → receitas e despesas realizadas/previstas → correção/realização da previsão → estorno/cancelamento → histórico/dashboard → exportação → recarga e nova aba no mesmo perfil.

| Verificação de interface | Evidência observada |
|---|---|
| Identidade e conteúdo | Título Atlas Financeiro, rota local e tela inicial com conteúdo real, sem overlay do Vite. |
| Console | Sem erros ou avisos da aplicação nos cenários que os monitoram; avisos de cores do runner e 403 deliberado do teste de privacidade não são erros da aplicação. |
| Celular e desktop | Capturas inspecionadas de início vazio, dashboard, conta, categoria, formulário, erro, confirmação, histórico, contas e exportação. |
| Teclado | Valor recebe foco inicial; sequência de Tab fica no diálogo; Escape fecha e devolve foco. Erro de valor inválido mantém campos e rola a mensagem para área visível. |
| Integridade | Submissão repetida no mesmo ciclo produz uma única receita. Histórico mantém originais, estornos e substituições; conta e categoria não se perdem. |
| Arquivo exportado | JSON baixado efetivamente lido: 1 conta, 1 categoria, 9 eventos, 6 liquidações e 10 pendências; soma exata das contrapartidas de 8.700 centavos após o fluxo completo. |
| Outra aba | Uma segunda aba acrescenta uma conta; a exportação solicitada na aba antiga relê o IndexedDB e inclui as 2 contas e 11 pendências, mesmo com snapshot visual anterior. |
| Reabertura | Nova aba no mesmo contexto IndexedDB mantém saldo de R$ 87,00, 9 eventos e 10 operações pendentes. |
| Outbox | Reabertura e reenvio do mesmo comando não duplicam dados; payload divergente é rejeitado; falha na escrita final desfaz todo o agregado. |
| PWA de produção | Worker pronto, recarga offline, despesa offline de 1 centavo, nova recarga com R$ 49,99 e duas pendências preservadas. |
| Atualização | Servidor local isolado oferece versões N/N+1 do HTML/worker. A nova versão espera com formulário aberto; depois de fechar a aba, assume a versão nova com saldo e pendência intactos, inclusive offline. Cache antigo é removido. |

Defeitos encontrados e corrigidos: fim mensal fixo em dia 31; foco inicial e ciclo de Tab nos diálogos; ação inferior do formulário cortada; baixo contraste de ações no tema escuro; falta de trava síncrona contra gravação repetida; payload de outbox desacoplado do agregado; exportação baseada no snapshot visual em vez de reler a base; cache sem versão por conteúdo. O primeiro teste do novo cache falhou por `Vary: Origin` nos ativos estáticos do preview; a busca por ativos estáticos pré-cacheados passou a ignorar `Vary`, preservando correspondência de URL.

O teste antigo de transferência dependia da ordem dos IDs no IndexedDB e, com UUIDs aleatórios, podia selecionar a conta reservada como origem. Foi corrigido para selecionar origem e destino pelos nomes, sem alterar a regra financeira. A ação de transferir agora abre diretamente o formulário de transferência.

Além de `npm run check`, foi executada QA temporária com Playwright sobre o build em `http://127.0.0.1:4173`, em 390×844 e 390×480: valor máximo de R$ 999.999.999,99 sem rolagem horizontal, contas, tema escuro e ação Salvar inteiramente visível com viewport reduzido. Esse ensaio simula pouco espaço vertical, não um teclado Android real. Capturas e script ficaram no diretório temporário do sistema, fora do Git; os testes reproduzíveis ficam no repositório.

`npm ci` concluiu com zero vulnerabilidades reportadas pelo npm. Tentativas iniciais de npm/Node/Git falharam por permissões do sandbox; a instalação e a validação foram depois executadas com acesso permitido. As falhas intermediárias de seletores de teste, foco, cache e ordem de contas foram corrigidas; somente a execução final bem-sucedida é o critério de entrega. `git diff --check` foi executado na revisão final. Nenhum teste foi ignorado além do manifesto privado ausente.

Uma tentativa da suíte PWA foi interrompida por porta 4173 ocupada pelo preview usado na inspeção visual. O preview foi encerrado antes da execução final, sem mudar a política de isolamento dos testes. No PowerShell deste ambiente, a chamada interativa com argumentos adicionais de host/porta não foi encaminhada corretamente pelo wrapper npm; `npm run preview` usa os valores corretos já definidos no Vite e foi o comando utilizado na inspeção.

Revisão dos arquivos preparados: somente código, testes, ícones próprios e documentação sanitizada; nenhum `.env`, banco, exportação, dependência, build, screenshot ou arquivo temporário preparado. Busca de padrões de credenciais conhecidas no patch não encontrou ocorrências. Essa busca não constitui auditoria de segurança integral. A execução final de `npm run check` concluiu todas as etapas com código 0; não há serviço local necessário para recuperar a entrega a partir do GitHub.

Entrega remota: as primeiras tentativas de push aguardaram credencial ou falharam explicitamente por falta de autenticação. Depois do login concluído pelo usuário, o push retornou `Everything up-to-date`; `git ls-remote origin refs/heads/codex/incremento-2-local-finance` e `git rev-parse HEAD` retornaram o mesmo SHA `214c3f97e9c641119c0f664a80602c25c0e87221`. Isso confirmou os três checkpoints no GitHub e resolveu o bloqueio. O registro documental final segue em commit posterior na mesma branch, sem alteração do código testado.

O pacote alternativo foi verificado com `git bundle verify .private/entrega/atlas-i2-checkpoints.bundle` e clonado com sucesso em diretório temporário, com HEAD `214c3f9` e worktree limpo. Para recuperar um pacote: `git clone -b codex/incremento-2-local-finance <caminho-do-bundle> Atlas-Financeiro-recuperado`. Ao usar esse caminho alternativo, configurar `origin` para o GitHub antes de enviar. O repositório remoto é o ponto de continuidade da entrega concluída.

## Validação documental do planejamento de I3 — 26/10/2026

- Leitura integral de `AGENTS.md`, README e documentação técnica existente; inspeção dos contratos de identidade, persistência, outbox e referência SQL. Os requisitos pessoais originais e seu manifesto seguem ausentes; essa leitura não foi alegada como realizada.
- `git fetch origin`, `git ls-remote origin refs/heads/codex/incremento-2-local-finance`, `git rev-parse HEAD` e `git status --porcelain`: base final de I2 confirmada no SHA `86bcdffebedaa09698a613c8f24e4bd7fa6ede6d`, com diretório inicialmente limpo.
- Pesquisa somente de leitura em documentação oficial Supabase, Google, PostgreSQL e Cloudflare. A busca documental Supabase funcionou; não foram usados comandos de projetos, credenciais, SQL ou configuração. Referências e datas em `REFERENCIAS_INCREMENTO_3.md`.
- Revisão do plano contra os dez tópicos solicitados, proteção de recuperação, limites de autorização e continuidade por GitHub. A proposta não foi marcada como aprovada no plano existente.
- `git diff --check`, conferência de links relativos, arquivos preparados e ausência de alterações em `app/`/`database/`. Somente Markdown sanitizado será versionado.
- Typecheck, unitários, build e navegador não foram reexecutados nesta tarefa documental; seus resultados acima pertencem a I2. Nenhum teste de OAuth, RLS, RPC, associação ou sincronização de I3 foi executado. A matriz A01–B02 é critério futuro de aprovação, não evidência de implementação.

Não houve criação/configuração de serviços, OAuth, migração remota, instalação de dependência, publicação ou início de implementação de I3/I4. O checkpoint documental usará prefixos de omissão de CI/Pages para não solicitar builds automáticos; nenhuma configuração de hospedagem foi alterada. A conferência do commit remoto será feita após o push na mesma branch existente.
