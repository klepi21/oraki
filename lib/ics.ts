import "server-only";
import { nextOccurrenceDate } from "@/lib/schedule";

const BYDAY_CODES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

export type FeedLesson = {
  slotId: string;
  studentName: string;
  subject: string;
  dayOfWeek: number;
  startTime: string;
  durationMinutes: number;
};

export type FeedException = {
  id: string;
  originalSlotId: string;
  originalDate: string;
  newDate: string;
  newStartTime: string;
  newDurationMinutes: number;
};

function escapeText(text: string): string {
  return text.replace(/[\\,;]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");
}

function toICSDateTime(isoDate: string, time: string): string {
  return `${isoDate.replace(/-/g, "")}T${time.slice(0, 5).replace(":", "")}00`;
}

function nowStamp(): string {
  return new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

/**
 * Builds an iCalendar feed: one recurring VEVENT per lesson (RRULE
 * weekly, with EXDATE for any occurrence that's been moved), plus one
 * standalone VEVENT per exception for the moved-to date/time. A calendar
 * app subscribing to this URL (webcal://) re-fetches it periodically, so
 * this always reflects the current schedule — no separate "sync" step.
 */
export function buildICSFeed(tutorName: string, lessons: FeedLesson[], exceptions: FeedException[]): string {
  const dtstamp = nowStamp();
  const exceptionsBySlot = new Map<string, FeedException[]>();
  for (const exc of exceptions) {
    const list = exceptionsBySlot.get(exc.originalSlotId) ?? [];
    list.push(exc);
    exceptionsBySlot.set(exc.originalSlotId, list);
  }

  const events: string[] = [];

  for (const lesson of lessons) {
    const anchorDate = nextOccurrenceDate(lesson.dayOfWeek);
    const summary = escapeText(`${lesson.studentName} — ${lesson.subject}`);
    const excDates = (exceptionsBySlot.get(lesson.slotId) ?? [])
      .map((exc) => `EXDATE;TZID=Europe/Athens:${toICSDateTime(exc.originalDate, lesson.startTime)}`)
      .join("\r\n");

    events.push(
      [
        "BEGIN:VEVENT",
        `UID:slot-${lesson.slotId}@oraki.gr`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART;TZID=Europe/Athens:${toICSDateTime(anchorDate, lesson.startTime)}`,
        `DURATION:PT${lesson.durationMinutes}M`,
        `RRULE:FREQ=WEEKLY;BYDAY=${BYDAY_CODES[lesson.dayOfWeek]}`,
        excDates,
        `SUMMARY:${summary}`,
        "END:VEVENT",
      ]
        .filter(Boolean)
        .join("\r\n")
    );
  }

  for (const exc of exceptions) {
    const lesson = lessons.find((l) => l.slotId === exc.originalSlotId);
    const summary = escapeText(`${lesson?.studentName ?? ""} — ${lesson?.subject ?? ""} (μετακίνηση)`);

    events.push(
      [
        "BEGIN:VEVENT",
        `UID:exception-${exc.id}@oraki.gr`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART;TZID=Europe/Athens:${toICSDateTime(exc.newDate, exc.newStartTime)}`,
        `DURATION:PT${exc.newDurationMinutes}M`,
        `SUMMARY:${summary}`,
        "END:VEVENT",
      ].join("\r\n")
    );
  }

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Oraki//Schedule//EL",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(`Πρόγραμμα — ${tutorName}`)}`,
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}
