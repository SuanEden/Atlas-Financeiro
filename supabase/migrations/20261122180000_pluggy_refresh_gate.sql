-- Distributed, owner-scoped Pluggy refresh lock. Infrastructure-only migration:
-- no updates to financial tables, bank balances, or existing sync receipts.
-- Apply to a disposable environment first; populate allowlist only after approval.
begin;

create table if not exists atlas_private.pluggy_refresh_allowed_items (
  owner_id uuid not null,
  item_id uuid not null,
  primary key (owner_id, item_id)
);
create table if not exists atlas_private.pluggy_refresh_claims (
  owner_id uuid not null,
  item_id uuid not null,
  next_allowed_at timestamptz not null,
  primary key (owner_id, item_id)
);

alter table atlas_private.pluggy_refresh_allowed_items enable row level security;
alter table atlas_private.pluggy_refresh_claims enable row level security;
-- There are no direct client policies. Only the restricted SECURITY DEFINER
-- RPC can claim a lock after checking active ownership and the admin allowlist.
revoke all on atlas_private.pluggy_refresh_allowed_items from public, anon, authenticated;
revoke all on atlas_private.pluggy_refresh_claims from public, anon, authenticated;

create or replace function api.pluggy_claim_refresh(p_item_id uuid)
returns boolean language plpgsql security definer set search_path=pg_catalog as $$
declare
  v_owner uuid := auth.uid();
  v_claimed integer := 0;
begin
  if v_owner is null or p_item_id is null then return false; end if;
  if not exists (
    select 1 from atlas_security.app_access a
    where a.user_id=v_owner and a.active
  ) then return false; end if;
  if not exists (
    select 1 from atlas_private.pluggy_refresh_allowed_items a
    where a.owner_id=v_owner and a.item_id=p_item_id
  ) then return false; end if;
  insert into atlas_private.pluggy_refresh_claims(owner_id,item_id,next_allowed_at)
    values (v_owner,p_item_id,now()+interval '1 hour')
    on conflict (owner_id,item_id) do update
      set next_allowed_at=excluded.next_allowed_at
      where atlas_private.pluggy_refresh_claims.next_allowed_at <= now();
  get diagnostics v_claimed=row_count;
  return v_claimed=1;
end $$;

revoke all on function api.pluggy_claim_refresh(uuid) from public, anon;
grant execute on function api.pluggy_claim_refresh(uuid) to authenticated;

comment on function api.pluggy_claim_refresh(uuid) is
  'Atomic one-hour refresh claim for authenticated active Atlas owner + an admin-approved Pluggy item.';
commit;
