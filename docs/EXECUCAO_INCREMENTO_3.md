# Execução local do Incremento 3

**Retomada em 26/10/2026:** recuperado o checkpoint `34b6566`, posterior ao registro inicial abaixo. Protocolo SQL/motor presentes e revalidados; Auth/controlador parciais e compilação quebrada. Ver [RECUPERACAO_I3.md](RECUPERACAO_I3.md). Os números e exclusões de implementação abaixo são históricos do primeiro checkpoint, não o inventário atual.

Atualizado em 26/10/2026. **I3 iniciado localmente e incompleto.** Branch `codex/incremento-3-local-foundation`, derivada de `43355a50c14a8593c52212409e066d2ace1f0496` em `codex/incremento-2-local-finance`. A referência de I2 foi conferida no GitHub e preservada. Não houve merge com `main`.

## Autorizações e inventário

O usuário aprovou o plano e implementação local, migrações versionadas, testes e commits/pushes. Antecipou apenas recuperação mínima de exportação I2 em nova origem/dispositivo, com validação integral, atomicidade e preservação de IDs/histórico/pendências. Serviços, OAuth, migração remota, deploy, pagamento/trial, piloto real e I4 continuam sem autorização.

O usuário confirmou que ainda não usou o Atlas nem inseriu dados financeiros pessoais. Só existem testes sintéticos conhecidos nesta VM; não escolhê-los como base inaugural. Ver [inventário](INVENTARIO_BASES.md).

## Requisitos privados encontrados

Foram pesquisados repositório/histórico, diretórios pessoais usuais e anexos autorizados desta VM, sem encontrar os originais. A busca no Drive conectado encontrou `00_COMECE_AQUI.md`, `PROMPT_CODEX.md`, `REQUISITOS_ATLAS.md` e a versão privada de `REFERENCIAS_E_DECISOES.md`. Os quatro textos foram lidos integralmente. Não é necessário pedir esses arquivos novamente nesta etapa.

Cópias de texto e um manifesto da leitura atual ficam em `.private/originais/2026-10-26-recuperados/`, ignorados pelo Git e descartáveis com a VM; a fonte privada deve continuar preservada fora dela. O manifesto inicial de 24/10 não foi recuperado: o hash dos textos obtidos agora não comprova igualdade byte a byte com os antigos arquivos. O teste antigo continua ignorado por essa razão. Não copiar conteúdo pessoal ou hashes privados para documentação pública, fixtures, seeds ou frontend. Os dados históricos desses textos exigem conferência explícita; nenhuma conta/saldo/lançamento pessoal foi criado a partir deles.

## Implementado neste checkpoint

1. Recuperação mínima em **Backup**, com seleção de arquivo e prévia sem gravação. Aceita somente formato I2 conhecido, até 10 MiB/50 mil registros financeiros, schema financeiro suportado, proprietário único, UUIDs, datas, dinheiro em strings canônicas, contagens, referências e grafo financeiro válidos.
2. Validação de cada operação da outbox contra os registros exatos do arquivo: IDs únicos, tipo, payload, proprietário, liquidações/contrapartidas completas e nenhum registro coberto por duas operações. Não recria IDs nem inventa comandos legados.
3. Gravação das cinco coleções e outbox em uma transação Dexie. Destino precisa estar vazio ou ser exatamente igual; qualquer diferença é recusada, sem fusão/substituição. Repetição exata é uma confirmação sem novas inserções. A base de origem não é alterada.
4. Ativação local só depois do commit completo, preservando o proprietário original do arquivo. Web Locks coordena gravações e recuperação nesta versão; ativação entre proprietários é recusada se o navegador não tiver esse recurso. Se a ativação do ponteiro falhar, a cópia completa permanece inativa e a repetição reconhece-a. Isso não associa uma conta Google.
5. Migração `supabase/migrations/20261026164923_i3_private_foundation.sql`, gerada como arquivo pela CLI: schemas privados, autorização ativa por UUID, entidades com propriedade composta/FKs, dinheiro `bigint`, checks, validação diferida de ledger, histórico imutável e RLS de leitura. Sem grants de escrita ao cliente. `api.i3_readiness()` exige acesso ativo e retorna `financialWritesEnabled: false`.
6. Reservas de estrutura para recibos e revisão, **sem protocolo de escrita implementado**. Ter essas tabelas não torna idempotência remota ou sincronização funcionais.

Nenhuma dependência de teste, fixture sintética, CLI ou PostgreSQL embarcado integra o bundle de produção. `database/modelo_inicial.sql` continua referência intocada.

## Evidência e alcance

Após `npm ci`, `npm run check` passou com 136 testes aprovados/1 ignorado, typecheck/build, 20 testes de navegador e 3 de PWA. Desses 136, 7 executam SQL em PGlite e 129 são unitários/local-store. Detalhes em [VALIDACAO.md](VALIDACAO.md).

A prova exportar → recuperar em outro perfil → reabrir → exportar/comparar preservou IDs, centavos, datas, previsões, originais, estornos, substituições, cancelamentos e outbox. Repetição, arquivo inválido, destino ocupado e falha final injetada foram cobertos. Recuperação e nova gravação offline também passaram no build de produção. Perfis no mesmo PC não são dois aparelhos reais.

PGlite executou PostgreSQL real embarcado, mas com `auth.users`, `auth.uid()` e papéis de teste simulados. Sem Docker/psql disponíveis, não houve Supabase local completo, gateway JWT/PostgREST, advisors nem teste de concorrência entre conexões. RLS foi exercitada com `SET ROLE authenticated`, não somente como administrador. A identidade simulada não é prova de autenticação.

## Limites e riscos remanescentes

- Recuperação atual é exclusivamente I2 local. Não aceita metadados futuros de recibos/cursor/conflitos; versão desconhecida é recusada. Não transmite operações. Preservar IDs evita duplicação na cópia, mas deduplicação após transmissão dependerá dos recibos/RPCs ainda pendentes.
- Fechar abas de I2 antes de recuperar. Código antigo não conhece Web Locks/checagem do proprietário ativo. IndexedDB e localStorage são armazenamentos distintos; o protocolo grava tudo antes de ativar, com repetição segura, sem alegar uma única transação entre ambos.
- Arquivo íntegro estruturalmente não é prova de autenticidade: alguém com acesso ao arquivo/perfil pode alterar dados coerentemente. Não há criptografia própria nem proteção contra devtools/acesso físico ao perfil. Permissões do SO/dispositivo continuam relevantes.
- Login restrito, associação Google, sessão expirada/logout, push/pull, conflitos, tombstones/arquivamento e duas conexões/dispositivos **não estão implementados nem comprovados por este checkpoint**. O modo atual continua local e sem login; não apresentar a proteção de logout planejada como disponível.
- Alterações de schema futuras exigem migração local aditiva e exportação versionada com recibos/vínculo/conflitos. Não usar o importador I2 para descartar metadados de sincronização.
- Antes de piloto real, ainda são obrigatórias as provas de autenticação, isolamento remoto, sincronização física, falhas e recuperação do recorte aprovado. I4 permanece sem início.

## Próximo lote local autorizado

Continuar E1/E2 do plano: envelope e canonicalização/digest compartilhados; RPCs transacionais de carga inicial e operação, recibos imutáveis, revisão sob lock por proprietário e feed por agregado; testes de falha antes/depois de commit, repetição com mesmo ID/outro conteúdo, autorização e concorrência real. Revisar explicitamente as permissões necessárias ao invoker e a exposição exclusiva de `api`, sem abrir DML público ou usar definer como atalho. Não habilitar o indicador de escrita antes dessas provas.

Depois: adaptador Auth PKCE, estado de sessão/offline/logout; cópia de associação com proveniência e ativação retomável; base confirmada separada de pendências/conflitos; push/pull e UI de situação. O inventário vazio informado não elimina testes de migração de I1 sem outbox e I2 com pendências. Esses trabalhos locais já estão autorizados.

O procedimento remoto futuro está em [PENDENCIAS_INCREMENTO_3.md](PENDENCIAS_INCREMENTO_3.md). Nenhum comando de provisionamento, OAuth ou SQL remoto deve ser executado por consequência de um push. No momento o usuário não precisa cadastrar dados nem fornecer segredos.
