import { describe, expect, it } from "vitest";
import { buildICSFeed } from "@/lib/ics";

describe("buildICSFeed (phone calendar subscription feed)", () => {
  const lessons = [
    { slotId: "sl1", studentName: "Μαρία Παπαδοπούλου", subject: "Μαθηματικά", dayOfWeek: 2, startTime: "16:00", durationMinutes: 60 },
  ];

  it("wraps events in a valid VCALENDAR envelope", () => {
    const ics = buildICSFeed("Δημήτρης", lessons, []);
    expect(ics).toMatch(/^BEGIN:VCALENDAR/);
    expect(ics).toMatch(/END:VCALENDAR$/);
    expect(ics).toContain("VERSION:2.0");
  });

  it("emits one recurring VEVENT per lesson with a weekly RRULE", () => {
    const ics = buildICSFeed("Δημήτρης", lessons, []);
    expect(ics).toContain("UID:slot-sl1@oraki.gr");
    expect(ics).toContain("RRULE:FREQ=WEEKLY;BYDAY=TU");
    expect(ics).toContain("DURATION:PT60M");
  });

  it("adds an EXDATE on the recurring event for a moved occurrence, plus a standalone VEVENT at the new time", () => {
    const exceptions = [
      { id: "e1", originalSlotId: "sl1", originalDate: "2026-07-14", newDate: "2026-07-15", newStartTime: "18:00", newDurationMinutes: 60 },
    ];
    const ics = buildICSFeed("Δημήτρης", lessons, exceptions);

    expect(ics).toContain("EXDATE;TZID=Europe/Athens:20260714T160000");
    expect(ics).toContain("UID:exception-e1@oraki.gr");
    expect(ics).toContain("DTSTART;TZID=Europe/Athens:20260715T180000");
  });

  it("escapes commas and semicolons in free text fields", () => {
    const withComma = [{ ...lessons[0], subject: "Μαθηματικά, Άλγεβρα" }];
    const ics = buildICSFeed("Δημήτρης", withComma, []);
    expect(ics).toContain("Μαθηματικά\\, Άλγεβρα");
  });
});
