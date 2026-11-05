import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import type { LocalFinancialState } from '../domain';
import { syntheticDataset } from '../persistence/synthetic-fixture.test-helper';
import { FinanceCharts, buildChartRows, defaultCharts, findFreeChartPosition, normalizeChartConfig } from './FinanceCharts';

const owner = 'a0000000-0000-4000-8000-000000000001';
function state(): LocalFinancialState {
  return { ...syntheticDataset(owner), outbox: [] };
}

describe('gráficos do dashboard financeiro', () => {

  it('encaixa gráficos em pontos livres, mantendo cinco bolinhas de distância se houver espaço',()=>{
    const occupied=[{id:'a',x:0,y:0,w:25,h:18}];
    expect(findFreeChartPosition(occupied,'b',30,0,25,18)).toEqual({x:30,y:0});
    const snapped=findFreeChartPosition(occupied,'b',10,5,25,18);
    expect(snapped.x>=25||snapped.y>=18||snapped.y+18<=0).toBe(true);
    expect(findFreeChartPosition(occupied,'a',5,5,25,18)).toEqual({x:5,y:5});
  });
  it('preserva coordenadas livres sem perder compatibilidade com gráficos antigos',()=>{
    const chart=defaultCharts()[0]!;
    expect(normalizeChartConfig({...chart,gridX:5,gridY:35})).toMatchObject({gridX:5,gridY:35});
    expect(normalizeChartConfig({...chart,gridX:-5,gridY:5})).not.toHaveProperty('gridX');
    expect(normalizeChartConfig(chart)).not.toHaveProperty('gridY');
  });

  it('filtra múltiplas categorias e respeita filtros antigos ao recarregar', () => {
    const data = state();
    const accountId = data.accounts[0]!.id;
    const categoryOne = data.categories[0]!.id;
    const categoryTwo = data.categories[1]!.id;
    const categoryThree = data.categories[2]!.id;
    for (const [index, categoryId] of [categoryOne, categoryTwo, categoryThree].entries()) {
      const eventId = 'category-event-' + index;
      data.events.push({
        id:eventId,userId:owner,kind:'expense',source:'manual',status:'confirmed',certainty:'confirmed',
        amountCents:BigInt((index + 1) * 1000),accountId,categoryId,
        description:'Despesa por categoria',competenceDate:'2026-10-28',
      });
      data.settlements.push({id:'category-settlement-' + index,userId:owner,eventId,
        amountCents:BigInt((index + 1) * 1000),settlementDate:'2026-10-28',paymentDate:'2026-10-28'});
    }
    const chart = {...defaultCharts()[0]!,months:1 as const,measure:'expense' as const,categoryIds:[categoryOne,categoryThree]};
    const persisted = normalizeChartConfig(JSON.parse(JSON.stringify(chart)))!;
    expect(persisted.categoryIds).toEqual([categoryOne,categoryThree]);
    expect(buildChartRows(data,'2026-10',persisted)[0]?.expense).toBe(4000n);
    expect(buildChartRows(data,'2026-10',{...chart,categoryIds:[]})[0]?.expense).toBe(6000n);
    const legacy = {...chart,categoryId:categoryTwo};
    delete (legacy as {categoryIds?:string[]}).categoryIds;
    expect(buildChartRows(data,'2026-10',legacy)[0]?.expense).toBe(2000n);
    expect(normalizeChartConfig({...chart,categoryIds:[categoryOne,categoryOne,9,null,'']})?.categoryIds).toEqual([categoryOne]);
  });

  it('não converte transferência em receita ou despesa realizada', () => {
    const html = renderToStaticMarkup(createElement(FinanceCharts, {state: state(), month: '2026-10'}));
    expect(html).toContain('Entradas e saídas realizadas');
    expect(html).toContain('Compromissos e receitas previstos');
    expect(html).toContain('Despesas pagas por categoria');
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
  });
});


describe('configuração personalizável e cálculo dos gráficos', () => {
  it('permite mudar tipo, métrica, agrupamento e tamanho com configuração validada', () => {
    const chart = normalizeChartConfig({ ...defaultCharts()[0], type: 'pie', measure: 'both', dimension: 'account', size: 'compact' });
    expect(chart).toMatchObject({ type: 'pie', measure: 'expense', dimension: 'account', size: 'compact' });
    expect(normalizeChartConfig({ ...defaultCharts()[0], type: 'javascript' })).toBeNull();
  });

  it('não contabiliza transferências e respeita filtros de conta e categoria', () => {
    const data = state();
    const expenseId = 'a0000000-0000-4000-8000-000000000044';
    const reverseId = 'a0000000-0000-4000-8000-000000000045';
    const base = {
      userId: owner, kind: 'expense' as const, source: 'manual' as const,
      status: 'confirmed' as const, certainty: 'confirmed' as const,
      accountId: data.accounts[0]!.id, categoryId: data.categories[0]!.id,
      description: 'Despesa de teste', competenceDate: '2026-10-25',
    };
    data.events.push({ ...base, id: expenseId, amountCents: 3500n });
    data.events.push({ ...base, id: reverseId, amountCents: 500n, reversesEventId: expenseId });
    data.settlements.push({ id: 'a0000000-0000-4000-8000-000000000046', userId: owner, eventId: expenseId, amountCents: 3500n, settlementDate: '2026-10-25', paymentDate: '2026-10-25' });
    data.settlements.push({ id: 'a0000000-0000-4000-8000-000000000047', userId: owner, eventId: reverseId, amountCents: 500n, settlementDate: '2026-10-26', paymentDate: '2026-10-26' });
    const config = { ...defaultCharts()[0]!, months: 1 as const };
    expect(buildChartRows(data, '2026-10', config)[0]).toMatchObject({ income: 0n, expense: 3000n });
    expect(buildChartRows(data, '2026-10', { ...config, dimension: 'category' })[0]).toMatchObject({ label: 'Categoria de teste', expense: 3000n });
    expect(buildChartRows(data, '2026-10', { ...config, accountId: data.accounts[1]!.id })[0]).toMatchObject({ income: 0n, expense: 0n });
    expect(buildChartRows(data, '2026-10', { ...config, categoryId: 'categoria-inexistente' })[0]).toMatchObject({ income: 0n, expense: 0n });
  });

  it('mantém previsão separada de valores efetivamente realizados', () => {
    const data = state();
    data.events.push({
      id: 'a0000000-0000-4000-8000-000000000055', userId: owner, kind: 'income', source: 'manual',
      status: 'planned', certainty: 'estimated', amountCents: 9500n,
      accountId: data.accounts[0]!.id, description: 'Receita futura', competenceDate: '2026-11-04',
    });
    const config = { ...defaultCharts()[1]!, months: 1 as const };
    expect(buildChartRows(data, '2026-11', config)[0]?.income).toBe(9500n);
    expect(buildChartRows(data, '2026-11', { ...config, source: 'realized' })[0]?.income).toBe(0n);
  });
});
