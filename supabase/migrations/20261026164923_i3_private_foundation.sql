-- I3 local foundation. No remote application authorized. Auth is provided by Supabase;
-- local tests use a deliberately limited auth.uid/roles shim, not a real JWT gateway.
-- Financial write RPCs remain unavailable until transactional/idempotency integration is ready.
begin;

create schema atlas_security;
create schema atlas_private;
create schema api;
revoke all on schema atlas_security, atlas_private, api from public, anon;
grant usage on schema atlas_security, atlas_private, api to authenticated;
alter default privileges in schema atlas_security, atlas_private, api revoke execute on functions from public;

create table atlas_security.app_access (
  user_id uuid primary key references auth.users(id) on delete restrict,
  active boolean not null default false
);
alter table atlas_security.app_access enable row level security;
create policy own_access_status on atlas_security.app_access for select to authenticated
  using (user_id = (select auth.uid()));
grant select on atlas_security.app_access to authenticated;

create table atlas_private.accounts (
  user_id uuid not null references auth.users(id) on delete restrict,
  id uuid not null,
  name text not null check (length(btrim(name)) > 0 and length(name) <= 120),
  kind text not null check (kind in ('checking','savings','cash','digital','transport','investment','other')),
  availability text not null check (availability in ('free','reserved','restricted')),
  primary key (user_id, id),
  check (kind <> 'transport' or availability = 'restricted')
);
create table atlas_private.categories (
  user_id uuid not null references auth.users(id) on delete restrict,
  id uuid not null,
  name text not null check (length(btrim(name)) > 0 and length(name) <= 120),
  kind text not null check (kind in ('income','expense','both')),
  parent_id uuid,
  primary key (user_id, id),
  foreign key (user_id, parent_id) references atlas_private.categories(user_id,id) deferrable initially deferred,
  check (parent_id is null or parent_id <> id)
);
create table atlas_private.financial_events (
  user_id uuid not null references auth.users(id) on delete restrict,
  id uuid not null,
  kind text not null check (kind in ('income','expense','transfer','adjustment')),
  status text not null check (status in ('planned','confirmed','cancelled')),
  certainty text not null check (certainty in ('confirmed','estimated')),
  source text not null check (source in ('manual','import','opening_balance')),
  amount_cents bigint not null check (amount_cents between 1 and 99999999999),
  account_id uuid not null,
  transfer_account_id uuid,
  category_id uuid,
  description text not null check (length(btrim(description)) > 0 and length(description) <= 500),
  competence_date date not null check (competence_date between date '0001-01-01' and date '9999-12-31'),
  due_date date check (due_date between date '0001-01-01' and date '9999-12-31'),
  adjustment_direction text,
  reverses_event_id uuid,
  replaces_event_id uuid,
  primary key (user_id,id),
  foreign key (user_id,account_id) references atlas_private.accounts(user_id,id),
  foreign key (user_id,transfer_account_id) references atlas_private.accounts(user_id,id),
  foreign key (user_id,category_id) references atlas_private.categories(user_id,id),
  foreign key (user_id,reverses_event_id) references atlas_private.financial_events(user_id,id) deferrable initially deferred,
  foreign key (user_id,replaces_event_id) references atlas_private.financial_events(user_id,id) deferrable initially deferred,
  unique (user_id,reverses_event_id), unique (user_id,replaces_event_id),
  check (status <> 'confirmed' or certainty = 'confirmed'),
  check (source <> 'opening_balance' or kind = 'adjustment'),
  check ((kind = 'transfer' and transfer_account_id is not null and transfer_account_id <> account_id)
    or (kind <> 'transfer' and transfer_account_id is null)),
  check ((kind = 'adjustment' and adjustment_direction is not null and adjustment_direction in ('increase','decrease'))
    or (kind <> 'adjustment' and adjustment_direction is null)),
  check (category_id is null or kind in ('income','expense')),
  check (reverses_event_id is null or (reverses_event_id <> id and replaces_event_id is null)),
  check (replaces_event_id is null or replaces_event_id <> id)
);
create table atlas_private.settlements (
  user_id uuid not null references auth.users(id) on delete restrict,
  id uuid not null, event_id uuid not null,
  amount_cents bigint not null check (amount_cents between 1 and 99999999999),
  payment_date date not null check (payment_date between date '0001-01-01' and date '9999-12-31'),
  settlement_date date not null check (settlement_date between date '0001-01-01' and date '9999-12-31'),
  primary key (user_id,id),
  foreign key (user_id,event_id) references atlas_private.financial_events(user_id,id),
  check (payment_date <= settlement_date)
);
create table atlas_private.postings (
  user_id uuid not null references auth.users(id) on delete restrict,
  id uuid not null, settlement_id uuid not null, account_id uuid not null,
  amount_cents bigint not null check (amount_cents between -99999999999 and 99999999999 and amount_cents <> 0),
  primary key (user_id,id),
  foreign key (user_id,settlement_id) references atlas_private.settlements(user_id,id),
  foreign key (user_id,account_id) references atlas_private.accounts(user_id,id)
);

-- Reserved for the later write protocol; clients cannot forge receipts or update revisions.
create table atlas_private.operation_receipts (
  user_id uuid not null references auth.users(id) on delete restrict,
  operation_id uuid not null, protocol_version integer not null check (protocol_version = 1),
  payload_digest text not null check (payload_digest ~ '^[0-9a-f]{64}$'),
  revision bigint not null check (revision > 0),
  result jsonb not null,
  primary key (user_id,operation_id), unique (user_id,revision)
);
create table atlas_private.sync_heads (
  user_id uuid primary key references auth.users(id) on delete restrict,
  revision bigint not null default 0 check (revision >= 0)
);

create index events_account on atlas_private.financial_events(user_id,account_id);
create index events_category on atlas_private.financial_events(user_id,category_id);
create index events_destination on atlas_private.financial_events(user_id,transfer_account_id);
create index categories_parent on atlas_private.categories(user_id,parent_id);
create index settlements_event on atlas_private.settlements(user_id,event_id);
create index postings_settlement on atlas_private.postings(user_id,settlement_id);
create index postings_account on atlas_private.postings(user_id,account_id);

do $policies$
declare table_name text;
begin
  foreach table_name in array array['accounts','categories','financial_events','settlements','postings','operation_receipts','sync_heads'] loop
    execute format('alter table atlas_private.%I enable row level security', table_name);
    execute format('create policy active_owner_read on atlas_private.%I for select to authenticated using
      (user_id = (select auth.uid()) and exists (select 1 from atlas_security.app_access a where a.user_id = (select auth.uid()) and a.active))', table_name);
    execute format('grant select on atlas_private.%I to authenticated', table_name);
  end loop;
end $policies$;

create function atlas_private.reject_ledger_mutation() returns trigger
language plpgsql security invoker set search_path = pg_catalog as $$
begin raise exception 'Financial history is append-only' using errcode = '23514'; end $$;

create function atlas_private.check_ledger() returns trigger
language plpgsql security invoker set search_path = pg_catalog as $$
declare owner_id uuid := coalesce(new.user_id,old.user_id);
begin
  if exists (select 1 from atlas_private.settlements s join atlas_private.financial_events e using (user_id)
      where s.user_id=owner_id and e.id=s.event_id and e.status <> 'confirmed') then
    raise exception 'Settlement requires confirmed event' using errcode='23514';
  end if;
  if exists (select 1 from atlas_private.financial_events e join atlas_private.settlements s on s.user_id=e.user_id and s.event_id=e.id
      where e.user_id=owner_id group by e.id,e.amount_cents having sum(s.amount_cents)>e.amount_cents) then
    raise exception 'Settlement exceeds event' using errcode='23514';
  end if;
  if exists (select 1 from atlas_private.financial_events e join atlas_private.categories c on c.user_id=e.user_id and c.id=e.category_id
      where e.user_id=owner_id and c.kind<>'both' and c.kind<>e.kind) then
    raise exception 'Incompatible category' using errcode='23514';
  end if;
  if exists (
    select 1 from atlas_private.settlements s join atlas_private.financial_events e on e.user_id=s.user_id and e.id=s.event_id
    left join atlas_private.postings p on p.user_id=s.user_id and p.settlement_id=s.id
    where s.user_id=owner_id
    group by s.id,s.amount_cents,e.kind,e.account_id,e.transfer_account_id,e.adjustment_direction,e.reverses_event_id
    having (e.kind='transfer' and (count(p.id)<>2 or sum(p.amount_cents)<>0 or
      count(*) filter (where p.account_id=e.account_id and p.amount_cents=-s.amount_cents*(case when e.reverses_event_id is null then 1 else -1 end))<>1 or
      count(*) filter (where p.account_id=e.transfer_account_id and p.amount_cents=s.amount_cents*(case when e.reverses_event_id is null then 1 else -1 end))<>1))
    or (e.kind<>'transfer' and (count(p.id)<>1 or count(*) filter (where p.account_id=e.account_id and
      p.amount_cents=s.amount_cents*(case when e.kind='income' or (e.kind='adjustment' and e.adjustment_direction='increase') then 1 else -1 end)
        *(case when e.reverses_event_id is null then 1 else -1 end))<>1))
  ) then raise exception 'Incomplete or inconsistent postings' using errcode='23514'; end if;
  if exists (select 1 from atlas_private.financial_events r join atlas_private.financial_events o on o.user_id=r.user_id and o.id=r.reverses_event_id
    where r.user_id=owner_id and (r.status<>'confirmed' or o.status<>'confirmed' or o.reverses_event_id is not null
      or r.kind<>o.kind or r.amount_cents<>o.amount_cents or r.account_id<>o.account_id
      or r.transfer_account_id is distinct from o.transfer_account_id or r.category_id is distinct from o.category_id
      or r.adjustment_direction is distinct from o.adjustment_direction
      or (select coalesce(sum(s.amount_cents),0) from atlas_private.settlements s where s.user_id=o.user_id and s.event_id=o.id)<>o.amount_cents
      or (select coalesce(sum(s.amount_cents),0) from atlas_private.settlements s where s.user_id=r.user_id and s.event_id=r.id)<>r.amount_cents)) then
    raise exception 'Invalid full reversal' using errcode='23514';
  end if;
  if exists (select 1 from atlas_private.financial_events e where e.user_id=owner_id and e.replaces_event_id is not null
    and exists (select 1 from atlas_private.settlements s where s.user_id=e.user_id and s.event_id=e.replaces_event_id)
    and not exists (select 1 from atlas_private.financial_events r where r.user_id=e.user_id and r.reverses_event_id=e.replaces_event_id)) then
    raise exception 'Replacing settled event requires reversal' using errcode='23514';
  end if;
  if exists (with recursive parents as (
    select id,parent_id,array[id] as path,false as cycle from atlas_private.categories where user_id=owner_id
    union all select c.id,c.parent_id,p.path||c.id,c.id=any(p.path) from parents p join atlas_private.categories c on c.id=p.parent_id and c.user_id=owner_id where not p.cycle
  ) select 1 from parents where cycle) then raise exception 'Category cycle' using errcode='23514'; end if;
  if exists (with recursive previous as (
    select id,replaces_event_id,array[id] as path,false as cycle from atlas_private.financial_events where user_id=owner_id
    union all select e.id,e.replaces_event_id,p.path||e.id,e.id=any(p.path) from previous p join atlas_private.financial_events e on e.id=p.replaces_event_id and e.user_id=owner_id where not p.cycle
  ) select 1 from previous where cycle) then raise exception 'Replacement cycle' using errcode='23514'; end if;
  return null;
end $$;

do $triggers$
declare table_name text;
begin
  foreach table_name in array array['accounts','categories','financial_events','settlements','postings'] loop
    execute format('create constraint trigger consistent_ledger after insert or update or delete on atlas_private.%I deferrable initially deferred for each row execute function atlas_private.check_ledger()',table_name);
  end loop;
  foreach table_name in array array['financial_events','settlements','postings'] loop
    execute format('create trigger immutable_ledger before update or delete on atlas_private.%I for each row execute function atlas_private.reject_ledger_mutation()',table_name);
  end loop;
end $triggers$;

create function api.i3_readiness() returns jsonb
language plpgsql security invoker set search_path = pg_catalog as $$
begin
  if auth.uid() is null or not exists (select 1 from atlas_security.app_access a where a.user_id=auth.uid() and a.active) then
    raise exception 'Access denied' using errcode='42501';
  end if;
  return jsonb_build_object('protocolVersion',1,'financialWritesEnabled',false);
end $$;
revoke all on all functions in schema api,atlas_private from public,anon,authenticated;
grant execute on function api.i3_readiness() to authenticated;
revoke all on all tables in schema atlas_private,atlas_security from anon,public;
comment on schema api is 'I3 local foundation only. Expose only explicitly reviewed RPCs; financial writes are not implemented.';
commit;
