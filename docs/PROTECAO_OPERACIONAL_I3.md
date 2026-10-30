# Cópia e retomada operacional de I3 — 27/10/2026

Revisão e ensaios locais autorizados pelo usuário com `faça`. Base de partida conferida com fetch: `c941bc1`, branch `codex/incremento-3-local-foundation`, worktree inicialmente limpo. Nenhuma migração, publicação ou mudança de configuração remota nesta etapa. I3 continua incompleto.

## Resultado e mudança pequena

A exportação I3 já fazia uma leitura transacional de base confirmada, projeção, pendências, recibos e contexto. O servidor informado ao exportador agora precisa ser o mesmo do namespace aberto; um rótulo divergente é recusado antes da leitura. O formato versão 1 e o schema IndexedDB não mudaram. Nenhuma interface financeira foi alterada.

Doze testes novos em `app/tests/sync/backup-safety.test.ts` verificaram a cópia e a retomada da **origem local preservada**. Sete testes em `tools/i3-postgres/backup.test.mjs` recuperaram uma **cópia administrativa sintética** em outro cluster PostgreSQL temporário. Esses são procedimentos distintos; nenhum deles implementa importação da cópia JSON I3.

## Cópia do navegador e origem preservada

| Caso | Evidência observada |
|---|---|
| Associação ainda não enviada | Reabrir o mesmo namespace preserva IDs, envelope, operações cobertas, digest e proprietário de origem; servidor sintético sem lotes. |
| Origem mudou após recibo | Ativação recusada; estado `verifying_source`, recibo e dados permanecem exportáveis. |
| Comando offline | Confirmado e projeção continuam distintos; centavos em strings, IDs/digests/envelope e pendência preservados após reabertura; exportar não altera o banco. |
| Commit com resposta perdida | Cópia mantém comando pendente e cursor anterior. Retomada lê feed, sem reenviar ou duplicar efeito. |
| Recibo antes de incorporar feed | Recibo e pendência `acknowledged` coexistem; efeito aparece uma vez na projeção; retomada não reenvia. |
| Falha na última escrita de página | IndexedDB reverte confirmado, cursor e remoção da pendência juntos. Reabrir conserva a cópia anterior; repetir página conclui. |
| Exportação concorrente | Quatro gravações de outra conexão ao mesmo IndexedDB: cada arquivo observado é o estado inteiro anterior ou posterior, com ordinal/fila coerentes. Não é prova de dois aparelhos. |
| Conflito e dependência | Tentativa `conflict`, dependência `blocked` e decisão `resolved` conservam envelopes; ficam fora dos saldos e não são reenviadas automaticamente. |
| Outro namespace vazio | Recebe apenas o confirmado remoto; não inventa o comando offline da origem. Retomada da origem ainda presente depois transmite o ID original. |
| Importador I2 | Recusa arquivo I3 sem modificar destino vazio ou ocupado. |
| Sessão e destino | Exportador não lê localStorage/sessionStorage; campos raiz limitados ao contrato financeiro. Servidor divergente recusado sem alterar base. |
| Erro de leitura | Exportação rejeitada sem retornar JSON parcial nem modificar a base. |

Ambiente: fake-indexeddb e PGlite com migrações reais e identidade simulada; sem rede/credenciais hospedadas. Fechar/reabrir conexão e injetar falha transacional não equivale a cortar a energia ou perder fisicamente o disco. Reabrir a origem não é restaurar seu arquivo.

## Arquivo realmente baixado e sessão sintética no navegador

Fluxo: entrada sintética → associação vazia explícita → conta sintética → expiração offline → recarga → Backup/baixar arquivo → sair/bloquear → recarga/reentrada → baixar novamente → sincronizar.

Teste existente ampliado em `app/tests/browser/auth-session.spec.ts`: compara o arquivo baixado com pendências, recibos e contexto lidos do IndexedDB real; distingue confirmado vazio da conta projetada. Após logout/recarga/reentrada, o segundo arquivo mantém o conteúdo, exceto instante de exportação. Sincronização sintética incorpora a operação uma vez, esvazia a fila e avança cursor para 2. Sem tokens exportados ou seletor I2 nesse modo.

| Conferência | Resultado |
|---|---|
| URL/título e conteúdo | `/`, Atlas Financeiro, tela financeira e Backup presentes. |
| Overlay/console | Sem overlay Vite ou erro/warning relevante na página. |
| Interação | Download real, comparação de arquivos, bloqueio/reentrada e confirmação sintética passaram. |
| Capturas | Inspecionadas em 1280×900 e 390×844, fora do Git: `atlas-i3-backup-safety-desktop-edge.png` e `atlas-i3-backup-safety-mobile-edge.png` no temporário do sistema. Capturam a posição de rolagem do fluxo; não são uma auditoria visual completa. |

Browser plugin ausente no catálogo de ferramentas; utilizado Playwright com Edge instalado. Servidor de QA em `http://127.0.0.1:5174`, isolado do servidor pessoal 5173. Autenticação/transporte substituídos somente na entrada de teste; nenhum teste leu o perfil ou sessão pessoal. Emulação móvel não comprova Android físico; PWA integrada ao Google real também não foi comprovada aqui.

## Cópia administrativa: banco sintético recuperado

Dois clusters PostgreSQL 17.10 temporários em loopback, com diretórios/portas próprios. Clientes oficiais `pg_dump` e `pg_restore` 17.2 já instalados nesta máquina; nenhuma instalação, serviço ou download adicional. Executáveis só acessam endereços/portas criados pelo teste. Ambiente dos subprocessos exclui variáveis de conexão/segredos externos; não há URL configurável.

O ensaio criou dois proprietários apenas como fixtures SQL, sem contas Google. Na origem, carga com duas contas e operações cobertas, receita, despesa, transferência, estorno e previsão produziu seis revisões confirmadas. Com gate falso, o dump customizado foi gravado fora do repositório. Uma sétima operação concorrente estava sem commit durante a cópia e foi confirmada na origem depois dela. Restauração em banco vazio de outro cluster, sem `clean`/substituição, usou transação única e saída imediata em erro.

Sete verificações aprovadas:

1. Conteúdo exato das nove tabelas privadas, incluindo relações, envelopes, recibos e origem: seis lotes/recibos e duas operações incorporadas; origem posterior com sete lotes.
2. Total de **99.802 centavos**, saldos por conta de 99.802 e zero, previsão de 10.001 e revisão 6 conservados; commit posterior ausente.
3. Onze tabelas com RLS, constraints privadas validadas, três RPCs invoker e gate falso; apply recusado mesmo para operação antiga enquanto bloqueado.
4. Outro proprietário autorizado lê somente sua base vazia; anônimo não executa a RPC.
5. Com gate aberto **somente na cópia sintética**, replay das seis operações retorna recibos originais, sem novo efeito/revisão; gate restaurado para falso em finally.
6. Arquivo adulterado é recusado pelo digest calculado no próprio ensaio antes de qualquer restauração. Hash local não é assinatura de autenticidade nem proteção de um arquivo I3 do usuário.
7. Conflito SQL deliberado no destino ocupado aborta a restauração inteira, conserva a tabela sentinela e não deixa schemas/tabelas parciais.

Os papéis globais foram preparados nos clusters pelo bootstrap de teste, não extraídos do dump. Auth é uma simulação mínima. Este ensaio não é backup/restauração do Supabase hospedado, nem recuperação de GoTrue/Google, Storage, segredos, papéis globais ou IndexedDB. Não disponibiliza rotina administrativa para produção e não comprova recuperação após desastre do provedor. As primeiras execuções expuseram chamadas com assinatura incorreta de pull no novo teste; corrigidas para o contrato textual parametrizado existente. Nenhuma alteração de RPC/migração foi necessária.

Referências consultadas: [pg_dump 17](https://www.postgresql.org/docs/17/app-pgdump.html), para snapshot consistente e limites de objetos globais, e [pg_restore 17](https://www.postgresql.org/docs/17/app-pgrestore.html), para restauração customizada/transação única. O comportamento descrito acima foi observado nos testes, sem inferir igualdade com a distribuição hospedada.

## Procedimento operacional dentro do recorte atual

| Situação | Procedimento e limite |
|---|---|
| Navegador/aba fechou; dados ainda presentes | Reabrir o mesmo endereço e perfil. Após logout, entrar novamente com a mesma conta. Conferir pendências/recibos antes de sincronizar; não criar outra associação ou trocar IDs por causa de timeout. A escrita remota atual continua bloqueada. |
| Arquivo I2 válido e origem de destino vazia | Recuperação mínima já disponível: prévia/validação, confirmação explícita e cópia integral. Preservar origem e arquivo privado fora da VM. Não usar I2 para descartar contexto I3. |
| Outro dispositivo recebe do servidor | Recebe somente o confirmado. Não prometer recuperação de comandos nunca enviados, conflitos locais ou decisões guardadas apenas no dispositivo perdido. |
| Perda total do IndexedDB I3 | Preservar qualquer JSON I3 em local privado fora da VM; não o converter em I2, remover metadados, editar cursor ou reenviar com novos IDs. Importação dessa cópia ainda indisponível. Não declarar recuperação concluída ou iniciar uso pessoal enquanto o caminho necessário não for aprovado/ensaiado. |
| Cópia administrativa de ambiente real | Preparar inventário, autorização, destino isolado e procedimento específico do provedor antes de qualquer extração/restauração. O runner local não aceita endpoint externo e não deve ser adaptado automaticamente para dados pessoais. |

## Comandos e estado final

`npx vitest run tests/sync/backup-safety.test.ts`: **12 aprovados**; typecheck aprovado. `npx playwright test tests/browser/auth-session.spec.ts`: **4 aprovados** (dois fluxos em dois tamanhos). Depois, `ATLAS_BROWSER_TEST_PORT=5174`, `VITE_ATLAS_REMOTE_MODE=disabled`, `npm run check`: **223 aprovados/1 ignorado**, typecheck/build, **24 navegador e 3 PWA**. O ignorado depende do manifesto privado original ausente, não de um teste novo de recuperação.

`node --check backup.test.mjs` e `npm run test:backup` em `tools/i3-postgres`: **7 aprovados**. Suítes antigas de concorrência/gateway não repetidas: bootstrap compartilhado e migrações não mudaram. `test:all` agora inclui as três suítes; não afirmar que os 30 cenários nativos foram executados juntos nesta etapa. Dependências/lockfiles inalterados; instalação existente preservada para não interferir no servidor pessoal ativo.

Clusters próprios encerrados, sem excluir diretórios nem tocar PostgreSQL preexistente. Somente servidor pessoal loopback 5173 permaneceu ouvindo; QA 5174/4173 encerrou. Dumps, bancos, downloads e capturas não foram preparados para Git. Antes do commit: revisar lista/diff, procurar dados privados/segredos e confirmar push/HEAD remoto.

Consulta final **somente SELECT** ao projeto existente: 1 usuário, 1 identidade Google, 1 autorização ativa, gate falso e zero registros nas nove tabelas privadas. Sem nova associação, configuração, migração, recurso pago ou publicação.

Após staging explícito dos 15 arquivos, `git diff --cached --check` passou. Revisão do conteúdo preparado contra padrões de credenciais e identificadores do recibo privado não encontrou valores privados; caminhos de bancos/binários/arquivos gerados ausentes. Teste de privacidade novamente executado: **2 aprovados/1 ignorado**, com o mesmo limite do manifesto antigo. Registrar este lote em commit/push com marcadores de não publicação e confirmar igualdade do HEAD local/remoto.

## Critérios ainda abertos

B01 ganhou prova de cópia consistente/retorno à origem preservada. B02 ganhou prova administrativa **local e sintética** de contagens, relações, recibos e saldos. Não considerar B02 hospedado nem recuperação do JSON I3 como concluídos. Ainda faltam o caminho de perda total de I3, proteção contra versões antigas, arquivamento/tombstones e provas reais de PWA/sessão/dois aparelhos. Restauração completa/gerações continuam em I4. Próxima etapa técnica local: revisar contratos de versões antigas e arquivamento, documentando ações concretas antes de qualquer mudança remota.
