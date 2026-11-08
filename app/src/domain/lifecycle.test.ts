import {describe,expect,it} from 'vitest';
import {
  LifecycleConflict, currentLifecycle, decideLifecycleChange,
  incorporateLifecyclePage, isEntitySelectable, type LifecycleChange, type LifecycleRecord,
} from './lifecycle';

const owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const other='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const account='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const category='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const operation=(operationId:string,expectedVersion:number,nextState:'active'|'archived',
  entity:'account'|'category'='account',entityId=account):LifecycleChange=>({
  operationId,ownerId:owner,entity,entityId,expectedVersion,nextState,
});
const op1='11111111-1111-4111-8111-111111111111';
const op2='22222222-2222-4222-8222-222222222222';
const op3='33333333-3333-4333-8333-333333333333';

describe('P03 archive lifecycle independent of financial records',()=>{
  it('archives without deleting ledgers and remains archived across client reconnect',()=>{
    const source:LifecycleRecord[]=[];
    const archived=decideLifecycleChange(source,operation(op1,0,'archived'),1,true);
    expect(archived.created).toBe(true);
    expect(archived.record.version).toBe(1);
    const deviceA=incorporateLifecyclePage(source,[archived.record],owner);
    expect(isEntitySelectable(deviceA,owner,'account',account)).toBe(false);
    const deviceB=incorporateLifecyclePage([],deviceA,owner);
    expect(isEntitySelectable(deviceB,owner,'account',account)).toBe(false);
    expect(currentLifecycle(deviceB,owner,'account',account)).toEqual({version:1,state:'archived'});
  });

  it('prevents an offline device with version zero from undoing the archive',()=>{
    const archive=decideLifecycleChange([],operation(op1,0,'archived'),1,true).record;
    const oldDevice=operation(op2,0,'active');
    expect(()=>decideLifecycleChange([archive],oldDevice,2,true)).toThrow(LifecycleConflict);
    const staleEvent={...oldDevice,version:1,revision:2};
    expect(()=>incorporateLifecyclePage([archive],[staleEvent],owner)).toThrow(LifecycleConflict);
    expect(isEntitySelectable([archive],owner,'account',account)).toBe(false);
  });

  it('retries exact operation idempotently but rejects same ID with different data',()=>{
    const item=decideLifecycleChange([],operation(op1,0,'archived'),1,true).record;
    expect(decideLifecycleChange([item],operation(op1,0,'archived'),2,true))
      .toEqual({record:item,created:false});
    expect(incorporateLifecyclePage([item],[item],owner)).toEqual([item]);
    expect(()=>decideLifecycleChange([item],operation(op1,0,'active'),2,true)).toThrow(/reutilizado/);
    expect(()=>incorporateLifecyclePage([item],[{...item,nextState:'active'}],owner)).toThrow(/divergente/);
  });

  it('restores archived entity only with a new expectedVersion and explicit reactivation',()=>{
    const archive=decideLifecycleChange([],operation(op1,0,'archived'),1,true).record;
    const reactivate=decideLifecycleChange([archive],operation(op2,1,'active'),2,true).record;
    const state=incorporateLifecyclePage([archive],[reactivate],owner);
    expect(isEntitySelectable(state,owner,'account',account)).toBe(true);
    expect(currentLifecycle(state,owner,'account',account).version).toBe(2);
    expect(()=>decideLifecycleChange(state,operation(op3,1,'archived'),3,true)).toThrow(LifecycleConflict);
  });

  it('isolates categories, accounts, and owners, with sequential entity revisions',()=>{
    const accountArchive=decideLifecycleChange([],operation(op1,0,'archived'),1,true).record;
    const categoryArchive=decideLifecycleChange([accountArchive],
      operation(op2,0,'archived','category',category),2,true).record;
    const state=incorporateLifecyclePage([],[accountArchive,categoryArchive],owner);
    expect(isEntitySelectable(state,owner,'category',category)).toBe(false);
    expect(isEntitySelectable(state,owner,'account',category)).toBe(true);
    expect(isEntitySelectable(state,other,'account',account)).toBe(true);
    expect(()=>incorporateLifecyclePage(state,[{...categoryArchive,ownerId:other,operationId:op3}],owner))
      .toThrow(/outro proprietário/);
  });

  it('rejects gaps, duplicate global revision, nonexistent entity and invalid values without changes',()=>{
    const archive=decideLifecycleChange([],operation(op1,0,'archived'),1,true).record;
    const baseline=[archive];
    expect(()=>decideLifecycleChange(baseline,operation(op2,1,'active'),2,false)).toThrow(/não encontrada/);
    expect(()=>decideLifecycleChange(baseline,operation(op2,1,'active','category',category),1,true))
      .toThrow(/Revisão global/);
    expect(()=>decideLifecycleChange(baseline,{...operation(op2,1,'active'),expectedVersion:-1},2,true))
      .toThrow(/Versão esperada/);
    expect(()=>incorporateLifecyclePage(baseline,[{...operation(op2,1,'active'),version:4,revision:2}],owner))
      .toThrow(LifecycleConflict);
    expect(baseline).toEqual([archive]);
  });
});
