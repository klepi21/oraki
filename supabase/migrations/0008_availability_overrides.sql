-- Date-specific availability overrides, layered on top of the recurring
-- weekly `tutor_availability` windows. Most tutors set their availability
-- once and it repeats every week — this table is only for the exceptional
-- case: "closed" blocks part of a normally-open date, "extra" opens a
-- window on a date that wouldn't otherwise be available (e.g. a one-off
-- Saturday). Kept separate from tutor_availability so the common weekly
-- pattern never has to be re-entered.
create table availability_overrides (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references tutors(id) on delete cascade,
  date date not null,
  start_time time not null,
  end_time time not null,
  -- true = an extra open window on this date; false = a closed block that
  -- carves time out of the recurring windows on this date.
  is_available boolean not null default false,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

create index availability_overrides_tutor_id_idx on availability_overrides(tutor_id);
create index availability_overrides_date_idx on availability_overrides(date);

alter table availability_overrides enable row level security;

create policy "availability_overrides_all_own_tutor"
  on availability_overrides for all
  using (tutor_id in (select id from tutors where clerk_user_id = auth.jwt()->>'sub'))
  with check (tutor_id in (select id from tutors where clerk_user_id = auth.jwt()->>'sub'));

grant select, insert, update, delete on availability_overrides to authenticated;
