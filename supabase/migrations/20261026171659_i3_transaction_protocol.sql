-- Local I3 protocol, NOT remotely applied. Expose only api via PostgREST.
-- Invoker RPCs require minimal DML in PRIVATE schemas, still subject to RLS.
-- A JWT is not a database login; never expose these schemas or generic SQL helpers.
begin;

-- Explicit administrative switch. A migration alone must not start a real-data pilot.
create table atlas_security.integration_control (
  id boolean primary key default true check(id), writes_enabled boolean not null default false
);
insert into atlas_security.integration_control values(true,false);
alter table atlas_security.integration_control enable row level security;
create policy active_owner_control_read on atlas_security.integration_control for select to authenticated
  using(exists(select 1 from atlas_security.app_access where user_id=(select auth.uid()) and active));
grant select on atlas_security.integration_control to authenticated;
revoke all on atlas_security.integration_control from public,anon;

create table atlas_private.sync_batches (
  user_id uuid not null references auth.users(id) on delete restrict,
  revision bigint not null check (revision > 0), operation_id uuid not null,
  envelope jsonb not null, receipt jsonb not null,
  primary key(user_id,revision), unique(user_id,operation_id),
  foreign key(user_id,operation_id) references atlas_private.operation_receipts(user_id,operation_id) deferrable initially deferred
);
create table atlas_private.incorporated_operations (
  user_id uuid not null references auth.users(id) on delete restrict,
  operation_id uuid not null, bootstrap_id uuid not null,
  operation_digest text not null check(operation_digest ~ '^[0-9a-f]{64}$'),
  primary key(user_id,operation_id),
  foreign key(user_id,bootstrap_id) references atlas_private.operation_receipts(user_id,operation_id) deferrable initially deferred,
  check(operation_id <> bootstrap_id)
);

do $policies$
declare t text;
begin
  foreach t in array array['sync_batches','incorporated_operations'] loop
    execute format('alter table atlas_private.%I enable row level security',t);
    execute format('create policy active_owner_read on atlas_private.%I for select to authenticated using
      (user_id=(select auth.uid()) and exists(select 1 from atlas_security.app_access where user_id=(select auth.uid()) and active))',t);
    execute format('grant select on atlas_private.%I to authenticated',t);
  end loop;
  foreach t in array array['accounts','categories','financial_events','settlements','postings','operation_receipts','sync_heads','sync_batches','incorporated_operations'] loop
    execute format('create policy active_owner_insert on atlas_private.%I for insert to authenticated with check
      (user_id=(select auth.uid()) and exists(select 1 from atlas_security.app_access where user_id=(select auth.uid()) and active))',t);
    execute format('grant insert on atlas_private.%I to authenticated',t);
  end loop;
end $policies$;
create policy active_owner_head_update on atlas_private.sync_heads for update to authenticated
  using(user_id=(select auth.uid()) and exists(select 1 from atlas_security.app_access where user_id=(select auth.uid()) and active))
  with check(user_id=(select auth.uid()) and exists(select 1 from atlas_security.app_access where user_id=(select auth.uid()) and active));
grant update(revision) on atlas_private.sync_heads to authenticated;

-- I3 has no metadata edit/archive/delete command. Ledger AND metadata append only.
do $immutable$
declare t text;
begin
  foreach t in array array['accounts','categories','operation_receipts','sync_batches','incorporated_operations'] loop
    execute format('create trigger immutable_record before update or delete on atlas_private.%I for each row execute function atlas_private.reject_ledger_mutation()',t);
  end loop;
end $immutable$;

create function atlas_private.canonical_json(v jsonb) returns text
language plpgsql immutable strict security invoker set search_path=pg_catalog as $$
declare result text;
begin
  case jsonb_typeof(v)
    when 'object' then select '{'||coalesce(string_agg(to_jsonb(key)::text||':'||atlas_private.canonical_json(value),',' order by key collate "C"),'')||'}' into result from jsonb_each(v);
    when 'array' then select '['||coalesce(string_agg(atlas_private.canonical_json(value),',' order by ordinal),'')||']' into result from jsonb_array_elements(v) with ordinality as x(value,ordinal);
    when 'number' then
      if v::text !~ '^-?(0|[1-9][0-9]*)$' or abs((v::text)::numeric)>9007199254740991 then raise exception 'Noncanonical JSON number' using errcode='22023'; end if;
      result:=v::text;
    else result:=v::text;
  end case;
  return result;
end $$;
create function atlas_private.json_digest(v jsonb) returns text
language sql immutable strict security invoker set search_path=pg_catalog as $$
  select encode(sha256(convert_to(atlas_private.canonical_json(v),'UTF8')),'hex')
$$;
create function atlas_private.assert_object(v jsonb, allowed text[], required text[]) returns void
language plpgsql immutable security invoker set search_path=pg_catalog as $$
begin
  if jsonb_typeof(v) is distinct from 'object' then raise exception 'Expected JSON object' using errcode='22023'; end if;
  if not v ?& required or exists(select 1 from jsonb_object_keys(v) k where not k=any(allowed)) then raise exception 'Missing or unsupported fields' using errcode='22023'; end if;
end $$;
create function atlas_private.validate_data(d jsonb, owner_id uuid, financial_schema integer) returns void
language plpgsql security invoker set search_path=pg_catalog as $$
declare t text; r jsonb; k text; val jsonb; allowed text[]; required text[];
begin
  perform atlas_private.assert_object(d,array['schemaVersion','userId','accounts','categories','events','settlements','postings'],array['schemaVersion','userId']);
  if d->'schemaVersion' is distinct from to_jsonb(financial_schema) or d->>'userId' is distinct from owner_id::text then raise exception 'Wrong schema or owner' using errcode='22023'; end if;
  foreach t in array array['accounts','categories','events','settlements','postings'] loop
    if d ? t and jsonb_typeof(d->t) is distinct from 'array' then raise exception 'Invalid collection' using errcode='22023'; end if;
    if financial_schema=2 and not d ? t then raise exception 'Incomplete snapshot' using errcode='22023'; end if;
    case t
      when 'accounts' then allowed:=array['id','userId','name','kind','availability']; required:=allowed;
      when 'categories' then allowed:=array['id','userId','name','kind','parentId']; required:=array['id','userId','name','kind'];
      when 'events' then allowed:=array['id','userId','kind','status','source','certainty','amountCents','accountId','transferAccountId','categoryId','description','competenceDate','dueDate','adjustmentDirection','reversesEventId','replacesEventId']; required:=array['id','userId','kind','status','source','certainty','amountCents','accountId','description','competenceDate'];
      when 'settlements' then allowed:=array['id','userId','eventId','amountCents','paymentDate','settlementDate']; required:=allowed;
      when 'postings' then allowed:=array['id','userId','settlementId','accountId','amountCents']; required:=allowed;
    end case;
    for r in select value from jsonb_array_elements(coalesce(d->t,'[]')) loop
      perform atlas_private.assert_object(r,allowed,required);
      if r->>'userId' is distinct from owner_id::text then raise exception 'Foreign owner' using errcode='42501'; end if;
      for k,val in select key,value from jsonb_each(r) loop
        if jsonb_typeof(val) is distinct from 'string' then raise exception 'Financial fields must be strings' using errcode='22023'; end if;
        if (k='id' or right(k,2)='Id') and (val#>>'{}') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'Noncanonical UUID' using errcode='22023'; end if;
        if k='amountCents' and (val#>>'{}') !~ '^-?[1-9][0-9]{0,10}$' then raise exception 'Noncanonical cents' using errcode='22023'; end if;
        if right(k,4)='Date' then
          if (val#>>'{}') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or to_char((val#>>'{}')::date,'YYYY-MM-DD')<>(val#>>'{}') then raise exception 'Noncanonical date' using errcode='22023'; end if;
        end if;
      end loop;
    end loop;
  end loop;
end $$;

create function atlas_private.validate_operation(o jsonb, owner_id uuid) returns void
language plpgsql security invoker set search_path=pg_catalog as $$
declare p jsonb; a integer; c integer; e integer; s integer; n integer; kind text;
begin
  perform atlas_private.assert_object(o,array['id','userId','kind','createdAt','payload'],array['id','userId','kind','createdAt','payload']);
  if o->>'userId' is distinct from owner_id::text or coalesce(o->>'id','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    or jsonb_typeof(o->'id') is distinct from 'string' then raise exception 'Invalid operation owner/id' using errcode='22023'; end if;
  if jsonb_typeof(o->'createdAt') is distinct from 'string' or coalesce(o->>'createdAt','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{3})?Z$'
    or to_char((o->>'createdAt')::timestamptz at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')<>replace(case when position('.' in o->>'createdAt')=0 then replace(o->>'createdAt','Z','.000Z') else o->>'createdAt' end,' ','') then raise exception 'Invalid operation instant' using errcode='22023'; end if;
  p:=o->'payload'; kind:=o->>'kind';
  perform atlas_private.validate_data(p,owner_id,1);
  a:=jsonb_array_length(coalesce(p->'accounts','[]')); c:=jsonb_array_length(coalesce(p->'categories','[]'));
  e:=jsonb_array_length(coalesce(p->'events','[]')); s:=jsonb_array_length(coalesce(p->'settlements','[]')); n:=jsonb_array_length(coalesce(p->'postings','[]'));
  if kind='create_account' then
    if a<>1 or c<>0 or e>1 or (e=0 and (s<>0 or n<>0)) or exists(select 1 from jsonb_array_elements(coalesce(p->'events','[]')) r where r->>'source'<>'opening_balance' or r->>'accountId'<>p->'accounts'->0->>'id') then raise exception 'Invalid create_account shape' using errcode='22023'; end if;
  elsif kind='create_category' then
    if c<>1 or a<>0 or e<>0 or s<>0 or n<>0 then raise exception 'Invalid create_category shape' using errcode='22023'; end if;
  elsif kind in ('record_event','reverse_event','replace_event') then
    if a<>0 or c<>0 then raise exception 'Unexpected metadata in event command' using errcode='22023'; end if;
    if kind='record_event' and (e<>1 or exists(select 1 from jsonb_array_elements(coalesce(p->'events','[]')) r where r ? 'reversesEventId' or r ? 'replacesEventId' or r->>'source'<>'manual')) then raise exception 'Invalid record_event shape' using errcode='22023'; end if;
    if kind='reverse_event' and (e<>1 or not exists(select 1 from jsonb_array_elements(coalesce(p->'events','[]')) r where r ? 'reversesEventId' or (r->>'status'='cancelled' and r ? 'replacesEventId'))) then raise exception 'Invalid reverse_event shape' using errcode='22023'; end if;
    if kind='replace_event' and (e not between 1 and 2 or (select count(*) from jsonb_array_elements(coalesce(p->'events','[]')) r where r ? 'replacesEventId')<>1 or exists(select 1 from jsonb_array_elements(coalesce(p->'events','[]')) r where not r ? 'replacesEventId' and not r ? 'reversesEventId')) then raise exception 'Invalid replace_event shape' using errcode='22023'; end if;
  else raise exception 'Unsupported operation kind' using errcode='22023'; end if;
  if exists(select 1 from jsonb_array_elements(coalesce(p->'settlements','[]')) r where not exists(select 1 from jsonb_array_elements(coalesce(p->'events','[]')) v where v->>'id'=r->>'eventId'))
    or exists(select 1 from jsonb_array_elements(coalesce(p->'postings','[]')) r where not exists(select 1 from jsonb_array_elements(coalesce(p->'settlements','[]')) v where v->>'id'=r->>'settlementId')) then raise exception 'Command splits a financial aggregate' using errcode='22023'; end if;
end $$;

create function atlas_private.insert_data(d jsonb, owner_id uuid) returns void
language plpgsql security invoker set search_path=pg_catalog as $$
begin
  insert into atlas_private.accounts select owner_id,(r->>'id')::uuid,r->>'name',r->>'kind',r->>'availability' from jsonb_array_elements(coalesce(d->'accounts','[]')) r;
  insert into atlas_private.categories select owner_id,(r->>'id')::uuid,r->>'name',r->>'kind',(r->>'parentId')::uuid from jsonb_array_elements(coalesce(d->'categories','[]')) r;
  insert into atlas_private.financial_events select owner_id,(r->>'id')::uuid,r->>'kind',r->>'status',r->>'certainty',r->>'source',(r->>'amountCents')::bigint,
    (r->>'accountId')::uuid,(r->>'transferAccountId')::uuid,(r->>'categoryId')::uuid,r->>'description',(r->>'competenceDate')::date,(r->>'dueDate')::date,
    r->>'adjustmentDirection',(r->>'reversesEventId')::uuid,(r->>'replacesEventId')::uuid from jsonb_array_elements(coalesce(d->'events','[]')) r;
  insert into atlas_private.settlements select owner_id,(r->>'id')::uuid,(r->>'eventId')::uuid,(r->>'amountCents')::bigint,(r->>'paymentDate')::date,(r->>'settlementDate')::date from jsonb_array_elements(coalesce(d->'settlements','[]')) r;
  insert into atlas_private.postings select owner_id,(r->>'id')::uuid,(r->>'settlementId')::uuid,(r->>'accountId')::uuid,(r->>'amountCents')::bigint from jsonb_array_elements(coalesce(d->'postings','[]')) r;
end $$;

create function api.i3_apply(p_envelope jsonb) returns jsonb
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
  kind:=p_envelope->>'kind'; op_id:=(p_envelope->>'operationId')::uuid; base:=(p_envelope->>'baseRevision')::bigint;
  if octet_length(atlas_private.canonical_json(p_envelope))>(case when kind='bootstrap' then 2097152 else 131072 end) then raise exception 'Envelope too large; nothing changed' using errcode='22023'; end if;
  hash:=atlas_private.json_digest(p_envelope);
  insert into atlas_private.sync_heads(user_id) values(owner_id) on conflict do nothing;
  select revision into head from atlas_private.sync_heads where user_id=owner_id for update;
  -- The row lock serializes revision allocation and commit, not client timestamps/sequences.
  select * into existing from atlas_private.operation_receipts where user_id=owner_id and operation_id=op_id;
  if found then
    if existing.payload_digest<>hash then raise exception 'ID_CONTENT_MISMATCH' using errcode='22023'; end if;
    return existing.result;
  end if;
  if exists(select 1 from atlas_private.incorporated_operations where user_id=owner_id and operation_id=op_id) then
    if kind='bootstrap' or exists(select 1 from atlas_private.incorporated_operations where user_id=owner_id and operation_id=op_id and operation_digest<>atlas_private.json_digest(p_envelope->'operation')) then raise exception 'ID_CONTENT_MISMATCH' using errcode='22023'; end if;
    select receipts.result into result from atlas_private.incorporated_operations i join atlas_private.operation_receipts receipts on receipts.user_id=i.user_id and receipts.operation_id=i.bootstrap_id where i.user_id=owner_id and i.operation_id=op_id;
    return result;
  end if;
  if base>head then raise exception 'Future revision' using errcode='22023'; end if;
  if kind='bootstrap' then
    if p_envelope ? 'operation' or base<>0 or head<>0 or exists(select 1 from atlas_private.accounts where user_id=owner_id) or exists(select 1 from atlas_private.categories where user_id=owner_id) then raise exception 'BOOTSTRAP_REQUIRES_EMPTY_DESTINATION' using errcode='23505'; end if;
    perform atlas_private.assert_object(p_envelope->'source',array['ownerId','digest'],array['ownerId','digest']);
    if coalesce(p_envelope->'source'->>'ownerId','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' or coalesce(p_envelope->'source'->>'digest','') !~ '^[0-9a-f]{64}$'
      or jsonb_typeof(p_envelope->'coveredOperations') is distinct from 'array' then raise exception 'Invalid bootstrap provenance' using errcode='22023'; end if;
    d:=p_envelope->'data'; perform atlas_private.validate_data(d,owner_id,2);
    foreach t in array array['accounts','categories','events','settlements','postings'] loop count_rows:=count_rows+jsonb_array_length(d->t); end loop;
    if count_rows>5000 then raise exception 'Bootstrap row limit; nothing changed' using errcode='22023'; end if;
    for o in select value from jsonb_array_elements(p_envelope->'coveredOperations') loop
      perform atlas_private.validate_operation(o,owner_id);
      if o->>'id'=op_id::text or seen_ops ? (o->>'id') then raise exception 'Duplicate covered operation' using errcode='22023'; end if;
      seen_ops:=seen_ops||jsonb_build_object(o->>'id',true);
      foreach t in array array['accounts','categories','events','settlements','postings'] loop
        for r in select value from jsonb_array_elements(coalesce(o->'payload'->t,'[]')) loop
          key:=t||':'||(r->>'id');
          if seen ? key or not exists(select 1 from jsonb_array_elements(d->t) v where v=r) then raise exception 'Covered operation diverges from snapshot' using errcode='22023'; end if;
          seen:=seen||jsonb_build_object(key,true);
        end loop;
      end loop;
      if exists(select 1 from jsonb_array_elements(d->'settlements') s where exists(select 1 from jsonb_array_elements(coalesce(o->'payload'->'events','[]')) e where e->>'id'=s->>'eventId') and not exists(select 1 from jsonb_array_elements(coalesce(o->'payload'->'settlements','[]')) v where v=s))
        or exists(select 1 from jsonb_array_elements(d->'postings') p where exists(select 1 from jsonb_array_elements(coalesce(o->'payload'->'settlements','[]')) s where s->>'id'=p->>'settlementId') and not exists(select 1 from jsonb_array_elements(coalesce(o->'payload'->'postings','[]')) v where v=p)) then raise exception 'Incomplete covered aggregate' using errcode='22023'; end if;
      covered:=covered||jsonb_build_array(jsonb_build_object('id',o->>'id','digest',atlas_private.json_digest(o)));
      insert into atlas_private.incorporated_operations values(owner_id,(o->>'id')::uuid,op_id,atlas_private.json_digest(o));
    end loop;
  else
    if p_envelope ?| array['source','data','coveredOperations'] then raise exception 'Unsupported command fields' using errcode='22023'; end if;
    o:=p_envelope->'operation'; perform atlas_private.validate_operation(o,owner_id);
    if o->>'id'<>op_id::text or o->>'kind' is distinct from kind then raise exception 'Command identity mismatch' using errcode='22023'; end if;
    d:=o->'payload';
  end if;
  perform atlas_private.insert_data(d,owner_id);
  head:=head+1;
  result:=jsonb_build_object('protocolVersion',1,'userId',owner_id::text,'operationId',op_id::text,'revision',head::text,'digest',hash,'coveredOperations',covered);
  insert into atlas_private.operation_receipts values(owner_id,op_id,1,hash,head,result);
  insert into atlas_private.sync_batches values(owner_id,head,op_id,p_envelope,result);
  update atlas_private.sync_heads set revision=head where user_id=owner_id;
  return result;
end $$;

create function api.i3_pull(p_after text, p_through text default null, p_limit integer default 10) returns jsonb
language plpgsql security invoker set search_path=pg_catalog as $$
declare owner_id uuid:=auth.uid(); head bigint; after_revision bigint; through_revision bigint; cursor_revision bigint; batches jsonb:='[]'; item jsonb; b record; used_bytes integer:=0;
begin
  if owner_id is null or not exists(select 1 from atlas_security.app_access where user_id=owner_id and active) then raise exception 'Access denied' using errcode='42501'; end if;
  if coalesce(p_after,'') !~ '^(0|[1-9][0-9]{0,18})$' or (p_through is not null and p_through !~ '^(0|[1-9][0-9]{0,18})$') or p_limit is null or p_limit not between 1 and 20 then raise exception 'Invalid page bounds' using errcode='22023'; end if;
  select coalesce((select revision from atlas_private.sync_heads where user_id=owner_id),0) into head;
  after_revision:=p_after::bigint; through_revision:=coalesce(p_through::bigint,head); cursor_revision:=after_revision;
  if after_revision>through_revision or through_revision>head then raise exception 'Unknown/future cursor' using errcode='22023'; end if;
  for b in select * from atlas_private.sync_batches where user_id=owner_id and revision>after_revision and revision<=through_revision order by revision limit p_limit loop
    item:=jsonb_build_object('revision',b.revision::text,'envelope',b.envelope,'receipt',b.receipt);
    if used_bytes+octet_length(item::text)>4194304 and jsonb_array_length(batches)>0 then exit; end if;
    batches:=batches||jsonb_build_array(item); cursor_revision:=b.revision; used_bytes:=used_bytes+octet_length(item::text);
  end loop;
  if cursor_revision<through_revision and jsonb_array_length(batches)=0 then raise exception 'Feed gap' using errcode='23514'; end if;
  return jsonb_build_object('protocolVersion',1,'userId',owner_id::text,'after',p_after,'through',through_revision::text,'cursor',cursor_revision::text,'batches',batches);
end $$;

-- Commit proof: receipt, immutable batch and head must agree, including its server digest.
create function atlas_private.check_protocol_commit() returns trigger
language plpgsql security invoker set search_path=pg_catalog as $$
declare owner_id uuid:=new.user_id; head bigint;
begin
  select revision into head from atlas_private.sync_heads where user_id=owner_id;
  if head is null or head<>(select coalesce(max(revision),0) from atlas_private.operation_receipts where user_id=owner_id)
    or exists(select 1 from atlas_private.operation_receipts r left join atlas_private.sync_batches b on b.user_id=r.user_id and b.operation_id=r.operation_id
      where r.user_id=owner_id and (b.operation_id is null or b.revision<>r.revision or b.receipt<>r.result or atlas_private.json_digest(b.envelope)<>r.payload_digest
        or b.envelope->>'userId'<>owner_id::text or b.envelope->>'operationId'<>r.operation_id::text
        or r.result is distinct from jsonb_build_object('protocolVersion',1,'userId',owner_id::text,'operationId',r.operation_id::text,'revision',r.revision::text,'digest',r.payload_digest,'coveredOperations',
          coalesce((select jsonb_agg(jsonb_build_object('id',o->>'id','digest',atlas_private.json_digest(o)) order by ord) from jsonb_array_elements(coalesce(b.envelope->'coveredOperations','[]')) with ordinality as covered(o,ord)),'[]'))
        or (r.revision>1 and not exists(select 1 from atlas_private.operation_receipts prior where prior.user_id=owner_id and prior.revision=r.revision-1)))) then
    raise exception 'Incomplete or forged protocol commit' using errcode='23514';
  end if;
  return null;
end $$;
create constraint trigger protocol_commit after insert on atlas_private.operation_receipts deferrable initially deferred for each row execute function atlas_private.check_protocol_commit();
create constraint trigger protocol_commit after insert on atlas_private.sync_batches deferrable initially deferred for each row execute function atlas_private.check_protocol_commit();
create constraint trigger protocol_commit after insert or update on atlas_private.sync_heads deferrable initially deferred for each row execute function atlas_private.check_protocol_commit();

create function atlas_private.require_batch_coverage() returns trigger
language plpgsql security invoker set search_path=pg_catalog as $$
declare t text:=case when tg_table_name='financial_events' then 'events' else tg_table_name end; found_record boolean; wire jsonb;
begin
  wire:=jsonb_build_object('id',new.id::text,'userId',new.user_id::text);
  case t
    when 'accounts' then wire:=wire||jsonb_build_object('name',new.name,'kind',new.kind,'availability',new.availability);
    when 'categories' then wire:=wire||jsonb_strip_nulls(jsonb_build_object('name',new.name,'kind',new.kind,'parentId',new.parent_id::text));
    when 'events' then wire:=wire||jsonb_strip_nulls(jsonb_build_object('kind',new.kind,'status',new.status,'source',new.source,'certainty',new.certainty,'amountCents',new.amount_cents::text,
      'accountId',new.account_id::text,'transferAccountId',new.transfer_account_id::text,'categoryId',new.category_id::text,'description',new.description,'competenceDate',to_char(new.competence_date,'YYYY-MM-DD'),
      'dueDate',to_char(new.due_date,'YYYY-MM-DD'),'adjustmentDirection',new.adjustment_direction,'reversesEventId',new.reverses_event_id::text,'replacesEventId',new.replaces_event_id::text));
    when 'settlements' then wire:=wire||jsonb_build_object('eventId',new.event_id::text,'amountCents',new.amount_cents::text,'paymentDate',to_char(new.payment_date,'YYYY-MM-DD'),'settlementDate',to_char(new.settlement_date,'YYYY-MM-DD'));
    when 'postings' then wire:=wire||jsonb_build_object('settlementId',new.settlement_id::text,'accountId',new.account_id::text,'amountCents',new.amount_cents::text);
  end case;
  -- Every inserted financial row must be included in an immutable batch of this owner.
  select exists(select 1 from atlas_private.sync_batches b,
      lateral jsonb_array_elements(coalesce(case when b.envelope->>'kind'='bootstrap' then b.envelope->'data'->t else b.envelope->'operation'->'payload'->t end,'[]')) r
    where b.user_id=new.user_id and r=wire) into found_record;
  if not found_record then raise exception 'Financial row without committed batch' using errcode='23514'; end if;
  return null;
end $$;
do $coverage$
declare t text;
begin
  foreach t in array array['accounts','categories','financial_events','settlements','postings'] loop
    execute format('create constraint trigger batch_coverage after insert on atlas_private.%I deferrable initially deferred for each row execute function atlas_private.require_batch_coverage()',t);
  end loop;
end $coverage$;

create function atlas_private.check_incorporated_operation() returns trigger
language plpgsql security invoker set search_path=pg_catalog as $$
begin
  if not exists(select 1 from atlas_private.sync_batches b,
    lateral jsonb_array_elements(coalesce(b.envelope->'coveredOperations','[]')) o
    where b.user_id=new.user_id and b.operation_id=new.bootstrap_id and b.envelope->>'kind'='bootstrap'
      and o->>'id'=new.operation_id::text and atlas_private.json_digest(o)=new.operation_digest) then
    raise exception 'Forged incorporated operation' using errcode='23514';
  end if;
  return null;
end $$;
create constraint trigger incorporated_commit after insert on atlas_private.incorporated_operations deferrable initially deferred for each row execute function atlas_private.check_incorporated_operation();

-- Protocol implemented locally, but keep integration/pilot disabled until actual gateway/Auth tests.
create or replace function api.i3_readiness() returns jsonb
language plpgsql security invoker set search_path=pg_catalog as $$
begin
  if auth.uid() is null or not exists(select 1 from atlas_security.app_access a where a.user_id=auth.uid() and a.active) then raise exception 'Access denied' using errcode='42501'; end if;
  return jsonb_build_object('protocolVersion',1,'financialWritesEnabled',coalesce((select writes_enabled from atlas_security.integration_control where id),false),'localProtocolAvailable',true);
end $$;
revoke all on all functions in schema api,atlas_private from public,anon,authenticated;
grant execute on function api.i3_readiness(), api.i3_apply(jsonb), api.i3_pull(text,text,integer) to authenticated;
grant execute on function atlas_private.canonical_json(jsonb),atlas_private.json_digest(jsonb),atlas_private.assert_object(jsonb,text[],text[]),atlas_private.validate_data(jsonb,uuid,integer),atlas_private.validate_operation(jsonb,uuid),atlas_private.insert_data(jsonb,uuid) to authenticated;
revoke all on all tables in schema atlas_private from public,anon;
comment on schema api is 'Expose only api. I3 RPCs locally tested; real Auth/API/two-device acceptance still mandatory. Never expose atlas_private or atlas_security.';
commit;
