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
  it('follows a Pluggy cursor that omits the accountId and retains deduplication',async()=>{
    const state:LocalFinancialState={
      accounts:[{id:atlasAccountId,userId,name:'Nubank',kind:'digital',availability:'free'}],
      events:[],categories:[],settlements:[],postings:[],outbox:[],
    };
    const requests:Array<{accountId:string;after?:string;dateFrom?:string}>=[];
    const source={
      readPage:async(id:string,after?:string,dateFrom?:string)=>{
        requests.push({accountId:id,...(after?{after}:{}),...(dateFrom?{dateFrom}:{})});
        return after
          ? {results:[row('second','2026-11-04'),row('first','2026-11-03')],next:null}
          : {results:[row('first','2026-11-03')],next:'?after=opaque%2Bvalue%3D%3D'};
      },
      readState:async()=>state,
      execute:async(command:import('../application').LocalCommand)=>{
        state.events.push(...command.aggregate.events||[]);
        state.settlements.push(...command.aggregate.settlements||[]);
        state.postings.push(...command.aggregate.postings||[]);
      },
      context:{userId,nextId:()=>crypto.randomUUID(),now:()=>new Date().toISOString(),today:()=> '2026-11-04'},
    };
    const link={itemId,pluggyAccountId:accountId,atlasAccountId,activatedOn:'2026-11-02'};
    expect(await syncLinkedBankAccount(link,source)).toBe(2);
    expect(requests).toEqual([
      {accountId,dateFrom:'2026-11-02'},
      {accountId,after:'opaque+value==',dateFrom:'2026-11-02'},
    ]);
    expect(await syncLinkedBankAccount(link,source)).toBe(0);
    expect(state.events).toHaveLength(2);
  });
  it('accepts extra Pluggy next-query filters but never forwards them to the gateway',async()=>{
    const state:LocalFinancialState={
      accounts:[{id:atlasAccountId,userId,name:'Nubank',kind:'digital',availability:'free'}],
      events:[],categories:[],settlements:[],postings:[],outbox:[],
    };
    const pages:Array<{account:string;after?:string;dateFrom?:string}>=[];
    const link={itemId,pluggyAccountId:accountId,atlasAccountId,activatedOn:'2026-11-01'};
    const count=await syncLinkedBankAccount(link,{
      readPage:async(account,after,dateFrom)=>{
        pages.push({account,...(after?{after}:{}),...(dateFrom?{dateFrom}:{})});
        return after
          ? {results:[row('second','2026-11-03')],next:null}
          : {results:[row('first','2026-11-02')],next:'?accountId='+accountId+'&dateFrom=2026-11-01T00%3A00%3A00.000Z&pageSize=500&after=c%2B2'};
      },
      readState:async()=>state,
      execute:async(command)=>{
        state.events.push(...command.aggregate.events||[]);
        state.settlements.push(...command.aggregate.settlements||[]);
        state.postings.push(...command.aggregate.postings||[]);
      },
      context:{userId,nextId:()=>crypto.randomUUID(),now:()=>new Date().toISOString(),today:()=> '2026-11-04'},
    });
    expect(count).toBe(2);
    expect(pages).toEqual([
      {account:accountId,dateFrom:'2026-11-01'},
      {account:accountId,after:'c+2',dateFrom:'2026-11-01'},
    ]);
  });
  it('rejects mismatched or repeated cursor parameters before any financial write',async()=>{
    for(const next of [
      '?accountId=other&after=cursor',
      '?accountId='+accountId+'&accountId='+accountId+'&after=cursor',
      '?after=cursor&after=second',
      '?accountId='+accountId,
      '?after=cursor', // Repeated by the fixture on the next page; must stop.
    ]){
      let calls=0;
      const source={
        readPage:async(_id:string,_after?:string)=>({
          results:[row('first','2026-11-03')],
          next,
        }),
        readState:async():Promise<LocalFinancialState>=>({
          accounts:[{id:atlasAccountId,userId,name:'Nubank',kind:'digital',availability:'free'}],
          events:[],categories:[],settlements:[],postings:[],outbox:[],
        }),
        execute:async()=>{calls++;},
        context:{userId,nextId:()=>crypto.randomUUID(),now:()=>new Date().toISOString(),today:()=> '2026-11-04'},
      };
      await expect(syncLinkedBankAccount({itemId,pluggyAccountId:accountId,atlasAccountId,activatedOn:'2026-11-02'},source))
        .rejects.toThrow('Paginação bancária inconsistente');
      expect(calls).toBe(0);
    }
  });
  it('imports only same-day transactions after the confirmed bank snapshot',async()=>{
    const events: string[]=[];
    const context:CommandContext={
      userId, nextId:()=>crypto.randomUUID(), now:()=>new Date().toISOString(),today:()=> '2026-11-02',
    };
    const state:LocalFinancialState={
      accounts:[{id:atlasAccountId,userId,name:'Nubank',kind:'digital',availability:'free'}],
      events:[],categories:[],settlements:[],postings:[],outbox:[],
    };
    const link={itemId,pluggyAccountId:accountId,atlasAccountId,activatedOn:'2026-11-02',activatedAt:'2026-11-02T18:00:00.000Z'};
    const count=await syncLinkedBankAccount(link,{
      readPage:async()=>({results:[
        row('old','2026-11-02T17:00:00.000Z'),
        row('same-minute','2026-11-02T18:00:00.000Z'),
        row('new','2026-11-02T19:00:00.000Z'),
        row('no-time','2026-11-02'),
        row('tomorrow','2026-11-03'),
      ],next:null}),
      readState:async()=>state,
      execute:async(command)=>{
        events.push(command.aggregate.events?.[0]?.description||'');
        state.events.push(...command.aggregate.events||[]);
      },
      context,
    });
    expect(count).toBe(2);
    expect(events).toEqual(['PIX','PIX']);
  });
  it('recovers the original account creation time for the Nov 2 Nubank transaction without importing an older one',async()=>{
    const createdAt='2026-11-03T00:44:10.318Z'; // 21:44 on Nov 2 in Sao Paulo
    const state:LocalFinancialState={
      accounts:[{id:atlasAccountId,userId,name:'Nubank',kind:'digital',availability:'free'}],
      events:[],categories:[],settlements:[],postings:[],
      outbox:[{
        id:'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',userId,kind:'create_account',createdAt,
        payloadJson:JSON.stringify({
          accounts:[{id:atlasAccountId,userId}],
          events:[{accountId:atlasAccountId,source:'opening_balance'}],
        }),
      }],
    };
    const link={itemId,pluggyAccountId:accountId,atlasAccountId,activatedOn:'2026-11-02'};
    let next=0;
    const context:CommandContext={
      userId,nextId:()=>('00000000-0000-4000-8000-'+(++next).toString(16).padStart(12,'0')),
      now:()=>createdAt,today:()=> '2026-11-03',
    };
    const imported=await syncLinkedBankAccount(link,{
      readPage:async()=>({results:[
        row('older','2026-11-03T00:40:00.000Z'),
        row('expense20','2026-11-03T00:56:00.000Z'),
        row('date-only','2026-11-03'),
      ],next:null}),
      readState:async()=>state,
      execute:async command=>{
        state.events.push(...command.aggregate.events||[]);
        state.settlements.push(...command.aggregate.settlements||[]);
        state.postings.push(...command.aggregate.postings||[]);
      },
      context,
    });
    expect(imported).toBe(1);
    expect(state.events).toHaveLength(1);
    expect(state.events[0]?.description).toBe('PIX');
  });
  it('does not relax the cutoff for an account created manually or much earlier',async()=>{
    const {withRecoveredOpeningBaseline}=await import('./bank-auto-import');
    const link={itemId,pluggyAccountId:accountId,atlasAccountId,activatedOn:'2026-11-02'};
    const manual:LocalFinancialState={
      accounts:[{id:atlasAccountId,userId,name:'Nubank',kind:'digital',availability:'free'}],
      events:[],categories:[],settlements:[],postings:[],
      outbox:[{
        id:'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',userId,kind:'create_account',
        createdAt:'2026-10-20T12:00:00.000Z',
        payloadJson:JSON.stringify({accounts:[{id:atlasAccountId}],events:[{accountId:atlasAccountId,source:'opening_balance'}]}),
      }],
    };
    expect(withRecoveredOpeningBaseline(link,manual)).toEqual(link);
    manual.outbox[0]!.createdAt='2026-11-03T00:44:10.318Z';
    manual.outbox[0]!.payloadJson=JSON.stringify({accounts:[{id:atlasAccountId}],events:[{accountId:atlasAccountId,source:'manual'}]});
    expect(withRecoveredOpeningBaseline(link,manual)).toEqual(link);
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