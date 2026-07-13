-- Oraki: initial schema
-- RLS is the privacy backbone (see build plan §5). Every table below gets
-- RLS explicitly ENABLED (not just policies written) — a table with
-- policies but RLS disabled silently allows unrestricted access.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- tutors
-- ---------------------------------------------------------------------
create table tutors (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null unique,
  email text not null,
  name text not null,
  -- Public URL handle, e.g. oraki.gr/ger1/... — chosen by the tutor,
  -- editable, validated against a reserved-word list in lib/slugs.ts so it
  -- can never collide with an app route like /dashboard or /api.
  slug text not null unique,
  -- Bearer token for the tutor's phone-calendar subscription feed
  -- (/api/calendar/[token].ics). Same trust model as a student magic
  -- link: plaintext, unguessable via entropy, not a login credential.
  calendar_feed_token text not null unique,
  stripe_customer_id text,
  stripe_subscription_id text,
  billing_grace_period_ends_at timestamptz,
  created_at timestamptz not null default now()
);

alter table tutors enable row level security;

create policy "tutors_select_own"
  on tutors for select
  using (clerk_user_id = auth.jwt()->>'sub');

create policy "tutors_update_own"
  on tutors for update
  using (clerk_user_id = auth.jwt()->>'sub');

-- Insert happens via service-role (server action right after Clerk signup),
-- never directly from an authenticated tutor session.

-- ---------------------------------------------------------------------
-- students
-- ---------------------------------------------------------------------
create table students (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references tutors(id) on delete cascade,
  name text not null,
  subject text not null,
  contact_email text,
  -- Tutor-chosen, human-readable part of the link (e.g. "gerdinos").
  -- Purely cosmetic — kept separately so "regenerate link" can issue a
  -- fresh random suffix while keeping the same label, and so the tutor
  -- can rename it later without that counting as a security-relevant
  -- regenerate.
  magic_link_label text not null,
  -- Public per-student URL segment: magic_link_label plus a random
  -- suffix (see lib/slugs.ts), e.g. "gerdinos-x7fq2k9a2b". Stored in
  -- plaintext deliberately — the tutor needs to see/copy it at any time,
  -- and unlike a pure-random session token, the actual security boundary
  -- here is the suffix's entropy plus the rate limiter on lookups, not
  -- secrecy of a hash. Regenerating replaces this with a fresh suffix.
  magic_link_slug text not null unique,
  active boolean not null default true,
  deactivated_at timestamptz,
  created_at timestamptz not null default now()
);

create index students_tutor_id_idx on students(tutor_id);
create index students_magic_link_slug_idx on students(magic_link_slug);

alter table students enable row level security;

create policy "students_all_own_tutor"
  on students for all
  using (
    tutor_id in (select id from tutors where clerk_user_id = auth.jwt()->>'sub')
  )
  with check (
    tutor_id in (select id from tutors where clerk_user_id = auth.jwt()->>'sub')
  );

-- ---------------------------------------------------------------------
-- slots (confirmed recurring lessons)
-- ---------------------------------------------------------------------
create table slots (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  duration_minutes smallint not null default 60,
  is_recurring boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index slots_student_id_idx on slots(student_id);

alter table slots enable row level security;

create policy "slots_all_own_tutor"
  on slots for all
  using (
    student_id in (
      select s.id from students s
      join tutors t on t.id = s.tutor_id
      where t.clerk_user_id = auth.jwt()->>'sub'
    )
  )
  with check (
    student_id in (
      select s.id from students s
      join tutors t on t.id = s.tutor_id
      where t.clerk_user_id = auth.jwt()->>'sub'
    )
  );

-- ---------------------------------------------------------------------
-- tutor_availability (recurring windows, Phase 2)
-- ---------------------------------------------------------------------
create table tutor_availability (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references tutors(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

create index tutor_availability_tutor_id_idx on tutor_availability(tutor_id);

alter table tutor_availability enable row level security;

create policy "tutor_availability_all_own_tutor"
  on tutor_availability for all
  using (tutor_id in (select id from tutors where clerk_user_id = auth.jwt()->>'sub'))
  with check (tutor_id in (select id from tutors where clerk_user_id = auth.jwt()->>'sub'));

-- ---------------------------------------------------------------------
-- lesson_exceptions: one-time overrides of a recurring slot
-- ---------------------------------------------------------------------
-- A reschedule is a change to ONE occurrence, never the recurring
-- pattern itself — approving a request must never permanently add or
-- mutate a row in `slots`. `original_slot_id` + `original_date` identify
-- exactly which calendar occurrence of a student's recurring lesson is
-- being moved; `new_date`/`new_start_time` is where it moves to. The
-- underlying `slots` row is untouched and keeps recurring normally on
-- every other week.
create table lesson_exceptions (
  id uuid primary key default gen_random_uuid(),
  original_slot_id uuid not null references slots(id) on delete cascade,
  original_date date not null,
  new_date date not null,
  new_start_time time not null,
  new_duration_minutes smallint not null,
  created_at timestamptz not null default now(),
  unique (original_slot_id, original_date)
);

create index lesson_exceptions_original_slot_idx on lesson_exceptions(original_slot_id);
create index lesson_exceptions_new_date_idx on lesson_exceptions(new_date);

alter table lesson_exceptions enable row level security;

create policy "lesson_exceptions_all_own_tutor"
  on lesson_exceptions for all
  using (
    original_slot_id in (
      select sl.id from slots sl
      join students st on st.id = sl.student_id
      join tutors t on t.id = st.tutor_id
      where t.clerk_user_id = auth.jwt()->>'sub'
    )
  )
  with check (
    original_slot_id in (
      select sl.id from slots sl
      join students st on st.id = sl.student_id
      join tutors t on t.id = st.tutor_id
      where t.clerk_user_id = auth.jwt()->>'sub'
    )
  );

-- ---------------------------------------------------------------------
-- reschedule_requests
-- ---------------------------------------------------------------------
-- A request always names WHICH of the student's (possibly several)
-- recurring lessons it's about, and WHICH occurrence of it — never just
-- "a new day/time" in the abstract. Approving one writes a single
-- lesson_exceptions row (see above), not a change to `slots`.
create table reschedule_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  original_slot_id uuid not null references slots(id) on delete cascade,
  original_date date not null,
  new_date date not null,
  new_start_time time not null,
  duration_minutes smallint not null default 60,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  decline_reason text,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create index reschedule_requests_student_id_idx on reschedule_requests(student_id);
create index reschedule_requests_status_idx on reschedule_requests(status);

alter table reschedule_requests enable row level security;

create policy "reschedule_requests_all_own_tutor"
  on reschedule_requests for all
  using (
    student_id in (
      select s.id from students s
      join tutors t on t.id = s.tutor_id
      where t.clerk_user_id = auth.jwt()->>'sub'
    )
  )
  with check (
    student_id in (
      select s.id from students s
      join tutors t on t.id = s.tutor_id
      where t.clerk_user_id = auth.jwt()->>'sub'
    )
  );

-- Student-facing flow never uses these policies at all — the student's
-- browser has no Supabase session and no JWT. The /api/link/[tutorSlug]/
-- [studentSlug] routes use the service-role key server-side, look the
-- student up by slug themselves, and hand-pick only the fields for that
-- one student before returning JSON. RLS above only ever needs to reason
-- about tutor sessions.

-- ---------------------------------------------------------------------
-- unique partial index: only one pending request per lesson occurrence
-- (defense in depth; real race handled transactionally in application code)
-- ---------------------------------------------------------------------
create unique index reschedule_requests_one_pending_per_occurrence
  on reschedule_requests (original_slot_id, original_date)
  where status = 'pending';
-- Atomic, race-safe approval of a reschedule request.
-- Two students requesting the same freshly-opened occurrence within
-- seconds of each other must never both succeed. Approving writes a
-- single lesson_exceptions row for the one occurrence being moved — it
-- never touches `slots`, so the recurring lesson is otherwise unaffected
-- on every other week.
--
-- SECURITY DEFINER is required because the function needs to read across
-- other students belonging to the same tutor to check for overlaps, which
-- the calling tutor's own RLS-scoped session is already entitled to do
-- (all students in this query belong to the same tutor_id) — but we still
-- re-verify tutor ownership of the request explicitly inside the function
-- so it can never be used to touch another tutor's data.
create or replace function approve_reschedule_request(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request reschedule_requests%rowtype;
  v_tutor_id uuid;
  v_caller_clerk_id text;
  v_conflict_count int;
begin
  v_caller_clerk_id := auth.jwt()->>'sub';

  select * into v_request from reschedule_requests where id = p_request_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select st.tutor_id into v_tutor_id
  from slots sl
  join students st on st.id = sl.student_id
  where sl.id = v_request.original_slot_id;

  if not exists (
    select 1 from tutors where id = v_tutor_id and clerk_user_id = v_caller_clerk_id
  ) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if v_request.status <> 'pending' then
    return jsonb_build_object('ok', false, 'error', 'already_decided');
  end if;

  -- Lock every slot and exception row for this tutor so a concurrent
  -- approval can't interleave between our overlap check and our insert.
  perform 1
  from slots sl
  join students st on st.id = sl.student_id
  where st.tutor_id = v_tutor_id
  for update;

  perform 1
  from lesson_exceptions le
  join slots sl on sl.id = le.original_slot_id
  join students st on st.id = sl.student_id
  where st.tutor_id = v_tutor_id
  for update;

  -- Conflict case 1: another active recurring slot for this tutor whose
  -- normal weekly occurrence falls on the requested date/time and hasn't
  -- itself been moved away by its own exception.
  select count(*) into v_conflict_count
  from slots sl
  join students st on st.id = sl.student_id
  where st.tutor_id = v_tutor_id
    and sl.active
    and sl.id <> v_request.original_slot_id
    and sl.day_of_week = extract(dow from v_request.new_date)::smallint
    and sl.start_time = v_request.new_start_time
    and not exists (
      select 1 from lesson_exceptions le
      where le.original_slot_id = sl.id and le.original_date = v_request.new_date
    );

  -- Conflict case 2: another lesson already moved (by exception) onto
  -- this exact date/time.
  if v_conflict_count = 0 then
    select count(*) into v_conflict_count
    from lesson_exceptions le
    join slots sl on sl.id = le.original_slot_id
    join students st on st.id = sl.student_id
    where st.tutor_id = v_tutor_id
      and le.new_date = v_request.new_date
      and le.new_start_time = v_request.new_start_time;
  end if;

  if v_conflict_count > 0 then
    update reschedule_requests
      set status = 'declined',
          decline_reason = 'slot just taken, please pick another',
          decided_at = now()
      where id = p_request_id;
    return jsonb_build_object('ok', false, 'error', 'slot_taken');
  end if;

  insert into lesson_exceptions (original_slot_id, original_date, new_date, new_start_time, new_duration_minutes)
  values (v_request.original_slot_id, v_request.original_date, v_request.new_date, v_request.new_start_time, v_request.duration_minutes)
  on conflict (original_slot_id, original_date) do update
    set new_date = excluded.new_date,
        new_start_time = excluded.new_start_time,
        new_duration_minutes = excluded.new_duration_minutes;

  update reschedule_requests
    set status = 'approved', decided_at = now()
    where id = p_request_id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function approve_reschedule_request(uuid) from public;
grant execute on function approve_reschedule_request(uuid) to authenticated;
-- Rate limiting for the student magic-link lookup route. Backed by
-- Postgres (not in-memory) because the app runs as multiple serverless
-- instances on Vercel — in-memory counters would not share state.
create table rate_limit_hits (
  id bigint generated always as identity primary key,
  bucket_key text not null,
  created_at timestamptz not null default now()
);

create index rate_limit_hits_bucket_created_idx on rate_limit_hits(bucket_key, created_at);

alter table rate_limit_hits enable row level security;
-- No policies granted to `authenticated`/`anon` — only the service-role
-- key (used from the student API route) ever touches this table.

create or replace function check_rate_limit(p_bucket_key text, p_max_hits int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  delete from rate_limit_hits
    where bucket_key = p_bucket_key
      and created_at < now() - make_interval(secs => p_window_seconds);

  select count(*) into v_count from rate_limit_hits where bucket_key = p_bucket_key;

  if v_count >= p_max_hits then
    return false;
  end if;

  insert into rate_limit_hits (bucket_key) values (p_bucket_key);
  return true;
end;
$$;

revoke all on function check_rate_limit(text, int, int) from public;
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
