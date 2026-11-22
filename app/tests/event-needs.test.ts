import { describe, expect, it } from 'vitest';
import type { FinancialEvent } from '../src/domain';
import { NECESSITY_PAGE_SIZE, searchExpenseEvents } from '../src/planning/event-needs';

const event=(id:string,n:number,description='Despesa'):FinancialEvent=>({
  id,userId:'test-owner',kind:'expense',source:'manual',status:'confirmed',certainty:'confirmed',
  amountCents:100n,accountId:'account',competenceDate:'2026-11-'+String(1+(n%28)).padStart(2,'0'),
  description
});
describe('necessidade em todo o histórico',()=>{
  it('percorre mais de 120 eventos sem omissão ou duplicação',()=>{
    const rows=Array.from({length:251},(_,n)=>event('e-'+String(n).padStart(3,'0'),n));
    const pages=[] as string[][];
    for(let index=0;index<7;index++)pages.push(searchExpenseEvents(rows,'',index).matches.map(x=>x.id));
    expect(pages.flat()).toHaveLength(251);
    expect(new Set(pages.flat()).size).toBe(251);
    expect(searchExpenseEvents(rows,'',0).pages).toBe(7);
    expect(NECESSITY_PAGE_SIZE).toBe(40);
  });
  it('ignora receitas e eventos de estorno',()=>{
    const canceled={...event('rev',1),reversesEventId:'original'};
    const income={...event('in',2),kind:'income' as const};
    const results=searchExpenseEvents([event('ok',3),canceled,income],'',0);
    expect(results.total).toBe(1);
    expect(results.matches[0]?.id).toBe('ok');
  });
  it('busca com acentos e data e limita páginas inválidas',()=>{
    const rows=[event('a',1,'Farmácia'),event('b',2,'Internet')];
    expect(searchExpenseEvents(rows,'farmacia',10).matches[0]?.id).toBe('a');
    expect(searchExpenseEvents(rows,'2026-11-03',0).matches[0]?.id).toBe('b');
    expect(searchExpenseEvents(rows,'inexistente',0)).toMatchObject({total:0,pages:1,matches:[]});
    expect(searchExpenseEvents(rows,'',-50).page).toBe(0);
    expect(()=>searchExpenseEvents(rows,'',0,0)).toThrow();
  });
});
