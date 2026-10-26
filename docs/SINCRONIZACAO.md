# Sincronização

**Outbox local implementada em I2; protocolo remoto continua futuro para I3.** Cada comando financeiro grava agregado e `PendingOperation` na mesma transação IndexedDB. Não existem credenciais, chamadas remotas, cursor ou engine de sincronização; por isso todas as operações aparecem como pendentes sem alegação de envio.

## Fluxo pretendido

1. O comando financeiro valida o proprietário e grava o agregado local mais a operação na outbox na mesma transação. IDs são estáveis e independentes do relógio.
2. A interface passa a mostrar o resultado local como pendente de envio. Uma transferência é uma operação de domínio com suas duas contrapartidas.
3. Com sessão válida do mesmo proprietário, o envio usa RPC autorizada, identificador de operação e versões esperadas dos registros alterados.
4. O servidor verifica acesso ativo, propriedade, invariantes e concorrência; aplica tudo ou nada; registra comprovante de operação e mudanças na mesma transação.
5. A pendência só é confirmada após resposta reconhecida ou consulta inequívoca do comprovante. Reenvio da mesma operação com o mesmo conteúdo retorna o resultado original; conteúdo diferente com ID reutilizado é rejeitado.
6. O cliente recebe mudanças incrementais e avança seu cursor somente na transação local que aplicou a página recebida. O pull não apaga edições locais pendentes.

O cursor será emitido pelo servidor e ordenado de modo seguro em relação ao commit; um timestamp do aparelho ou uma sequência alocada antes de commits concorrentes não basta. O protocolo não reenviará o banco inteiro a cada sincronização.

## Estados, falhas e concorrência

Estados visíveis: pendente, sincronizando, sincronizado, erro e conflito, separados de status financeiro. Sincronizar ao abrir, retomar e reconectar, com ação manual e retentativas com intervalo crescente. Não prometer envio com a PWA fechada.

Sessão expirada, quota, servidor pausado e falha de rede preservam a fila. Login de outro usuário não envia nem apresenta pendências do anterior. Saída com pendências exige aviso e opções explícitas de preservação/exportação; nunca limpeza silenciosa.

Versões concorrentes causam conflito explícito para decisões financeiras. A resolução permite comparar versões e gravar nova operação; não há sobrescrita silenciosa por horário local. Exclusões usam tombstones e versão, impedindo ressurreição por dispositivo atrasado. Duas abas coordenarão o envio e o servidor continuará idempotente caso ambas enviem.

Saldos indicarão pendências locais e a última sincronização confirmada. Uma base local não é cópia segura definitiva: apagar dados do navegador ou perder o aparelho pode destruir alterações nunca enviadas. Exportação deverá incluir as pendências e deixar essa condição visível.

## Validação necessária para I3

Perder conexão antes/depois do commit remoto; perder apenas a resposta; reenviar; fechar e reabrir; sessão expirada; usuário trocado; duas abas/dispositivos; edição versus edição/exclusão; cursor paginado; transação recusada; quota; relógio incorreto. Confirmar que não há operações duplicadas, vazamento entre usuários, exclusões ressuscitadas ou avanço de cursor antes de persistência local.
