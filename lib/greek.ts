export const GREEK_DAY_LABELS = [
  "Κυριακή",
  "Δευτέρα",
  "Τρίτη",
  "Τετάρτη",
  "Πέμπτη",
  "Παρασκευή",
  "Σάββατο",
] as const;

export function dayLabel(dayOfWeek: number): string {
  return GREEK_DAY_LABELS[dayOfWeek];
}

/** "15:00" -> "15:00" (24h, already the natural Greek convention). */
export function timeLabel(time: string): string {
  return time.slice(0, 5);
}

/** "2026-07-15" -> "Τετάρτη 15/7" */
export function dateLabel(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return `${dayLabel(date.getUTCDay())} ${d}/${m}`;
}

export const DURATION_OPTIONS = [30, 45, 60, 90, 120] as const;

/** 60 -> "1 ώρα", 90 -> "1,5 ώρα", 45 -> "45 λεπτά" — everyday phrasing, not raw minutes. */
export function durationLabel(minutes: number): string {
  if (minutes === 60) return "1 ώρα";
  if (minutes === 90) return "1,5 ώρα";
  if (minutes % 60 === 0) return `${minutes / 60} ώρες`;
  return `${minutes} λεπτά`;
}
