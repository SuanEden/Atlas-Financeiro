-- Planning is isolated from the immutable financial ledger (I3). Staging first.
begin;

create table if not exists atlas_private.planning_documents (
  user_id uuid primary key,
  cloud_revision bigint not null default 1 check (cloud_revision > 0),
  document jsonb not null,
  updated_at timestamptz not null default now(),
  constraint planning_document_size check (pg_column_size(document) <= 1000000)
);

alter table atlas_private.planning_documents enable row level security;
revoke all on table atlas_private.planning_documents from public, anon, authenticated;

-- All access must pass an active, authenticated Atlas user check. This
-- function is read-only and does not depend on the financial write gate.
create or replace function api.planning_read()
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare v_user uuid := auth.uid(); v_result jsonb;
begin
  if v_user is null or not exists(
    select 1 from atlas_security.app_access a where a.user_id=v_user and a.active
  ) then
    raise exception 'Planning access denied' using errcode='42501';
  end if;
  select jsonb_build_object('revision',p.cloud_revision,'document',p.document)
    into v_result from atlas_private.planning_documents p where p.user_id=v_user;
  return coalesce(v_result,jsonb_build_object('revision',0,'document',null));
end $$;

-- Atomic compare-and-swap. A stale device cannot silently replace another's plan.
create or replace function api.planning_compare_swap(p_expected_revision bigint,p_document jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare
  v_user uuid := auth.uid();
  v_rows integer := 0;
  v_revision bigint := 0;
  v_document jsonb;
begin
  if v_user is null or not exists(
    select 1 from atlas_security.app_access a where a.user_id=v_user and a.active
  ) then raise exception 'Planning access denied' using errcode='42501'; end if;
  if p_expected_revision is null or p_expected_revision < 0 then
    raise exception 'Invalid planning revision' using errcode='22023';
  end if;
  if p_document is null or jsonb_typeof(p_document) <> 'object'
    or p_document->>'ownerId' is distinct from v_user::text
    or p_document->>'schemaVersion' is distinct from '1'
    or jsonb_typeof(p_document->'goals') <> 'array'
    or jsonb_typeof(p_document->'recurrences') <> 'array'
    or jsonb_typeof(p_document->'obligations') <> 'array'
    or jsonb_typeof(p_document->'shared') <> 'array'
    or jsonb_typeof(p_document->'rules') <> 'array'
    or jsonb_typeof(p_document->'accountPreferences') <> 'array'
    or pg_column_size(p_document) > 1000000
  then raise exception 'Invalid planning document' using errcode='22023'; end if;

  if p_expected_revision=0 then
    insert into atlas_private.planning_documents(user_id,cloud_revision,document)
      values(v_user,1,p_document) on conflict (user_id) do nothing;
    get diagnostics v_rows=row_count;
  else
    update atlas_private.planning_documents
       set cloud_revision=cloud_revision+1, document=p_document, updated_at=now()
     where user_id=v_user and cloud_revision=p_expected_revision;
    get diagnostics v_rows=row_count;
  end if;

  select p.cloud_revision,p.document into v_revision,v_document
    from atlas_private.planning_documents p where p.user_id=v_user;
  return jsonb_build_object('applied',v_rows=1,'revision',coalesce(v_revision,0),'document',v_document);
end $$;

revoke all on function api.planning_read(),api.planning_compare_swap(bigint,jsonb)
  from public,anon;
grant execute on function api.planning_read(),api.planning_compare_swap(bigint,jsonb)
  to authenticated;

commit;
