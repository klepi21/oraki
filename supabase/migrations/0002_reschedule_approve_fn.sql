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
