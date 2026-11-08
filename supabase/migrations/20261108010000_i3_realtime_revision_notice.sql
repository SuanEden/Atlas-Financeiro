-- P04: private, revision-only notification after a committed I3 write.
-- The realtime message is a hint; i3_pull remains the authoritative ledger.
-- Do not expose financial records in Broadcast payloads.
create policy "atlas_private_revision_listener"
on realtime.messages
for select to authenticated
using (
  extension = 'broadcast'
  and (select realtime.topic()) = 'atlas:revision:' || (select auth.uid())::text
);

create function atlas_private.notify_i3_revision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform realtime.send(
    payload => pg_catalog.jsonb_build_object('revision', new.revision::text),
    event => 'revision_changed',
    topic => 'atlas:revision:' || new.user_id::text,
    private => true
  );
  return new;
end;
$$;

revoke all on function atlas_private.notify_i3_revision() from public, anon, authenticated;

create trigger notify_i3_revision_after_receipt
after insert on atlas_private.operation_receipts
for each row execute function atlas_private.notify_i3_revision();
