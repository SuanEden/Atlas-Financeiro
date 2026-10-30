# I3 — proposta de protocolo remoto com escrita bloqueada

Preparada em 27/10/2026 após [provas de acesso e concorrência](CONCORRENCIA_E_ACESSO_I3.md). **Atualização: aplicação autorizada pelo pedido de prosseguimento e executada, com gate false.** [Resultado e correção do índice de apoio](RESULTADO_PROTOCOLO_REMOTO_I3.md). As seções abaixo preservam a proposta original; não repetir aplicação nem pedir autorização novamente.

## Ação concreta proposta

No projeto Supabase `atlas-financeiro-i3` existente, aplicar **somente** [`20261026171659_i3_transaction_protocol.sql`](../supabase/migrations/20261026171659_i3_transaction_protocol.sql), inalterada, SHA-256 `d99195c09e3e674816e4ffaf223f28deb6d4c597abfa825b25584485c4fd2187`, usando a ferramenta de migração. Não executar `db push` nem reaplicar a fundação.

Essa migração cria o controle administrativo `integration_control` com **writes_enabled=false**, lotes/recibos de incorporação, triggers de integridade e as RPCs `i3_apply`/`i3_pull`; atualiza readiness. A RPC de escrita verifica o gate e deve retornar REMOTE_WRITES_DISABLED. Nenhuma base é associada ou inicializada por aplicar o SQL.

Permissões mudam de forma deliberada: authenticated recebe INSERT nas nove tabelas privadas e UPDATE somente da coluna revision em sync_heads, necessários às funções SECURITY INVOKER. RLS restringe dono/autorização ativa, triggers exigem agregado/recibo/lote consistentes e ledger imutável. As tabelas continuam fora da Data API; somente `api` fica exposto. Não descrever esse passo como manutenção de zero DML interno, nem copiar grants amplos da documentação genérica.

Única superfície HTTP futura: readiness, apply e pull explicitamente revisadas. Helpers financeiros ficam em schema privado; sem SQL genérico, definer financeiro ou concessão de autoativação. Usuário com JWT não ganha credencial PostgreSQL por receber os grants internos. A ausência de exposição privada é condição obrigatória e deve continuar sendo testada.

## Precondições e execução depois da aprovação

1. Reconsultar o projeto/plano, histórico de migrações, schemas, conta/autorização exatas, tabelas vazias, cadastro fechado e somente Google habilitado. Não recriar projetos, usuário ou identidade.
2. Confirmar que somente a fundação remota `20261027152920 / i3_private_foundation` existe e que as estruturas da segunda migração não existem. Em caso de interrupção ou resultado incerto, ler o estado antes de repetir qualquer escrita.
3. Conferir checksum e aplicar exclusivamente o artefato acima. Registrar a versão gerada pelo serviço e sua correspondência com o prefixo local; diferença de prefixo não é motivo para reaplicação.
4. Confirmar onze tabelas com RLS (nove privadas e duas de segurança), três RPCs API invoker, permissões mínimas esperadas e nenhum DML cliente nos controles administrativos. Preservar Google/cadastro e lista exposta somente api.
5. Com papel authenticated/identidade simulada administrativamente, verificar readiness false; apply negada pelo gate, pull vazio; identidade ausente/não autorizada negada. Nenhum seed financeiro ou outro usuário remoto para esse ensaio. Não coletar JWT da sessão pessoal.
6. Repetir negativas HTTP anônimas/privadas e advisors; inventário final deve manter mesmo usuário/autorização e nove tabelas privadas vazias. Registrar somente evidência sanitizada no GitHub.

Provas com JWT real e múltiplos dispositivos continuam necessárias. Esta aplicação permitirá testar contratos hospedados sem liberar lançamentos; **não aprova ativar writes_enabled, associar bases, enviar dados financeiros, publicar, contratar recurso ou iniciar piloto**.

Se a migração ou verificação falhar, preservar estado e gate false; não remover schemas, ledger, conta ou histórico. Não tentar resolver com signup aberto, grants genéricos ou SECURITY DEFINER. Corrigir localmente e apresentar eventual nova alteração remota para revisão.
