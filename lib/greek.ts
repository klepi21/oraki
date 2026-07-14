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

const GREEK_MONTHS_FULL = [
  "Ιανουάριος", "Φεβρουάριος", "Μάρτιος", "Απρίλιος", "Μάιος", "Ιούνιος",
  "Ιούλιος", "Αύγουστος", "Σεπτέμβριος", "Οκτώβριος", "Νοέμβριος", "Δεκέμβριος",
];

/** "2026-07" -> "Ιούλιος 2026", for the monthly schedule header. */
export function monthLabel(yearMonth: string): string {
  const [y, m] = yearMonth.split("-").map(Number);
  return `${GREEK_MONTHS_FULL[m - 1]} ${y}`;
}

const GREEK_MONTH_SHORT = [
  "Ιαν", "Φεβ", "Μαρ", "Απρ", "Μάι", "Ιουν", "Ιουλ", "Αυγ", "Σεπ", "Οκτ", "Νοε", "Δεκ",
];

/** "2026-07-13" (Monday) -> "13–19 Ιουλ 2026", for the weekly schedule header. */
export function weekRangeLabel(mondayISO: string): string {
  const [y, m, d] = mondayISO.split("-").map(Number);
  const monday = new Date(Date.UTC(y, m - 1, d));
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const startDay = monday.getUTCDate();
  const endDay = sunday.getUTCDate();
  const endMonth = GREEK_MONTH_SHORT[sunday.getUTCMonth()];
  const startMonth = GREEK_MONTH_SHORT[monday.getUTCMonth()];
  const monthPart = startMonth === endMonth ? endMonth : `${startMonth}–${endMonth}`;
  return `${startDay}–${endDay} ${monthPart} ${sunday.getUTCFullYear()}`;
}

export const LESSON_STATUS_LABELS: Record<string, string> = {
  scheduled: "Προγραμματισμένο",
  in_progress: "Σε εξέλιξη",
  done: "Έγινε",
  cancelled: "Ακυρώθηκε",
};

/** Total minutes done -> "12,5 ώρες", "45 λεπτά" — same everyday phrasing as durationLabel. */
export function hoursDoneLabel(totalMinutes: number): string {
  if (totalMinutes === 0) return "0 ώρες";
  const hours = totalMinutes / 60;
  const rounded = Math.round(hours * 2) / 2; // nearest half-hour
  const formatted = Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1).replace(".", ",");
  return `${formatted} ${rounded === 1 ? "ώρα" : "ώρες"}`;
}
