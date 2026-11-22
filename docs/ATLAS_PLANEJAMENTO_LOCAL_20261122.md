# Planejamento pessoal (Atlas 2.0) — liberação segura

## Escopo implementado
- Acesso em **Mais → Planejamento**, sem menu principal redundante.
- Metas com valor-alvo e prazo opcionais, prioridade não definida por padrão, status ativo/pausado/concluído e reservas associadas somente a contas livres com saldo inicial conciliado.
- A soma das reservas da mesma conta é verificada antes de uma nova destinação. Anular uma reserva mantém o registro original para conferência.
- Recorrências de frequência única, semanal, quinzenal, mensal, trimestral, semestral, anual e intervalo personalizado, com necessidade e vencimento opcionais; começam como **rascunho**.
- Referências de obrigações históricas ou planejadas **não** geram dívida no livro-caixa e não podem ser marcadas automaticamente como pagas.
- Despesas compartilhadas: total, parte pessoal, participantes, contribuições e pendências. Contribuições não são lançadas como renda. Correções preservam histórico da anotação.
- Regras por identificador confiável aprovado e categoria existente. **Não habilitam classificação automática Pluggy** até integração verificada; não classificar por semelhança de nomes.
- Preferências por conta: instituição, liquidez e restrições, sem alterar o registro real, o saldo ou a titularidade.
- Backup **independente** do planejamento por exportação JSON e importação sem sobrescrever IDs conflitantes.

## Dados existentes e privacidade
A auditoria do I3 principal identificou 4 contas, 2 categorias, 163 eventos e 168 recibos. Nenhum deles deve ser apagado, renomeado ou alterado com base em sugestões de texto. A base principal continua protegida pelo gate de gravações. O plano é salvo no **IndexedDB do navegador** com chave por usuário, não tem sincronização entre dispositivos e não está incluído no backup financeiro normal. Não afirmar que isso representa nuvem ou integração bancária concluída.

**Nunca inserir valores pessoais e históricos do solicitante no código público do repositório.** O arquivo privado de importação é gerado e entregue separadamente; suas obrigações históricas devem continuar como históricas ou pendentes de confirmação.

## Como usar a prévia
1. Abra a implantação de teste do PR, entre no espaço financeiro apropriado e escolha Mais → Planejamento.
2. Exporte o planejamento antes de importar qualquer configuração personalizada.
3. Importe o arquivo JSON privado recebido, confira metas, recorrências em rascunho e obrigações históricas; nenhum saldo bancário é modificado.
4. Em Categorias → Conferir categorias, veja o catálogo proposto. Faça backup completo do Atlas antes de confirmar criação das categorias faltantes.
5. No lançamento manual, sugestões conservadoras podem aparecer. Aplicação exige clique expresso.
6. Teste em um dispositivo de cada vez; como o planejamento é somente local, a importação do arquivo é necessária em outro dispositivo.

## Fora de escopo desta etapa / gates
- Não migrar, reabrir ou modificar recibos existentes em produção.
- Não ativar renda bruta histórica, dívidas ou vencimentos sem confirmação.
- Não operar pagamentos, reconciliações de Pluggy, cobrança de participantes ou alocações reais a partir de um painel de planejamento.
- Não executar merge na main nem publicação final antes de CI completo, restauração verificada, testes PC↔Android e homologação financeira real.
- O núcleo mensal de recorrências financeiras ainda não representa todas as frequências como lançamentos; as demais frequências são apenas informativas no painel.
