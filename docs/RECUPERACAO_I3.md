# Recuperação da VM — 26/10/2026

Fonte: `https://github.com/SuanEden/Atlas-Financeiro`. `git fetch origin --prune` recuperou estas referências:

| Branch remota | Commit |
|---|---|
| `main` | `8be0bed` |
| `codex/incremento-1-foundation` | `9f51d19` |
| `codex/incremento-2-local-finance` | `43355a5` |
| `codex/incremento-3-local-foundation` | `34b65665cf55202361c9b4ea7be1a271f4864f3a` |

O checkpoint mais recente de I3 é `34b6566`, descendente direto de `6a7c308`. Foi selecionada a branch existente, sem reset, merge ou descarte. O worktree estava limpo. A documentação do checkpoint anterior estava defasada em relação ao código desse commit.

## Código e provas recuperadas

- Recuperação mínima I2, fundação SQL e regras financeiras I1/I2 preservadas.
- Segunda migração local com carga inicial, operações, recibos, lock/revisão e feed. Contratos de envelope/canonicalização e armazenamento I3 separado da origem I2.
- Motor de sincronização e dois clientes simulados em PGlite/fake-indexeddb. Os testes cobrem resposta perdida após commit, repetição, cursor persistido, falha de armazenamento, troca de conta em andamento e conflitos de correção.
- Início de Auth Google/PKCE, política de sessão e controlador. Não há ligação desses arquivos à interface recuperada nem testes específicos do controlador/Auth nesse commit.

Nesta VM, `npm ci` concluiu (70 pacotes adicionados, 71 auditados, zero vulnerabilidades reportadas). `npm run check` executou **164 testes aprovados/1 ignorado** em 13 arquivos e parou no typecheck com **9 erros**: tipos do SDK, metadados de origem ausentes, assinatura de preparação divergente e resolução de conflito inexistente. Build/PWA não aprovados nesse estado. Não interpretar os unitários aprovados como aplicativo compilável ou login comprovado.

## O que o clone não preserva

Bancos IndexedDB, exportações, dependências/cache e cópias privadas ignoradas não integram o Git. Não é possível afirmar que havia alterações adicionais sem commit ou recuperá-las pelo repositório. Nenhuma perda de dados financeiros pessoais foi identificada: o usuário informa que nunca os cadastrou. Testes continuam exclusivamente sintéticos e isolados; não associá-los como base pessoal.

Os registros de leitura dos originais privados pertencem à VM anterior. Suas cópias não foram recuperadas neste clone e não foram relidas nesta retomada. O manifesto antigo continua ausente; não fabricá-lo. Consultar a fonte privada autorizada se surgir regra que dependa dela.

## Continuidade autorizada

Corrigir e testar o controlador/política local antes de conectar a interface. Sessão expirada mantém leitura/gravação offline após associação; transmissão exige sessão verificada do mesmo proprietário. Logout explícito bloqueia a visão, preservando pendências. Confirmar resposta em andamento no namespace original, sem ativação cruzada. Só então integrar controles de acesso/situação e validar navegador/PWA.

Nenhum serviço externo, OAuth real, SQL remoto, publicação, pagamento/trial ou piloto foi configurado/autorizado por esta recuperação. Dois clientes simulados não comprovam conexões PostgreSQL independentes, Google real ou dois aparelhos. I3 permanece incompleto; I4 não foi iniciado.

Cada lote deve atualizar estado/validação/pendências, revisar arquivos preparados, fazer commit com `[CF-Pages-Skip] [skip ci]`, push sem força e comparar HEAD com o SHA remoto. Marcadores de skip não comprovam a configuração de hospedagem.
