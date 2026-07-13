// Date-based scheduling core. Recurring lessons live in `slots` as a
// day-of-week template; a reschedule only ever changes ONE calendar
// occurrence of that template (see lesson_exceptions in the DB) — the
// template itself is never mutated by a reschedule. This module computes,
// for a concrete date range, what actually happens on each date once
// exceptions are taken into account.

export type RecurringSlot = {
  id: string;
  dayOfWeek: number;
  startTime: string; // "HH:MM" or "HH:MM:SS"
  durationMinutes: number;
};

export type AvailabilityWindow = { dayOfWeek: number; startTime: string; endTime: string };

export type LessonException = {
  originalSlotId: string;
  originalDate: string; // ISO date "YYYY-MM-DD"
  newDate: string;
  newStartTime: string;
  newDurationMinutes: number;
};

export type Occurrence = {
  slotId: string;
  date: string; // ISO date
  startTime: string;
  durationMinutes: number;
  moved: boolean;
};

export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/** The next date (today or later) whose weekday matches dayOfWeek, as an ISO date. */
export function nextOccurrenceDate(dayOfWeek: number, fromDate: Date = new Date()): string {
  const from = new Date(Date.UTC(fromDate.getUTCFullYear(), fromDate.getUTCMonth(), fromDate.getUTCDate()));
  const diff = (dayOfWeek - from.getUTCDay() + 7) % 7;
  return toISODate(addDays(from, diff));
}

function weekdayOf(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/**
 * Expands recurring slots into concrete dated occurrences over
 * [startDate, startDate+days), applying exceptions: an occurrence whose
 * date matches an exception's originalDate is suppressed at its normal
 * time and instead appears (if its newDate falls in range) at the
 * exception's new date/time.
 */
export function computeOccurrences(
  slots: RecurringSlot[],
  exceptions: LessonException[],
  startDate: Date,
  days: number
): Occurrence[] {
  const startISO = toISODate(startDate);
  const endISO = toISODate(addDays(startDate, days));
  const exceptionsBySlotAndDate = new Map<string, LessonException>();
  for (const exc of exceptions) {
    exceptionsBySlotAndDate.set(`${exc.originalSlotId}|${exc.originalDate}`, exc);
  }

  const occurrences: Occurrence[] = [];

  for (let i = 0; i < days; i++) {
    const date = toISODate(addDays(startDate, i));
    const weekday = weekdayOf(date);
    for (const slot of slots) {
      if (slot.dayOfWeek !== weekday) continue;
      const exception = exceptionsBySlotAndDate.get(`${slot.id}|${date}`);
      if (exception) continue; // moved away from its normal occurrence
      occurrences.push({
        slotId: slot.id,
        date,
        startTime: slot.startTime,
        durationMinutes: slot.durationMinutes,
        moved: false,
      });
    }
  }

  for (const exc of exceptions) {
    if (exc.newDate >= startISO && exc.newDate < endISO) {
      occurrences.push({
        slotId: exc.originalSlotId,
        date: exc.newDate,
        startTime: exc.newStartTime,
        durationMinutes: exc.newDurationMinutes,
        moved: true,
      });
    }
  }

  return occurrences;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

export type OpenSlot = { date: string; startTime: string; durationMinutes: number };

/**
 * Computes open reschedule candidates over a concrete date range: divides
 * the tutor's availability windows into increments matching lesson
 * duration, then excludes any increment overlapping a booked occurrence
 * on that date. Taken slots are simply absent — never shown as "taken" —
 * so nothing can be inferred about another student's schedule.
 */
export function computeOpenSlotsForDateRange(
  windows: AvailabilityWindow[],
  bookedOccurrences: Occurrence[],
  durationMinutes: number,
  startDate: Date,
  days: number
): OpenSlot[] {
  const bookedByDate = new Map<string, { start: number; end: number }[]>();
  for (const occ of bookedOccurrences) {
    const start = timeToMinutes(occ.startTime);
    const end = start + occ.durationMinutes;
    const list = bookedByDate.get(occ.date) ?? [];
    list.push({ start, end });
    bookedByDate.set(occ.date, list);
  }

  const open: OpenSlot[] = [];

  for (let i = 0; i < days; i++) {
    const date = toISODate(addDays(startDate, i));
    const weekday = weekdayOf(date);
    const booked = bookedByDate.get(date) ?? [];

    for (const window of windows) {
      if (window.dayOfWeek !== weekday) continue;
      const windowStart = timeToMinutes(window.startTime);
      const windowEnd = timeToMinutes(window.endTime);

      for (let start = windowStart; start + durationMinutes <= windowEnd; start += durationMinutes) {
        const end = start + durationMinutes;
        const overlaps = booked.some((b) => start < b.end && end > b.start);
        if (!overlaps) {
          open.push({ date, startTime: minutesToTime(start), durationMinutes });
        }
      }
    }
  }

  return open;
}
