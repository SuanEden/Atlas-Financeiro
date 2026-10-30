-- Administrative read/denial checks. No financial seed or control change.
-- Bind the pre-registered UUID privately in the declaration at execution time.
-- Identity claims below are simulated; this is not signed-JWT validation.
do $verification$
declare
  expected_user uuid := nullif(current_setting('atlas_i3.expected_user_id', true), '')::uuid;
  denied_user uuid := 'a3000000-0000-4000-8000-000000000099';
  previous_role text := current_user;
  identity_id uuid;
  table_name text;
  row_count bigint;
  value jsonb;
  payload jsonb;
  operation_id uuid := gen_random_uuid();
  result jsonb := '{}'::jsonb;
  prefix text;
begin
  if expected_user is null or expected_user=denied_user then raise exception 'Expected private UUID required'; end if;
  if (select count(*) from auth.users)<>1 or not exists(select 1 from auth.users where id=expected_user)
    or (select count(*) from atlas_security.app_access)<>1
    or not exists(select 1 from atlas_security.app_access where user_id=expected_user and active) then
    raise exception 'Account/authorization inventory changed';
  end if;
  if (select count(*) from atlas_security.integration_control)<>1
    or not exists(select 1 from atlas_security.integration_control where id and not writes_enabled) then
    raise exception 'Financial gate must remain disabled';
  end if;
  foreach table_name in array array['accounts','categories','financial_events','settlements','postings','operation_receipts','sync_heads','sync_batches','incorporated_operations'] loop
    execute format('select count(*) from atlas_private.%I',table_name) into row_count;
    if row_count<>0 then raise exception 'Unexpected financial rows'; end if;
  end loop;
  payload:=jsonb_build_object('protocolVersion',1,'operationId',operation_id,'userId',expected_user,'baseRevision','0','kind','create_account',
    'operation',jsonb_build_object('id',operation_id,'userId',expected_user,'kind','create_account','createdAt','2026-10-27T12:00:00.000Z',
      'payload',jsonb_build_object('schemaVersion',1,'userId',expected_user,'accounts',jsonb_build_array(jsonb_build_object(
        'id',gen_random_uuid(),'userId',expected_user,'name','Synthetic denial probe','kind','cash','availability','free')))));

  perform set_config('request.jwt.claim.sub',expected_user::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',expected_user::text,'role','authenticated')::text,true);
  perform set_config('role','authenticated',true);
  select api.i3_readiness() into value;
  if value is distinct from jsonb_build_object('protocolVersion',1,'financialWritesEnabled',false,'localProtocolAvailable',true) then
    raise exception 'Unexpected readiness';
  end if;
  result:=result||'{"owner_readiness_disabled":true}';
  select api.i3_pull('0',null,10) into value;
  if value is distinct from jsonb_build_object('protocolVersion',1,'userId',expected_user::text,'after','0','through','0','cursor','0','batches','[]'::jsonb) then
    raise exception 'Unexpected empty feed';
  end if;
  result:=result||'{"owner_pull_empty":true}';
  begin
    perform api.i3_apply(payload);
    raise exception 'Financial apply unexpectedly succeeded';
  exception when insufficient_privilege then
    if sqlerrm<>'REMOTE_WRITES_DISABLED' then raise; end if;
    result:=result||'{"owner_apply_blocked_by_gate":true}';
  end;
  begin
    update atlas_security.integration_control set writes_enabled=true where id;
    raise exception 'Client enabled financial gate';
  exception when insufficient_privilege then result:=result||'{"client_cannot_enable_writes":true}'; end;
  begin
    update atlas_security.app_access set active=true where user_id=expected_user;
    raise exception 'Client changed authorization';
  exception when insufficient_privilege then result:=result||'{"client_cannot_change_authorization":true}'; end;
  begin
    perform api.i3_pull('-1',null,10);
    raise exception 'Invalid cursor accepted';
  exception when invalid_parameter_value then result:=result||'{"invalid_cursor_rejected":true}'; end;
  begin
    perform api.i3_pull('1',null,10);
    raise exception 'Future cursor accepted';
  exception when invalid_parameter_value then result:=result||'{"future_cursor_rejected":true}'; end;

  foreach identity_id in array array[null::uuid,denied_user] loop
    prefix:=case when identity_id is null then 'missing_identity_' else 'unauthorized_identity_' end;
    perform set_config('request.jwt.claim.sub',coalesce(identity_id::text,''),true);
    perform set_config('request.jwt.claims',case when identity_id is null then '{}' else jsonb_build_object('sub',identity_id::text,'role','authenticated')::text end,true);
    select count(*) into row_count from atlas_security.app_access;
    if row_count<>0 then raise exception 'Unauthorized authorization read'; end if;
    result:=result||jsonb_build_object(prefix||'authorization_hidden',true);
    select count(*) into row_count from atlas_security.integration_control;
    if row_count<>0 then raise exception 'Unauthorized control read'; end if;
    result:=result||jsonb_build_object(prefix||'control_hidden',true);
    begin
      perform api.i3_readiness(); raise exception 'Unauthorized readiness succeeded';
    exception when insufficient_privilege then result:=result||jsonb_build_object(prefix||'readiness_denied',true); end;
    begin
      perform api.i3_pull('0',null,10); raise exception 'Unauthorized pull succeeded';
    exception when insufficient_privilege then result:=result||jsonb_build_object(prefix||'pull_denied',true); end;
    begin
      perform api.i3_apply(payload); raise exception 'Unauthorized apply succeeded';
    exception when insufficient_privilege then result:=result||jsonb_build_object(prefix||'apply_denied',true); end;
  end loop;

  perform set_config('role',previous_role,true);
  perform set_config('request.jwt.claim.sub','',true);
  perform set_config('request.jwt.claims','{}',true);
  perform set_config('role','anon',true);
  begin
    perform api.i3_readiness(); raise exception 'Anonymous readiness succeeded';
  exception when insufficient_privilege then result:=result||'{"anonymous_readiness_denied":true}'; end;
  begin
    perform api.i3_pull('0',null,10); raise exception 'Anonymous pull succeeded';
  exception when insufficient_privilege then result:=result||'{"anonymous_pull_denied":true}'; end;
  begin
    perform api.i3_apply(payload); raise exception 'Anonymous apply succeeded';
  exception when insufficient_privilege then result:=result||'{"anonymous_apply_denied":true}'; end;
  begin
    perform count(*) from atlas_security.app_access; raise exception 'Anonymous authorization read succeeded';
  exception when insufficient_privilege then result:=result||'{"anonymous_authorization_read_denied":true}'; end;
  begin
    perform count(*) from atlas_private.accounts; raise exception 'Anonymous financial read succeeded';
  exception when insufficient_privilege then result:=result||'{"anonymous_financial_read_denied":true}'; end;

  perform set_config('role',previous_role,true);
  foreach table_name in array array['accounts','categories','financial_events','settlements','postings','operation_receipts','sync_heads','sync_batches','incorporated_operations'] loop
    execute format('select count(*) from atlas_private.%I',table_name) into row_count;
    if row_count<>0 then raise exception 'Probe changed financial inventory'; end if;
  end loop;
  if exists(select 1 from atlas_security.integration_control where writes_enabled) then raise exception 'Probe changed gate'; end if;
  result:=result||'{"nine_tables_still_empty":true,"gate_still_disabled":true}';
  perform set_config('atlas_i3.disabled_protocol_validation',result::text,false);
end $verification$;
select current_setting('atlas_i3.disabled_protocol_validation')::jsonb as verification;
