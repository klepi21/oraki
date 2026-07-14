export type CalendarEntry = {
  slotId: string;
  studentId: string;
  studentName: string;
  subject: string;
  date: string; // ISO date, the concrete day this occurrence falls on
  dayOfWeek: number;
  startTime: string;
  durationMinutes: number;
  /** True if this occurrence was moved here by an approved reschedule. */
  moved: boolean;
  status: "scheduled" | "in_progress" | "done" | "cancelled";
  /** Set if this slot is a one-off lesson (occurs only on this date, never recurs). */
  oneTimeDate: string | null;
};

/** Groups occurrences by ISO date, each day sorted by start time. */
export function groupEntriesByDate(entries: CalendarEntry[]): Map<string, CalendarEntry[]> {
  const byDate = new Map<string, CalendarEntry[]>();
  for (const entry of entries) {
    const list = byDate.get(entry.date) ?? [];
    list.push(entry);
    byDate.set(entry.date, list);
  }
  for (const list of byDate.values()) {
    list.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }
  return byDate;
}

/** Reorders day indices so the week starts on Monday for display (calendar convention). */
export const CALENDAR_DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
