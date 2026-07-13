-- Table/function grants for the Supabase API roles. Grants and RLS are
-- two separate gates: policies (0001) decide WHICH ROWS a role may see,
-- but the role still needs plain SQL privileges on the table at all.
-- Projects where migrations run without the default-privilege chain end
-- up with policies-but-no-grants, which surfaces as 42501 on every call.

grant usage on schema public to anon, authenticated, service_role;

-- The server-side admin client (service role, bypasses RLS) needs full
-- access everywhere: tutor bootstrap, student-link lookups, webhooks,
-- rate limiting.
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Signed-in tutors (Clerk third-party tokens carry role=authenticated)
-- get row-level access via the RLS policies — but only to the tables the
-- tutor UI actually touches. Deliberately NOT rate_limit_hits: that table
-- is service-role-only by design.
grant select, insert, update, delete on
  tutors, students, slots, tutor_availability, reschedule_requests, lesson_exceptions
to authenticated;

-- Anonymous browsers get nothing: the student magic-link flow never
-- queries the database from the client — it goes through our API routes,
-- which use the service role.

-- SECURITY DEFINER functions had EXECUTE revoked from PUBLIC (0002/0004/
-- 0005), which also stripped it from the API roles that legitimately call
-- them — re-grant to exactly the callers each one is meant for.
grant execute on function check_rate_limit(text, int, int) to service_role;
grant execute on function approve_reschedule_request(uuid) to authenticated, service_role;

-- Future-proofing: objects created by later migrations get the same
-- grants automatically.
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant usage, select on sequences to service_role;
