import { describe, expect, it } from 'vitest';
import type { Category } from '../src/domain';
import { atlasCategoryCatalog, categoryKey, planPersonalizedCategories, resolveCatalogParent } from '../src/ui/personalized-categories';

const owner='7e70df2f-42bc-4263-bfe8-b9c26af13213';
const create=(id:string,name:string,kind:'income'|'expense'|'both',parentId?:string):Category=>({
  id,userId:owner,name,kind,...(parentId?{parentId}:{})
});
describe('catálogo financeiro personalizado',()=>{
  it('gera grupos e filhos, sem categorias de transferências/faturas tratadas como despesas',()=>{
    const plan=planPersonalizedCategories([]);
    expect(plan.length).toBeGreaterThan(75);
    expect(plan.some(item=>item.name==='Alimentação'&&!item.parentKey)).toBe(true);
    expect(plan.some(item=>item.name==='Lanches'&&!!item.parentKey)).toBe(true);
    expect(plan.some(item=>item.name==='Salário'&&item.kind==='income')).toBe(true);
    for(const forbidden of ['Pagamento de fatura','Transferência entre contas','Aplicação','Resgate'])
      expect(plan.some(item=>item.name===forbidden)).toBe(false);
  });
  it('reaproveita categorias existentes sem alterar IDs',()=>{
    const root=create('root-1','ALIMENTACAO','expense');
    const child=create('child-1','padaria','expense','root-1');
    const plan=planPersonalizedCategories([root,child]);
    expect(plan.some(item=>categoryKey(item.name)==='alimentacao'&&item.kind==='expense')).toBe(false);
    expect(plan.some(item=>item.name==='Padaria'&&item.kind==='expense')).toBe(false);
    expect(plan.some(item=>item.name==='Lanches'&&item.kind==='expense')).toBe(true);
  });
  it('não confunde naturezas ou categorias com o mesmo nome sob pais distintos',()=>{
    const incomeRoot=create('income','REEMBOLSOS','income');
    const incomeChild=create('income-child','Transporte','income','income');
    const plan=planPersonalizedCategories([incomeRoot,incomeChild]);
    expect(plan.some(item=>item.name==='Transporte'&&item.kind==='income')).toBe(false);
    expect(plan.some(item=>item.name==='Transporte'&&item.kind==='expense')).toBe(true);
  });
  it('reconhece apenas igualdade normalizada, nunca nomes parecidos',()=>{
    const plan=planPersonalizedCategories([create('similar','MErcaos','expense')]);
    expect(plan.some(item=>item.name==='Supermercado e mercado')).toBe(true);
  });
  it('resolve a hierarquia com ID real existente',()=>{
    const plan=planPersonalizedCategories([]);
    const child=plan.find(item=>item.name==='Lanches');
    expect(child).toBeDefined();
    expect(()=>resolveCatalogParent([],child!)).toThrow();
    expect(resolveCatalogParent([create('actual','Alimentação','expense')],child!)).toBe('actual');
    expect(resolveCatalogParent([create('income','Alimentação','income')],child!)).toThrow();
  });
  it('é idempotente após criação progressiva de todo o catálogo',()=>{
    let saved:Category[]=[];
    for(let i=0;i<180;i++){
      const plan=planPersonalizedCategories(saved);
      if(!plan.length)break;
      const current=plan[0];
      const parent=resolveCatalogParent(saved,current);
      saved=[...saved,create('id-'+i,current.name,current.kind,parent)];
    }
    expect(planPersonalizedCategories(saved)).toHaveLength(0);
    expect(planPersonalizedCategories([...saved])).toHaveLength(0);
    expect(new Set(saved.map(row=>[row.kind,row.parentId??'',categoryKey(row.name)].join(':'))).size).toBe(saved.length);
    expect(saved.length).toBe(atlasCategoryCatalog.reduce((count,group)=>count+group.children.length+1,0));
  });
});
