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
  /** When set, this slot occurs exactly once on this date instead of recurring weekly. */
  oneTimeDate?: string | null;
};

export type AvailabilityWindow = { dayOfWeek: number; startTime: string; endTime: string };

/**
 * A date-specific carve-out layered on top of the recurring
 * AvailabilityWindow pattern: isAvailable=false blocks part of a normally
 * open date, isAvailable=true opens extra time on a date that wouldn't
 * otherwise be available.
 */
export type AvailabilityOverride = { date: string; startTime: string; endTime: string; isAvailable: boolean };

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

/** Monday (UTC, midnight) of the week containing `date` — the calendar's week anchor. */
export function mondayOf(date: Date): Date {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const diff = (utc.getUTCDay() + 6) % 7; // days since Monday
  return addDays(utc, -diff);
}

/** Parses an ISO "YYYY-MM-DD" as a UTC-midnight Date, or returns undefined if malformed. */
export function parseISODate(isoDate: string | undefined): Date | undefined {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return undefined;
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return Number.isNaN(date.getTime()) ? undefined : date;
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

/** The day-of-week (0=Sunday..6=Saturday) of an ISO "YYYY-MM-DD" date. */
export function weekdayOfISODate(isoDate: string): number {
  return weekdayOf(isoDate);
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
      if (slot.oneTimeDate ? slot.oneTimeDate !== date : slot.dayOfWeek !== weekday) continue;
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

type Interval = { start: number; end: number };

/** Removes `block` from every interval in `intervals`, splitting as needed. */
function subtractInterval(intervals: Interval[], block: Interval): Interval[] {
  const result: Interval[] = [];
  for (const iv of intervals) {
    if (block.end <= iv.start || block.start >= iv.end) {
      result.push(iv); // no overlap
      continue;
    }
    if (block.start > iv.start) result.push({ start: iv.start, end: Math.min(block.start, iv.end) });
    if (block.end < iv.end) result.push({ start: Math.max(block.end, iv.start), end: iv.end });
  }
  return result;
}

/**
 * The concrete open intervals (in minutes-since-midnight) for one date:
 * the recurring weekly windows for that weekday, with "closed" overrides
 * carved out and "extra" overrides added on top.
 */
function intervalsForDate(
  windows: AvailabilityWindow[],
  overrides: AvailabilityOverride[],
  date: string,
  weekday: number
): Interval[] {
  let intervals: Interval[] = windows
    .filter((w) => w.dayOfWeek === weekday)
    .map((w) => ({ start: timeToMinutes(w.startTime), end: timeToMinutes(w.endTime) }));

  for (const override of overrides) {
    if (override.date !== date) continue;
    const block = { start: timeToMinutes(override.startTime), end: timeToMinutes(override.endTime) };
    if (override.isAvailable) {
      intervals.push(block);
    } else {
      intervals = subtractInterval(intervals, block);
    }
  }

  return intervals;
}

/**
 * Computes open reschedule candidates over a concrete date range: divides
 * the tutor's availability windows (recurring pattern plus any
 * date-specific overrides) into increments matching lesson duration, then
 * excludes any increment overlapping a booked occurrence on that date.
 * Taken slots are simply absent — never shown as "taken" — so nothing can
 * be inferred about another student's schedule.
 */
export function computeOpenSlotsForDateRange(
  windows: AvailabilityWindow[],
  bookedOccurrences: Occurrence[],
  durationMinutes: number,
  startDate: Date,
  days: number,
  overrides: AvailabilityOverride[] = []
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

    for (const interval of intervalsForDate(windows, overrides, date, weekday)) {
      for (let start = interval.start; start + durationMinutes <= interval.end; start += durationMinutes) {
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

/** First day of the month containing `date`, UTC midnight. */
export function firstOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

/** Adds `months` calendar months to `date` (UTC), clamped to day 1 to avoid month-length rollover. */
export function addMonths(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

/**
 * The Monday-aligned grid range covering a whole month: start is the
 * Monday of the week containing the 1st, and `days` extends through the
 * Sunday of the week containing the last day of the month — so a monthly
 * calendar view always renders in full weeks.
 */
export function monthGridRange(monthStart: Date): { start: Date; days: number } {
  const start = mondayOf(monthStart);
  const nextMonth = addMonths(monthStart, 1);
  const lastDay = addDays(nextMonth, -1);
  const gridEnd = addDays(mondayOf(lastDay), 7); // Monday after the last day's week
  const days = Math.round((gridEnd.getTime() - start.getTime()) / 86400000);
  return { start, days };
}
