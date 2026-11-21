# Atlas Financeiro — prontidão para uso real (21/11/2026)

## Estado verificável
- Base: `codex/atlas-fluidez-ux-20261121`; interface, extrato, skeleton, animações e testes já aprovados na execução anterior do GitHub Actions.
- Nova proteção: o painel em modo nuvem não chama o estado de `Sincronizado` quando o servidor não confirmou a revisão. `Sem pendências` e `Sincronizado` são estados diferentes. O resultado é invalidado em novo login, perda de sessão, mudança de origem/namespace, escrita local, recuperação e importação.
- Supabase conectado pela integração: projeto de staging e projeto I3 existentes; ambos com schema privado `atlas_private` e API `api.i3_*`; não foram executadas migrações, DML nem alterações em credenciais.
- Staging: existe um recibo e um lote sintéticos conhecidos; nenhuma conta/lançamento bancário confirmado por esta auditoria. O projeto I3 apresenta tabelas financeiras sem registros estimados. Essas informações **não demonstram que os dados financeiros do usuário estejam vazios**.
- `api.i3_readiness` de staging declara protocolo 1 e versão financeira 4; consulta read-only confirmou `integration_control.writes_enabled=true` no **staging** e `false` no **projeto I3 principal**. Não alterar a autorização sem homologação nem supor que staging contenha os dados reais.
- A conexão Vercel acessível no contexto não apresenta projeto Git vinculado a `SuanEden/Atlas-Financeiro`; nenhuma publicação foi possível/realizada.

## Prioridades para liberar operação diária
### P0 — obrigatório
1. Validar configuração da hospedagem real, domínio, ambiente, callback Google autorizado e apontamento para o Supabase *correto* sem expor chaves privadas.
2. Conferir a situação da associação local já existente no navegador de origem. **Não** criar outra associação se houver `bootstrap`, `verifying_source` ou `join` pendentes.
3. Exportar e testar a recuperação de backup I2/I3 sem apagar ou substituir a base atual. Guardar uma cópia fora do aparelho.
4. Executar cenário autenticado com dois dispositivos de teste: associar base com contas/lancamentos sintéticos, reiniciar app, desconectar, lançar nos dois dispositivos em momentos diferentes, reconectar e confrontar IDs, recibos, cursor, histórico e saldos.
5. Simular perda de resposta do servidor depois do commit; confirmar reenvio idempotente e ausência de operações duplicadas.
6. Validar RLS, grants e auditoria de segurança no Supabase. Segurança de senhas vazadas consta como aviso (configuração de autenticação; não corrigida nesta branch).
7. Verificar Pluggy com conexões autorizadas e dados apropriados: webhooks/atualizações, paginação, deduplicação por IDs, cancelamentos e saldo.
8. Autorizar explicitamente merge, publicação e liberação de escrita **somente após** os itens acima.

### P1 — fluidez e UX
- Buscar, navegar, salvar e visualizar histórico com 1.000+ lançamentos sintéticos num Android intermediário; medir INP, LCP, CLS.
- Verificar contraste e comportamento de foco/teclado, leitores de tela, animações reduzidas e estados offline.
- Revisar perfis mobile e desktop em build isolado sem contas reais.

### P2 — refinamento
- Ampliar microinterações/animacoes somente após medições de desempenho. Sem sobrecarregar CPUs móveis nem ocultar dados financeiros com skeletons indevidos.

## Proibições e riscos
Não executar limpeza/reset de IndexedDB, `last-write-wins` genérico, migração destrutiva, criação de projeto Supabase paralelo ou publicação de chaves. Não enviar dados pessoais para staging.
O total de testes sintéticos não substitui o ensaio autenticado na hospedagem nem a verificação física dos dispositivos.
O diagnóstico de sincronização é apenas um indicador de **última confirmação durante a sessão**, não uma garantia eterna de que o servidor ou a integração bancária permanecem atualizados.

## Critério de pronto
Somente declarar **pronto para uso financeiro diário com nuvem** após P0 passar com evidências, sem discrepâncias de saldo e sem perda/duplicação de operações. Para uso estritamente local, manter backups testados e não depender de sincronização não homologada.
