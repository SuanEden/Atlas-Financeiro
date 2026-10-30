# Compatibilidade e preservação local — 28/10/2026

## Correção

A leitura do IndexedDB aceitava metadados sem conferir campos/versão e projetava envelopes persistidos sem validar o protocolo completo. O envio confiava no envelope anterior a uma consulta assíncrona. O feed podia remover uma pendência alterada usando seu digest salvo.

Agora metadados e todas as pendências, inclusive conflitos/resolvidas, precisam corresponder ao contrato conhecido. Versão/campo/estado desconhecido, proprietário/ID divergente, revisão/ordinal inválidos ou contexto ausente em base ocupada interrompem o fluxo. Não há limpeza, troca de ID, migração de I2 ou reenfileiramento. Metadados legados conhecidos de v1 sem `version` continuam legíveis, sem regravação na leitura. Novos contextos registram `version:1`; versão física do IndexedDB e formato do arquivo de exportação não mudaram.

O motor confere digests antes da primeira consulta e relê a pendência antes de transmitir. A incorporação verifica digests dentro da transação IndexedDB, mantida viva com `Dexie.waitFor`; falha reverte efeitos, recibos, cursor e remoção juntos. A fronteira SDK também recusa envelopes incompatíveis antes da RPC. Paginação conserva o limite superior da primeira página de cada rodada; uma resposta divergente não é incorporada. Páginas anteriores válidas permanecem confirmadas.

Digests detectam divergência em relação à cópia original; não são assinatura ou criptografia. Formato desconhecido pode também bloquear a exportação pelo aplicativo: preservar a origem/perfil e usar versão compatível para conferência, sem apagar armazenamento ou converter I3 em I2. Clientes anteriores a este lote não ganham a proteção local retroativamente.

## Testes observados

- `compatibility-safety.test.ts`: **21 aprovados**. Retomada legada sem regravação; sete falhas de metadados; nove de pendências; feed tentando confirmar versão/payload alterados; outra aba modificando conteúdo após pull; paginação divergente. Spies comprovam zero chamadas de transporte nos casos prévios à rede; comparação integral das quatro tabelas comprova preservação local.
- SDK: dois casos adicionais sem RPC para envelope incompatível. SQL: seis casos de protocolo antigo/futuro, schema futuro, arquivamento/campo tombstone não suportados e reutilização de ID de conta por cliente atrasado. Os protocolos inválidos são testados em destino vazio, sem depender da recusa de uma segunda associação.
- `npm run check` final: **252 aprovados/1 ignorado, typecheck/build, 24 navegador e 3 PWA**. A primeira rodada modificada parou no typecheck por cast de fixture; corrigido via `unknown`, seguido de check completo aprovado. Ignorado: manifesto privado original ausente.
- Runner PostgreSQL `npm run test:all`: **30 aprovados na mesma execução** (10 concorrência, 13 gateway, 7 backup). Valida SQL preservado; não há migração nova neste lote. Dependências/lockfiles inalterados, instalações por `npm ci`.

## QA de navegador

Fluxo: entrada sintética → associação vazia explícita → conta sintética → expiração/offline → recarga → download I3 → logout/reentrada → segundo download igual → confirmação única no servidor sintético. Suíte também cobre segunda aba, persistência, recuperação I2 e atualização de PWA.

Playwright/Edge instalado, Browser plugin não disponível; `http://127.0.0.1:5173/` em 1280×900 e 390×844, preview em 4173. Perfis automatizados separados do pessoal. Capturas temporárias desktop/mobile após sincronização inspecionadas, fora do Git. Mostram Backup com estado confirmado e aviso de recuperação I3 própria ainda necessária. A captura mobile de página inteira conserva a barra de navegação na posição do viewport; não comprova instalação/teclado Android.

| Verificação | Resultado |
|---|---|
| URL/título/conteúdo | `/`, Atlas Financeiro, conteúdo e controles esperados. |
| Tela vazia/overlay | Ausentes no fluxo verificado. |
| Console | Sem erro/warning de aplicação no fluxo Auth; aviso NO_COLOR do runner e recusa esperada de caminho privado separados. |
| Interação | Downloads comparados ao IndexedDB, bloqueio/reentrada e confirmação sem duplicação aprovados. |
| Capturas | Desktop/mobile inspecionadas fora do Git; sem mudança visual neste lote. |

Comandos: `npm ci`; testes dirigidos `npx vitest run`; `npm run check`; `npm ci --no-audit --no-fund` e `npm run test:all` no runner PostgreSQL. Processos próprios encerrados. Sem nova sessão pessoal, escrita hospedada, Google/PWA real ou aparelhos físicos.

## Pendências e próxima ação concreta

Arquivamento não foi implementado: contas/categorias continuam append-only; comandos/campos não suportados são recusados. Isso não cumpre sozinho P03. Falta arquivamento suportado com versões por entidade e retorno de cliente atrasado; atualizar cliente, servidor e testes juntos antes de considerar esse requisito concluído. Não retirar o requisito para abrir escrita.

Também faltam comparação detalhada de conflitos/dependências, interrupções/limites restantes da associação, recuperação operacional hospedada e provas físicas. JSON I3 continua sem importador: autorização vigente antecipou somente recuperação I2. Perda total I3 exige proposta de recuperação limitada e escopo próprios; restauração completa/gerações seguem em I4. A falta do importador não deve ser apresentada como perda dos backups nem como restauração aprovada.

Contratos, implementação e testes locais restantes continuam autorizados. Este lote cliente não exige migração remota. Gate financeiro permanece false.

A futura ação externa para computador/celular é disponibilizar **o mesmo build de homologação em HTTPS estável aprovado**, na hospedagem existente identificada, e adicionar somente seu retorno exato `/auth/callback` à configuração quando necessário. Identificar destino/branch, conferir deploy automático e apresentar build/alterações concretos para autorização específica, conforme AGENTS. Usar projeto/cliente Google existentes e somente chave publicável no frontend. Nenhum destino HTTPS aprovado foi recuperado; não inventar domínio ou criar conta/serviço. Pode-se validar primeiro acesso/PWA mantendo escrita bloqueada.

Para testes financeiros hospedados, resolver antes recuperação/compatibilidade e isolamento dos sintéticos, com autorização do ambiente/identidade de teste. O backend atual separa por proprietário, não por segunda base do mesmo proprietário; não associar fixtures à única conta pessoal como atalho. Abertura de gate, associação pessoal e piloto continuam separados. Nenhuma dessas ações externas foi executada ou é presumida autorizada.

Próximo passo técnico: fechar contrato local de versões/arquivamento e o recorte de recuperação, sem repetir login/pré-cadastro/criação de serviços. [Retomada](RETOMADA_2026_10_28.md).
