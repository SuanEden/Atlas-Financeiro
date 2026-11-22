# Atlas Financeiro — otimizações adicionais (21/11/2026)

## Implementado no código
- A sincronização de primeiro plano continua automática ao retomar foco, conexão ou visibilidade, mas seu polling de segurança passou de 10 para 30 segundos para reduzir interrupções em celulares.
- Quando uma consulta não muda cursor, estado de associação, recibos ou fila de pendências, `dataRevision` permanece estável. A interface não relê/re-renderiza toda a projeção financeira desnecessariamente.
- O indicador de nuvem reage imediatamente ao evento de desconexão e impede checagem remota enquanto offline.
- Botão `Conferir com servidor` disponível quando não há pendências e ainda não existe confirmação válida; não exige criar outra associação.
- Teste unitário garante que consultas repetidas sem novidades não aumentam o contador de revisão visual.

## Supabase confirmado por COUNT(*) (não estimativa)
- I3 principal `zxancpaardzuqyyikwio`: 4 contas, 163 eventos, 168 recibos. **Dados existentes; preservá-los.** Escrita remota desabilitada.
- Staging `eiqsrredrboxxhxwibyy`: 0 contas, 0 eventos, 1 recibo. Escrita remota habilitada; não é cópia intercambiável do principal.
- Dois índices aditivos foram aplicados **somente no staging**, por migration `atlas_fk_covering_indexes_staging_20261121`, e sua existência foi confirmada: `account_reconciliations_user_event_fk_idx` e `financial_events_user_recurrence_fk_idx`. Nenhum dado financeiro foi migrado.
- SQL de referência: `ops/sql/staging_fk_index_review.sql`. Para aplicar no principal povoado, avaliar janela de manutenção, locks e uso de `CREATE INDEX CONCURRENTLY` executado fora de transação quando houver autorização, com revisão SQL específica para produção. Não aplicar o SQL de staging automaticamente no principal.

## Pendências reais para concluir uso diário
1. Vínculo de hospedagem atual não aparece na conexão Vercel. Identificar o projeto e domínio reais antes de merge/deploy.
2. Com backup externo verificado, homologar login Google, associação existente, read-only, envio idempotente e recuperação em PC e Android reais, sem apagar IndexedDB.
3. Confrontar os 4/163/168 registros do servidor principal com a origem local e reconciliar histórico sem duplicar IDs.
4. Homologar Pluggy com autorização bancária e checagem de centavos, faturas, data e deduplicação.
5. Comparar métricas INP/LCP/CLS em dispositivos e validar acessibilidade. Nenhuma métrica foi inventada.

Aprovação de CI prova apenas testes automatizados, não substitui homologação real ou torna uma base financeira segura para migração.
