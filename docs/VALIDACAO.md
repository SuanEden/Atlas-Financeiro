# Validação — I3 local e histórico de I1/I2

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
