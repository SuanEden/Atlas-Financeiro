# Recuperação I3 preparada neste ambiente — 28/10/2026

## Fonte e autorização

Base: `b63daa340c2533cc642723017c58612005af2208`, branch remota I3. Implementação em branch separada `codex/recuperacao-i3-chat`, sem merge nem publicação. O usuário autorizou continuar o projeto aqui e, no escopo consolidado de continuação, antecipar a recuperação limitada de JSON I3. A base original continua recuperável pelo Git. Nenhuma migração remota ou liberação de escrita integra este lote.

## Implementado

- Importador I3 exige a mesma conta e servidor do namespace. Não importa tokens, não autentica e não concede autorização remota.
- Controlador exige identidade verificada online inclusive quando o gate financeiro está falso. Logout/expiração/troca de sessão impedem recuperação. Uma associação ativa recuperada permite visualizar os dados locais, sem habilitar transmissão quando o servidor a proíbe.
- Validação de formatos, versões, centavos, registros, envelopes/digests, recibos, cursor sem lacunas, ordinais, projeção e proveniência mínima. Limites: 10 MiB e 50 mil registros contando confirmado, projeção, pendências e recibos. O mesmo registro presente nas duas projeções conta duas vezes neste limite conservador.
- Novas exportações incluem `integritySha256` sobre o conteúdo, exceto a data de exportação. Detecta alteração acidental; não é assinatura, criptografia ou prova de autenticidade. Exportações legadas sem esse campo conservam validação estrutural/financeira e digests de operações, sem prometer verificação integral do conteúdo histórico.
- Gravação das quatro tabelas em transação única. Destino vazio ou repetição exatamente idêntica; base diferente não é substituída. Mudança de autorização antes do fim aborta a transação.
- Nenhuma chamada de rede pelo importador; controlador impede iniciar sincronização enquanto recupera e recusa recuperar durante uma sincronização em andamento.
- Formulário de arquivo, conferência e confirmação na tela de acesso autenticado, disponível sem liberação de escrita, e na tela de backup. I2 mantém seu importador separado.

## Uso da recuperação

No mesmo servidor aprovado, entre com a mesma conta Google em um perfil novo/vazio. Escolha Arquivo JSON de I3, confira o resumo e confirme. Se o arquivo tem associação ativa, os dados locais ficam visíveis. Nenhuma sincronização é iniciada pela recuperação. Se a associação ainda estava interrompida, o estado permanece interrompido: uma fonte I2 ausente não é inventada, e poderá ser necessário recuperar a origem I2 separadamente para validar sua proveniência.

Não apague uma base existente para contornar uma recusa. Um backup antigo não pode substituir uma base nova por esta função. As gerações, substituição coordenada entre dispositivos e restauração administrativa hospedada de I4 não foram implementadas aqui.

## Verificação e ambiente

Testes dirigidos novos: recuperar em outro namespace, resposta perdida sem reenvio, repetição sem duplicação, destino mais recente preservado, ACK anterior ao feed, conflito resolvido, associação interrompida, proprietário/servidor/versão/payload/projeção/recibo/cursor/ordinal/campo extra inválidos, rollback por mudança da sessão, checksum e legado, recuperação autenticada com gate false e logout bloqueado. Todos usam identidades/dados sintéticos, SQL embarcado e fake IndexedDB.

Resultado final dos comandos registrado em `VALIDACAO.md`. Uma rodada inicial encontrou a lista esperada de campos da exportação desatualizada após a adição do checksum; expectativa corrigida. Rodadas concorrentes de Vitest pressionaram recursos e causaram timeout/SIGKILL; a execução final limita dois workers, sem aumentar timeout nem ocultar falhas.

Browser plugin não disponível. Playwright do repositório foi tentado com Chrome oficial extraído fora do Git. O processo não inicia neste ambiente: `socket() failed: Operation not permitted` em `process_singleton_posix.cc`. Resultado: 24 cenários com navegador falharam ao iniciar, dois testes HTTP passaram; não é aprovação da interface. Novo cenário E2E cobre exportar, perfil novo, recuperar, recarregar e sincronizar uma vez, em desktop e viewport móvel, mas sua execução permanece pendente. Não há nova captura válida nem teste físico de Android. Configurações originais Edge/Playwright foram preservadas.

Não foram reexecutados os 30 testes PostgreSQL nativos Windows; não há alteração SQL neste lote. Resultados históricos desses testes não são apresentados como atuais.

## Estado externo observado por leitura

Projeto Atlas existente ativo em São Paulo. Consultas agregadas confirmaram um usuário, uma identidade Google, uma autorização ativa, `writes_enabled=false`, zero contas e zero eventos financeiros. Isso não inspeciona faturamento nem comprova sincronização real. Nenhuma configuração, escrita financeira, identidade ou publicação remota foi alterada.

## Bloqueios reais para concluir o projeto

1. Executar a suíte de navegador e PWA em ambiente que permita iniciar Chrome/Edge; inspecionar a interface nova.
2. Fechar o contrato e a implementação de arquivamento/versionamento (P03), com cliente atrasado e testes correspondentes. Continua pendente, sem mudança de requisito.
3. Fechar critérios restantes de conflitos/dependências/associação e recuperação operacional hospedada.
4. Identificar destino HTTPS de homologação e preparar configuração/build para revisão antes de publicar; não há domínio aprovado neste checkout.
5. Preparar isolamento dos dados sintéticos antes de testes financeiros hospedados; não usar a única conta pessoal como base de fixtures.
6. Autorizar a alteração remota concreta necessária, quando preparada, e testar computador e Android físicos, incluindo offline/reconexão e recuperação. Não abrir o gate apenas por este checkpoint.

O projeto completo e I3 ainda não estão concluídos. O modo local I2 pode ser experimentado com dados fictícios. Esta branch contém desenvolvimento ainda não liberado para uso financeiro real.
