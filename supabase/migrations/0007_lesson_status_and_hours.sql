-- Lesson status tracking (scheduled -> in_progress -> done/cancelled) and
-- per-student "hours done" bookkeeping.
--
-- A calendar occurrence isn't its own row anywhere yet — it's a recurring
-- `slots` row expanded date-by-date (see lib/schedule.ts), optionally
-- redirected by a `lesson_exceptions` row. `lesson_logs` gives each
-- concrete occurrence (identified by slot_id + occurrence_date, the same
-- key `lesson_exceptions` uses for "which occurrence") a place to record
-- status, independent of whether that occurrence was ever moved.
create table lesson_logs (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references slots(id) on delete cascade,
  occurrence_date date not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'in_progress', 'done', 'cancelled')),
  duration_minutes smallint not null,
  done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (slot_id, occurrence_date)
);

create index lesson_logs_slot_id_idx on lesson_logs(slot_id);

alter table lesson_logs enable row level security;

create policy "lesson_logs_all_own_tutor"
  on lesson_logs for all
  using (
    slot_id in (
      select sl.id from slots sl
      join students st on st.id = sl.student_id
      join tutors t on t.id = st.tutor_id
      where t.clerk_user_id = auth.jwt()->>'sub'
    )
  )
  with check (
    slot_id in (
      select sl.id from slots sl
      join students st on st.id = sl.student_id
      join tutors t on t.id = st.tutor_id
      where t.clerk_user_id = auth.jwt()->>'sub'
    )
  );

grant select, insert, update, delete on lesson_logs to authenticated;

-- Marks the point after which "hours done" is counted from scratch — set
-- when a tutor has been paid and wants the running total to restart at
-- zero without deleting the underlying lesson history.
alter table students add column hours_reset_at timestamptz;
