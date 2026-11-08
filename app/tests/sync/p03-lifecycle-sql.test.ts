import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {sqlTestServer} from './sql-test-server';

let server:Awaited<ReturnType<typeof sqlTestServer>>;
beforeAll(async()=>{server=await sqlTestServer();},30000);
afterAll(async()=>{await server?.close();});

describe('P03 migration staging: immutable and inaccessible for writes',()=>{
  it('keeps the new lifecycle table private, under RLS, with no public API',async()=>{
    const flags=await server.db.query<{rls:boolean;schema:string}>(`
      select c.relrowsecurity as rls,n.nspname as schema
      from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='atlas_private' and c.relname='entity_lifecycle'
    `);
    expect(flags.rows).toEqual([{rls:true,schema:'atlas_private'}]);
    const grants=await server.db.query<{allowed:boolean}>(`
      select has_table_privilege('authenticated','atlas_private.entity_lifecycle','INSERT') as allowed
    `);
    expect(grants.rows[0]?.allowed).toBe(false);
    const calls=await server.db.query<{count:string}>(`
      select count(*)::text as count from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='api' and p.proname like '%lifecycle%'
    `);
    expect(calls.rows[0]?.count).toBe('0');
  });

  it('does not allow an authenticated owner to insert an archive without a versioned RPC',async()=>{
    const owner=await server.user();
    await expect(server.asUser(owner,()=>server.db.query(`
      insert into atlas_private.entity_lifecycle
      (user_id,operation_id,entity_kind,entity_id,expected_version,entity_version,new_state,feed_revision)
      values ($1,$2,'account',$3,0,1,'archived',2)
    `,[owner,crypto.randomUUID(),crypto.randomUUID()]))).rejects.toThrow(/permission denied/);
    const result=await server.asUser(owner,()=>server.db.query<{count:string}>(
      'select count(*)::text as count from atlas_private.entity_lifecycle'));
    expect(result.rows[0]?.count).toBe('0');
  });
});
