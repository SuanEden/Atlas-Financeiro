import { describe, expect, it } from 'vitest';
import {
  emptyPlan, validatePlan, canReserve, reservedForAccount, sharedSummary,
  applyApprovedRule, mergeImportedPlan, type FinancialPlan, type Goal, type SharedExpense
} from '../src/planning/model';

const owner='079b4aa9-6473-4a7c-8473-7340b066e17c';
const goal=(id='g1'):Goal=>({id,name:'Reserva de emergência',targetCents:null,deadline:null,
  priority:'high',status:'active',allocations:[]});
describe('planejamento pessoal isolado do livro-caixa',()=>{
  it('começa sem saldos, receitas, cobranças ou metas inventadas',()=>{
    const plan=emptyPlan(owner);
    validatePlan(plan,owner);
    expect(plan.goals).toEqual([]);
    expect(plan.recurrences).toEqual([]);
    expect(plan.obligations).toEqual([]);
  });
  it('suporta meta sem prazo nem valor-alvo',()=>{
    const plan={...emptyPlan(owner),goals:[goal()]};
    expect(()=>validatePlan(plan,owner)).not.toThrow();
  });
  it('impede reservar o mesmo dinheiro duas vezes em metas diferentes',()=>{
    const plan:FinancialPlan={...emptyPlan(owner),goals:[
      {...goal(),allocations:[{id:'a1',accountId:'nubank',cents:7500,on:'2026-11-22'}]},
      {...goal('g2'),allocations:[]}
    ]};
    expect(reservedForAccount(plan,'nubank')).toBe(7500);
    expect(canReserve(plan,'nubank',2500,10000)).toBe(true);
    expect(canReserve(plan,'nubank',2501,10000)).toBe(false);
    expect(canReserve(plan,'nubank',1000,0)).toBe(false);
  });
  it('separa contribuição compartilhada de renda pessoal',()=>{
    const shared:SharedExpense={id:'sh1',name:'Assinatura',totalCents:1300,
      personalCents:500,participants:['A','B'],carriedCreditCents:100,status:'active',
      contributions:[{id:'c1',participant:'A',cents:400,on:'2026-11-22'}]};
    expect(sharedSummary(shared)).toEqual({receivedCents:400,coveredCents:500,pendingCents:300,surplusCents:0});
  });
  it('nunca sugere uma regra por nome, somente identificador exato autorizado',()=>{
    const plan:FinancialPlan={...emptyPlan(owner),rules:[{id:'rule1',identifierType:'merchant_id',
      identifier:'merchant_001',categoryId:'cat01',approvedAt:'2026-11-22',enabled:true}]};
    expect(applyApprovedRule(plan,'merchant_id','merchant_001')).toBe('cat01');
    expect(applyApprovedRule(plan,'counterparty_id','merchant_001')).toBeUndefined();
    expect(applyApprovedRule(plan,'merchant_id','merchant_002')).toBeUndefined();
  });
  it('bloqueia campos, prazos e regras inválidos em uma importação',()=>{
    const plan=emptyPlan(owner);
    expect(()=>validatePlan({...plan,schemaVersion:2})).toThrow();
    expect(()=>validatePlan({...plan,goals:[{...goal(),deadline:'2026-02-30'}]})).toThrow();
    expect(()=>validatePlan({...plan,goals:[{...goal(),allocations:[{id:'a',accountId:'x',cents:-5,on:'2026-11-22'}]}]})).toThrow();
    expect(()=>validatePlan({...plan,rules:[{id:'r',identifierType:'merchant_id',identifier:'',categoryId:'x',approvedAt:'2026-11-22',enabled:true}]})).toThrow();
  });
  it('não reativa uma cobrança recorrente sem valor confirmado',()=>{
    const plan={...emptyPlan(owner),recurrences:[{id:'rec',name:'Internet',direction:'expense',
      cents:null,frequency:'monthly',customIntervalDays:null,dueDay:null,
      necessity:'essential',status:'active',categoryId:null,shared:false}]};
    expect(()=>validatePlan(plan)).toThrow();
  });
  it('importa apenas registros ausentes, com IDs estáveis',()=>{
    const first={...emptyPlan(owner),goals:[goal('one')]};
    const second={...emptyPlan(owner),goals:[goal('two')]};
    const merged=mergeImportedPlan(first,second);
    expect(merged.goals.map(g=>g.id)).toEqual(['one','two']);
    expect(mergeImportedPlan(merged,second).goals).toHaveLength(2);
  });
  it('não sobrescreve conteúdo divergente com o mesmo ID',()=>{
    const first={...emptyPlan(owner),goals:[goal('one')]};
    const second={...emptyPlan(owner),goals:[{...goal('one'),name:'Diferente'}]};
    expect(()=>mergeImportedPlan(first,second)).toThrow(/mesmo ID/);
  });
  it('rejeita registros repetidos em arquivos restaurados',()=>{
    expect(()=>validatePlan({...emptyPlan(owner),goals:[goal('one'),goal('one')]})).toThrow();
  });
});
