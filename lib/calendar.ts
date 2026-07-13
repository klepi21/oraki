export type CalendarEntry = {
  slotId: string;
  studentId: string;
  studentName: string;
  subject: string;
  dayOfWeek: number;
  startTime: string;
  durationMinutes: number;
};

/** Groups lesson slots by day of week (0=Sunday..6=Saturday), each day sorted by start time. */
export function groupEntriesByDay(entries: CalendarEntry[]): CalendarEntry[][] {
  const byDay: CalendarEntry[][] = Array.from({ length: 7 }, () => []);
  for (const entry of entries) {
    byDay[entry.dayOfWeek].push(entry);
  }
  for (const day of byDay) {
    day.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }
  return byDay;
}

/** Reorders day indices so the week starts on Monday for display (calendar convention). */
export const CALENDAR_DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
