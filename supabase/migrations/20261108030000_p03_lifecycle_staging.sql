-- P03 staging only: versioned lifecycle ledger, no endpoint or write grant.
-- Do not merge this migration until client/protocol v2 and recovery can consume it.
-- Production financial history remains append-only and untouched by the migration.
begin;

create table atlas_private.entity_lifecycle (
  user_id uuid not null references auth.users(id) on delete restrict,
  operation_id uuid not null,
  entity_kind text not null check (entity_kind in ('account','category')),
  entity_id uuid not null,
  expected_version integer not null check(expected_version >= 0),
  entity_version integer not null check(entity_version > 0 and entity_version=expected_version+1),
  new_state text not null check(new_state in ('active','archived')),
  feed_revision bigint not null check(feed_revision > 0),
  primary key(user_id,operation_id),
  unique(user_id,entity_kind,entity_id,entity_version),
  unique(user_id,feed_revision)
);

create index entity_lifecycle_by_entity
  on atlas_private.entity_lifecycle(user_id,entity_kind,entity_id,entity_version desc);

alter table atlas_private.entity_lifecycle enable row level security;
create policy lifecycle_owner_read
  on atlas_private.entity_lifecycle for select to authenticated
  using(
    user_id=(select auth.uid()) and exists(
      select 1 from atlas_security.app_access
      where user_id=(select auth.uid()) and active
    )
  );

-- No INSERT grant or public API is added. A future protocol-versioned RPC
-- must atomically acquire the owner sync-head lock, validate the expected entity
-- version, append the lifecycle row, append a sync batch and issue its receipt.
-- This migration by itself cannot be used to archive anything.
grant select on atlas_private.entity_lifecycle to authenticated;
revoke all on atlas_private.entity_lifecycle from public,anon;
create trigger immutable_lifecycle
  before update or delete on atlas_private.entity_lifecycle
  for each row execute function atlas_private.reject_ledger_mutation();

commit;
