# Próxima etapa — continuar I3 local

## Prioridade após testes de acesso e concorrência — 27/10/2026

[Recarga/reentrada, conta negativa e dez testes nativos de concorrência](CONCORRENCIA_E_ACESSO_I3.md) registrados. A proposta concreta seguinte é [aplicar exclusivamente segunda migração com gate financeiro false](PROTOCOLO_REMOTO_I3.md), sujeita à aprovação específica. Procedimento já preparado, sem alterações remotas por consequência dos testes. Não repetir primeiro login ou fechar o banco local preexistente; a ferramenta encerrou somente seus clusters temporários. Escrita, associação, piloto/publicação e provas restantes não estão aprovados.

## Continuidade do teste de saída — 27/10/2026

Usuário já relatou acesso local bloqueado/pendências preservadas após sair. [Registro](RESULTADO_PRIMEIRO_LOGIN_I3.md). Orientar agora F5 e confirmação de bloqueio persistente, seguida de nova entrada com a mesma conta. Não considerar esses dois passos concluídos sem relato; não pedir logout novamente nem abrir associação/escrita.

## Prioridade após primeiro login real — 27/10/2026

Primeiro Google real e UUID original preservado confirmados, sem conta duplicada ou registros financeiros. [Evidência e roteiro](RESULTADO_PRIMEIRO_LOGIN_I3.md). Próximo teste pessoal: saída local, recarga ainda bloqueada e nova entrada na mesma conta, mantendo associação/envio indisponíveis. Não pedir novamente autorização/configuração do provedor ou pré-cadastro; não acessar tokens do navegador. Depois do relato, conferir por leitura e registrar checkpoint. Protocolo posterior/abertura financeira dependem de preparação técnica e aprovação própria; testes reais negativos, concorrência e dois aparelhos seguem pendentes.

## Prioridade após habilitação Google conferida — 27/10/2026

Google exclusivo habilitado, cadastro fechado e bloqueio financeiro verificados. [Primeiro login preparado](PRIMEIRO_LOGIN_GOOGLE_I3.md). Servidor local loopback com integração somente no processo e QA desktop/celular aprovados; OAuth foi interceptado, sem autenticação. Próxima ação remota concreta para aprovação é o primeiro login pessoal, vinculando Google ao cadastro existente e preservando o UUID. Após retorno, conferir identidade/login por leitura e mensagem de envio ainda bloqueado. Não pedir novamente autorização do provedor, criar `.env` com segredos, associar base, abrir escrita, aplicar segunda migração ou publicar.

## Prioridade após autorização de Google — 27/10/2026

Google especificamente autorizado pelo usuário; não pedir novamente. Fornecer o [roteiro completo de campos](ROTEIRO_GOOGLE_OAUTH_I3.md) para salvamento privado no painel, pois o conector não configura o provedor. Última prévia: projeto ativo/Free, cadastro fechado, todos os métodos desligados, autorização única exata e tabelas privadas vazias. Depois do relato de conclusão, verificar por leitura a ativação exclusiva de Google e os bloqueios preservados. Não presumir login ou autorização de `.env` real, protocolo posterior, escrita financeira ou publicação.

## Prioridade após verificação da Data API — 27/10/2026

Usuário concluiu Exposed schemas; somente `api` exposto e bloqueios HTTP confirmados. [Resultado](VERIFICACAO_DATA_API_I3.md). Próxima proposta preparada: configurar/habilitar somente o provedor Google no projeto Supabase existente, com o cliente Web já criado e segredos inseridos privadamente no painel. Requer autorização específica, pois Google continua explicitamente desligado. Usar [roteiro Google](ROTEIRO_GOOGLE_OAUTH_I3.md), sem recriar recursos, sem abrir cadastro, métodos extras ou escrita financeira. `.env` real/primeiro login, protocolo posterior, publicação e piloto não foram executados. Não repetir configuração já comprovada.

## Prioridade após fundação remota — 27/10/2026

Fundação inicial e autorização da conta aprovadas, executadas e verificadas. [Resultados e limites](RESULTADO_FUNDACAO_REMOTA_I3.md). Não reaplicar ou reautorizar. Próxima proposta concreta: mudar somente Exposed schemas da Data API de `public, graphql_public` para `api`, mantendo Google, cadastro e escrita financeira desligados. Essa configuração adicional depende de aprovação específica e conferência do campo no painel; não está autorizada pela aplicação da fundação. Não aplicar protocolo posterior, configurar faturamento ou publicar. I3 incompleto; prova assinada de Auth/isolamento e dois aparelhos continuam pendentes.

## Prioridade de recuperação — 27/10/2026

Revisão do servidor existente feita por consultas de leitura: não há migração/schema Atlas nem autorização financeira. A próxima ação concreta está preparada em [AUTORIZACAO_BACKEND_I3.md](AUTORIZACAO_BACKEND_I3.md): instalar somente fundação inicial e autorizar UUID pré-cadastrado, mantendo escrita financeira bloqueada. Aguardar aprovação específica dessa alteração remota; depois conferir o estado antes de executar. Não repetir pré-cadastro, criar projeto ou ativar Google. Revisão do protocolo/gateway e provas reais permanecem pendentes.

## Prioridade vigente depois da ligação da interface

Ler [STATUS_I3_LOCAL.md](STATUS_I3_LOCAL.md): a ligação de Auth/controlador às telas e cópia I3 já foi implementada. Não repetir o lote descrito nas prioridades históricas abaixo. Conferir o HEAD remoto da branch para o checkpoint mais recente. Continuar pelas pendências locais do resumo (ambiente de concorrência, associação interrompida/legada, conflitos/dependências, tombstones e proteção operacional da cópia); integração externa e piloto continuam aguardando autorização específica, com orientação uma etapa por vez. Não iniciar I4.

## Prioridade após recuperação de 26/10/2026

Foi recuperado `34b6566` e o diagnóstico está em `3885cc4`/`RECUPERACAO_I3.md`. SQL/motor já existem; não refazê-los como se só houvesse `6a7c308`. Lote seguinte corrigiu Auth/controlador e passou `npm run check` (189/1 ignorado, 20 navegador, 3 PWA).

Continuar localmente: ligar o runtime às telas com barreira de visão, namespace por proprietário, controles de login/associação/envio/logout e retorno PKCE limpo; testar no navegador com Auth/transporte sintéticos separados do bundle. Preservar a aplicação I2 quando modo remoto estiver desabilitado. Exportação I3 deve incluir base confirmada, pendências, conflitos, recibos, cursor e proveniência sem tokens; não usar importador I2 para eliminar metadados. Não habilitar serviços externos nem indicador de escrita por consequência dos testes. O roteiro abaixo é histórico do checkpoint inicial; seguir primeiro esta prioridade.

O usuário aprovou o plano e autorizou execução local, migrações versionadas, testes e checkpoints. O recorte mínimo de recuperação I2 também foi aprovado e implementado neste primeiro checkpoint. I3 ainda não está concluído. Estado verificável em [EXECUCAO_INCREMENTO_3.md](EXECUCAO_INCREMENTO_3.md) e [VALIDACAO.md](VALIDACAO.md).

## Retomada

1. Conferir branch `codex/incremento-3-local-foundation`, remoto, worktree e commits; preservar alterações. Ler AGENTS, README, estado/validação, plano e execução. Não alterar a branch final de I2 ou `main`.
2. Com Node >=22.12 e Edge, executar `npm ci` e `npm run check` em `app/`. A migração SQL roda somente no banco embarcado de teste. Não executar `db push`, `link`, `apply_migration` remoto ou comandos de provisionamento.
3. Completar E1/E2: contrato de envelope/digest e dependências, carga inicial específica com recibos cobrindo outbox/legado, escrita transacional, lock por proprietário, feed por agregado e limites. Revisar superfície API/RLS/grants, testar acesso negado e invariantes financeiras equivalentes a I2.
4. Provar mesmo ID/conteúdo idêntico, mesmo ID/conteúdo divergente, falha após commit/resposta perdida, falha parcial, conflitos de estorno/correção e cursores sem lacuna. PGlite é útil, mas não comprova concorrência entre conexões nem gateway Auth; preparar testes nesse ambiente completo antes de declarar E2 aprovado.
5. Implementar adaptador Auth PKCE e runtime de sessão, associação/cópia com origem preservada, base confirmada separada de outbox/conflitos, push/pull e UI. Não abrir escrita financeira remota enquanto o indicador de readiness está falso. Não inventar recibos nem marcar operações como enviadas pelo simples upload de snapshot.
6. Apresentar procedimento concreto e pedir autorização específica antes de criar/configurar serviços, OAuth, aplicar migrações remotas ou publicar. Essas ações não estão autorizadas. Não aceitar trial, cartão ou pagamento.
7. Executar primeiro Google restrito, isolamento e sincronização real em celular/computador com sintéticos; somente depois pedir autorização do piloto. I4 permanece sem início.

O inventário está respondido: o usuário nunca usou nem cadastrou dados financeiros; só testes sintéticos do agente na VM. Não há exportação pessoal a solicitar nem base inaugural escolhida. Não associar os testes à conta pessoal. Orientar o primeiro uso passo a passo quando for a hora.

Os quatro originais privados foram encontrados/lidos no Drive; as cópias atuais são ignoradas e podem desaparecer com a VM. O manifesto antigo não foi recuperado, portanto seu teste continua ignorado. Não recriar o manifesto antigo a partir das cópias atuais. Não transformar informações históricas privadas em seeds.

Cada lote coerente deve atualizar estado/validação/pendências e ser salvo no GitHub após revisão de arquivos e busca de segredos/dados pessoais. Mensagens de commit devem evitar publicação automática (`[CF-Pages-Skip] [skip ci]`), sem tratar isso como prova de configuração do provedor. Confirmar SHA remoto e worktree. Push não autoriza deploy.
