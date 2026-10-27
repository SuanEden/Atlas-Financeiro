# I3 — recarga, nova entrada, recusa e concorrência independente

Atualizado em 27/10/2026. Base recuperada nesta etapa: `94e12eb4a2f17ee9d2560cc7ee5d1ef756624455`, branch I3. Nenhuma nova alteração remota pelo agente.

## Sessão pessoal e conta negativa

Usuário confirmou `EXATAMANETE` em resposta ao roteiro F5 → bloqueio preservado → nova entrada na mesma conta → login verificado/envio ainda bloqueado. Esses resultados de interface são confirmados **por relato**, sem inspeção do perfil pessoal, armazenamento de sessão ou tráfego autenticado pelo agente.

SELECT posterior reconfirmou um usuário, mesmo UUID privado esperado, identidade Google única no usuário original, autorização ativa preservada e sete tabelas privadas vazias. O registro de login existente não quantifica quantas autenticações ocorreram; a prova da repetição combina esse inventário estável com o relato da interface. Não equivale a revogação imediata de JWT, teste de expiração ou bloqueio em segunda aba.

Usuário confirmou possuir outra conta Google sob seu controle e recebeu instruções de tentativa em janela anônima, sem cadastrar/autorizar a conta. Informou `O retorno do Google não pôde ser validado. Entre novamente.`. Após isso, consultas retornaram:

- Exatamente um usuário, ainda o UUID original.
- Uma identidade Google, nenhuma em outro usuário.
- Uma autorização ativa, para o UUID esperado.
- Zero registros nas sete tabelas privadas financeiras/de protocolo.

Logs Auth foram consultados **somente por agregados**, numa janela de vinte minutos abrangendo a tentativa. Duas ocorrências continham a mensagem `Signups not allowed for this instance`. São entradas de log, não contagem de tentativas ou pessoas; nenhuma conta, URL, código, token ou conteúdo bruto de log foi extraído. A recusa informada e o inventário preservado são consistentes com o bloqueio de cadastro observado nesses logs. Não foi preciso abrir cadastro ou criar outro usuário para testar.

GET Auth permanece com cadastro fechado e somente Google habilitado. A conta negativa não foi cadastrada ou autorizada. Esse teste cobre a recusa de conta não cadastrada; **não substitui um JWT real de usuário cadastrado sem autorização ativa**, cuja criação/revogação não foi executada.

## Concorrência PostgreSQL real, local e sintética

Criada ferramenta isolada em [tools/i3-postgres](../tools/i3-postgres/README.md), com versões fixadas/lockfile próprios. Nenhuma dependência ou lockfile de `app/` foi alterado. PostgreSQL **17.10 nativo para Windows**, cluster temporário loopback; sem Docker, serviço registrado, usuário de sistema novo, recurso remoto ou pagamento.

As duas migrações existentes foram aplicadas somente nesse cluster sintético. O default de escrita false foi conferido; habilitação true ocorreu somente nesse banco para os ensaios. Identidade usa papéis reais com auth.uid simulado; não há Auth/JWT/PostgREST hospedado nessa prova.

`npm test` em `tools/i3-postgres`: **10 testes aprovados**, com conexões TCP independentes, PIDs distintos e espera efetiva confirmada por `pg_blocking_pids`:

| Caso | Resultado |
|---|---|
| Gate financeiro e ausência de autoativação | RPC negada com gate false; nenhum registro parcial |
| Primeiro bootstrap simultâneo idêntico | Segundo cliente espera; mesmo recibo, revisão 1 única |
| Appends independentes do mesmo dono | Revisões 1/2 serializadas; lote não confirmado invisível ao leitor |
| Rollback do primeiro gravador | Próximo confirma revisão 1 sem lacuna ou lote descartado |
| Resposta perdida/replay em outra conexão | Mesmo recibo; conteúdo divergente rejeitado |
| Outro proprietário | Progride com transação do primeiro ainda aberta |
| Dois estornos do mesmo realizado | Um confirma; rival falha sem agregado/recibo parcial |
| Meia transferência com constraint diferida | Commit falha; fila retoma sem evento/posting/revisão parcial |
| Paginação com limite superior fixo | Revisão posterior não entra na página anterior |
| Revogação durante espera pelo lock | Comando enfileirado é negado, sem alteração financeira |

A primeira execução não chegou aos testes: pg_ctl iniciou o cluster, mas o runner esperou por um pipe herdado e atingiu timeout. Corrigidos stdio do processo e cleanup em falha de inicialização. A execução seguinte passou nos dez testes. O cluster órfão da primeira execução foi identificado pelo caminho explícito/versão/PID e encerrado; uma checagem inicial de caminho abortou sem tocar processos até corrigir a resolução de caminho curto/longo. Todos os clusters desta ferramenta foram encerrados. Nenhum processo PostgreSQL preexistente foi interrompido e nenhuma exclusão recursiva foi realizada.

Essa prova fecha a lacuna específica de conexões independentes nos dez cenários, sem declarar matriz inteira aprovada. Não é igualdade de patch com Supabase 17.11, teste de durabilidade em queda de energia, gateway assinado, ensaio de carga ou sincronização física. As suites anteriores do aplicativo não foram repetidas, pois código/dependências/migrações dele não mudaram. O teste novo é opt-in Windows e fica fora do bundle/check padrão.

## Continuidade

Uma próxima alteração remota concreta foi preparada em [PROTOCOLO_REMOTO_I3.md](PROTOCOLO_REMOTO_I3.md): aplicar somente a segunda migração versionada, **mantendo o gate financeiro false**. Ainda requer aprovação específica. Não aplicar pasta inteira, associar base, promover fixtures a pessoais ou abrir escrita por consequência dos testes. I3 continua incompleto.
