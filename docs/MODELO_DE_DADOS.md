# Modelo de dados

## Contrato local I1

Todos os registros têm `id` e `userId` em UUID canônico minúsculo, assim como suas referências. No domínio TypeScript são strings validadas; na referência relacional, colunas UUID. A futura fronteira remota preservará esses identificadores sem converter a propriedade.

| Entidade | Campos e relações essenciais |
|---|---|
| `Account` | Nome; tipo `checking`, `savings`, `cash`, `digital`, `transport`, `investment` ou `other`; disponibilidade `free`, `reserved` ou `restricted`. Transporte exige disponibilidade restrita. |
| `Category` | Nome; natureza `income`, `expense` ou `both`; categoria superior opcional do mesmo proprietário, sem ciclos. |
| `FinancialEvent` | Natureza `income`, `expense`, `transfer` ou `adjustment`; status `planned`, `confirmed` ou `cancelled`; certeza `confirmed` ou `estimated`; origem `manual`, `import` ou `opening_balance`; valor positivo; conta; destino em transferência; categoria opcional; descrição; competência e vencimento opcional; direção de ajuste quando aplicável. |
| `Settlement` | Evento confirmado; valor positivo; data do pagamento e data da liquidação. Soma das liquidações não pode ultrapassar o valor do evento. |
| `Posting` | Liquidação, conta e valor com sinal. Data efetiva e evento são obtidos pela liquidação, sem cópia redundante. |

`FinancialDataset` contém as cinco coleções. A validação exige um único proprietário e referências existentes. Uma transferência liquidada tem exatamente duas contrapartidas opostas em contas diferentes; receitas, despesas e ajustes têm exatamente uma, com sinal compatível. Previsto/estimado não produz caixa realizado.

Centavos são `bigint`, com limite de `99_999_999_999` por evento, liquidação ou magnitude de contrapartida. Somas usam `bigint` sem conversão para `number`. O codec JSON recebe/devolve strings decimais canônicas. Datas financeiras são calendários `YYYY-MM-DD`; exibição futura em `DD/MM/AAAA`. Instantes de auditoria/sincronização futuros usarão UTC, separados dessas datas.

## Referência SQL

`database/modelo_inicial.sql` reproduz o desenho em schema isolado, com proprietário UUID de domínio, FKs compostas por proprietário, `bigint`, checks e índices. Não cria `auth.users`, não configura provedores, não possui grants de cliente ou políticas de acesso prontas, não é uma migration e **não foi aplicado nem testado em PostgreSQL**.

As restrições de linha e FKs não bastam para invariantes entre linhas. Soma liquidada, compatibilidade de categoria, ausência de ciclos, status do evento e número/sinais das contrapartidas precisam de validação transacional no backend e mecanismos de banco futuros. Não tratar esse SQL como schema pronto para produção.

Saldo inicial será um ajuste explicitamente confirmado e liquidado na data de referência. Não há coluna de saldo mutável concorrendo com as contrapartidas. Nenhum agregado financeiro persistido independente foi introduzido em I1.

`source = opening_balance` só é válido para ajustes. I2 mantém a reserva simples pela disponibilidade de uma conta inteira, alimentada por transferência. Reservas com finalidade, metas e alocações parciais ficam para a fase de planejamento, conforme `REGRAS_FINANCEIRAS.md`.

## Entidades posteriores

- I2 acrescentou `reversesEventId` e `replacesEventId` opcionais ao evento local. Estornos são eventos confirmados do mesmo valor/natureza com contrapartidas inversas; substituições de eventos liquidados exigem o estorno no mesmo comando.
- `PendingOperation` contém ID estável, proprietário, tipo, instante UTC e payload JSON explícito. A tabela `outbox` é isolada pelo mesmo proprietário e gravada atomicamente com o agregado. Em I2 todas permanecem pendentes; confirmação remota pertence a I3.
- O backup I2 contém manifesto, dataset serializado e outbox. Não há tabela de saldo, arquivo importável, restauração ou geração ativa.
- I3 acrescenta autorização administrativa por UUID, versões, tombstones, comprovantes de operação e mudanças incrementais do servidor. Relação com `auth.users` será criada apenas na integração autorizada.
- I4 acrescenta validação de entrada, prévia e controle de gerações para restauração segura; o manifesto de exportação já existe em I2.
- Fase 2 acrescenta cartões, compras, parcelas, faturas e alocação de pagamentos; dívidas, ofertas e acordos versionados; recorrências, participantes/rateios/créditos; benefícios, reembolsos e anexos.
- Fases 3–4 acrescentam orçamentos, metas/aportes, condições, cenários/premissas, preferências de alertas e relatórios. Resultados deriváveis não ganham duplicações sem mecanismo de consistência.

Essas entidades futuras não são tabelas ou funcionalidades implementadas no I1. A extensão de cartões será validada para reconhecer a compra e liquidar a obrigação sem criar uma segunda despesa no pagamento da fatura.
