# Estado atual

## Protocolo remoto instalado e verificado, sem abertura financeira — 27/10/2026

Usuário autorizou prosseguir e executar o necessário em resposta à segunda migração. Protocolo aplicado (versão remota `20261027163903`), seguido de índice de apoio da FK (`20261027164301`); sem nova conta, serviço, pagamento ou publicação. Onze tabelas com RLS, três RPCs invoker, gate false e nove tabelas privadas vazias; mesmo usuário/Google/autorização. **24 verificações SQL hospedadas aprovadas**, com papéis reais/identidades simuladas, negativas HTTP e advisors conferidos. **10 testes nativos e check completo 201/1 ignorado +24 navegador/+3 PWA aprovados**. [Resultado, mapeamento e limites](RESULTADO_PROTOCOLO_REMOTO_I3.md). Não reaplicar migrações ou pedir aprovação repetida; associação/escrita continuam bloqueadas. Próxima conferência pessoal: recarregar a tela local, mantendo login verificado/envio aguardando liberação. I3 incompleto.

## Recarga/reentrada, conta negativa e concorrência local — 27/10/2026

Usuário confirmou F5 bloqueado e nova entrada na mesma conta; outra conta em teste foi recusada. Leituras preservam usuário/UUID/autorização únicos, uma identidade Google e tabelas financeiras vazias. Logs agregados mostram cadastro fechado na tentativa. Ferramenta local Windows PostgreSQL 17.10, isolada de app/servidor, passou **10 testes com conexões independentes**; clusters próprios encerrados. [Evidências e limites](CONCORRENCIA_E_ACESSO_I3.md). Próxima alteração concreta preparada: [aplicar somente segunda migração mantendo escrita false](PROTOCOLO_REMOTO_I3.md), ainda aguardando aprovação específica. Nenhuma migração, abertura financeira, serviço pago ou publicação remota nesta etapa.

## Saída local exibiu bloqueio; recarga e reentrada pendentes — 27/10/2026

Usuário informou pedido de entrada Google e aviso de acesso local bloqueado/pendências preservadas. Relato confirma o bloqueio visual após saída; não comprova recarga, nova entrada ou invalidação de JWT. [Evidência e continuidade](RESULTADO_PRIMEIRO_LOGIN_I3.md). Próximo passo: F5, confirmar bloqueio persistente e entrar novamente com a mesma conta. Não repetir saída já relatada nem associar base/abrir escrita. Sem nova inspeção ou alteração remota nesta atualização.

## Primeiro login Google real confirmado — 27/10/2026

Usuário relatou login verificado/envio aguardando liberação. SELECTs confirmaram um único usuário, mesmo UUID pré-cadastrado, conta confirmada, login registrado e identidade Google vinculada ao UUID esperado; autorização ativa preservada. Sete tabelas privadas vazias, RLS e bloqueio DML preservados. Cadastro fechado, somente Google habilitado, API restrita e anônimo negado. [Resultado e limites](RESULTADO_PRIMEIRO_LOGIN_I3.md). Associação ainda não realizada; não abrir escrita para ultrapassar a mensagem de associação. Próximo teste pessoal: sair/bloquear, recarregar e entrar novamente com a mesma conta, seguido de conferência por leitura. Protocolo posterior, testes negativos reais e dois aparelhos continuam pendentes.

## Google habilitado; primeiro login preparado — 27/10/2026

Após PRONTO do usuário, GET confirmou somente Google habilitado e cadastro fechado. Projeto ativo/Free, UUID/autorização única preservados, nenhum login/identidade Google ainda; oito tabelas com RLS, sem DML de cliente e sete tabelas privadas vazias. Readiness continua com escrita financeira falsa; HTTP privado/anônimo bloqueado. [Evidência e próximo teste](PRIMEIRO_LOGIN_GOOGLE_I3.md). Servidor local preparado em loopback com integration somente no processo e chave publicável, sem `.env` real/publicação ou mudança do padrão disabled. QA Edge desktop/celular aprovada; clique OAuth interceptado localmente, sem login remoto. Próxima ação para aprovação: primeiro login pessoal que vincule Google ao usuário existente, preservando UUID e bloqueio financeiro.

## Ativação somente Google autorizada, salvamento pendente — 27/10/2026

Usuário autorizou a proposta específica com `vamos`; não pedir novamente. Prévia por leituras: projeto ativo/Free, cadastro fechado, Google e todos os métodos retornados ainda desligados, autorização única exata, zero login/identidade Google e sete tabelas privadas vazias. [Roteiro completo e limites](ROTEIRO_GOOGLE_OAUTH_I3.md). Conector não configura o provedor: usuário deve preencher credenciais diretamente no painel e salvar; nenhuma ativação ou login comprovados ainda. Cadastro, métodos extras e escrita financeira permanecem desligados; aplicativo remoto disabled, sem `.env` real/publicação/protocolo posterior.

## Data API restrita conferida — 27/10/2026

Após salvamento relatado pelo usuário, leituras HTTP confirmaram somente `api` exposto. Perfis privados, `public` e `graphql_public` recusados com 406/PGRST106; POST anônimo de readiness negado com 401/42501. Projeto ativo/Free, autorização única exata e oito tabelas com RLS preservados; sete tabelas privadas vazias. Cadastro e todos os métodos retornados continuam desligados; readiness por SQL com identidade simulada mantém escrita financeira falsa. [Evidência e limites](VERIFICACAO_DATA_API_I3.md). Próxima proposta preparada: habilitar somente Google com cliente existente, mediante autorização específica; Google e aplicativo remoto continuam desligados. Sem nova migração, publicação ou custo habilitado pelo agente.

## Fundação privada e autorização única aplicadas — 27/10/2026

Após autorização específica, projeto existente ativo/Free e UUID privado exato reconfirmados, com identidade Email correspondente. Primeira fundação aplicada (versão remota `20261027152920`, conteúdo do arquivo local `20261026164923`), e uma autorização ativa criada para a conta pré-cadastrada. Oito tabelas com RLS, sem DML financeiro ao cliente; sete tabelas privadas vazias. Doze verificações no banco hospedado aprovadas com papéis reais/claims simulados; HTTP privado recusado com 406/PGRST106. Google, cadastro e escrita financeira continuam desligados, protocolo posterior ausente, sem publicação ou recurso pago. [Resultado e limites](RESULTADO_FUNDACAO_REMOTA_I3.md). Próxima configuração proposta: expor somente `api` na Data API, mediante aprovação própria; atualmente expostos `public, graphql_public`. I3 incompleto.

## Recuperação e revisão do backend — 27/10/2026

Recuperado HEAD remoto `40e31a6`, worktree inicialmente limpo. Leituras atuais: projeto existente ativo/Free, 1 usuário confirmado sem login e uma identidade Email; nenhum schema Atlas ou migração remota. Logo, autorização financeira ainda não existe. Cadastro público e todos os métodos retornados continuam desligados. Os endereços anteriores foram aceitos pelo usuário; captura não disponível. [Procedimento concreto preparado](AUTORIZACAO_BACKEND_I3.md): somente primeira migração privada e autorização do UUID pré-cadastrado, com escrita financeira bloqueada, aguardando aprovação específica. Nenhuma alteração remota executada. Base local revalidada e 10 testes do novo procedimento aprovados; I3 incompleto.

## Continuidade solicitada sem troca de segredo — 27/10/2026

Usuário recusou expressamente a troca recomendada e pediu o próximo passo; não presumir revogação nem repetir essa exigência. Orientar URLs locais de retorno no Supabase existente, sem salvamento comprovado ainda. GET atual confirma cadastro fechado e Google/Email/anônimo desligados. [Decisão, valores e limites](CONFIGURACAO_EXTERNA_I3.md). Ativação ainda requer revisão técnica de autorização da conta/backend e autorização remota específica; código e I3 incompleto preservados, nenhum segredo transcrito.

## Cliente OAuth criado; segredo exposto a substituir — 27/10/2026

Captura do usuário confirma criação de cliente Google e inclui segredo ativo; valor/identificadores/imagem não foram transcritos ou versionados. Próxima ação é substituir o segredo no mesmo cliente e desativar o anterior pela interface, com novo valor guardado privadamente, sem chat/captura. Rotação não executada ou confirmada. [Procedimento e evidência](CONFIGURACAO_EXTERNA_I3.md). Supabase por leitura continua ativo, cadastro fechado e métodos retornados desligados; um usuário confirmado, nenhuma identidade Google. Autorização do UUID/backend e integração permanecem pendentes; I3 incompleto.

## Google sem conta de faturamento vinculada — 27/10/2026

Usuário relatou mensagem explícita do painel: projeto Google não tem conta de faturamento. Confirmação por relato, sem API independente; não comprova ausência de cartões na conta nem gratuidade permanente de recursos futuros. Próxima etapa é abrir Google Auth Platform e conferir formulário antes de salvar configuração OAuth. [Registro vigente](CONFIGURACAO_EXTERNA_I3.md). Sem trial/serviço pago pelo agente; Supabase e pré-cadastro preservados, Google login pendente e I3 incompleto.

## Projeto Google criado pelo usuário — 27/10/2026

Captura confirma projeto Google `Atlas Financeiro` correspondente ao formulário preparado, em Nenhuma organização, criado pelo usuário após orientação condicionada à autorização específica. Vínculo de faturamento ainda não verificado: seção cortada na captura. Próxima etapa é leitura desse trecho antes de OAuth. [Evidência e limites](CONFIGURACAO_EXTERNA_I3.md). Supabase e pré-cadastro preservados, Google login ainda desabilitado; sem configuração paga ou OAuth pelo agente, I3 incompleto.

## Pré-cadastro criado e conferido — 27/10/2026

Criação autorizada concluída para a conta escolhida: exatamente um usuário, email confirmado, nenhum login/anonimato/Google. Recibo confere projeto/conta/UUID privadamente. Cadastro público e métodos de entrada continuam desligados; projeto ativo/Free. Pedido omitiu senha e convite; serviço gerou registro interno de senha, sem senha definida ou recebida pelo usuário/agente. [Evidência e precisão](CONFIGURACAO_EXTERNA_I3.md). Não repetir criação. Google, autorização financeira por UUID, schema/API, testes negativos, publicação e dois aparelhos continuam pendentes; I3 incompleto.

## Retomada da chave administrativa — 27/10/2026

Projeto ativo/Free e zero usuários reconfirmados. Entradas privadas pararam na validação local, sem requisições/marcador; a última foi Publishable. Helper agora distingue tipos, remove espaços externos e aceita Secret key ou legado service_role; 11 testes locais aprovados. Nova janela privada aguarda chave administrativa existente, sem criação comprovada. [Registro e limites](CONFIGURACAO_EXTERNA_I3.md). Não repetir com resultado incerto, nem pedir chave pelo chat.

## Janela privada de execução aberta — 27/10/2026

Usuário pediu autonomia para executar o cadastro já especificamente autorizado. Aberta uma única janela **Atlas I3 - chave privada**, com alvo preenchido privadamente; aguarda apenas chave oculta. Precondições/criação única/conferência automáticas após entrada. Última conferência: janela ativa, sem tentativa/recibo; cadastro ainda não comprovado. [Procedimento e retomada](PRE_CADASTRO_ADMIN_I3.md). Não iniciar outra execução enquanto pendente. Autorização não abrange Google, outras contas, SQL de alteração ou publicação.

## Pré-cadastro especificamente autorizado — 27/10/2026

Usuário autorizou criar um único cadastro confirmado da conta escolhida no projeto existente, sem senha/convite. Projeto ativo, Free e zero usuários reconfirmados por leitura; criação ainda não executada. Próxima etapa: localizar chave administrativa existente no painel e orientar entrada privada local, prévia e conferência antes da criação já autorizada. Nenhuma chave obtida ou janela iniciada. [Procedimento e escopo](PRE_CADASTRO_ADMIN_I3.md). Google, schema, publicação e demais alterações continuam separados; I3 incompleto.

## Procedimento de pré-cadastro preparado — 27/10/2026

Identidade Google escolhida pelo usuário, sem email versionado. [Helper administrativo local e procedimento](PRE_CADASTRO_ADMIN_I3.md) preparados para prévia sem escrita e criação explícita de um único usuário confirmado sem senha/convite, com entrada administrativa privada futura. Nove testes locais do helper aprovados; integração remota e entrada interativa não executadas. Próxima etapa: autorização específica antes da criação, por exigência do usuário. Nenhum usuário criado ou segredo administrativo obtido; última contagem real zero. Código do app, migrações, Google e publicação inalterados; I3 incompleto.

## Inspeção do formulário de criação — 27/10/2026

Captura mostra Email, Password e Auto confirm user marcado. Código público do formulário exige senha não vazia; referência oficial da API administrativa permite email confirmado sem senha. Orientação atual: fechar sem salvar e escolher privadamente a conta Google; preparar depois procedimento administrativo sem senha, com autorização específica antes de criar. [Evidência e limites](CONFIGURACAO_EXTERNA_I3.md). Nenhum usuário, segredo administrativo ou alteração remota nesta inspeção. Última contagem zero; I3 incompleto.

## Contagem de usuários confirmada — 27/10/2026

Após persistir a divergência do painel, projeto existente reconfirmado e SELECT remoto somente de leitura de `count(*)` em `auth.users` retornou **zero usuários**, sem dados individuais ou alterações. Estimativa visual de 10 não corresponde à contagem atual; causa não determinada. Próxima etapa: abrir formulário Create new user vazio para inspeção, sem criar/salvar. [Registro e limites](CONFIGURACAO_EXTERNA_I3.md). Código inalterado, nenhuma migração/configuração/criação de usuário/publicação e I3 incompleto.

## Vinculação manual confirmada pelo usuário — 27/10/2026

Usuário respondeu afirmativamente à pergunta específica sobre `Allow manual linking` desligado. Confirmação do painel relatada pelo usuário, sem verificação independente; demais controles conforme última leitura pública abaixo. Próxima etapa: conferir somente se Authentication → Users está vazia ou contém usuários, sem dados pessoais no chat ou criação/alteração de usuários. [Registro vigente](CONFIGURACAO_EXTERNA_I3.md). Sem nova leitura/configuração remota pelo agente, código inalterado e I3 incompleto.

## Email desativado confirmado — 27/10/2026

Leitura após conclusão da etapa Email pelo usuário: cadastro público fechado e todos os métodos retornados em `external` desabilitados, incluindo Email, entrada anônima, telefone e Google. Falta confirmação individual no painel de que vinculação manual está desligada; essa opção não consta na resposta pública. [Registro vigente e próxima conferência](CONFIGURACAO_EXTERNA_I3.md). Sem teste de cadastro/login, alteração de Auth pelo agente, SQL remoto, usuário ou publicação; aplicativo remoto desabilitado e I3 incompleto.

## Cadastro fechado após correção — 27/10/2026

Nova leitura após o segundo relato de conclusão do usuário: `disable_signup: true`, `external.anonymous_users: false`, Email habilitado e Google desabilitado. Configuração pública informa cadastro fechado e entrada anônima desligada; não houve teste negativo de cadastro/login. Vinculação manual continua sem confirmação individual ou verificação independente. Próxima etapa guiada: desabilitar Email e verificar após salvar, além de confirmar vinculação manual no painel. [Registro vigente](CONFIGURACAO_EXTERNA_I3.md). Agente não alterou Auth; aplicativo remoto desabilitado, I3 incompleto.

## Reconsulta do formulário de acesso — 27/10/2026

Depois do relato de conclusão do usuário, duas leituras de Auth settings ainda indicam cadastro público aberto (`disable_signup: false`) e entrada anônima agora habilitada (`external.anonymous_users: true`). Email habilitado, Google desabilitado; vinculação manual não verificada. Continuar orientando o mesmo formulário, com as três opções gerais desligadas e salvamento, antes de avançar para Email. [Evidência atual](CONFIGURACAO_EXTERNA_I3.md). Agente não alterou configuração remota; código e modo remoto desabilitado preservados.

## Retomada — 27/10/2026

Recuperado o HEAD remoto `300098a` na branch I3, sem commits posteriores no momento da consulta. Projeto existente ativo em São Paulo e organização Free reconfirmados. Consulta pública somente de leitura de Auth mostrou cadastro ainda aberto e Email habilitado; Google/anônimo desabilitados. Vinculação manual não verificada. [Registro atual e próxima etapa guiada](CONFIGURACAO_EXTERNA_I3.md). Nenhuma configuração remota foi alterada; o aplicativo continua com modo remoto desabilitado. I3 permanece incompleto.

## Início da configuração externa — 26/10/2026

O usuário criou pessoalmente `atlas-financeiro-i3`. Consulta somente de leitura confirmou projeto ativo em São Paulo e organização Free. [Registro e limites](CONFIGURACAO_EXTERNA_I3.md). Auth/API ainda não foram inspecionados/configurados pelo agente; nenhuma migração, Google real, publicação ou dado pessoal foi enviado. O modo remoto do aplicativo continua desabilitado. As afirmações seguintes de ausência de serviço referem-se ao checkpoint local anterior.

## Estado vigente após ligação da interface — 26/10/2026

O resumo atual está em [STATUS_I3_LOCAL.md](STATUS_I3_LOCAL.md). Runtime/controlador estão ligados às telas, com bloqueio visual de logout/troca de conta, acesso offline após associação e envio condicionado à sessão verificada. A cópia I3 preserva metadados e não é aceita pelo importador I2. O modo remoto permanece desabilitado por padrão, sem configuração real. I3 incompleto; pendências locais e externas explicitadas no resumo. As seções seguintes preservam os lotes anteriores e não substituem este estado.

## Retomada após encerramento da VM

Em 26/10/2026 foi recuperado `34b6566`, posterior a `6a7c308`, na mesma branch I3. [Diagnóstico de recuperação](RECUPERACAO_I3.md), preservado em `3885cc4`. Os registros após esta seção descrevem o checkpoint inicial e são históricos.

Lote local posterior: corrigidos os 9 erros de TypeScript do Auth/controlador; proveniência da associação persistida; conflito aceito mantém o comando original como evidência, sem reenvio/efeito nos saldos; invalidação de sessão e respostas atrasadas protegidas por geração. Expiração mantém a concessão offline após associação; logout bloqueia memória/recarga e eventos automáticos não a reabrem. Essas políticas estão testadas no controlador, **ainda sem ligação à interface** neste lote.

`npm run check` aprovado: **189 testes/1 ignorado**, typecheck/build, **20 de navegador** e **3 de PWA**. Foram adicionados 25 testes de política, adaptador/callback e controlador com SQL embarcado. Sem Google real, JWT/PostgREST, conexões independentes, aparelhos físicos, configuração externa ou dados pessoais. Próximo lote: ligar runtime e controles de sessão/associação/situação às telas, exportando metadados I3 sem reduzi-los ao backup I2. I3 permanece incompleto.

Atualizado em 26/10/2026. **I1 e I2 concluídos; I3 em implementação local e ainda incompleto.**

Branch de trabalho: `codex/incremento-3-local-foundation`, criada a partir de `43355a50c14a8593c52212409e066d2ace1f0496` da branch `codex/incremento-2-local-finance`. Esse SHA de I2/plano foi confirmado no GitHub nesta retomada e não foi alterado. `main` não foi mesclada.

Checkpoint de código `9f6be3776b001510949b89374656297c85e752b8` enviado e confirmado por igualdade entre HEAD e `git ls-remote` em 26/10/2026. Este registro e a exclusão do cache temporário da CLI são o checkpoint documental subsequente. Nenhum deploy foi acionado pelo agente; o commit usa marcadores de skip e não foi conectado provedor de publicação.

## Autorização vigente

O usuário aprovou o plano de I3 e implementação local, migrações versionadas, testes e checkpoints no GitHub. Antecipou recuperação mínima de exportação I2 em origem/dispositivo novo, preservando IDs, valores, histórico e pendências, com validação integral e atomicidade. Não autoriza restauração completa/gerações de I4, serviços externos, OAuth, SQL remoto, publicação, pagamento/trial ou piloto real.

Política aprovada para o futuro modo autenticado: consulta/escrita offline após primeira associação online; expiração preserva registros e exige nova autenticação para transmitir; logout explícito bloqueia visualização e preserva pendências. Essas funções de sessão ainda não estão disponíveis no aplicativo atual. Não prometer sincronização com aplicativo fechado nem criptografia local.

## Inventário e documentos privados

O usuário nunca usou o Atlas nem cadastrou dados financeiros pessoais. Só existem testes sintéticos conhecidos na VM. Não promover essas bases a inaugural, criar seeds pessoais ou associar/mesclar automaticamente. O primeiro uso será orientado passo a passo. Ver [INVENTARIO_BASES.md](INVENTARIO_BASES.md).

Os quatro originais privados foram encontrados no Drive conectado e lidos integralmente após busca local sem resultado. Cópias de texto ficam ignoradas em `.private/originais/2026-10-26-recuperados/`. A fonte privada deve continuar fora da VM. Não há arquivo adicional a solicitar neste momento. O manifesto inicial de 24/10 continua ausente; o teste de igualdade dos bytes antigos permanece ignorado, sem substituir o manifesto por hashes da leitura atual. Nenhum conteúdo pessoal foi incluído em código, fixtures ou documentação pública.

## Implementação preservada de I2

A aplicação local em `app/` inicia vazia: dinheiro `bigint`, JSON com centavos em strings, contas, categorias, previstos/realizados, transferências com duas contrapartidas, reservas simples, edição por estorno/substituição, histórico, dashboard, outbox atômica, exportação consistente e PWA offline. Os testes de I2 continuam no fluxo completo; a expectativa textual do aviso foi atualizada para distinguir restauração completa da recuperação mínima agora autorizada. `database/modelo_inicial.sql` permanece referência intocada.

## Novo checkpoint local de I3

- Recuperação mínima em Backup: prévia sem gravação, validação completa de formato/grafo/outbox, destino vazio ou exatamente igual, commit único Dexie e ativação posterior. Preserva IDs/proprietário/histórico/pendências, não une nem substitui bases.
- Limites: exportações I2 conhecidas, 10 MiB e 50 mil registros financeiros; arquivos futuros são recusados. Web Locks obrigatório para ativação segura entre proprietários nesta versão. Fechar abas antigas.
- Migração local `supabase/migrations/20261026164923_i3_private_foundation.sql`: entidades, checks/FKs, autorização ativa, RLS de leitura e ledger imutável. Sem grants de escrita financeira ao cliente. `api.i3_readiness()` retorna escrita desabilitada.
- Testes sintéticos de recuperação e SQL, incluindo outro perfil, repetição, arquivo inválido, destino ocupado, falha final e reabertura offline.

Evidência observada após `npm ci` e `npm run check`: **136 aprovados/1 ignorado** (129 unitários e 7 SQL), **20 testes de navegador**, **3 de PWA**, typecheck/build aprovados. O SQL foi executado em PostgreSQL embarcado PGlite com identidade/papéis simulados; não houve Supabase/Auth/PostgREST, advisors ou concorrência entre conexões. Detalhes em [VALIDACAO.md](VALIDACAO.md) e [EXECUCAO_INCREMENTO_3.md](EXECUCAO_INCREMENTO_3.md).

## Ainda não entregue

Google OAuth restrito, associação de conta, política de sessão no runtime, RPC de escrita/carga inicial, envio idempotente da outbox, pull/cursor, conflitos e sincronização entre aparelhos. Tabelas reservadas para recibos/revisão não são uma engine de sincronização. Nenhum teste real de Auth/isolamento remoto/dois aparelhos foi realizado; **não declarar I3 concluído**. Instalação/teclado/ciclo de vida Android físico continuam pendentes.

Nenhum serviço foi criado/configurado e nenhum deploy, SQL remoto ou piloto real foi realizado. Nenhum teste autoriza automaticamente essas ações.

## Retomar após perda da VM

Clonar o GitHub e selecionar `codex/incremento-3-local-foundation`. Ler AGENTS, README, este estado, validação, execução I3 e pendências. Conferir branch/remoto/worktree antes de editar; preservar alterações e não usar reset destrutivo/force push. Código e documentação públicos estarão no último checkpoint remoto confirmado; bancos, arquivos exportados e originais privados não vêm com o clone.

Com Node >=22.12 e Edge instalado, entrar em `app/`, executar `npm ci` e `npm run check`. Desenvolvimento: `npm run dev` em `http://127.0.0.1:5173`. Produção local: `npm run build`, depois `npm run preview` em `http://127.0.0.1:4173`. As origens/perfis têm bases distintas. Para conferir a recuperação, usar somente arquivo sintético em perfil vazio; não apagar perfis pessoais.

Próximo lote autorizado: completar contratos/RPCs/protocolo e testes locais antes de abrir escrita, seguindo [PROXIMA_ETAPA.md](PROXIMA_ETAPA.md). Próximas ações do usuário e limites estão em [PENDENCIAS_INCREMENTO_3.md](PENDENCIAS_INCREMENTO_3.md). I4 continua sem início automático.
