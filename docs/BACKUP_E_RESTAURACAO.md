# Backup e restauração

**Contrato futuro.** I1 oferece codec de centavos para JSON e leitura consistente do armazenamento local. Esses componentes não constituem um exportador completo, arquivo de backup ou restaurador. Backup local entra em I2; restauração completa e controle de gerações, em I4.

## Arquivo de backup

O formato será versionado e conterá manifesto, versão de schema, proprietário de origem, instante de exportação e todas as entidades financeiras/histórico. Valores monetários usam strings canônicas; datas financeiras mantêm seu calendário. Nunca incluir senhas, tokens de sessão, Client Secret, chaves administrativas ou configuração de faturamento.

Incluir operações locais pendentes com identificadores/proveniência preservados e informar que ainda não foram confirmadas remotamente. CSV é exportação tabular, não substituto desse formato. O usuário precisa salvar cópia fora do aparelho; sincronização não protege contra exclusões indevidas propagadas.

Anexos futuros são uma opção explícita. Um pacote sem arquivos deve declarar quais referências ficaram de fora. Download remoto interrompido não produz pacote declarado completo. Comprovantes mantêm estado independente do lançamento: falha de upload/download não apaga nem duplica a despesa.

## Restauração prevista

1. Validar formato, versão, integridade, limites, referências e dinheiro antes de alterar a base ativa. Exibir prévia de contas, período, registros, anexos e pendências.
2. Conferir identidade de destino. Não aceitar `userId` de outro usuário como autorização nem importar sessões do arquivo.
3. Identificar duplicatas por IDs e proveniência. Não duplicar liquidações ou reenviar operações já confirmadas. Conflitos de conteúdo precisam de resolução explícita.
4. Antes de substituir, produzir cópia recuperável do estado atual. Tratar a outbox existente explicitamente, sem apagar pendências ou fundi-las por adivinhação.
5. Construir uma geração nova isolada, validar e somente então trocar o ponteiro ativo de forma atômica. Falha/fechamento antes da troca mantém a geração antiga utilizável.
6. Na integração remota, validar geração e autorização para impedir dispositivo antigo de reintroduzir dados substituídos. Confirmar a situação remota antes de informar recuperação concluída.

Geração é uma fronteira futura de recuperação/sincronização, não uma tabela ou engine implementada no I1. Arquivos de backup são dados sensíveis; não há criptografia própria implementada e não se deve anunciar proteção inexistente.

## Critérios de aceitação de I4

Exportar/restaurar em instalação limpa com os mesmos saldos e relações; rejeitar arquivo inválido sem alterações; testar cópia anterior à substituição; duplicata de arquivo/operação; arquivo com estimativas; pendências locais; anexos ausentes/interrompidos; proprietário diferente; falha durante criação e troca de geração; retorno de dispositivo antigo. Atualização da PWA não pode apagar IndexedDB, outbox ou uma recuperação em andamento.
