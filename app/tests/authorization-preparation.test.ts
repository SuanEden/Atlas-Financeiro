import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const owner = 'a3000000-0000-4000-8000-000000000001';
const other = 'a3000000-0000-4000-8000-000000000002';
const sql = readFileSync(new URL('../../scripts/sql/i3-authorize-existing-user.sql', import.meta.url), 'utf8');
let db: PGlite;

// Local PostgreSQL only; no real account, JWT, API, or administrative credential.
beforeEach(async () => {
  db = new PGlite();
  await db.exec(`create role anon nologin; create role authenticated nologin;
    create schema auth;
    create table auth.users(id uuid primary key, email_confirmed_at timestamptz,
      is_anonymous boolean default false, last_sign_in_at timestamptz);
    create table auth.identities(user_id uuid references auth.users, provider text);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`);
  await db.exec(readFileSync(new URL('../../supabase/migrations/20261026164923_i3_private_foundation.sql', import.meta.url), 'utf8'));
  await db.query('insert into auth.users(id,email_confirmed_at) values($1,now())', [owner]);
  await db.query("insert into auth.identities values($1,'email')", [owner]);
  await db.query("select set_config('atlas_i3.expected_user_id',$1,false)", [owner]);
}, 30_000);
afterEach(async () => { await db?.close(); });

async function rejected(pattern: RegExp) {
  await expect(db.exec(sql)).rejects.toThrow(pattern);
  await db.exec('rollback');
}

describe('preparação administrativa antes de Google, com UUID sintético fixado', () => {
  it('autoriza uma única vez e preserva bloqueio financeiro, RLS e proibição de autoativação', async () => {
    await db.exec(sql);
    await db.exec(sql);
    expect((await db.query('select * from atlas_security.app_access')).rows).toEqual([{ user_id: owner, active: true }]);
    await db.exec('set role authenticated');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [owner]);
    expect((await db.query<{ status: { financialWritesEnabled: boolean } }>('select api.i3_readiness() as status')).rows[0]!.status.financialWritesEnabled).toBe(false);
    await expect(db.exec('update atlas_security.app_access set active=true')).rejects.toThrow(/permission denied/);
    await expect(db.exec("insert into atlas_private.sync_heads values(auth.uid(),0)")).rejects.toThrow(/permission denied/);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [other]);
    expect((await db.query('select * from atlas_security.app_access')).rows).toEqual([]);
    await expect(db.exec('select api.i3_readiness()')).rejects.toThrow(/Access denied/);
  });
  it.each(['missing', 'wrong'])('recusa UUID %s sem escolher conta automaticamente', async (mode) => {
    await db.query("select set_config('atlas_i3.expected_user_id',$1,false)", [mode === 'missing' ? '' : other]);
    await rejected(/Expected UUID|inventory changed/);
    expect((await db.query('select * from atlas_security.app_access')).rows).toEqual([]);
  });
  it.each(['unconfirmed', 'anonymous', 'signed-in', 'extra-user', 'google'])('recusa inventário alterado: %s', async (mode) => {
    if (mode === 'unconfirmed') await db.exec('update auth.users set email_confirmed_at=null');
    if (mode === 'anonymous') await db.exec('update auth.users set is_anonymous=true');
    if (mode === 'signed-in') await db.exec('update auth.users set last_sign_in_at=now()');
    if (mode === 'extra-user') await db.query('insert into auth.users(id) values($1)', [other]);
    if (mode === 'google') await db.exec("update auth.identities set provider='google'");
    await rejected(/inventory changed/);
    expect((await db.query('select * from atlas_security.app_access')).rows).toEqual([]);
  });
  it('preserva revogação e recusa autorização de outra conta', async () => {
    await db.query('insert into atlas_security.app_access values($1,false)', [owner]);
    await rejected(/never reactivate/);
    expect((await db.query('select active from atlas_security.app_access')).rows).toEqual([{ active: false }]);
    await db.query('insert into auth.users(id) values($1)', [other]);
    await db.query('insert into atlas_security.app_access values($1,true)', [other]);
    await db.query('delete from auth.identities where user_id=$1', [owner]);
    await rejected(/inventory changed/);
    expect((await db.query('select count(*)::int as n from atlas_security.app_access')).rows).toEqual([{ n: 2 }]);
  });
  it('recusa protocolo posterior sem alterar a autorização', async () => {
    await db.exec('create table atlas_security.integration_control(id boolean)');
    await rejected(/Foundation-only/);
    expect((await db.query('select * from atlas_security.app_access')).rows).toEqual([]);
  });
});
