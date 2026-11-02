import { describe, expect, it } from 'vitest';
import type { LocalFinancialState } from '../domain';
import { syncLinkedBankAccount } from './bank-auto-import';
import type { CommandContext } from '../application';

const userId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const atlasAccountId='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const accountId='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const itemId='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const row=(id:string,date:string,status='POSTED')=>({
  id,accountId,date,description:'PIX',amount:-19.99,currencyCode:'BRL',status,type:'DEBIT',
});
describe('automatic Pluggy bank imports',()=>{
  it('retrieves all pages and never posts the same event twice',async()=>{
    let counter=0;
    const context:CommandContext={userId,nextId:()=>{counter++;return '00000000-0000-4000-8000-'+counter.toString(16).padStart(12,'0');},now:()=>new Date().toISOString(),today:()=> '2026-11-03'};
    const state:LocalFinancialState={
      accounts:[{id:atlasAccountId,userId,name:'Nubank',kind:'digital',availability:'free'}],
      events:[],categories:[],settlements:[],postings:[],outbox:[],
    };
    const cursors:string[]=[];
    const source={
      readPage:async(_id:string,after?:string)=>{
        cursors.push(after||'start');
        return !after?{results:[row('before','2026-11-02'),row('one','2026-11-03'),row('pending','2026-11-03','PENDING')],next:'?accountId='+accountId+'&after=cursor'}:
          {results:[row('two','2026-11-04'),row('one','2026-11-03')],next:null};
      },
      readState:async()=>state,
      execute:async(command:import('../application').LocalCommand)=>{
        state.events.push(...command.aggregate.events||[]);
        state.settlements.push(...command.aggregate.settlements||[]);
        state.postings.push(...command.aggregate.postings||[]);
      },
      context,
    };
    const link={itemId,pluggyAccountId:accountId,atlasAccountId,activatedOn:'2026-11-02'};
    expect(await syncLinkedBankAccount(link,source)).toBe(2);
    expect(state.events).toHaveLength(2);
    expect(state.events.every(e=>e.source==='import')).toBe(true);
    expect(await syncLinkedBankAccount(link,source)).toBe(0);
    expect(state.events).toHaveLength(2);
    expect(cursors).toEqual(['start','cursor','start','cursor']);
  });
  it('does not post any transaction when a cursor is malformed',async()=>{
    const link={itemId,pluggyAccountId:accountId,atlasAccountId,activatedOn:'2026-11-02'};
    let committed=0;
    await expect(syncLinkedBankAccount(link,{
      readPage:async()=>({results:[row('one','2026-11-03')],next:'https://hostile.example/'}),
      readState:async()=>({accounts:[],events:[],categories:[],settlements:[],postings:[],outbox:[]}),
      execute:async()=>{committed++;},
      context:{userId,nextId:()=>atlasAccountId,now:()=>new Date().toISOString(),today:()=> '2026-11-03'},
    })).rejects.toThrow('Cursor bancário inválido');
    expect(committed).toBe(0);
  });
});