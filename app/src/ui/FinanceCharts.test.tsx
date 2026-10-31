import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import type { LocalFinancialState } from '../domain';
import { syntheticDataset } from '../persistence/synthetic-fixture.test-helper';
import { FinanceCharts } from './FinanceCharts';

const owner = 'a0000000-0000-4000-8000-000000000001';
function state(): LocalFinancialState {
  return { ...syntheticDataset(owner), outbox: [] };
}

describe('gráficos do dashboard financeiro', () => {
  it('não converte transferência em receita ou despesa realizada', () => {
    const html = renderToStaticMarkup(createElement(FinanceCharts, {state: state(), month: '2026-10'}));
    expect(html).toContain('Entradas e saídas realizadas');
    expect(html).toContain('Compromissos e receitas previstos');
    expect(html).toContain('Despesas pagas por categoria');
    expect(html).toContain('Nenhuma despesa paga neste período.');
    expect(html).toContain('Ainda não há valores para este gráfico.');
    expect(html).not.toContain('NaN');
  });

  it('usa apenas liquidações e mostra categorias e montantes efetivos', () => {
    const data = state();
    const eventId = 'a0000000-0000-4000-8000-000000000030';
    data.events.push({
      id:eventId,userId:owner,kind:'expense',source:'manual',status:'confirmed',certainty:'confirmed',
      amountCents:1299n,accountId:data.accounts[0]!.id,categoryId:data.categories[0]!.id,
      description:'Despesa de teste',competenceDate:'2026-10-28',
    });
    data.settlements.push({
      id:'a0000000-0000-4000-8000-000000000031',userId:owner,eventId,amountCents:1299n,
      settlementDate:'2026-10-28',paymentDate:'2026-10-28',
    });
    const html = renderToStaticMarkup(createElement(FinanceCharts, {state:data,month:'2026-10'}));
    expect(html).toContain('R$ 12,99');
    expect(html).toContain('Categoria de teste');
    expect(html).not.toContain('Nenhuma despesa paga neste período.');
  });
});
