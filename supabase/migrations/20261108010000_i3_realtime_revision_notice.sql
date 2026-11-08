-- P04: private, revision-only I3 hint. i3_pull remains authoritative.
-- The Supabase Realtime extension is not available in isolated PGlite tests.
do $atlas_migration$
begin
  if exists (select 1 from pg_catalog.pg_namespace where nspname = 'realtime') then
    execute $atlas_policy$
      create policy "atlas_private_revision_listener"
      on realtime.messages for select to authenticated
      using (
        extension = 'broadcast'
        and (select realtime.topic()) = 'atlas:revision:' || (select auth.uid())::text
      )
    $atlas_policy$;

    execute $atlas_function$
      create function atlas_private.notify_i3_revision()
      returns trigger
      language plpgsql
      security definer
      set search_path = ''
      as $atlas_body$
      begin
        perform realtime.send(
          payload => pg_catalog.jsonb_build_object('revision', new.revision::text),
          event => 'revision_changed',
          topic => 'atlas:revision:' || new.user_id::text,
          private => true
        );
        return new;
      end
      $atlas_body$
    $atlas_function$;

    revoke all on function atlas_private.notify_i3_revision() from public, anon, authenticated;
    execute $atlas_trigger$
      create trigger notify_i3_revision_after_receipt
      after insert on atlas_private.operation_receipts
      for each row execute function atlas_private.notify_i3_revision()
    $atlas_trigger$;
  end if;
end;
$atlas_migration$;
