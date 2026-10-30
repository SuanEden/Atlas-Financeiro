-- PREPARED ONLY. Remote execution requires specific user approval.
-- Run administratively, after ONLY the private_foundation migration.
-- Bind atlas_i3.expected_user_id privately in the SAME transaction/session.
-- Never substitute an email, user_metadata, or a UUID supplied by the frontend.
begin;
lock table auth.users in share mode;
lock table auth.identities in share mode;
lock table atlas_security.app_access in share row exclusive mode;

do $authorization$
declare
  expected_user uuid := nullif(current_setting('atlas_i3.expected_user_id', true), '')::uuid;
begin
  if expected_user is null then
    raise exception 'Expected UUID must be bound privately' using errcode='22023';
  end if;
  if to_regclass('atlas_security.integration_control') is not null then
    raise exception 'Foundation-only procedure; review later backend separately' using errcode='22023';
  end if;
  if (select count(*) from auth.users) <> 1 or not exists (
    select 1 from auth.users where id=expected_user
      and email_confirmed_at is not null and is_anonymous is false
      and last_sign_in_at is null
  ) then
    raise exception 'Pre-registered account inventory changed' using errcode='22023';
  end if;
  if (select count(*) from auth.identities) <> 1 or not exists (
    select 1 from auth.identities where user_id=expected_user and provider='email'
  ) then
    raise exception 'Pre-Google identity inventory changed' using errcode='22023';
  end if;
  if exists (select 1 from atlas_security.app_access where user_id<>expected_user)
     or exists (select 1 from atlas_security.app_access where user_id=expected_user and not active) then
    raise exception 'Existing authorization requires separate review; never reactivate automatically' using errcode='42501';
  end if;

  insert into atlas_security.app_access(user_id,active) values(expected_user,true)
    on conflict(user_id) do nothing;
end $authorization$;
commit;
