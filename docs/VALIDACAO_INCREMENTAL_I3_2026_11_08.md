# Atlas Financeiro I3 — verificação incremental de backup e sincronização

Data: 2026-11-08
Branch de trabalho: `feat/i3-backup-preflight-20261108`

## Escopo implementado
- A exportação JSON I3 agora valida previamente formato, integridade, versão, proprietário, servidor, projeção financeira, pendências, recibos e tamanho máximo com o mesmo validador utilizado na recuperação.
- Se a cópia não atender aos requisitos de recuperação, o download é interrompido; a base IndexedDB e a outbox não são apagadas nem sobrescritas.
- Regressão sintética para adulteração de envelope pendente sem mutação de dados no teste de exportação.
- Cenário automatizado de sincronização nos dois sentidos entre dois clientes sintéticos, incluindo período offline, reconexão, idempotência e ausência de duplicação.

## Limites explícitos
- Este lote não contém dados bancários reais, credenciais ou arquivos CSV pessoais.
- Nenhuma migração SQL, alteração remota, mudança de RLS ou ativação de escrita foi realizada por este lote.
- O projeto remoto não deve ser considerado vazio a partir de documentação antiga; confirmar o estado atualizado antes de qualquer operação.
- Testes sintéticos não comprovam operação com dois dispositivos físicos nem garantem recuperação após perda simultânea de ambos sem backup externo.
- Arquivamento/tombstones P03, ensaio operacional de recuperação hospedada, testes de autenticação real e homologação bancária ainda precisam de verificação isolada.

## Critério de integração
Só integrar o código após CI aprovado (unitários, checagem TypeScript, build, navegador e PWA). Publicar em produção exige confirmação do commit READY; não confundir esta etapa com homologação completa do I3.
