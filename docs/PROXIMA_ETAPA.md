# Próxima etapa — continuar I3 local

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