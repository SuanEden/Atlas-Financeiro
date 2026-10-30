# Validação local de concorrência I3 — Windows x64

Ferramenta administrativa de desenvolvimento separada de `app/`. Usa PostgreSQL nativo **17.10**, distribuído pelo pacote fixado `@embedded-postgres/windows-x64@17.10.0-beta.17`, e `pg@8.23.1`. Dependências e integridades estão no lockfile. Binários, dependências e bancos não integram o Git ou o bundle do aplicativo.

```powershell
cd tools/i3-postgres
npm ci --no-audit --no-fund
npm test
```

Requer Windows x64 e Node >=22.12, como a VM de desenvolvimento. Aproximadamente 110 MB de binários descompactados; sem Docker, instalação global, conta de sistema, Windows Service ou recurso externo. Os scripts de instalação do pacote apenas hidratam arquivos/symlinks do pacote; preservar instalação compatível com o lockfile.

O teste cria seu próprio cluster em `%TEMP%/atlas-i3-pg-*`, escolhe uma porta livre e escuta **somente `127.0.0.1`**. Não aceita URL de banco remoto, `DATABASE_URL` ou credencial de produção. Usa somente fixtures sintéticas, com autenticação trust limitada ao cluster local temporário. Não colocar dados pessoais nesse banco.

Cria papéis/auth.uid de teste, aplica todas as migrações locais ordenadas e habilita escrita **apenas nesse cluster descartável**. O primeiro teste também exercita o script de 24 verificações do protocolo com gate false. Duas ou três conexões reais, com processos PostgreSQL distintos, exercitam o protocolo como authenticated. `pg_blocking_pids` confirma contenção real; não depende de uma fila JS ou de sleeps presumidos para afirmar concorrência.

Ao terminar, fecha clientes e encerra seu próprio cluster. Conserva logs/dados temporários fora do Git para diagnóstico, sem remover recursivamente caminhos calculados. Se a VM cair durante o teste, conferir caminho e PID do cluster antes de pará-lo; não encerrar processos PostgreSQL genéricos nem um serviço preexistente.

Cobertura: gate administrativo, bootstrap simultâneo idempotente, appends concorrentes, invisibilidade antes do commit, rollback sem lacuna, replay/resposta perdida, proprietário independente, estornos concorrentes, meia transferência recusada no commit, paginação com limite superior e revogação durante espera. Resultado observado e limites em [CONCORRENCIA_E_ACESSO_I3.md](../../docs/CONCORRENCIA_E_ACESSO_I3.md).

PostgreSQL nativo com auth.uid simulado não é Supabase/Auth/PostgREST completo, nem teste em dois aparelhos. O servidor hospedado usa 17.11; esta prova na mesma versão principal não comprova igualdade de distribuição, extensões ou patch. Não autoriza aplicação remota nem abertura financeira.

Fontes primárias: [embedded-postgres](https://github.com/leinelissen/embedded-postgres), [locks PostgreSQL](https://www.postgresql.org/docs/17/explicit-locking.html), [pg_blocking_pids](https://www.postgresql.org/docs/17/functions-info.html).

## Gateway HTTP e JWT local

```powershell
npm run setup:gateway
npm run test:gateway
# Ou executar todas as suítes locais, sequencialmente:
npm run test:all
```

O setup baixa a release oficial Windows PostgREST 16.5, verifica checksum fixado e guarda zip/binário somente em node_modules/.cache. Sem novas dependências npm, instalação global ou serviço. O teste chama o setup automaticamente se necessário e valida o cache antes de executar. Requer rede apenas para obter esse artefato público na primeira execução.

O gateway usa o cluster sintético compartilhado, papel authenticator mínimo e segredo JWT aleatório efêmero; escuta somente loopback. A chave e os tokens não são argumentos de shell, não aparecem nos resultados e não pertencem ao Supabase real. Variáveis PG/credenciais externas não são herdadas pelo gateway. Dados locais podem ser escritos durante os ensaios, sem associação a conta pessoal ou destino remoto.

Treze cenários cobrem assinatura/expiração/audiência, falta de sub, papel privilegiado, autorização/revogação, perfis privados, idempotência, isolamento, concorrência e rollback HTTP. [Resultados e limites](../../docs/GATEWAY_LOCAL_I3.md). Os processos próprios são encerrados; não usar encerramento genérico de postgres.exe/postgrest.exe para limpar testes.

## Cópia administrativa e recuperação sintética

`npm run test:backup` exige clientes PostgreSQL 17 já instalados em `C:/Program Files/PostgreSQL/17/bin`; o runner confere versão e não instala nada. Usa dois clusters próprios do bootstrap, cria destinos vazios e gera dump customizado somente no temporário da origem. Não aceita URL/porta de serviço externo. Ambientes de conexão do sistema não são herdados pelos subprocessos. Não encerra o serviço PostgreSQL instalado.

Sete testes comparam nove tabelas, contagens/relações/saldos/recibos/proveniência, exclusão de commit posterior, RLS/constraints/gate, outro proprietário/anônimo, replay sem duplicação e recusa de adulteração/erro SQL com rollback. A restauração usa transação única/exit-on-error, sem clean ou substituição. Dumps/dados permanecem fora do Git; clusters próprios são encerrados sem exclusão recursiva.

Os papéis globais e Auth simulados são preparados pelo bootstrap de cada cluster. Não é recuperação Supabase hospedada, Google, Storage, papéis globais ou JSON/IndexedDB I3. [Evidência, resultado observado e limites](../../docs/PROTECAO_OPERACIONAL_I3.md). `test:all` agora inclui concorrência, gateway e backup; seus totais só devem ser informados como rodada conjunta após executar esse comando com sucesso.
