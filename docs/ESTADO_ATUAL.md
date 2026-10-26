# Estado atual

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
