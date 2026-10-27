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
