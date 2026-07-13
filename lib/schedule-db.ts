import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  computeOccurrences,
  computeOpenSlotsForDateRange,
  type RecurringSlot,
  type LessonException,
  type AvailabilityWindow,
  type OpenSlot,
} from "@/lib/schedule";

const DEFAULT_LOOKAHEAD_DAYS = 14;

async function fetchTutorScheduleData(tutorId: string) {
  const admin = createAdminSupabaseClient();

  const [{ data: windowRows }, { data: slotRows }] = await Promise.all([
    admin.from("tutor_availability").select("day_of_week, start_time, end_time").eq("tutor_id", tutorId),
    admin
      .from("slots")
      .select("id, day_of_week, start_time, duration_minutes, students!inner(tutor_id)")
      .eq("active", true)
      .eq("students.tutor_id", tutorId),
  ]);

  const slots: RecurringSlot[] = (slotRows ?? []).map((s) => ({
    id: s.id,
    dayOfWeek: s.day_of_week,
    startTime: s.start_time,
    durationMinutes: s.duration_minutes,
  }));

  const slotIds = slots.map((s) => s.id);
  const { data: exceptionRows } =
    slotIds.length > 0
      ? await admin
          .from("lesson_exceptions")
          .select("original_slot_id, original_date, new_date, new_start_time, new_duration_minutes")
          .in("original_slot_id", slotIds)
      : { data: [] };

  const exceptions: LessonException[] = (exceptionRows ?? []).map((e) => ({
    originalSlotId: e.original_slot_id,
    originalDate: e.original_date,
    newDate: e.new_date,
    newStartTime: e.new_start_time,
    newDurationMinutes: e.new_duration_minutes,
  }));

  const windows: AvailabilityWindow[] = (windowRows ?? []).map((w) => ({
    dayOfWeek: w.day_of_week,
    startTime: w.start_time,
    endTime: w.end_time,
  }));

  return { slots, exceptions, windows };
}

/** All of a tutor's actual dated lessons over the next `days`, exceptions already applied. */
export async function computeTutorOccurrences(tutorId: string, days = DEFAULT_LOOKAHEAD_DAYS) {
  const { slots, exceptions } = await fetchTutorScheduleData(tutorId);
  return computeOccurrences(slots, exceptions, new Date(), days);
}

/** Open reschedule candidates for a tutor, for a lesson of the given duration. */
export async function computeOpenSlotsForTutor(
  tutorId: string,
  durationMinutes: number,
  days = DEFAULT_LOOKAHEAD_DAYS
): Promise<OpenSlot[]> {
  const { slots, exceptions, windows } = await fetchTutorScheduleData(tutorId);
  const bookedOccurrences = computeOccurrences(slots, exceptions, new Date(), days);
  return computeOpenSlotsForDateRange(windows, bookedOccurrences, durationMinutes, new Date(), days);
}
