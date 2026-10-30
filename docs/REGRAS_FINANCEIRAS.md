# Regras financeiras

## Dinheiro e datas

- `MoneyCents = bigint`. Um real corresponde a cem centavos. Valores de entrada são positivos e limitados a `99_999_999_999n`; contrapartidas aceitam sinal e nunca zero. Somas não usam ponto flutuante.
- Entrada brasileira é interpretada como texto; formatação não altera o valor armazenado. Para JSON, dinheiro é string decimal canônica: `"12345"` representa 123,45 BRL; não é um número JSON.
- Divisão em parcelas distribui os centavos restantes às primeiras parcelas, preservando exatamente o total; de uma a 1.200 parcelas, com pelo menos um centavo cada. Isso é uma primitiva matemática, não um módulo de cartão pronto.
- Percentuais usam pontos-base inteiros: 10.000 equivalem a 100%. Meio centavo arredonda para longe de zero. Nenhum cálculo de percentual presume pagamento.
- Competência, vencimento, pagamento e liquidação são conceitos distintos. Pagamento não pode ser posterior à liquidação registrada. Datas são de calendário no fuso financeiro, não instantes UTC disfarçados.

## Eventos e caixa

Um evento `planned` registra previsão; `confirmed` exige certeza confirmada e reconhece o fato financeiro. `cancelled` não é pago. Nenhum vencimento decorrido presume quitação. Pago/recebido/parcial serão estados derivados das liquidações, não uma segunda verdade independente.

Uma liquidação exige evento confirmado, data de pagamento, data de liquidação e contrapartidas completas. A soma liquidada de cada evento não pode exceder seu valor. Pagamento parcial deixa o restante em aberto.

Receita liquidada gera contrapartida positiva; despesa, negativa; ajuste segue sua direção. Transferência gera débito na origem e crédito igual no destino, numa única operação atômica. Transferências e ajustes não integram receitas/despesas do período.

Saldo inicial é ajuste na data conferida pelo usuário, com origem `opening_balance`, permitida somente em ajustes. As demais origens explícitas são `manual` e `import`. Não importar automaticamente números de especificações históricas. Não manter um saldo digitado em paralelo ao histórico de contrapartidas.

## Fórmulas implementadas no domínio I1

| Resultado | Definição |
|---|---|
| Saldo de uma conta até D | Soma das contrapartidas da conta cujas liquidações ocorreram até D, inclusive. |
| Livre | Soma dos saldos das contas com disponibilidade `free`. |
| Reservado | Soma dos saldos das contas com disponibilidade `reserved`. |
| Restrito | Soma dos saldos das contas com disponibilidade `restricted`. Não é dinheiro livre. |
| Total em contas | Livre + reservado + restrito. Não inclui limites de crédito. |
| Receitas/despesas de caixa | Liquidações de eventos de receita/despesa dentro do período, usando a data de liquidação. |
| Resultado de caixa | Receitas de caixa − despesas de caixa. |
| Receitas/despesas por competência | Valores dos eventos confirmados e de certeza confirmada cuja competência está no período, mesmo antes de liquidados. |
| Resultado por competência | Receitas por competência − despesas por competência. |

As funções de cálculo pressupõem um conjunto previamente validado na fronteira de persistência. Datas do período são inclusivas e o início não pode ser posterior ao fim. Meses sem movimento têm fluxo zero, mas o saldo mantém as contrapartidas de períodos anteriores.

Em I2, `reserved` continua classificando uma conta inteira como reservada. Separar valor nela é uma transferência entre contas e preserva o patrimônio total. Reservas com finalidade, meta ou alocação parcial pertencem à fase de planejamento.

Edição de evento liquidado acrescenta, atomicamente, um estorno integral de contrapartidas inversas e o evento substituto. Estorno simples acrescenta somente a correção inversa. O original nunca é apagado ou sobrescrito. Eventos previstos podem ser substituídos sem caixa; referências de substituição não podem formar ciclos ou versões concorrentes silenciosas.

## Contratos posteriores, ainda não implementados

Saldo projetado até uma data parte do saldo atual e soma entradas/saídas ainda abertas previstas até ela; parcelas já liquidadas não entram novamente. Projeção exibirá horizonte, contas incluídas e estimativas separadas. Não confundir livre com sobra depois de todos os compromissos futuros.

Compra em cartão e pagamento de fatura terão vínculo de obrigação/liquidação, sem reconhecimento duplicado de despesa. Juros, multas e descontos serão explícitos. Reembolso pendente não é caixa recebido nem aumento salarial automático. Recorrências gerarão previsões identificáveis, sem presumir pagamentos e sem duplicação em reprocessamento.

Restauração/importação manterá proveniência e não transformará estimativa em informação confirmada. Cada extensão adicionará casos de teste antes de ser considerada entregue.
