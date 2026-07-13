-- Lets integration tests confirm RLS is actually enabled on a table (not
-- just that policies exist) by querying Postgres catalog state directly,
-- rather than trusting the migration SQL source alone.
create or replace function check_table_rls_enabled(p_table_name text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select relrowsecurity
  from pg_class
  where oid = ('public.' || p_table_name)::regclass;
$$;

revoke all on function check_table_rls_enabled(text) from public;
grant execute on function check_table_rls_enabled(text) to service_role;
