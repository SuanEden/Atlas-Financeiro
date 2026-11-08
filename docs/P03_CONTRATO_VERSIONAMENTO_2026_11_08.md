# Atlas I3 — P03: arquivamento versionado sem perda de histórico

Data da revisão: 2026-11-08
Estado: **compatibilidade preventiva implementada; arquivamento ainda NÃO implementado**.

## Fatos atuais verificados
- O servidor Supabase I3 já possui migração financeira v3, com a escrita financeira **habilitada** e registros existentes. O estado remoto **não é uma base vazia** e não deve ser tratado como a configuração histórica (gate falso).
- O cliente atual usa envelopes de protocolo 1, operações e recibos idempotentes, cursores de feed, projeção append-only e IndexedDB por proprietário/servidor.
- Inserções financeiras, correções e estornos preservam histórico; atualização de estado de uma conta/categoria não pode sobrescrever suas versões anteriores.
- Esta branch rejeita indicadores desconhecidos de arquivamento/versão nos envelopes v1 antes de enviar ou incorporar um feed por um cliente antigo. Ela não altera a estrutura remota.

## Contrato P03 proposto para próxima migração
1. **Evento explícito de ciclo de vida**, não exclusão física da conta ou categoria. Eventos financeiros, lançamentos e conciliações vinculados permanecem íntegros.
2. Operações devem declarar `entityId`, `expectedVersion`, `nextState` (`archived` ou `active`), identificador de operação e proprietário; versão corrente é conferida **atomicamente no servidor**.
3. Versão sequencial **atribuída pelo servidor**, e não por horário do dispositivo. Cliente atrasado que enviar `expectedVersion` antigo recebe conflito versionado, nunca last-write-wins.
4. Feed inclui evento de ciclo de vida e nova versão. Cliente sem suporte recusa todo o lote **antes** de avançar cursor, gravar recibo ou atualizar projeção.
5. Uma conta arquivada não aceita novos lançamentos inconsistentes; lançamentos históricos continuam consultáveis. Categoria arquivada não deve ser oferecida para novos lançamentos, preservando as classificações existentes.
6. Proteções: operação idempotente por ID/digest, isolamento por dono autenticado, lote e recibo transacionais, RLS, sem SECURITY DEFINER exposto, sem reinterpretação de comandos antigos.
7. Backup e recuperação devem versionar explicitamente o novo estado e impedir restauração de snapshot antigo que reative registros arquivados. Backup I3 legado continua legível sem conversão destrutiva.
8. Testes sintéticos: A arquiva, B volta do offline, B tenta criar operação baseada na versão antiga, servidor recusa, B incorpora o feed, repetição idempotente; exportação e restauração não ressuscitam registro.
9. Toda migração deve ser ensaiada primeiro em base **isolada**, com snapshot recuperável e prova de compatibilidade do cliente anterior, antes de uma proposta específica de execução hospedada.

## Condições para o próximo incremento
- Implementar o modelo append-only de ciclo de vida em domínio, projeção, serializer, comandos, engine e API, junto com uma migração SQL versionada e testes PostgreSQL locais.
- Comprovar isolamento por proprietário, concorrência, retries, mudança de sessão, dados legados, conflitos e recuperação sem substituir as informações financeiras atuais.
- Conferir estado remoto atual e garantir plano de rollback da aplicação e de recuperação dos dados **antes de qualquer migração no banco em uso**.
- **Não executar migrações ou alterar o gate remoto só porque uma suíte local passou.** A implantação que afete a base real exige avaliação de risco e aprovação própria.
- Testes físicos no computador e no celular com sessão real ainda são obrigatórios.

## Não confundir
Este documento e o gate de compatibilidade **não significam P03 concluído**. O suporte de arquivamento no banco e sua interface ainda não existe nesta entrega; a proteção atual impede interpretação insegura de versões futuras.
