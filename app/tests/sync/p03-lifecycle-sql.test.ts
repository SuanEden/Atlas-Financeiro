import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {sqlTestServer} from './sql-test-server';
import type {BootstrapEnvelope,CommandEnvelope} from '../../src/sync/protocol';

let server:Awaited<ReturnType<typeof sqlTestServer>>;
beforeAll(async()=>{server=await sqlTestServer();},30000);
afterAll(async()=>{await server?.close();});

async function createAccount(owner:string,accountId=crypto.randomUUID()) {
  const bootstrap:BootstrapEnvelope={
    protocolVersion:1,operationId:crypto.randomUUID(),userId:owner,baseRevision:'0',kind:'bootstrap',
    source:{ownerId:owner,digest:'a'.repeat(64)},
    data:{schemaVersion:4,userId:owner,accounts:[{id:accountId,userId:owner,name:'Conta de teste',kind:'checking',availability:'free'}],
      categories:[],events:[],settlements:[],postings:[],accountReconciliations:[],entityLifecycles:[]},
    coveredOperations:[],
  };
  await server.apply(owner,bootstrap);
  return accountId;
}
function manage(owner:string,accountId:string,expectedVersion:number,nextState:'active'|'archived',operationId=crypto.randomUUID()):CommandEnvelope {
  const operation={id:operationId,userId:owner,kind:'manage_entity' as const,createdAt:'2026-11-08T12:00:00.000Z',
    payload:{schemaVersion:1,userId:owner,lifecycleChange:{entity:'account',entityId:accountId,expectedVersion,nextState,
      metadata:{name:'Conta de teste',kind:'checking',availability:'free'}}}};
  return {protocolVersion:1,operationId,userId:owner,baseRevision:'1',kind:'manage_entity',operation};
}

describe('P03 schema v4 versioned entity management',()=>{
  it('keeps lifecycle data private, owner-scoped, and immutable',async()=>{
    const first=await server.user(),second=await server.user(),account=await createAccount(first);
    const receipt=await server.apply(first,manage(first,account,0,'archived'));
    expect(receipt.revision).toBe('2');
    const own=await server.asUser(first,()=>server.db.query<{count:string;state:string;version:number}>(
      `select count(*)::text as count,max(new_state) as state,max(entity_version) as version from atlas_private.entity_lifecycle where user_id=$1`,[first]));
    const hidden=await server.asUser(second,()=>server.db.query<{count:string}>(
      'select count(*)::text as count from atlas_private.entity_lifecycle'));
    expect(own.rows[0]).toMatchObject({count:'1',state:'archived',version:1});
    expect(hidden.rows[0]?.count).toBe('0');
    await expect(server.db.query(
      "update atlas_private.entity_lifecycle set new_state='active' where user_id=$1",[first],
    )).rejects.toThrow();
    await expect(server.db.query(
      'delete from atlas_private.entity_lifecycle where user_id=$1',[first],
    )).rejects.toThrow();
  });

  it('assigns entity versions and feed revisions on the server and rejects stale devices atomically',async()=>{
    const owner=await server.user(),account=await createAccount(owner);
    const archived=await server.apply(owner,manage(owner,account,0,'archived'));
    expect(archived.revision).toBe('2');
    await expect(server.apply(owner,{...manage(owner,account,0,'active',crypto.randomUUID()),baseRevision:'2'})).rejects.toThrow(/ENTITY_VERSION_CONFLICT/);
    const rows=await server.db.query<{entity_version:number;feed_revision:string;new_state:string}>(
      'select entity_version,feed_revision::text,new_state from atlas_private.entity_lifecycle where user_id=$1',[owner]);
    expect(rows.rows).toEqual([{entity_version:1,feed_revision:'2',new_state:'archived'}]);
    const heads=await server.db.query<{revision:string}>('select revision::text from atlas_private.sync_heads where user_id=$1',[owner]);
    expect(heads.rows[0]?.revision).toBe('2');
  });

  it('rejects new financial events against an archived account but preserves the account and old history',async()=>{
    const owner=await server.user(),account=await createAccount(owner);
    await server.apply(owner,manage(owner,account,0,'archived'));
    const operationId=crypto.randomUUID(),eventId=crypto.randomUUID();
    const command:CommandEnvelope={
      protocolVersion:1,operationId,userId:owner,baseRevision:'2',kind:'record_event',
      operation:{id:operationId,userId:owner,kind:'record_event',createdAt:'2026-11-08T12:01:00.000Z',
        payload:{schemaVersion:1,userId:owner,accounts:[],categories:[],events:[{
          id:eventId,userId:owner,kind:'expense',status:'confirmed',source:'manual',certainty:'confirmed',
          amountCents:'100',accountId:account,description:'Teste',competenceDate:'2026-11-08',
        }],settlements:[],postings:[]}},
    };
    await expect(server.apply(owner,command)).rejects.toThrow(/Archived entities/);
    const rows=await server.db.query<{count:string}>('select count(*)::text as count from atlas_private.accounts where user_id=$1',[owner]);
    expect(rows.rows[0]?.count).toBe('1');
    const events=await server.db.query<{count:string}>('select count(*)::text as count from atlas_private.financial_events where user_id=$1',[owner]);
    expect(events.rows[0]?.count).toBe('0');
  });

  it('archives, reactivates and renames with sequential server versions and repeat-safe receipts',async()=>{
    const owner=await server.user(),account=await createAccount(owner);
    const first=manage(owner,account,0,'archived');
    const archived=await server.apply(owner,first);
    expect((await server.apply(owner,first)).revision).toBe(archived.revision);
    const active=manage(owner,account,1,'active');
    const restored=await server.apply(owner,{...active,baseRevision:'2'});
    expect(restored.revision).toBe('3');
    const renamed=manage(owner,account,2,'active');
    renamed.baseRevision='3';
    (renamed.operation.payload.lifecycleChange as {metadata:{name:string}}).metadata.name='Conta renomeada';
    const saved=await server.apply(owner,renamed);
    expect(saved.revision).toBe('4');
    const rows=await server.db.query<{entity_version:number;new_state:string;name:string}>(
      "select entity_version,new_state,metadata->>'name' as name from atlas_private.entity_lifecycle where user_id=$1 order by entity_version",[owner]);
    expect(rows.rows).toEqual([
      {entity_version:1,new_state:'archived',name:'Conta de teste'},
      {entity_version:2,new_state:'active',name:'Conta de teste'},
      {entity_version:3,new_state:'active',name:'Conta renomeada'},
    ]);
    const feed=await server.pull(owner,'0',null,10);
    expect(feed.batches.map(row=>row.revision)).toEqual(['1','2','3','4']);
    const accountRows=await server.db.query<{count:string}>('select count(*)::text as count from atlas_private.accounts where user_id=$1',[owner]);
    expect(accountRows.rows[0]?.count).toBe('1');
  });

  it('rejects direct lifecycle inserts that have no committed sync batch',async()=>{
    const owner=await server.user();
    await expect(server.asUser(owner,()=>server.db.query(`
      insert into atlas_private.entity_lifecycle
      (user_id,operation_id,entity_kind,entity_id,expected_version,entity_version,new_state,feed_revision,metadata)
      values ($1,$2,'account',$3,0,1,'archived',1,'{"name":"Conta","kind":"checking","availability":"free"}'::jsonb)
    `,[owner,crypto.randomUUID(),crypto.randomUUID()]))).rejects.toThrow(/Lifecycle row without committed sync batch/);
    const rows=await server.db.query<{count:string}>('select count(*)::text as count from atlas_private.entity_lifecycle where user_id=$1',[owner]);
    expect(rows.rows[0]?.count).toBe('0');
  });
});
