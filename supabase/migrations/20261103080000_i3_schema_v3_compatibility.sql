-- I3 schema v3 compatibility — preparatory only; never turns on financial writes.
-- Existing owner/data/protocol receipts are unchanged. All operations are append-only.
begin;
alter table atlas_private.financial_events
  add column recurrence_json text,
  add column recurrence_rule_id uuid,
  add column recurrence_month text,
  add constraint recurrence_pair check ((recurrence_rule_id is null) = (recurrence_month is null)),
  add constraint recurrence_month_format check (recurrence_month is null or recurrence_month ~ '^2[0-9]{3}-(0[1-9]|1[0-2])$'),
  add constraint recurrence_json_object check (recurrence_json is null or (length(recurrence_json)<=5000 and recurrence_json is json object)),
  add constraint recurrence_rule_reference foreign key(user_id,recurrence_rule_id)
    references atlas_private.financial_events(user_id,id) deferrable initially deferred;
create table atlas_private.account_reconciliations (
 user_id uuid not null references auth.users(id) on delete restrict,
 id uuid not null, account_id uuid not null,
 balance_cents bigint not null check (balance_cents between -99999999999 and 99999999999),
 reference_date date not null,
 source_description text not null check (length(btrim(source_description))>0 and length(source_description)<=500),
 certainty text not null check (certainty in ('confirmed','estimated')),
 event_id uuid,
 replaces_reconciliation_id uuid,
 primary key(user_id,id),
 foreign key(user_id,account_id) references atlas_private.accounts(user_id,id),
 foreign key(user_id,event_id) references atlas_private.financial_events(user_id,id) deferrable initially deferred,
 foreign key(user_id,replaces_reconciliation_id) references atlas_private.account_reconciliations(user_id,id) deferrable initially deferred,
 unique(user_id,replaces_reconciliation_id),
 check (replaces_reconciliation_id is null or replaces_reconciliation_id<>id)
);
create index account_reconciliations_account on atlas_private.account_reconciliations(user_id,account_id);
alter table atlas_private.account_reconciliations enable row level security;
create policy active_owner_read on atlas_private.account_reconciliations for select to authenticated
  using(user_id=(select auth.uid()) and exists(select 1 from atlas_security.app_access where user_id=(select auth.uid()) and active));
create policy active_owner_insert on atlas_private.account_reconciliations for insert to authenticated
  with check(user_id=(select auth.uid()) and exists(select 1 from atlas_security.app_access where user_id=(select auth.uid()) and active));
grant select,insert on atlas_private.account_reconciliations to authenticated;
create trigger immutable_record before update or delete on atlas_private.account_reconciliations
  for each row execute function atlas_private.reject_ledger_mutation();
-- Runtime inserts never bypass validation or the existing owner's batch proof.
create or replace function atlas_private.validate_data(d jsonb, owner_id uuid, financial_schema integer) returns void
language plpgsql security invoker set search_path=pg_catalog as $$
declare t text; r jsonb; k text; val jsonb; allowed text[]; required text[];
begin
  perform atlas_private.assert_object(d,array['schemaVersion','userId','accounts','categories','events','settlements','postings','accountReconciliations'],array['schemaVersion','userId']);
  if d->'schemaVersion' is distinct from to_jsonb(financial_schema) or d->>'userId' is distinct from owner_id::text then raise exception 'Wrong schema or owner' using errcode='22023'; end if;
  foreach t in array array['accounts','categories','events','settlements','postings','accountReconciliations'] loop
    if d ? t and jsonb_typeof(d->t) is distinct from 'array' then raise exception 'Invalid collection' using errcode='22023'; end if;
    if financial_schema in (2,3) and not d ? t and (t<>'accountReconciliations' or financial_schema=3) then raise exception 'Incomplete snapshot' using errcode='22023'; end if;
    case t
      when 'accounts' then allowed:=array['id','userId','name','kind','availability']; required:=allowed;
      when 'categories' then allowed:=array['id','userId','name','kind','parentId']; required:=array['id','userId','name','kind'];
      when 'events' then allowed:=array['id','userId','kind','status','source','certainty','amountCents','accountId','transferAccountId','categoryId','description','competenceDate','dueDate','adjustmentDirection','reversesEventId','replacesEventId','recurrenceJson','recurrenceRuleId','recurrenceMonth']; required:=array['id','userId','kind','status','source','certainty','amountCents','accountId','description','competenceDate'];
      when 'settlements' then allowed:=array['id','userId','eventId','amountCents','paymentDate','settlementDate']; required:=allowed;
      when 'postings' then allowed:=array['id','userId','settlementId','accountId','amountCents']; required:=allowed;
      when 'accountReconciliations' then allowed:=array['id','userId','accountId','balanceCents','referenceDate','sourceDescription','certainty','eventId','replacesReconciliationId']; required:=array['id','userId','accountId','balanceCents','referenceDate','sourceDescription','certainty'];
    end case;
    for r in select value from jsonb_array_elements(coalesce(d->t,'[]')) loop
      perform atlas_private.assert_object(r,allowed,required);
      if r->>'userId' is distinct from owner_id::text then raise exception 'Foreign owner' using errcode='42501'; end if;
      for k,val in select key,value from jsonb_each(r) loop
        if jsonb_typeof(val) is distinct from 'string' then raise exception 'Financial fields must be strings' using errcode='22023'; end if;
        if (k='id' or right(k,2)='Id') and (val#>>'{}') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'Noncanonical UUID' using errcode='22023'; end if;
        if k='balanceCents' and (val#>>'{}') !~ '^(0|-?[1-9][0-9]{0,10})$' then raise exception 'Noncanonical balance cents' using errcode='22023'; end if;
        if k='amountCents' and (val#>>'{}') !~ '^-?[1-9][0-9]{0,10}$' then raise exception 'Noncanonical cents' using errcode='22023'; end if;
        if k='recurrenceMonth' and (val#>>'{}') !~ '^2[0-9]{3}-(0[1-9]|1[0-2])$' then raise exception 'Invalid recurrence month' using errcode='22023'; end if;
        if k='recurrenceJson' and (length(val#>>'{}') > 5000 or not ((val#>>'{}') is json object)) then raise exception 'Invalid recurrence rule' using errcode='22023'; end if;
        if right(k,4)='Date' then
          if (val#>>'{}') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or to_char((val#>>'{}')::date,'YYYY-MM-DD')<>(val#>>'{}') then raise exception 'Noncanonical date' using errcode='22023'; end if;
        end if;
      end loop;
    end loop;
  end loop;
end $$;
create or replace function atlas_private.validate_operation(o jsonb, owner_id uuid) returns void
language plpgsql security invoker set search_path=pg_catalog as $$
declare p jsonb; a integer; c integer; e integer; s integer; n integer; rec integer; kind text;
begin
  perform atlas_private.assert_object(o,array['id','userId','kind','createdAt','payload'],array['id','userId','kind','createdAt','payload']);
  if o->>'userId' is distinct from owner_id::text or coalesce(o->>'id','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    or jsonb_typeof(o->'id') is distinct from 'string' then raise exception 'Invalid operation owner/id' using errcode='22023'; end if;
  if jsonb_typeof(o->'createdAt') is distinct from 'string' or coalesce(o->>'createdAt','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{3})?Z$'
    or to_char((o->>'createdAt')::timestamptz at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')<>replace(case when position('.' in o->>'createdAt')=0 then replace(o->>'createdAt','Z','.000Z') else o->>'createdAt' end,' ','') then raise exception 'Invalid operation instant' using errcode='22023'; end if;
  p:=o->'payload'; kind:=o->>'kind';
  perform atlas_private.validate_data(p,owner_id,1);
  a:=jsonb_array_length(coalesce(p->'accounts','[]')); c:=jsonb_array_length(coalesce(p->'categories','[]'));
  e:=jsonb_array_length(coalesce(p->'events','[]')); s:=jsonb_array_length(coalesce(p->'settlements','[]')); n:=jsonb_array_length(coalesce(p->'postings','[]')); rec:=jsonb_array_length(coalesce(p->'accountReconciliations','[]'));
  if kind='create_account' then
    if a<>1 or c<>0 or rec>1 or e>1 or (e=0 and (s<>0 or n<>0)) or exists(select 1 from jsonb_array_elements(coalesce(p->'events','[]')) r where r->>'source'<>'opening_balance' or r->>'accountId'<>p->'accounts'->0->>'id') then raise exception 'Invalid create_account shape' using errcode='22023'; end if;
    if rec=1 and (p->'accountReconciliations'->0->>'accountId' <> p->'accounts'->0->>'id' or (e=1 and p->'accountReconciliations'->0->>'eventId' is distinct from p->'events'->0->>'id')) then raise exception 'Wrong opening reconciliation' using errcode='22023'; end if;
  elsif kind='create_category' then
    if c<>1 or a<>0 or e<>0 or s<>0 or n<>0 or rec<>0 then raise exception 'Invalid create_category shape' using errcode='22023'; end if;
  elsif kind='reconcile_account' then
    if a<>0 or c<>0 or rec<>1 or e>1 or (e=0 and (s<>0 or n<>0)) or (e=1 and (p->'events'->0->>'source'<>'opening_balance' or p->'events'->0->>'kind'<>'adjustment' or p->'events'->0->>'accountId' is distinct from p->'accountReconciliations'->0->>'accountId' or p->'accountReconciliations'->0->>'eventId' is distinct from p->'events'->0->>'id')) then raise exception 'Invalid reconcile_account shape' using errcode='22023'; end if;
  elsif kind in ('record_event','reverse_event','replace_event') then
    if a<>0 or c<>0 or rec<>0 then raise exception 'Unexpected metadata in event command' using errcode='22023'; end if;
    if kind='record_event' and (e<>1 or exists(select 1 from jsonb_array_elements(coalesce(p->'events','[]')) r where r ? 'reversesEventId' or r ? 'replacesEventId' or r->>'source' not in ('manual','import'))) then raise exception 'Invalid record_event shape' using errcode='22023'; end if;
    if kind='reverse_event' and (e<>1 or not exists(select 1 from jsonb_array_elements(coalesce(p->'events','[]')) r where r ? 'reversesEventId' or (r->>'status'='cancelled' and r ? 'replacesEventId'))) then raise exception 'Invalid reverse_event shape' using errcode='22023'; end if;
    if kind='replace_event' and (e not between 1 and 2 or (select count(*) from jsonb_array_elements(coalesce(p->'events','[]')) r where r ? 'replacesEventId')<>1 or exists(select 1 from jsonb_array_elements(coalesce(p->'events','[]')) r where not r ? 'replacesEventId' and not r ? 'reversesEventId')) then raise exception 'Invalid replace_event shape' using errcode='22023'; end if;
  else raise exception 'Unsupported operation kind' using errcode='22023'; end if;
  if rec>0 and kind not in ('create_account','reconcile_account') then raise exception 'Unexpected account reconciliation' using errcode='22023'; end if;
  if exists(select 1 from jsonb_array_elements(coalesce(p->'settlements','[]')) r where not exists(select 1 from jsonb_array_elements(coalesce(p->'events','[]')) v where v->>'id'=r->>'eventId'))
    or exists(select 1 from jsonb_array_elements(coalesce(p->'postings','[]')) r where not exists(select 1 from jsonb_array_elements(coalesce(p->'settlements','[]')) v where v->>'id'=r->>'settlementId')) then raise exception 'Command splits a financial aggregate' using errcode='22023'; end if;
end $$;
create or replace function atlas_private.insert_data(d jsonb, owner_id uuid) returns void
language plpgsql security invoker set search_path=pg_catalog as $$
begin
  insert into atlas_private.accounts select owner_id,(r->>'id')::uuid,r->>'name',r->>'kind',r->>'availability' from jsonb_array_elements(coalesce(d->'accounts','[]')) r;
  insert into atlas_private.categories select owner_id,(r->>'id')::uuid,r->>'name',r->>'kind',(r->>'parentId')::uuid from jsonb_array_elements(coalesce(d->'categories','[]')) r;
  insert into atlas_private.financial_events (user_id,id,kind,status,certainty,source,amount_cents,account_id,transfer_account_id,category_id,description,competence_date,due_date,adjustment_direction,reverses_event_id,replaces_event_id,recurrence_json,recurrence_rule_id,recurrence_month) select owner_id,(r->>'id')::uuid,r->>'kind',r->>'status',r->>'certainty',r->>'source',(r->>'amountCents')::bigint,
    (r->>'accountId')::uuid,(r->>'transferAccountId')::uuid,(r->>'categoryId')::uuid,r->>'description',(r->>'competenceDate')::date,(r->>'dueDate')::date,
    r->>'adjustmentDirection',(r->>'reversesEventId')::uuid,(r->>'replacesEventId')::uuid,r->>'recurrenceJson',(r->>'recurrenceRuleId')::uuid,r->>'recurrenceMonth' from jsonb_array_elements(coalesce(d->'events','[]')) r;
  insert into atlas_private.settlements select owner_id,(r->>'id')::uuid,(r->>'eventId')::uuid,(r->>'amountCents')::bigint,(r->>'paymentDate')::date,(r->>'settlementDate')::date from jsonb_array_elements(coalesce(d->'settlements','[]')) r;
  insert into atlas_private.postings select owner_id,(r->>'id')::uuid,(r->>'settlementId')::uuid,(r->>'accountId')::uuid,(r->>'amountCents')::bigint from jsonb_array_elements(coalesce(d->'postings','[]')) r;
  insert into atlas_private.account_reconciliations (user_id,id,account_id,balance_cents,reference_date,source_description,certainty,event_id,replaces_reconciliation_id)
    select owner_id,(r->>'id')::uuid,(r->>'accountId')::uuid,(r->>'balanceCents')::bigint,(r->>'referenceDate')::date,r->>'sourceDescription',r->>'certainty',(r->>'eventId')::uuid,(r->>'replacesReconciliationId')::uuid from jsonb_array_elements(coalesce(d->'accountReconciliations','[]')) r;
end $;
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
    d:=p_envelope->'data'; perform atlas_private.validate_data(d,owner_id,(d->>'schemaVersion')::integer);
    foreach t in array array['accounts','categories','events','settlements','postings','accountReconciliations'] loop count_rows:=count_rows+jsonb_array_length(d->t); end loop;
    if count_rows>5000 then raise exception 'Bootstrap row limit; nothing changed' using errcode='22023'; end if;
    for o in select value from jsonb_array_elements(p_envelope->'coveredOperations') loop
      perform atlas_private.validate_operation(o,owner_id);
      if o->>'id'=op_id::text or seen_ops ? (o->>'id') then raise exception 'Duplicate covered operation' using errcode='22023'; end if;
      seen_ops:=seen_ops||jsonb_build_object(o->>'id',true);
      foreach t in array array['accounts','categories','events','settlements','postings','accountReconciliations'] loop
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
  if kind='bootstrap' and (d->>'schemaVersion')::integer not in (2,3) then raise exception 'Unsupported snapshot version' using errcode='22023'; end if;
  perform atlas_private.insert_data(d,owner_id);
  head:=head+1;
  result:=jsonb_build_object('protocolVersion',1,'userId',owner_id::text,'operationId',op_id::text,'revision',head::text,'digest',hash,'coveredOperations',covered);
  insert into atlas_private.operation_receipts values(owner_id,op_id,1,hash,head,result);
  insert into atlas_private.sync_batches values(owner_id,head,op_id,p_envelope,result);
  update atlas_private.sync_heads set revision=head where user_id=owner_id;
  return result;
end $$;
create or replace function atlas_private.require_batch_coverage() returns trigger
language plpgsql security invoker set search_path=pg_catalog as $$
declare t text:=case when tg_table_name='financial_events' then 'events' when tg_table_name='account_reconciliations' then 'accountReconciliations' else tg_table_name end; found_record boolean; wire jsonb;
begin
  wire:=jsonb_build_object('id',new.id::text,'userId',new.user_id::text);
  case t
    when 'accounts' then wire:=wire||jsonb_build_object('name',new.name,'kind',new.kind,'availability',new.availability);
    when 'categories' then wire:=wire||jsonb_strip_nulls(jsonb_build_object('name',new.name,'kind',new.kind,'parentId',new.parent_id::text));
    when 'events' then wire:=wire||jsonb_strip_nulls(jsonb_build_object('kind',new.kind,'status',new.status,'source',new.source,'certainty',new.certainty,'amountCents',new.amount_cents::text,
      'accountId',new.account_id::text,'transferAccountId',new.transfer_account_id::text,'categoryId',new.category_id::text,'description',new.description,'competenceDate',to_char(new.competence_date,'YYYY-MM-DD'),
      'dueDate',to_char(new.due_date,'YYYY-MM-DD'),'adjustmentDirection',new.adjustment_direction,'reversesEventId',new.reverses_event_id::text,'replacesEventId',new.replaces_event_id::text,'recurrenceJson',new.recurrence_json,'recurrenceRuleId',new.recurrence_rule_id::text,'recurrenceMonth',new.recurrence_month));
    when 'settlements' then wire:=wire||jsonb_build_object('eventId',new.event_id::text,'amountCents',new.amount_cents::text,'paymentDate',to_char(new.payment_date,'YYYY-MM-DD'),'settlementDate',to_char(new.settlement_date,'YYYY-MM-DD'));
    when 'accountReconciliations' then wire:=wire||jsonb_strip_nulls(jsonb_build_object('accountId',new.account_id::text,'balanceCents',new.balance_cents::text,'referenceDate',to_char(new.reference_date,'YYYY-MM-DD'),'sourceDescription',new.source_description,'certainty',new.certainty,'eventId',new.event_id::text,'replacesReconciliationId',new.replaces_reconciliation_id::text));
    when 'postings' then wire:=wire||jsonb_build_object('settlementId',new.settlement_id::text,'accountId',new.account_id::text,'amountCents',new.amount_cents::text);
  end case;
  -- Every inserted financial row must be included in an immutable batch of this owner.
  select exists(select 1 from atlas_private.sync_batches b,
      lateral jsonb_array_elements(coalesce(case when b.envelope->>'kind'='bootstrap' then b.envelope->'data'->t else b.envelope->'operation'->'payload'->t end,'[]')) r
    where b.user_id=new.user_id and r=wire) into found_record;
  if not found_record then raise exception 'Financial row without committed batch' using errcode='23514'; end if;
  return null;
end $$;
create constraint trigger batch_coverage after insert on atlas_private.account_reconciliations
  deferrable initially deferred for each row execute function atlas_private.require_batch_coverage();
-- New recurrences/reconciliations must not change historical immutable receipts.
-- All deployed functions remain SECURITY INVOKER and schemas remain private.
create or replace function api.i3_readiness() returns jsonb
language plpgsql security invoker set search_path=pg_catalog as $$
begin
  if auth.uid() is null or not exists(select 1 from atlas_security.app_access a where a.user_id=auth.uid() and a.active) then
    raise exception 'Access denied' using errcode='42501';
  end if;
  return jsonb_build_object('protocolVersion',1,'financialSchemaVersion',3,
    'financialWritesEnabled',coalesce((select writes_enabled from atlas_security.integration_control where id),false),'localProtocolAvailable',true);
end $$;
-- Preserve original function execution grants: CREATE OR REPLACE keeps privileges.
-- The financial writes switch stays FALSE until a separately approved pilot.
commit;
