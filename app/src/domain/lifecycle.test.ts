import {describe,expect,it} from 'vitest';
import {LifecycleConflict,currentLifecycle,decideLifecycleChange,incorporateLifecyclePage,isEntitySelectable,type LifecycleChange,type LifecycleRecord} from './lifecycle';

const user='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const other='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const account='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const category='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const op1='11111111-1111-4111-8111-111111111111';
const op2='22222222-2222-4222-8222-222222222222';
const op3='33333333-3333-4333-8333-333333333333';
const accountMeta={name:'Conta de teste',kind:'checking' as const,availability:'free' as const};
const categoryMeta={name:'Categoria de teste',kind:'expense' as const};
const change=(operationId:string,expectedVersion:number,nextState:'active'|'archived',entity:'account'|'category'='account',entityId=account,metadata=accountMeta):LifecycleChange=>({
  operationId,userId:user,entity,entityId,expectedVersion,nextState,metadata,
});

describe('P03 versioned entity metadata and lifecycle',()=>{
  it('archives and reactivates without deleting financial history',()=>{
    const archived=decideLifecycleChange([],change(op1,0,'archived'),1,true).record;
    expect(archived.version).toBe(1);
    expect(isEntitySelectable([archived],user,'account',account)).toBe(false);
    const reactivated=decideLifecycleChange([archived],change(op2,1,'active'),2,true).record;
    const synced=incorporateLifecyclePage([archived],[reactivated],user);
    expect(isEntitySelectable(synced,user,'account',account)).toBe(true);
    expect(currentLifecycle(synced,user,'account',account)).toMatchObject({version:2,state:'active'});
  });

  it('allows metadata edits as a new version without changing state',()=>{
    const first=decideLifecycleChange([],change(op1,0,'active'),1,true).record;
    const renamed=decideLifecycleChange([first],change(op2,1,'active','account',account,{...accountMeta,name:'Conta renomeada'}),2,true).record;
    expect(renamed.version).toBe(2);
    expect(renamed.nextState).toBe('active');
    expect(currentLifecycle([first,renamed],user,'account',account).metadata?.name).toBe('Conta renomeada');
  });

  it('rejects an offline device with an obsolete expected version',()=>{
    const archived=decideLifecycleChange([],change(op1,0,'archived'),1,true).record;
    expect(()=>decideLifecycleChange([archived],change(op2,0,'active'),2,true)).toThrow(LifecycleConflict);
    expect(()=>incorporateLifecyclePage([archived],[{...change(op2,0,'active'),version:1,revision:2}],user)).toThrow(LifecycleConflict);
    expect(isEntitySelectable([archived],user,'account',account)).toBe(false);
  });

  it('retries an identical operation idempotently and rejects changed content',()=>{
    const first=decideLifecycleChange([],change(op1,0,'archived'),1,true).record;
    expect(decideLifecycleChange([first],change(op1,0,'archived'),2,true)).toEqual({record:first,created:false});
    expect(()=>decideLifecycleChange([first],change(op1,0,'active'),2,true)).toThrow(/divergente/);
    expect(()=>incorporateLifecyclePage([first],[{...first,nextState:'active'}],user)).toThrow(/divergente/);
  });

  it('rejects duplicate or non-monotonic feed revisions and no-op changes',()=>{
    const first=decideLifecycleChange([],change(op1,0,'active'),1,true).record;
    expect(()=>decideLifecycleChange([first],change(op2,1,'active'),2,true)).toThrow(/solicitados/);
    expect(()=>incorporateLifecyclePage([first],[{...change(op2,1,'active','account',account,{...accountMeta,name:'Nova'}),version:2,revision:1}],user)).toThrow(/fora de ordem/);
    expect(()=>incorporateLifecyclePage([first],[{...change(op2,1,'active','account',account,{...accountMeta,name:'Nova'}),version:2,revision:0}],user)).toThrow(/Revisão local/);
  });

  it('isolates owners and entity kinds and validates metadata',()=>{
    const accountRow=decideLifecycleChange([],change(op1,0,'archived'),1,true).record;
    const categoryChange=change(op2,0,'archived','category',category,categoryMeta);
    const categoryRow=decideLifecycleChange([accountRow],categoryChange,2,true).record;
    const history=incorporateLifecyclePage([accountRow],[categoryRow],user);
    expect(isEntitySelectable(history,user,'category',category)).toBe(false);
    expect(isEntitySelectable(history,user,'account',category)).toBe(true);
    expect(isEntitySelectable(history,other,'account',account)).toBe(true);
    expect(()=>decideLifecycleChange([], {...change(op3,0,'archived'),metadata:{...accountMeta,kind:'invalid' as never}},1,true)).toThrow(/Tipo de conta/);
    expect(()=>incorporateLifecyclePage(history,[{...categoryRow,userId:other,operationId:op3}],user)).toThrow(/outro proprietário/);
  });

  it('does not mutate source history when a transition fails',()=>{
    const first=decideLifecycleChange([],change(op1,0,'archived'),1,true).record;
    const source:LifecycleRecord[]=[first];
    expect(()=>decideLifecycleChange(source,change(op2,0,'active'),2,true)).toThrow(LifecycleConflict);
    expect(source).toEqual([first]);
  });
});
