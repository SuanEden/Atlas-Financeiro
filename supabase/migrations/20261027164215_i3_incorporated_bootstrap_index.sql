-- Supporting index identified by the hosted performance advisor after I3 protocol
-- installation. Does not change data, RLS, grants, API exposure or the write gate.
begin;
create index incorporated_operations_bootstrap
  on atlas_private.incorporated_operations(user_id,bootstrap_id);
commit;
