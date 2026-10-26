# Próxima etapa — aguardar autorização

Incremento 2 concluído nesta branch. As evidências e limitações estão em [VALIDACAO.md](VALIDACAO.md); o inventário e a recuperação do ambiente estão em [ESTADO_ATUAL.md](ESTADO_ATUAL.md).

Primeira pendência operacional desta VM: autenticar o GitHub e enviar os checkpoints locais na branch existente. O último remoto conferido ainda era `35e6a4e`; não perder a VM antes do push confirmado ou do download do bundle descrito no estado atual. Essa pendência não autoriza deploy ou I3.

Não iniciar I3 automaticamente. A próxima execução deve conferir branch, `git status`, commits e documentos, preservar alterações existentes e aguardar autorização explícita para identidade Google restrita, autorização ativa, RLS, RPC transacional e sincronização incremental.

I3 precisará validar a outbox real com dois usuários/dispositivos, idempotência, conflitos, falha antes/depois do commit e isolamento. O payload local atual é preparação, não prova de um protocolo remoto pronto. Não configurar serviços, aplicar SQL ou publicar com base na conclusão de I2.

A restauração completa continua prevista para I4: validar arquivo e identidade, apresentar prévia, preservar cópia anterior, construir geração isolada e trocar de forma atômica. Em I2 só existe exportação JSON; não prometer importação ou recuperação completa.

Pendências reais da versão local: ensaio em Android físico (instalação, teclado e ciclo de vida do app); conferência dos hashes privados se o usuário recuperar os originais fora do GitHub. Nenhuma delas autoriza incluir documentos pessoais ou backups no repositório. Viewports e testes executados estão discriminados na validação.
