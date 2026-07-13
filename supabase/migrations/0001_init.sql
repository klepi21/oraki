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
