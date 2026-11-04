import { describe, expect, it } from 'vitest';
import { activeEventIds, groupMovementHistory } from '../../src/ui/financial-view';
import type { FinancialEvent } from '../../src/domain';

const owner='11111111-1111-4111-8111-111111111111';
const account='22222222-2222-4222-8222-222222222222';
function event(id:string,kind:FinancialEvent['kind'],amountCents:bigint,description='Bolo'):FinancialEvent {
  return {id,userId:owner,kind,amountCents,description,accountId:account,
    status:'confirmed',certainty:'confirmed',source:'manual',competenceDate:'2026-11-03'};
}
describe('agrupamento visual de movimentações',()=>{
  it('mostra apenas valor corrigido de R$ 20 com original e estorno técnico dentro do histórico',()=>{
    const original=event('1','expense',7000n);
    const reversal={...event('2','expense',7000n,'Estorno: Bolo'),reversesEventId:original.id};
    const corrected={...event('3','expense',2000n),replacesEventId:original.id};
    const extra=event('4','income',10000n,'Salário');
    const before=[original,reversal,corrected,extra];
    const groups=groupMovementHistory(before);
    expect(groups).toHaveLength(2);
    const bolo=groups.find(group=>group.current.description==='Bolo');
    expect(bolo?.current.id).toBe('3');
    expect(bolo?.current.amountCents).toBe(2000n);
    expect(bolo?.history.map(row=>row.id).sort()).toEqual(['1','2']);
    expect(bolo?.cancelled).toBe(false);
    expect(before).toHaveLength(4); // No financial history is deleted.
    expect(activeEventIds({events:before} as import('../../src/domain').FinancialDataset)).toEqual(new Set(['3','4']));
  });
  it('apresenta estorno final como lançamento cancelado, sem criar reembolso independente',()=>{
    const original=event('10','expense',3000n);
    const reversal={...event('11','expense',3000n,'Estorno: Bolo'),reversesEventId:original.id};
    const groups=groupMovementHistory([original,reversal]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.current.id).toBe('10');
    expect(groups[0]?.cancelled).toBe(true);
    expect(groups[0]?.history.map(row=>row.id)).toEqual(['11']);
  });
  it('mantém transações sem alterações como lançamentos separados',()=>{
    const first=event('20','expense',2000n);
    const second=event('21','expense',5000n,'Mercado');
    expect(groupMovementHistory([first,second])).toHaveLength(2);
    expect(groupMovementHistory([first,second]).every(group=>group.history.length===0)).toBe(true);
  });
});
