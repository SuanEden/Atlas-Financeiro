# I3 — contrato de segurança para arquivamento e clientes atrasados (02/11/2026)

## Escopo desta preparação

Esta entrega é um contrato de implementação **não executado**, para proteger o incremento seguinte. Não há mudança no protocolo em produção, no SQL hospedado, na configuração OAuth nem no gate `atlas_security.integration_control.writes_enabled`.

## Estado verificado

- A recuperação JSON I3 já consta em `main`; a branch `codex/recuperacao-i3-chat` está atrás de `main`. Não repetir merge.
- O transporte existente usa `protocolVersion: 1`, revisões monotônicas, idempotência por operationId/digest, feed paginado e `mergeAppendOnly`.
- A projeção local e o contrato remoto só aceitam inserções imutáveis nos agregados financeiros; arquivamento e reativação versionados ainda não estão implementados.
- A proteção `writes_enabled = false` foi confirmada por SELECT em 02/11/2026.

## Invariantes para próxima implementação

1. **Não redefinir exclusão como remoção física**. Arquivamento deve manter registro, histórico e suas referências; contas e categorias arquivadas não podem receber novas operações incompatíveis.
2. **Revisão por entidade**. Cada alteração de estado deve declarar versão anterior esperada e uma versão subsequente atribuída pelo servidor; uma alteração de cliente atrasado com versão antiga deve produzir conflito explícito e não prevalecer por timestamp do dispositivo.
3. **Tombstone/estado arquivado transportado no feed**. O retorno de cliente atrasado não pode ressuscitar registro arquivado por reenvio de snapshot, bootstrap ou fila antiga.
4. **Compatibilidade falha fechada**. Cliente, protocolo ou schema não compatível com os novos campos devem ser recusados sem avanço de cursor, descarte de outbox, downgrade ou alteração silenciosa do conteúdo local.
5. **Atomicidade e idempotência**. Operação e recibo são gravados juntos no servidor; aplicação da página e cursor são gravados juntos no IndexedDB; repetição de operação não duplica efeitos.
6. **Nunca arquivar eventos, liquidações ou lançamentos contábeis como atalho**. Seu histórico e saldos permanecem auditáveis.
7. **Isolamento por proprietário**. RLS e validação de autorização por identidade ativa continuam obrigatórios. Não expor tabelas privadas ou chave privilegiada ao frontend.
8. **Recuperação**. Exportação/importação devem reconhecer versões e estado de arquivamento sem perder pendências ou substituir base mais recente.
9. **Gate financeiro**. Não ativar a escrita remota antes de provas de integração, simulações de cliente atrasado e recuperação; manter `writes_enabled=false` por padrão.

## Sequência técnica obrigatória

1. Inspecionar `app/src/domain`, `app/src/sync/protocol.ts`, `app/src/sync/local-sync-store.ts`, `app/src/sync/engine.ts`, `app/src/remote`, `supabase/migrations` e fixtures existentes.
2. Introduzir comandos de domínio explícitos para arquivar/reativar conta e categoria, preservando o restante do contrato I2.
3. Evoluir de modo versionado o formato do envelope, o estado persistido e a validação de schema. Não reusar a mesma versão com semântica distinta.
4. Adicionar migração SQL versionada e testes PostgreSQL locais para concorrência, autorização, cliente atrasado e idempotência. Não aplicar migração hospedada como efeito desta branch.
5. Integrar projeção local e fluxo de UI, impedindo ações em arquivados quando o domínio proíbe; incluir retorno após offline e atualização de PWA.
6. Expandir backups de forma compatível, recusar formatos futuros e preservar origem íntegra em falha.
7. Executar `npm ci`, `npm run check` e `npm run test:all` em ambiente adequado, com testes de navegação reais, antes de proposta de merge.
8. Preparar homologação isolada de dados pessoais; verificar dois clientes com sessão real, offline, alteração concorrente e recuperação. Propor especificamente, para aprovação, qualquer publicação ou abertura do gate.

## Critérios de aceitação

- [ ] Conta arquivada em A continua arquivada em B após B voltar do offline.
- [ ] Reenvio de versão anterior em B gera conflito, não ressurreição.
- [ ] Arquivar e repetir a operação não duplica efeitos.
- [ ] Falha de rede/ACK perdido não perde histórico nem altera cursor prematuramente.
- [ ] Registros financeiros antigos permanecem auditáveis e com saldos corretos.
- [ ] Outra conta autenticada não lê nem modifica dados do proprietário.
- [ ] Backup antes/depois de arquivamento recupera com controle de versão e sem mesclagem indevida.
- [ ] Cliente antigo recusa formato futuro sem perda local.
- [ ] Testes automáticos, SQL, navegador e ensaio físico comprovados.
- [ ] Escrita remota segue bloqueada até liberação específica.

**Estado:** preparação documental; implementação e testes pendentes. Não considerar I3 concluído.
