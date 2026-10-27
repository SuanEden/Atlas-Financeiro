import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { readFile, writeFile, realpath } from 'node:fs/promises';
import { join } from 'node:path';
import { Client } from 'pg';
import { startSyntheticCluster } from './postgres-cluster.mjs';
import { localProcessEnvironment } from './setup-postgrest.mjs';

// Administrative recovery rehearsal of this tool's synthetic databases ONLY.
// No remote endpoint, exported personal file, Auth session or connection env override.
const binaries='C:/Program Files/PostgreSQL/17/bin';
const dumpBinary=join(binaries,'pg_dump.exe'), restoreBinary=join(binaries,'pg_restore.exe');
const tables=['accounts','categories','financial_events','settlements','postings','operation_receipts','sync_heads','sync_batches','incorporated_operations'];
const clients=[];
let source,target,restored,snapshot,owner,bootstrap,archive,archiveHash,commands,held;
const env=()=>({...localProcessEnvironment(),PGPASSFILE:join(source.root,'absent-pgpass.conf')});
const run=(binary,args)=>{
  const result=spawnSync(binary,args,{env:env(),windowsHide:true,timeout:30_000,stdio:['ignore','pipe','pipe'],encoding:'utf8'});
  if(result.error)throw result.error;
  if(result.status!==0)throw new Error('Local PostgreSQL client failed: '+result.stderr);
  assert.equal(result.stderr,'','Unexpected PostgreSQL client warning');return result.stdout;
};
const connectionArgs=(cluster,database)=>['--host=127.0.0.1',`--port=${cluster.port}`,'--username=postgres',`--dbname=${database}`,'--no-password'];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const apply=async(client,envelope)=>(await client.query('select api.i3_apply($1::jsonb) as result',[JSON.stringify(envelope)])).rows[0].result;
const pull=async(client)=>(await client.query('select api.i3_pull($1,$2,$3) as page',['0',null,20])).rows[0].page;
async function connect(database) {
  const client=new Client({host:'127.0.0.1',port:target.port,user:'postgres',database,ssl:false,connectionTimeoutMillis:3000,statement_timeout:10_000});
  await client.connect();clients.push(client);
  assert.equal((await realpath((await client.query("show data_directory")).rows[0].data_directory)).toLowerCase(),(await realpath(target.dataDir)).toLowerCase());
  return client;
}
function command(userId,kind,data,baseRevision='0') {
  const operationId=randomUUID();return {protocolVersion:1,userId,operationId,baseRevision,kind,operation:{id:operationId,userId,kind,createdAt:'2026-10-27T12:00:00.000Z',payload:{schemaVersion:1,userId,...data}}};
}
function event(accountId,{kind='income',amount='100003',destination,reverse,planned=false}={}) {
  const row={id:randomUUID(),userId:owner,kind,status:planned?'planned':'confirmed',certainty:planned?'estimated':'confirmed',source:'manual',amountCents:amount,accountId,description:'Ensaio sintetico de copia',competenceDate:'2026-10-27',...(destination?{transferAccountId:destination}:{}),...(reverse?{reversesEventId:reverse}:{})};
  const settlement={id:randomUUID(),userId:owner,eventId:row.id,amountCents:amount,paymentDate:'2026-10-27',settlementDate:'2026-10-27'};
  const sign=kind==='income'?1n:-1n;
  const postings=[{id:randomUUID(),userId:owner,settlementId:settlement.id,accountId,amountCents:((reverse?-sign:sign)*BigInt(amount)).toString()}];
  if(destination)postings.push({id:randomUUID(),userId:owner,settlementId:settlement.id,accountId:destination,amountCents:((reverse?sign:-sign)*BigInt(amount)).toString()});
  return command(owner,reverse?'reverse_event':'record_event',{events:[row],...(planned?{}:{settlements:[settlement],postings})});
}
async function inventory(client) {
  const rows={};
  for(const name of tables)rows[name]=(await client.query(`select to_jsonb(t) as row from atlas_private.${name} t order by to_jsonb(t)::text`)).rows.map(row=>row.row);
  return rows;
}
async function restoreChecked(file,database) {
  assert.equal(hash(await readFile(file)),archiveHash,'Archive digest mismatch; restore not attempted');
  run(restoreBinary,[...connectionArgs(target,database),'--single-transaction','--exit-on-error','--no-owner',file]);
}

before(async()=>{
  source=await startSyntheticCluster();target=await startSyntheticCluster();
  assert.match(run(dumpBinary,['--version']),/PostgreSQL\) 17\./);
  assert.match(run(restoreBinary,['--version']),/PostgreSQL\) 17\./);
  await target.admin.query('create database atlas_i3_restored template template0');
  restored=await connect('atlas_i3_restored');
  owner=randomUUID();await source.admin.query('insert into auth.users values($1)',[owner]);
  await source.admin.query('insert into atlas_security.app_access values($1,true)',[owner]);
  const accounts=['A','B'].map(name=>({id:randomUUID(),userId:owner,name:'Conta sintetica '+name,kind:'cash',availability:'free'}));
  const covered=accounts.map(row=>command(owner,'create_account',{accounts:[row]}).operation);
  bootstrap={protocolVersion:1,userId:owner,operationId:randomUUID(),baseRevision:'0',kind:'bootstrap',source:{ownerId:randomUUID(),digest:'b'.repeat(64)},coveredOperations:covered,data:{schemaVersion:2,userId:owner,accounts,categories:[],events:[],settlements:[],postings:[]}};
  const transfer=event(accounts[0].id,{kind:'transfer',amount:'500',destination:accounts[1].id});
  commands=[bootstrap,event(accounts[0].id),event(accounts[0].id,{kind:'expense',amount:'201'}),transfer,event(accounts[0].id,{kind:'transfer',amount:'500',destination:accounts[1].id,reverse:transfer.operation.payload.events[0].id}),event(accounts[0].id,{amount:'10001',planned:true})];
  await source.admin.query('update atlas_security.integration_control set writes_enabled=true');
  const signed=await source.connect(owner);
  try {for(const value of commands)await apply(signed,value);}
  finally {await source.close(signed);await source.admin.query('update atlas_security.integration_control set writes_enabled=false');}
  snapshot=await inventory(source.admin);
  // A concurrent uncommitted financial operation must be absent from the backup.
  // Toggle only inside this transaction; other sessions continue to see gate false.
  held=await source.connect();await held.query('begin');
  await held.query('update atlas_security.integration_control set writes_enabled=true');
  await held.query('set local role authenticated');await held.query("select set_config('request.jwt.claim.sub',$1,true)",[owner]);
  await apply(held,event(accounts[0].id,{amount:'7'}));await held.query('reset role');
  await held.query('update atlas_security.integration_control set writes_enabled=false');
  archive=join(source.root,'synthetic-i3.dump');
  const warnings=run(dumpBinary,[...connectionArgs(source,'postgres'),'--format=custom','--no-owner',`--file=${archive}`]);
  assert.equal(warnings,'');archiveHash=hash(await readFile(archive));
  await held.query('commit');await source.close(held);held=undefined;
  await restoreChecked(archive,'atlas_i3_restored');
},{timeout:90_000});

after(async()=>{
  if(held)await held.query('rollback').catch(()=>{});
  await Promise.allSettled(clients.map(client=>client.end()));
  await Promise.allSettled([source?.stop(),target?.stop()]);
});

test('dump/restauração conserva exatamente nove tabelas, IDs, relações, envelopes e recibos',async()=>{
  assert.deepEqual(await inventory(restored),snapshot);
  assert.equal(snapshot.sync_batches.length,6);assert.equal(snapshot.operation_receipts.length,6);
  assert.equal(snapshot.incorporated_operations.length,2);
  assert.equal((await inventory(source.admin)).sync_batches.length,7);
});

test('snapshot exclui o commit posterior; saldos por conta, total e previsão permanecem exatos',async()=>{
  const balances=(await restored.query('select account_id,sum(amount_cents)::text as cents from atlas_private.postings group by account_id order by account_id')).rows;
  assert.deepEqual(balances.map(row=>row.cents).sort(),['0','99802']);
  assert.equal((await restored.query('select sum(amount_cents)::text as cents from atlas_private.postings')).rows[0].cents,'99802');
  assert.equal((await restored.query("select amount_cents::text as cents from atlas_private.financial_events where status='planned'")).rows[0].cents,'10001');
  assert.equal(snapshot.sync_heads[0].revision,6);
});

test('restauração conserva RLS, constraints validadas, RPCs invoker e gate false',async()=>{
  assert.equal((await restored.query('select writes_enabled from atlas_security.integration_control')).rows[0].writes_enabled,false);
  const rls=await restored.query("select count(*)::int as n,bool_and(relrowsecurity) as ok from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('atlas_private','atlas_security') and relkind='r'");
  assert.deepEqual(rls.rows[0],{n:11,ok:true});
  assert.equal((await restored.query("select count(*)::int as n from pg_constraint where connamespace='atlas_private'::regnamespace and not convalidated")).rows[0].n,0);
  const rpc=(await restored.query("select count(*)::int as n,bool_and(not prosecdef) as invoker from pg_proc where pronamespace='api'::regnamespace")).rows[0];
  assert.deepEqual(rpc,{n:3,invoker:true});
  await restored.query('set role authenticated');await restored.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);
  try {await assert.rejects(apply(restored,commands[1]),e=>e.code==='42501'&&/REMOTE_WRITES_DISABLED/.test(e.message));}
  finally {await restored.query('reset role');}
});

test('outro proprietário e anônimo não herdam o acesso ao banco recuperado',async()=>{
  const stranger=randomUUID();await restored.query('insert into auth.users values($1)',[stranger]);
  await restored.query('insert into atlas_security.app_access values($1,true)',[stranger]);
  await restored.query('set role authenticated');await restored.query("select set_config('request.jwt.claim.sub',$1,false)",[stranger]);
  try {
    const page=await pull(restored);
    assert.equal(page.userId,stranger);assert.equal(page.cursor,'0');assert.deepEqual(page.batches,[]);
    assert.equal((await restored.query('select count(*)::int as n from atlas_private.accounts')).rows[0].n,0);
  } finally {await restored.query('reset role');}
  await restored.query('set role anon');
  try {await assert.rejects(pull(restored),e=>e.code==='42501');}
  finally {await restored.query('reset role');}
});

test('replay na cópia isolada retorna os mesmos recibos sem novo efeito ou revisão',async()=>{
  const before=await inventory(restored);
  await restored.query('update atlas_security.integration_control set writes_enabled=true');
  await restored.query('set role authenticated');await restored.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);
  try {
    for(const value of commands) {
      const expected=snapshot.operation_receipts.find(row=>row.operation_id===value.operationId).result;
      assert.deepEqual(await apply(restored,value),expected);
    }
    const feed=await pull(restored);
    assert.equal(feed.cursor,'6');assert.deepEqual(feed.batches.map(row=>row.envelope),commands);
  } finally {await restored.query('reset role');await restored.query('update atlas_security.integration_control set writes_enabled=false');}
  assert.deepEqual(await inventory(restored),before);
});

test('arquivo adulterado é recusado antes de tocar o destino ou a origem',async()=>{
  const bad=join(source.root,'synthetic-corrupt.dump');const bytes=await readFile(archive);bytes[bytes.length-1]^=1;await writeFile(bad,bytes);
  const before=await inventory(restored),sourceBefore=await inventory(source.admin);
  await assert.rejects(restoreChecked(bad,'atlas_i3_restored'),/digest mismatch/);
  assert.deepEqual(await inventory(restored),before);assert.deepEqual(await inventory(source.admin),sourceBefore);
});

test('erro SQL durante restauração reverte schema parcial e preserva dados existentes',async()=>{
  await target.admin.query('create database atlas_i3_refusal template template0');const occupied=await connect('atlas_i3_refusal');
  await occupied.query('create schema auth;create table public.preserved(value int);insert into public.preserved values(42)');
  await assert.rejects(restoreChecked(archive,'atlas_i3_refusal'),/schema "auth" already exists/);
  assert.equal((await occupied.query('select value from public.preserved')).rows[0].value,42);
  assert.equal((await occupied.query("select to_regnamespace('api') is null as absent")).rows[0].absent,true);
  assert.equal((await occupied.query("select to_regnamespace('atlas_private') is null as absent")).rows[0].absent,true);
  assert.equal((await occupied.query("select count(*)::int as n from pg_tables where schemaname='auth'")).rows[0].n,0);
});
