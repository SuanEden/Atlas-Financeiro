import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, readdir, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { Client } from 'pg';
import { initdb, pg_ctl } from '@embedded-postgres/windows-x64';

export async function freeLoopbackPort() {
  const socket = createServer();
  await new Promise((resolve, reject) => socket.once('error', reject).listen(0, '127.0.0.1', resolve));
  const port = socket.address().port;
  await new Promise(resolve => socket.close(resolve));
  return port;
}

/** Own synthetic database only. No URL/env override, remote data or OS service. */
export async function startSyntheticCluster() {
  if (process.platform !== 'win32') throw new Error('This validation tool requires Windows x64');
  const root = await mkdtemp(join(tmpdir(), 'atlas-i3-pg-'));
  const dataDir = join(root, 'data'), port = await freeLoopbackPort(), connections = new Set();
  const run = (binary, args) => execFileSync(binary, args, { stdio: 'ignore', windowsHide: true, timeout: 30_000 });
  const connect = async owner => {
    const client = new Client({ host: '127.0.0.1', port, user: 'postgres', database: 'postgres', ssl: false,
      connectionTimeoutMillis: 3000, statement_timeout: 10_000, application_name: 'atlas-i3-synthetic-validation' });
    await client.connect(); connections.add(client);
    if (owner) {
      await client.query('set role authenticated');
      await client.query("select set_config('request.jwt.claim.sub',$1,false)", [owner]);
    }
    return client;
  };
  const close = async client => { connections.delete(client); await client.end(); };
  const stop = async () => {
    for (const client of connections) { try { await client.end(); } catch { /* stop owned cluster below */ } }
    connections.clear();
    // Never stop a generic postgres process or delete computed directories.
    if (existsSync(join(dataDir, 'postmaster.pid'))) run(pg_ctl, ['stop', '-D', dataDir, '-m', 'immediate', '-w', '-t', '20']);
  };
  try {
    run(initdb, ['-D', dataDir, '--username=postgres', '--auth=trust', '--encoding=UTF8', '--locale=C']);
    run(pg_ctl, ['start', '-D', dataDir, '-l', join(root, 'postgres.log'), '-w', '-t', '20', '-o', `-h 127.0.0.1 -p ${port} -c max_connections=15`]);
    const admin = await connect();
    const settings = (await admin.query("select current_setting('server_version_num')::int as version, current_setting('data_directory') as path")).rows[0];
    if (settings.version < 170000 || settings.version >= 180000 || (await realpath(settings.path)).toLowerCase() !== (await realpath(dataDir)).toLowerCase()) {
      throw new Error('Unexpected local database identity');
    }
    await admin.query(`create role anon nologin; create role authenticated nologin;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$
        select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),
          nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid
      $$;
      grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`);
    const migrations = new URL('../../supabase/migrations/', import.meta.url);
    for (const name of (await readdir(migrations)).filter(name => name.endsWith('.sql')).sort()) {
      await admin.query(await readFile(new URL(name, migrations), 'utf8'));
    }
    return { root, dataDir, port, admin, connect, close, stop };
  } catch (error) { await stop(); throw error; }
}
