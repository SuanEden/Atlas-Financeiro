# Backup e restauração

**Exportação implementada em I2; recuperação mínima antecipada e autorizada em I3. Restauração completa continua em I4.** O aplicativo baixa um JSON versionado com manifesto, dataset completo e operações pendentes. Valores monetários permanecem strings canônicas. O arquivo não contém credenciais, sessão ou configuração remota.

## Recuperação mínima de I2 — implementação local

Em Backup, selecionar **Arquivo JSON de I2** e conferir a prévia. A seleção valida sem gravar. O botão exige confirmação explícita. Aceitam-se até 10 MiB e 50 mil registros financeiros, formato/versão conhecidos, contagens corretas, dinheiro canônico em strings, UUIDs, datas, referências, histórico e outbox coerentes. Tipos e payloads das operações são comparados com as entidades exatas; IDs de operação repetidos, cobertura dupla e transferência parcial são recusados.

O destino deve estar vazio ou conter exatamente a mesma base e outbox. Não se unem bases nem se substituem registros. Os IDs e o proprietário anônimo original são mantidos; isso não é login/associação Google. Todos os registros financeiros e pendências entram na mesma transação Dexie. Falha final reverte tudo. Depois do commit completo ativa-se o namespace; se essa ativação falhar, a base anterior permanece ativa e repetir o arquivo reconhece a cópia completa. Não há uma transação única entre IndexedDB e localStorage.

Fechar abas antigas antes de recuperar. A versão atual coordena gravação/ativação com Web Locks; navegador sem esse recurso recusa recuperação, preservando dados. Abas antigas de I2 não conhecem essa trava. Guardar a exportação fora do aparelho/VM e manter a origem. Arquivos não têm criptografia própria nem assinatura de autenticidade.

Foi comprovado com sintéticos: exportação real no navegador → outro perfil vazio → prévia/recuperação → reabertura → comparação de IDs, centavos, histórico e pendências. Repetição exata não insere de novo; inválidos/destino ocupado/falha final são recusados sem mudança parcial. Também passou recuperação offline no build PWA, seguida de nova gravação e exportação. Isso não comprova dois aparelhos físicos nem idempotência de um futuro envio remoto.

Não aceita futuras exportações sincronizadas com recibos/cursor/conflitos. Não importa sessão, substitui base ativa ou gerencia gerações. Essa limitação impede usar um arquivo I2 para descartar metadados remotos; quando o formato evoluir, o importador terá de reconhecer e validar todos eles. A origem sintética da VM não será escolhida como base pessoal.

## Histórico da exportação de I2

O exportador foi validado unitariamente e pelo download no navegador. Ele não cifra o arquivo, não copia automaticamente para outro dispositivo e não constitui restauração. O usuário precisa guardar a cópia em local privado fora do navegador e da VM.

Formato atual: `atlas-financeiro-local-backup`, `schemaVersion: 1`, `manifest.financialSchemaVersion: 2`, proprietário UUID, instante de exportação, contagens das cinco coleções, total de pendências e `attachmentsIncluded: false`. `data` contém o dataset financeiro; `outbox` contém IDs, tipo, instante e payloads com centavos em strings. O exportador valida o dataset e os metadados das pendências e rejeita proprietário divergente, IDs de operação repetidos e instante inválido. O comando persistido exige payload idêntico ao agregado gravado.

O teste de navegador lê o arquivo realmente baixado, verifica contagens e soma exata, incluindo originais, estornos, substituições e cancelamento. Não existe seletor de arquivo, parser de entrada nem alteração do banco por arquivo em I2. Rejeição de arquivos de restauração e recuperação em instalação limpa ainda não foram implementadas ou testadas; esses critérios pertencem a I4.

Ao solicitar a exportação, a interface relê todas as coleções e a outbox em uma transação de leitura consistente. Não usa apenas o snapshot visual, que pode estar anterior a uma gravação de outra aba. O teste com duas abas confirmou a inclusão da conta recém-gravada na exportação da aba antiga. Falhas na leitura ou geração são apresentadas como erro, sem substituir os dados locais.

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
