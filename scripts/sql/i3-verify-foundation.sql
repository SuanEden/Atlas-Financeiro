-- Administrative verification of the initial foundation only.
-- Bind the expected UUID privately in the declaration at execution time.
-- Claims below SIMULATE identities in the hosted database; they are not signed JWTs.
-- No user, financial row, authorization, grant or persistent function is modified.
do $verification$
declare
  expected_user uuid := nullif(current_setting('atlas_i3.expected_user_id', true), '')::uuid;
  original_role text := current_user;
  denied_user uuid := 'a3000000-0000-4000-8000-000000000099';
  identity_id uuid;
  row_count bigint;
  status jsonb;
  table_name text;
  result jsonb := '{}'::jsonb;
begin
  if expected_user is null or expected_user=denied_user then
    raise exception 'Expected private UUID required' using errcode='22023';
  end if;
  if (select count(*) from atlas_security.app_access)<>1 or not exists (
    select 1 from atlas_security.app_access where user_id=expected_user and active
  ) then raise exception 'Unexpected authorization inventory'; end if;
  if to_regclass('atlas_security.integration_control') is not null then
    raise exception 'Foundation-only verification';
  end if;

  perform set_config('request.jwt.claim.sub',expected_user::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',expected_user::text,'role','authenticated')::text,true);
  perform set_config('role','authenticated',true);
  select api.i3_readiness() into status;
  if status is distinct from jsonb_build_object('protocolVersion',1,'financialWritesEnabled',false) then
    raise exception 'Financial writes must remain disabled';
  end if;
  result := result || '{"owner_readiness_disabled":true}';
  select count(*) into row_count from atlas_security.app_access where user_id=expected_user and active;
  if row_count<>1 then raise exception 'Owner cannot see exact authorization'; end if;
  result := result || '{"owner_exact_authorization_visible":true}';

  foreach table_name in array array['accounts','categories','financial_events','settlements','postings','operation_receipts','sync_heads'] loop
    execute format('select count(*) from atlas_private.%I',table_name) into row_count;
    if row_count<>0 then raise exception 'Unexpected financial data'; end if;
  end loop;
  result := result || '{"owner_seven_financial_tables_empty":true}';
  begin
    update atlas_security.app_access set active=true where user_id=expected_user;
    raise exception 'Self-authorization unexpectedly permitted';
  exception when insufficient_privilege then
    result := result || '{"self_authorization_denied":true}';
  end;
  begin
    insert into atlas_private.accounts default values;
    raise exception 'Financial INSERT unexpectedly permitted';
  exception when insufficient_privilege then
    result := result || '{"financial_insert_denied":true}';
  end;
  begin
    update atlas_private.accounts set name=name;
    raise exception 'Financial UPDATE unexpectedly permitted';
  exception when insufficient_privilege then
    result := result || '{"financial_update_denied":true}';
  end;
  begin
    delete from atlas_private.accounts;
    raise exception 'Financial DELETE unexpectedly permitted';
  exception when insufficient_privilege then
    result := result || '{"financial_delete_denied":true}';
  end;

  foreach identity_id in array array[null::uuid,denied_user] loop
    perform set_config('request.jwt.claim.sub',coalesce(identity_id::text,''),true);
    perform set_config('request.jwt.claims',case when identity_id is null then '{}' else jsonb_build_object('sub',identity_id::text,'role','authenticated')::text end,true);
    select count(*) into row_count from atlas_security.app_access;
    if row_count<>0 then raise exception 'Unauthorized identity can see authorization'; end if;
    foreach table_name in array array['accounts','categories','financial_events','settlements','postings','operation_receipts','sync_heads'] loop
      execute format('select count(*) from atlas_private.%I',table_name) into row_count;
      if row_count<>0 then raise exception 'Unauthorized identity can read financial rows'; end if;
    end loop;
    begin
      perform api.i3_readiness();
      raise exception 'Unauthorized readiness unexpectedly permitted';
    exception when insufficient_privilege then
      result := result || jsonb_build_object(case when identity_id is null then 'missing_identity_denied' else 'unauthorized_identity_denied' end,true);
    end;
  end loop;

  perform set_config('role',original_role,true);
  perform set_config('request.jwt.claim.sub','',true);
  perform set_config('request.jwt.claims','{}',true);
  perform set_config('role','anon',true);
  begin
    perform api.i3_readiness();
    raise exception 'Anonymous readiness unexpectedly permitted';
  exception when insufficient_privilege then
    result := result || '{"anonymous_readiness_denied":true}';
  end;
  begin
    perform count(*) from atlas_security.app_access;
    raise exception 'Anonymous authorization read unexpectedly permitted';
  exception when insufficient_privilege then
    result := result || '{"anonymous_authorization_read_denied":true}';
  end;
  begin
    perform count(*) from atlas_private.accounts;
    raise exception 'Anonymous financial read unexpectedly permitted';
  exception when insufficient_privilege then
    result := result || '{"anonymous_financial_read_denied":true}';
  end;
  perform set_config('role',original_role,true);
  -- Only booleans enter the session result; no UUID, email, JWT or financial data.
  perform set_config('atlas_i3.foundation_validation',result::text,false);
end $verification$;
select current_setting('atlas_i3.foundation_validation')::jsonb as verification;
