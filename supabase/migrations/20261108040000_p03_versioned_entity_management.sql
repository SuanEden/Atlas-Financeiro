-- P03 v4: append-only, server-versioned account/category metadata and lifecycle.
-- This migration is tested in disposable PGlite. Do not apply to production until
-- hosted staging and real two-device acceptance are complete.
begin;

alter table atlas_private.entity_lifecycle
  add column metadata jsonb not null default '{}'::jsonb;
alter table atlas_private.entity_lifecycle
  drop constraint if exists entity_lifecycle_user_id_feed_revision_key;
create policy lifecycle_owner_insert on atlas_private.entity_lifecycle
  for insert to authenticated
  with check(user_id=(select auth.uid()) and exists(
    select 1 from atlas_security.app_access where user_id=(select auth.uid()) and active
  ));
grant insert on atlas_private.entity_lifecycle to authenticated;

create or replace function atlas_private.validate_data(d jsonb, owner_id uuid, financial_schema integer) returns void
language plpgsql security invoker set search_path=pg_catalog as $$
declare t text; r jsonb; k text; val jsonb; allowed text[]; required text[]; m jsonb;
begin
  perform atlas_private.assert_object(d,
    array['schemaVersion','userId','accounts','categories','events','settlements','postings','accountReconciliations','entityLifecycles','lifecycleChange'],
    array['schemaVersion','userId']);
  if d->'schemaVersion' is distinct from to_jsonb(financial_schema) or d->>'userId' is distinct from owner_id::text then
    raise exception 'Wrong schema or owner' using errcode='22023';
  end if;
  foreach t in array array['accounts','categories','events','settlements','postings','accountReconciliations','entityLifecycles'] loop
    if d ? t and jsonb_typeof(d->t) is distinct from 'array' then raise exception 'Invalid collection' using errcode='22023'; end if;
    if financial_schema in (2,3,4) and not d ? t
      and (t<>'accountReconciliations' or financial_schema in (3,4))
      and (t<>'entityLifecycles' or financial_schema=4) then
      raise exception 'Incomplete snapshot' using errcode='22023';
    end if;
    case t
      when 'accounts' then allowed:=array['id','userId','name','kind','availability']; required:=allowed;
      when 'categories' then allowed:=array['id','userId','name','kind','parentId']; required:=array['id','userId','name','kind'];
      when 'events' then allowed:=array['id','userId','kind','status','source','certainty','amountCents','accountId','transferAccountId','categoryId','description','competenceDate','dueDate','adjustmentDirection','reversesEventId','replacesEventId','recurrenceJson','recurrenceRuleId','recurrenceMonth']; required:=array['id','userId','kind','status','source','certainty','amountCents','accountId','description','competenceDate'];
      when 'settlements' then allowed:=array['id','userId','eventId','amountCents','paymentDate','settlementDate']; required:=allowed;
      when 'postings' then allowed:=array['id','userId','settlementId','accountId','amountCents']; required:=allowed;
      when 'accountReconciliations' then allowed:=array['id','userId','accountId','balanceCents','referenceDate','sourceDescription','certainty','eventId','replacesReconciliationId']; required:=array['id','userId','accountId','balanceCents','referenceDate','sourceDescription','certainty'];
      when 'entityLifecycles' then allowed:=array['operationId','userId','entity','entityId','expectedVersion','version','nextState','revision','metadata']; required:=allowed;
    end case;
    for r in select value from jsonb_array_elements(coalesce(d->t,'[]')) loop
      perform atlas_private.assert_object(r,allowed,required);
      if r->>'userId' is distinct from owner_id::text then raise exception 'Foreign owner' using errcode='42501'; end if;
      if t='entityLifecycles' then
        if coalesce(r->>'operationId','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          or coalesce(r->>'entityId','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          or r->>'entity' not in ('account','category') or r->>'nextState' not in ('active','archived')
          or jsonb_typeof(r->'expectedVersion') is distinct from 'number'
          or jsonb_typeof(r->'version') is distinct from 'number'
          or jsonb_typeof(r->'revision') is distinct from 'number'
          or (r->>'expectedVersion')::integer<0
          or (r->>'version')::integer<>(r->>'expectedVersion')::integer+1
          or (r->>'revision')::bigint<0 then raise exception 'Invalid lifecycle snapshot row' using errcode='22023';
        end if;
        m:=r->'metadata';
        if r->>'entity'='account' then
          perform atlas_private.assert_object(m,array['name','kind','availability'],array['name','kind','availability']);
          if jsonb_typeof(m->'name') is distinct from 'string' or jsonb_typeof(m->'kind') is distinct from 'string' or jsonb_typeof(m->'availability') is distinct from 'string'
            or m->>'kind' not in ('checking','savings','cash','digital','transport','investment','other')
            or m->>'availability' not in ('free','reserved','restricted')
            or (m->>'kind'='transport' and m->>'availability'<>'restricted') then raise exception 'Invalid account lifecycle metadata' using errcode='22023'; end if;
        else
          perform atlas_private.assert_object(m,array['name','kind','parentId'],array['name','kind']);
          if jsonb_typeof(m->'name') is distinct from 'string' or jsonb_typeof(m->'kind') is distinct from 'string'
            or (m ? 'parentId' and m->'parentId'<>'null'::jsonb and jsonb_typeof(m->'parentId') is distinct from 'string')
            or m->>'kind' not in ('income','expense','both')
            or (m ? 'parentId' and m->>'parentId' is not null and coalesce(m->>'parentId','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') then
            raise exception 'Invalid category lifecycle metadata' using errcode='22023';
          end if;
        end if;
        if length(coalesce(m->>'name',''))=0 or length(m->>'name')>120 then raise exception 'Invalid lifecycle name' using errcode='22023'; end if;
        continue;
      end if;
      for k,val in select key,value from jsonb_each(r) loop
        if jsonb_typeof(val) is distinct from 'string' then raise exception 'Financial fields must be strings' using errcode='22023'; end if;
        if (k='id' or right(k,2)='Id') and (val#>>'{}') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'Noncanonical UUID' using errcode='22023'; end if;
        if k='balanceCents' and (val#>>'{}') !~ '^(0|-?[1-9][0-9]{0,10})$' then raise exception 'Noncanonical balance cents' using errcode='22023'; end if;
        if k='amountCents' and (val#>>'{}') !~ '^-?[1-9][0-9]{0,10}$' then raise exception 'Noncanonical cents' using errcode='22023'; end if;
        if k='recurrenceMonth' and (val#>>'{}') !~ '^2[0-9]{3}-(0[1-9]|1[0-2])$' then raise exception 'Invalid recurrence month' using errcode='22023'; end if;
        if k='recurrenceJson' and (length(val#>>'{}')>5000 or not ((val#>>'{}') is json object)) then raise exception 'Invalid recurrence rule' using errcode='22023'; end if;
        if right(k,4)='Date' and ((val#>>'{}') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or to_char((val#>>'{}')::date,'YYYY-MM-DD')<>(val#>>'{}')) then
          raise exception 'Noncanonical date' using errcode='22023';
        end if;
      end loop;
    end loop;
  end loop;
  if financial_schema=4 then
    if d ? 'lifecycleChange' then raise exception 'Lifecycle intent is not valid in a snapshot' using errcode='22023'; end if;
    if exists(select 1 from (
      select (x->>'entity') entity,(x->>'entityId') entity_id,(x->>'version')::integer version,
        row_number() over(partition by x->>'entity',x->>'entityId' order by (x->>'version')::integer) expected
      from jsonb_array_elements(d->'entityLifecycles') x
    ) q where q.version<>q.expected) then raise exception 'Lifecycle snapshot versions are not contiguous' using errcode='22023'; end if;
    if exists(select 1 from jsonb_array_elements(d->'entityLifecycles') x where (x->>'revision')::bigint<>0) then
      raise exception 'Bootstrap lifecycle revisions must be rebased to zero' using errcode='22023';
    end if;
    if exists(select 1 from jsonb_array_elements(d->'entityLifecycles') x
      where (x->>'entity'='account' and not exists(select 1 from jsonb_array_elements(d->'accounts') a where a->>'id'=x->>'entityId'))
         or (x->>'entity'='category' and not exists(select 1 from jsonb_array_elements(d->'categories') c where c->>'id'=x->>'entityId'))) then
      raise exception 'Lifecycle snapshot references a missing entity' using errcode='22023';
    end if;
  end if;
end $$;

create or replace function atlas_private.validate_operation(o jsonb, owner_id uuid) returns void
language plpgsql security invoker set search_path=pg_catalog as $$
declare p jsonb; a integer; c integer; e integer; s integer; n integer; rec integer; kind text;
begin
  perform atlas_private.assert_object(o,array['id','userId','kind','createdAt','payload'],array['id','userId','kind','createdAt','payload']);
  if o->>'userId' is distinct from owner_id::text or coalesce(o->>'id','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    or jsonb_typeof(o->'id') is distinct from 'string' then raise exception 'Invalid operation owner/id' using errcode='22023'; end if;
  if jsonb_typeof(o->'createdAt') is distinct from 'string' or coalesce(o->>'createdAt','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{3})?Z$'
    or to_char((o->>'createdAt')::timestamptz at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')<>replace(case when position('.' in o->>'createdAt')=0 then replace(o->>'createdAt','Z','.000Z') else o->>'createdAt' end,' ','') then
    raise exception 'Invalid operation instant' using errcode='22023';
  end if;
  p:=o->'payload'; kind:=o->>'kind';
  perform atlas_private.validate_data(p,owner_id,1);
  a:=jsonb_array_length(coalesce(p->'accounts','[]')); c:=jsonb_array_length(coalesce(p->'categories','[]'));
  e:=jsonb_array_length(coalesce(p->'events','[]')); s:=jsonb_array_length(coalesce(p->'settlements','[]'));
  n:=jsonb_array_length(coalesce(p->'postings','[]')); rec:=jsonb_array_length(coalesce(p->'accountReconciliations','[]'));
  if kind='manage_entity' then
    if a<>0 or c<>0 or e<>0 or s<>0 or n<>0 or rec<>0 or p ? 'entityLifecycles' then raise exception 'Invalid entity management aggregate' using errcode='22023'; end if;
    perform atlas_private.assert_object(p->'lifecycleChange',array['entity','entityId','expectedVersion','nextState','metadata'],array['entity','entityId','expectedVersion','nextState','metadata']);
    if p->>'userId' is distinct from owner_id::text
      or p->'lifecycleChange'->>'entity' not in ('account','category')
      or coalesce(p->'lifecycleChange'->>'entityId','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or jsonb_typeof(p->'lifecycleChange'->'expectedVersion') is distinct from 'number'
      or (p->'lifecycleChange'->>'expectedVersion')::integer<0
      or p->'lifecycleChange'->>'nextState' not in ('active','archived') then raise exception 'Invalid entity lifecycle intent' using errcode='22023'; end if;
    return;
  elsif p ? 'lifecycleChange' then raise exception 'Unexpected lifecycle intent' using errcode='22023';
  end if;
  if kind='create_account' then
    if a<>1 or c<>0 or rec>1 or e>1 or (e=0 and (s<>0 or n<>0))
      or exists(select 1 from jsonb_array_elements(coalesce(p->'events','[]')) r where r->>'source'<>'opening_balance' or r->>'accountId'<>p->'accounts'->0->>'id') then
      raise exception 'Invalid create_account shape' using errcode='22023';
    end if;
    if rec=1 and (p->'accountReconciliations'->0->>'accountId'<>p->'accounts'->0->>'id'
      or (e=1 and p->'accountReconciliations'->0->>'eventId' is distinct from p->'events'->0->>'id')) then
      raise exception 'Wrong opening reconciliation' using errcode='22023';
    end if;
  elsif kind='create_category' then
    if c<>1 or a<>0 or e<>0 or s<>0 or n<>0 or rec<>0 then raise exception 'Invalid create_category shape' using errcode='22023'; end if;
    if p->'categories'->0 ? 'parentId' and exists(select 1 from atlas_private.entity_lifecycle l where l.user_id=owner_id and l.entity_kind='category'
      and l.entity_id=(p->'categories'->0->>'parentId')::uuid and l.entity_version=(select max(x.entity_version) from atlas_private.entity_lifecycle x where x.user_id=owner_id and x.entity_kind='category' and x.entity_id=l.entity_id) and l.new_state='archived') then
      raise exception 'Parent category is archived' using errcode='22023';
    end if;
  elsif kind='reconcile_account' then
    if a<>0 or c<>0 or rec<>1 or e>1 or (e=0 and (s<>0 or n<>0))
      or (e=1 and (p->'events'->0->>'source'<>'opening_balance' or p->'events'->0->>'kind'<>'adjustment'
        or p->'events'->0->>'accountId' is distinct from p->'accountReconciliations'->0->>'accountId'
        or p->'accountReconciliations'->0->>'eventId' is distinct from p->'events'->0->>'id')) then
      raise exception 'Invalid reconcile_account shape' using errcode='22023';
    end if;
  elsif kind in ('record_event','reverse_event','replace_event') then
    if a<>0 or c<>0 or rec<>0 then raise exception 'Unexpected metadata in event command' using errcode='22023'; end if;
    if kind='record_event' and (e<>1 or exists(select 1 from jsonb_array_elements(coalesce(p->'events','[]')) r where r ? 'reversesEventId' or r ? 'replacesEventId' or r->>'source' not in ('manual','import'))) then raise exception 'Invalid record_event shape' using errcode='22023'; end if;
    if kind='reverse_event' and (e<>1 or not exists(select 1 from jsonb_array_elements(coalesce(p->'events','[]')) r where r ? 'reversesEventId' or (r->>'status'='cancelled' and r ? 'replacesEventId'))) then raise exception 'Invalid reverse_event shape' using errcode='22023'; end if;
    if kind='replace_event' and (e not between 1 and 2 or (select count(*) from jsonb_array_elements(coalesce(p->'events','[]')) r where r ? 'replacesEventId')<>1 or exists(select 1 from jsonb_array_elements(coalesce(p->'events','[]')) r where not r ? 'replacesEventId' and not r ? 'reversesEventId')) then raise exception 'Invalid replace_event shape' using errcode='22023'; end if;
  else raise exception 'Unsupported operation kind' using errcode='22023'; end if;
  if rec>0 and kind not in ('create_account','reconcile_account') then raise exception 'Unexpected account reconciliation' using errcode='22023'; end if;
  if exists(select 1 from jsonb_array_elements(coalesce(p->'settlements','[]')) r where not exists(select 1 from jsonb_array_elements(coalesce(p->'events','[]')) v where v->>'id'=r->>'eventId'))
    or exists(select 1 from jsonb_array_elements(coalesce(p->'postings','[]')) r where not exists(select 1 from jsonb_array_elements(coalesce(p->'settlements','[]')) v where v->>'id'=r->>'settlementId')) then
    raise exception 'Command splits a financial aggregate' using errcode='22023';
  end if;
  if kind='reconcile_account' and exists(
    select 1 from jsonb_array_elements(coalesce(p->'accountReconciliations','[]')) r
    where exists(select 1 from atlas_private.entity_lifecycle l where l.user_id=owner_id and l.entity_kind='account' and l.entity_id=(r->>'accountId')::uuid
      and l.entity_version=(select max(x.entity_version) from atlas_private.entity_lifecycle x where x.user_id=owner_id and x.entity_kind='account' and x.entity_id=l.entity_id) and l.new_state='archived')
  ) then raise exception 'Archived account cannot be reconciled' using errcode='23514'; end if;
  if kind in ('record_event','reconcile_account') and exists(
    select 1 from jsonb_array_elements(coalesce(p->'events','[]')) as event_row(value)
    where exists(select 1 from atlas_private.entity_lifecycle l where l.user_id=owner_id and l.entity_kind='account' and l.entity_id=(event_row.value->>'accountId')::uuid
      and l.entity_version=(select max(x.entity_version) from atlas_private.entity_lifecycle x where x.user_id=owner_id and x.entity_kind='account' and x.entity_id=l.entity_id) and l.new_state='archived')
      or (event_row.value ? 'transferAccountId' and exists(select 1 from atlas_private.entity_lifecycle l where l.user_id=owner_id and l.entity_kind='account' and l.entity_id=(event_row.value->>'transferAccountId')::uuid
        and l.entity_version=(select max(x.entity_version) from atlas_private.entity_lifecycle x where x.user_id=owner_id and x.entity_kind='account' and x.entity_id=l.entity_id) and l.new_state='archived'))
      or (event_row.value ? 'categoryId' and exists(select 1 from atlas_private.entity_lifecycle l where l.user_id=owner_id and l.entity_kind='category' and l.entity_id=(event_row.value->>'categoryId')::uuid
        and l.entity_version=(select max(x.entity_version) from atlas_private.entity_lifecycle x where x.user_id=owner_id and x.entity_kind='category' and x.entity_id=l.entity_id) and l.new_state='archived'))
  ) then raise exception 'Archived entities cannot receive new financial records' using errcode='23514'; end if;
end $$;

create or replace function atlas_private.insert_data(d jsonb, owner_id uuid) returns void
language plpgsql security invoker set search_path=pg_catalog as $$
begin
  insert into atlas_private.accounts select owner_id,(r->>'id')::uuid,r->>'name',r->>'kind',r->>'availability' from jsonb_array_elements(coalesce(d->'accounts','[]')) r;
  insert into atlas_private.categories select owner_id,(r->>'id')::uuid,r->>'name',r->>'kind',(r->>'parentId')::uuid from jsonb_array_elements(coalesce(d->'categories','[]')) r;
  insert into atlas_private.financial_events (user_id,id,kind,status,certainty,source,amount_cents,account_id,transfer_account_id,category_id,description,competence_date,due_date,adjustment_direction,reverses_event_id,replaces_event_id,recurrence_json,recurrence_rule_id,recurrence_month)
    select owner_id,(r->>'id')::uuid,r->>'kind',r->>'status',r->>'certainty',r->>'source',(r->>'amountCents')::bigint,
      (r->>'accountId')::uuid,(r->>'transferAccountId')::uuid,(r->>'categoryId')::uuid,r->>'description',(r->>'competenceDate')::date,(r->>'dueDate')::date,
      r->>'adjustmentDirection',(r->>'reversesEventId')::uuid,(r->>'replacesEventId')::uuid,r->>'recurrenceJson',(r->>'recurrenceRuleId')::uuid,r->>'recurrenceMonth'
    from jsonb_array_elements(coalesce(d->'events','[]')) r;
  insert into atlas_private.settlements select owner_id,(r->>'id')::uuid,(r->>'eventId')::uuid,(r->>'amountCents')::bigint,(r->>'paymentDate')::date,(r->>'settlementDate')::date from jsonb_array_elements(coalesce(d->'settlements','[]')) r;
  insert into atlas_private.postings select owner_id,(r->>'id')::uuid,(r->>'settlementId')::uuid,(r->>'accountId')::uuid,(r->>'amountCents')::bigint from jsonb_array_elements(coalesce(d->'postings','[]')) r;
  insert into atlas_private.account_reconciliations (user_id,id,account_id,balance_cents,reference_date,source_description,certainty,event_id,replaces_reconciliation_id)
    select owner_id,(r->>'id')::uuid,(r->>'accountId')::uuid,(r->>'balanceCents')::bigint,(r->>'referenceDate')::date,r->>'sourceDescription',r->>'certainty',(r->>'eventId')::uuid,(r->>'replacesReconciliationId')::uuid from jsonb_array_elements(coalesce(d->'accountReconciliations','[]')) r;
  insert into atlas_private.entity_lifecycle(user_id,operation_id,entity_kind,entity_id,expected_version,entity_version,new_state,feed_revision,metadata)
    select owner_id,(r->>'operationId')::uuid,r->>'entity',(r->>'entityId')::uuid,(r->>'expectedVersion')::integer,(r->>'version')::integer,
      r->>'nextState',1,r->'metadata' from jsonb_array_elements(coalesce(d->'entityLifecycles','[]')) r;
end $$;

create function atlas_private.apply_entity_change(change jsonb, owner_id uuid, op_id uuid, next_revision bigint) returns void
language plpgsql security invoker set search_path=pg_catalog as $$
declare v_entity_kind text; v_entity_id uuid; v_expected integer; v_next_state text; v_metadata jsonb;
  v_current_version integer:=0; v_current_state text:='active'; v_current_metadata jsonb;
  v_parent_id uuid; v_cycle boolean:=false;
begin
  perform atlas_private.assert_object(change,array['entity','entityId','expectedVersion','nextState','metadata'],array['entity','entityId','expectedVersion','nextState','metadata']);
  v_entity_kind:=change->>'entity';v_entity_id:=(change->>'entityId')::uuid;
  v_expected:=(change->>'expectedVersion')::integer;v_next_state:=change->>'nextState';v_metadata:=change->'metadata';
  if v_entity_kind='account' then
    select jsonb_build_object('name',a.name,'kind',a.kind,'availability',a.availability) into v_current_metadata
      from atlas_private.accounts a where a.user_id=owner_id and a.id=v_entity_id;
  elsif v_entity_kind='category' then
    select jsonb_strip_nulls(jsonb_build_object('name',c.name,'kind',c.kind,'parentId',c.parent_id::text)) into v_current_metadata
      from atlas_private.categories c where c.user_id=owner_id and c.id=v_entity_id;
  else raise exception 'Invalid entity kind' using errcode='22023';
  end if;
  if v_current_metadata is null then raise exception 'Entity not found' using errcode='P0002'; end if;
  select l.entity_version,l.new_state,l.metadata into v_current_version,v_current_state,v_current_metadata
    from atlas_private.entity_lifecycle l where l.user_id=owner_id and l.entity_kind=v_entity_kind and l.entity_id=v_entity_id
    order by l.entity_version desc limit 1;
  if not found then
    v_current_version:=0;v_current_state:='active';
    if v_entity_kind='account' then
      select jsonb_build_object('name',a.name,'kind',a.kind,'availability',a.availability) into v_current_metadata from atlas_private.accounts a where a.user_id=owner_id and a.id=v_entity_id;
    else
      select jsonb_strip_nulls(jsonb_build_object('name',c.name,'kind',c.kind,'parentId',c.parent_id::text)) into v_current_metadata from atlas_private.categories c where c.user_id=owner_id and c.id=v_entity_id;
    end if;
  end if;
  if v_expected<>v_current_version then raise exception 'ENTITY_VERSION_CONFLICT' using errcode='40001'; end if;
  if v_entity_kind='account' then
    perform atlas_private.assert_object(v_metadata,array['name','kind','availability'],array['name','kind','availability']);
    if v_metadata->>'kind' not in ('checking','savings','cash','digital','transport','investment','other')
      or v_metadata->>'availability' not in ('free','reserved','restricted')
      or (v_metadata->>'kind'='transport' and v_metadata->>'availability'<>'restricted') then raise exception 'Invalid account metadata' using errcode='22023'; end if;
  else
    perform atlas_private.assert_object(v_metadata,array['name','kind','parentId'],array['name','kind']);
    if v_metadata->>'kind' not in ('income','expense','both') then raise exception 'Invalid category metadata' using errcode='22023'; end if;
    if v_metadata ? 'parentId' and v_metadata->>'parentId' is not null then
      v_parent_id:=(v_metadata->>'parentId')::uuid;
      if v_parent_id=v_entity_id or not exists(select 1 from atlas_private.categories c where c.user_id=owner_id and c.id=v_parent_id) then
        raise exception 'Invalid parent category' using errcode='22023';
      end if;
      if exists(select 1 from atlas_private.entity_lifecycle l where l.user_id=owner_id and l.entity_kind='category' and l.entity_id=v_parent_id
        and l.entity_version=(select max(x.entity_version) from atlas_private.entity_lifecycle x where x.user_id=owner_id and x.entity_kind='category' and x.entity_id=v_parent_id) and l.new_state='archived') then
        raise exception 'Parent category is archived' using errcode='23514';
      end if;
      with recursive ancestors(id,parent_id,path) as (
        select c.id,(case when latest.metadata is null then c.parent_id::text else latest.metadata->>'parentId' end)::uuid,array[c.id]
          from atlas_private.categories c left join lateral(
            select l.metadata from atlas_private.entity_lifecycle l where l.user_id=owner_id and l.entity_kind='category' and l.entity_id=c.id order by l.entity_version desc limit 1
          ) latest on true where c.user_id=owner_id and c.id=v_parent_id
        union all
        select p.id,(case when latest.metadata is null then p.parent_id::text else latest.metadata->>'parentId' end)::uuid,a.path||p.id
          from ancestors a join atlas_private.categories p on p.user_id=owner_id and p.id=a.parent_id
          left join lateral(select l.metadata from atlas_private.entity_lifecycle l where l.user_id=owner_id and l.entity_kind='category' and l.entity_id=p.id order by l.entity_version desc limit 1) latest on true
          where not p.id=any(a.path)
      ) select exists(select 1 from ancestors where id=v_entity_id) into v_cycle;
      if v_cycle then raise exception 'Category hierarchy cannot contain a cycle' using errcode='23514'; end if;
    end if;
    if (v_metadata->>'kind'='income' and exists(select 1 from atlas_private.financial_events e where e.user_id=owner_id and e.category_id=v_entity_id and e.kind='expense'))
      or (v_metadata->>'kind'='expense' and exists(select 1 from atlas_private.financial_events e where e.user_id=owner_id and e.category_id=v_entity_id and e.kind='income')) then
      raise exception 'Category kind conflicts with historical financial events' using errcode='23514';
    end if;
  end if;
  if length(btrim(coalesce(v_metadata->>'name','')))=0 or length(v_metadata->>'name')>120 then raise exception 'Invalid entity name' using errcode='22023'; end if;
  if v_next_state not in ('active','archived') then raise exception 'Invalid lifecycle state' using errcode='22023'; end if;
  if v_current_state=v_next_state and v_current_metadata=v_metadata then raise exception 'No entity change' using errcode='22023'; end if;
  insert into atlas_private.entity_lifecycle(user_id,operation_id,entity_kind,entity_id,expected_version,entity_version,new_state,feed_revision,metadata)
    values(owner_id,op_id,v_entity_kind,v_entity_id,v_expected,v_current_version+1,v_next_state,next_revision,v_metadata);
end $$;

create or replace function api.i3_apply(p_envelope jsonb) returns jsonb
language plpgsql security invoker set search_path=pg_catalog as $$
declare owner_id uuid:=auth.uid(); op_id uuid; head bigint; base bigint; kind text; hash text; existing atlas_private.operation_receipts%rowtype;
  d jsonb; o jsonb; r jsonb; t text; key text; covered jsonb:='[]'; seen jsonb:='{}'; seen_ops jsonb:='{}'; result jsonb; count_rows integer:=0;
begin
  if owner_id is null or not exists(select 1 from atlas_security.app_access where user_id=owner_id and active) then raise exception 'Access denied' using errcode='42501'; end if;
  if not coalesce((select writes_enabled from atlas_security.integration_control where id),false) then raise exception 'REMOTE_WRITES_DISABLED' using errcode='42501'; end if;
  perform atlas_private.assert_object(p_envelope,array['protocolVersion','operationId','userId','baseRevision','kind','operation','source','data','coveredOperations'],array['protocolVersion','operationId','userId','baseRevision','kind']);
  if p_envelope->'protocolVersion' is distinct from '1'::jsonb or p_envelope->>'userId' is distinct from owner_id::text
    or jsonb_typeof(p_envelope->'operationId') is distinct from 'string' or coalesce(p_envelope->>'operationId','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    or jsonb_typeof(p_envelope->'baseRevision') is distinct from 'string' or coalesce(p_envelope->>'baseRevision','') !~ '^(0|[1-9][0-9]{0,18})$' then raise exception 'Invalid protocol identity/revision' using errcode='22023'; end if;
  kind:=p_envelope->>'kind';op_id:=(p_envelope->>'operationId')::uuid;base:=(p_envelope->>'baseRevision')::bigint;
  if octet_length(atlas_private.canonical_json(p_envelope))>(case when kind='bootstrap' then 2097152 else 131072 end) then raise exception 'Envelope too large; nothing changed' using errcode='22023'; end if;
  hash:=atlas_private.json_digest(p_envelope);
  insert into atlas_private.sync_heads(user_id) values(owner_id) on conflict do nothing;
  select revision into head from atlas_private.sync_heads where user_id=owner_id for update;
  select * into existing from atlas_private.operation_receipts where user_id=owner_id and operation_id=op_id;
  if found then if existing.payload_digest<>hash then raise exception 'ID_CONTENT_MISMATCH' using errcode='22023'; end if;return existing.result;end if;
  if exists(select 1 from atlas_private.incorporated_operations where user_id=owner_id and operation_id=op_id) then
    if kind='bootstrap' or exists(select 1 from atlas_private.incorporated_operations where user_id=owner_id and operation_id=op_id and operation_digest<>atlas_private.json_digest(p_envelope->'operation')) then raise exception 'ID_CONTENT_MISMATCH' using errcode='22023'; end if;
    select receipts.result into result from atlas_private.incorporated_operations i join atlas_private.operation_receipts receipts on receipts.user_id=i.user_id and receipts.operation_id=i.bootstrap_id where i.user_id=owner_id and i.operation_id=op_id;return result;
  end if;
  if base>head then raise exception 'Future revision' using errcode='22023'; end if;
  if kind='bootstrap' then
    if p_envelope ? 'operation' or base<>0 or head<>0 or exists(select 1 from atlas_private.accounts where user_id=owner_id) or exists(select 1 from atlas_private.categories where user_id=owner_id) then raise exception 'BOOTSTRAP_REQUIRES_EMPTY_DESTINATION' using errcode='23505'; end if;
    perform atlas_private.assert_object(p_envelope->'source',array['ownerId','digest'],array['ownerId','digest']);
    if coalesce(p_envelope->'source'->>'ownerId','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' or coalesce(p_envelope->'source'->>'digest','') !~ '^[0-9a-f]{64}$'
      or jsonb_typeof(p_envelope->'coveredOperations') is distinct from 'array' then raise exception 'Invalid bootstrap provenance' using errcode='22023'; end if;
    d:=p_envelope->'data';perform atlas_private.validate_data(d,owner_id,(d->>'schemaVersion')::integer);
    foreach t in array array['accounts','categories','events','settlements','postings','accountReconciliations','entityLifecycles'] loop count_rows:=count_rows+jsonb_array_length(coalesce(d->t,'[]'));end loop;
    if count_rows>5000 then raise exception 'Bootstrap row limit; nothing changed' using errcode='22023';end if;
    for o in select value from jsonb_array_elements(p_envelope->'coveredOperations') loop
      perform atlas_private.validate_operation(o,owner_id);
      if o->>'id'=op_id::text or seen_ops ? (o->>'id') then raise exception 'Duplicate covered operation' using errcode='22023';end if;
      seen_ops:=seen_ops||jsonb_build_object(o->>'id',true);
      foreach t in array array['accounts','categories','events','settlements','postings','accountReconciliations'] loop
        for r in select value from jsonb_array_elements(coalesce(o->'payload'->t,'[]')) loop
          key:=t||':'||(r->>'id');
          if seen ? key or not exists(select 1 from jsonb_array_elements(d->t) v where v=r) then raise exception 'Covered operation diverges from snapshot' using errcode='22023';end if;
          seen:=seen||jsonb_build_object(key,true);
        end loop;
      end loop;
      if exists(select 1 from jsonb_array_elements(d->'settlements') as snapshot_settlement(value)
        where exists(select 1 from jsonb_array_elements(coalesce(o->'payload'->'events','[]')) as covered_event(value)
          where covered_event.value->>'id'=snapshot_settlement.value->>'eventId')
          and not exists(select 1 from jsonb_array_elements(coalesce(o->'payload'->'settlements','[]')) as covered_settlement(value)
            where covered_settlement.value=snapshot_settlement.value))
        or exists(select 1 from jsonb_array_elements(d->'postings') as snapshot_posting(value)
          where exists(select 1 from jsonb_array_elements(coalesce(o->'payload'->'settlements','[]')) as covered_parent(value)
            where covered_parent.value->>'id'=snapshot_posting.value->>'settlementId')
            and not exists(select 1 from jsonb_array_elements(coalesce(o->'payload'->'postings','[]')) as covered_posting(value)
              where covered_posting.value=snapshot_posting.value)) then raise exception 'Incomplete covered aggregate' using errcode='22023';end if;
      covered:=covered||jsonb_build_array(jsonb_build_object('id',o->>'id','digest',atlas_private.json_digest(o)));
      insert into atlas_private.incorporated_operations values(owner_id,(o->>'id')::uuid,op_id,atlas_private.json_digest(o));
    end loop;
  else
    if p_envelope ?| array['source','data','coveredOperations'] then raise exception 'Unsupported command fields' using errcode='22023';end if;
    o:=p_envelope->'operation';perform atlas_private.validate_operation(o,owner_id);
    if o->>'id'<>op_id::text or o->>'kind' is distinct from kind then raise exception 'Command identity mismatch' using errcode='22023';end if;
    d:=o->'payload';
    if kind='manage_entity' then perform atlas_private.apply_entity_change(d->'lifecycleChange',owner_id,op_id,head+1);end if;
  end if;
  if kind='bootstrap' and (d->>'schemaVersion')::integer not in (2,3,4) then raise exception 'Unsupported snapshot version' using errcode='22023';end if;
  perform atlas_private.insert_data(d,owner_id);
  head:=head+1;
  result:=jsonb_build_object('protocolVersion',1,'userId',owner_id::text,'operationId',op_id::text,'revision',head::text,'digest',hash,'coveredOperations',covered);
  insert into atlas_private.operation_receipts values(owner_id,op_id,1,hash,head,result);
  insert into atlas_private.sync_batches values(owner_id,head,op_id,p_envelope,result);
  update atlas_private.sync_heads set revision=head where user_id=owner_id;
  return result;
end $$;

create or replace function atlas_private.check_lifecycle_batch_coverage() returns trigger
language plpgsql security invoker set search_path=pg_catalog as $$
declare covered boolean:=false;
begin
  select exists(
    select 1 from atlas_private.sync_batches b
    where b.user_id=new.user_id and (
      (b.envelope->>'kind'='bootstrap' and exists(
        select 1 from jsonb_array_elements(b.envelope->'data'->'entityLifecycles') r
        where r->>'operationId'=new.operation_id::text and r->>'entity'=new.entity_kind
          and r->>'entityId'=new.entity_id::text and (r->>'version')::integer=new.entity_version
          and r->>'nextState'=new.new_state and r->'metadata'=new.metadata
      )) or
      (b.operation_id=new.operation_id and b.envelope->>'kind'='manage_entity'
        and b.envelope->'operation'->'payload'->'lifecycleChange'->>'entity'=new.entity_kind
        and b.envelope->'operation'->'payload'->'lifecycleChange'->>'entityId'=new.entity_id::text
        and (b.envelope->'operation'->'payload'->'lifecycleChange'->>'expectedVersion')::integer=new.expected_version
        and b.envelope->'operation'->'payload'->'lifecycleChange'->>'nextState'=new.new_state
        and b.envelope->'operation'->'payload'->'lifecycleChange'->'metadata'=new.metadata
      )
    )
  ) into covered;
  if not covered then raise exception 'Lifecycle row without committed sync batch' using errcode='23514';end if;
  return null;
end $$;
create constraint trigger lifecycle_batch_coverage after insert on atlas_private.entity_lifecycle
  deferrable initially deferred for each row execute function atlas_private.check_lifecycle_batch_coverage();

create or replace function api.i3_readiness() returns jsonb
language plpgsql security invoker set search_path=pg_catalog as $$
begin
  if auth.uid() is null or not exists(select 1 from atlas_security.app_access a where a.user_id=auth.uid() and a.active) then
    raise exception 'Access denied' using errcode='42501';
  end if;
  return jsonb_build_object('protocolVersion',1,'financialSchemaVersion',4,
    'financialWritesEnabled',coalesce((select writes_enabled from atlas_security.integration_control where id),false),'localProtocolAvailable',true);
end $$;

revoke all on function atlas_private.apply_entity_change(jsonb,uuid,uuid,bigint),atlas_private.check_lifecycle_batch_coverage() from public,anon;
grant execute on function atlas_private.apply_entity_change(jsonb,uuid,uuid,bigint),atlas_private.check_lifecycle_batch_coverage() to authenticated;
revoke all on table atlas_private.entity_lifecycle from public,anon;
commit;
