import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import type { ChangePage, Receipt, SyncEnvelope } from '../../src/sync/protocol';

/** SQL is real; identity is a shim. This serialized single connection is NOT a concurrency test. */
export async function sqlTestServer() {
  const db = new PGlite();
  await db.exec(`create role anon nologin; create role authenticated nologin;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`);
  const migrations = fileURLToPath(new URL('../../../supabase/migrations/', import.meta.url));
  for (const file of readdirSync(migrations).filter((name) => name.endsWith('.sql')).sort()) {
    try { await db.exec(readFileSync(join(migrations,file),'utf8')); }
    catch (reason) {
      await db.close();
      const error = reason as Error & {position?:string; internalPosition?:string; where?:string; internalQuery?:string};
      throw new Error(`${file}: ${error.message}; position=${error.position}; internal=${error.internalPosition}; context=${error.where}; near=${error.internalQuery?.slice(Math.max(0,Number(error.internalPosition)-90),Number(error.internalPosition)+90)}`);
    }
  }
  // Synthetic, isolated in-memory test database only. The migration defaults to disabled.
  await db.exec('update atlas_security.integration_control set writes_enabled=true');
  let queue: Promise<unknown> = Promise.resolve();
  function exclusive<T>(work: () => Promise<T>): Promise<T> {
    const result = queue.then(work); queue = result.catch(() => undefined); return result;
  }
  function asUser<T>(owner: string | null, work: () => Promise<T>) {
    return exclusive(async () => {
      await db.exec(`set role ${owner === null ? 'anon' : 'authenticated'}`);
      await db.query("select set_config('request.jwt.claim.sub',$1,false)",[owner ?? '']);
      try { return await work(); } finally { await db.exec('reset role'); }
    });
  }
  return {
    db, asUser,
    async user(active=true) {
      const owner = crypto.randomUUID();
      await exclusive(async () => { await db.query('insert into auth.users values ($1)',[owner]); await db.query('insert into atlas_security.app_access values ($1,$2)',[owner,active]); });
      return owner;
    },
    apply(owner: string | null, envelope: SyncEnvelope) { return asUser(owner,async () => (await db.query<{result:Receipt}>('select api.i3_apply($1::jsonb) as result',[JSON.stringify(envelope)])).rows[0]!.result); },
    pull(owner: string | null, after='0', through: string | null=null, limit=10) { return asUser(owner,async () => (await db.query<{result:ChangePage}>('select api.i3_pull($1,$2,$3) as result',[after,through,limit])).rows[0]!.result); },
    async counts(owner: string) {
      return exclusive(async () => {
        const counts: Record<string,string> = {};
        for (const table of ['accounts','categories','financial_events','settlements','postings','operation_receipts','sync_batches','incorporated_operations','sync_heads']) {
          counts[table]=(await db.query<{count:string}>(`select count(*)::text as count from atlas_private.${table} where user_id=$1`,[owner])).rows[0]!.count;
        }
        return counts;
      });
    },
    close: () => db.close(),
  };
}
