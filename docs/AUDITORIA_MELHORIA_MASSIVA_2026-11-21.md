# Atlas Financeiro — auditoria e melhoria segura (21/11/2026)

## Referências efetivamente conferidas

- Histórico exportado de 122 páginas da retomada I3: falha em associação mesmo após autenticação Google; staging com recibo de associação e sem contas/eventos; não pressupor que a base pessoal esteja nesse staging.
- Branch de retomada `codex/i3-retomada-segura-20261120`, com os mecanismos de protocolo, armazenamento Dexie, controlador, testes SQL sintéticos e recuperação.
- `main`, commits históricos de arquivamento/versionamento P03 e documentação de recuperação I3.
- Branch intermediária `codex/atlas-auditoria-associacao-20261121` (diagnóstico e controles de associação).

## Alterações deste lote

1. Visualização do estado local de associação, inclusive quando o servidor não autoriza escrita. A interface não oferece novas associações nessa condição nem tenta transmitir.
2. Testes sintéticos para resposta de envio perdida, leitura posterior ao envio e prevenção de segundo bootstrap no mesmo contexto, com comprovação de preservação da pendência.
3. Diagnóstico público seguro para divergência da origem depois do recibo: não ativa vínculo, não substitui a base e não apresenta exceção interna.
4. Proteção contra leituras assíncronas fora de ordem na UI: uma leitura antiga não sobrescreve uma revisão posterior.
5. Preservação das melhorias herdadas: fases de falha read/validate/send e ocultação de ações incompatíveis quando existe associação pendente.

## Critérios para considerar I3 concluído

Todos os itens abaixo devem ter **evidência executada**, não apenas teste escrito:

- [ ] `cd app && npm ci && npm run test && npm run build`, com resultados documentados, inclusive testes de SQL sintético.
- [ ] `npm run test:browser` e `npm run test:pwa` com navegador Edge disponível; validar desktop e mobile.
- [ ] Conferir via leitura o estado do staging, autorização, versão financeira e gate de escrita; não aplicar migração automaticamente.
- [ ] Em ambiente isolado com dados fictícios, criar/associar uma base, reiniciar navegador e confirmar que o mesmo usuário não perde nem duplica registros.
- [ ] Interromper a resposta de envio após commit e demonstrar que o mesmo operationId/recibo é retomado, sem segunda associação.
- [ ] Validar desktop ↔ Android, offline/reconexão, conflitos, expiração e logout, por conta e dispositivos de teste.
- [ ] Restaurar backup I3 em perfil vazio, comparar histórico, recibos, cursor, outbox e saldo, sem substituir dados de outra origem.
- [ ] Verificar importação Pluggy com conexão autorizada e dados de teste/real cuidadosamente conferidos, incluindo deduplicação, paginação e classificação.
- [ ] Revisar acessibilidade, contraste, formulários, gráficos e áreas de toque em Android mantendo o tema visual aprovado.
- [ ] Fazer revisão final dos segredos, permissões, RLS, bloqueios de escrita e recuperação administrativa.
- [ ] Aprovação explícita do usuário antes de qualquer merge para a branch de produção, liberação de escrita financeira ou deploy de produção.

## Não fazer

Não apagar IndexedDB, não criar novo Supabase, não enviar históricos reais para staging, não resetar cursor, não reaplicar migrações e não abrir gate para contornar erro. Não apresentar recibo como prova de que os dados financeiros pessoais foram sincronizados; staging observado no histórico tinha zero contas/eventos.

## Riscos ainda abertos

- A causa raiz da falha de associação no ambiente hospedado **não está comprovada**; os diagnósticos e testes adicionados não equivalem a ensaio real.
- O script de compilação e os testes de navegador **não foram executados neste lote**, pois o ambiente de edição por integração GitHub não fornece runner Node/Edge conectado ao checkout.
- A branch não foi integrada nem publicada em produção.
