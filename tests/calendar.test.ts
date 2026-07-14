import { describe, expect, it } from "vitest";
import { groupEntriesByDate, CALENDAR_DAY_ORDER, type CalendarEntry } from "@/lib/calendar";

function entry(overrides: Partial<CalendarEntry>): CalendarEntry {
  return {
    slotId: "s1",
    studentId: "st1",
    studentName: "Μαρία",
    subject: "Μαθηματικά",
    date: "2026-07-13",
    dayOfWeek: 1,
    startTime: "16:00",
    durationMinutes: 60,
    moved: false,
    status: "scheduled",
    oneTimeDate: null,
    ...overrides,
  };
}

describe("groupEntriesByDate", () => {
  it("buckets entries by ISO date", () => {
    const grouped = groupEntriesByDate([
      entry({ date: "2026-07-12" }),
      entry({ date: "2026-07-18" }),
    ]);
    expect(grouped.get("2026-07-12")).toHaveLength(1);
    expect(grouped.get("2026-07-18")).toHaveLength(1);
    expect(grouped.get("2026-07-13")).toBeUndefined();
  });

  it("sorts entries within a day by start time", () => {
    const grouped = groupEntriesByDate([
      entry({ slotId: "late", date: "2026-07-14", startTime: "18:00" }),
      entry({ slotId: "early", date: "2026-07-14", startTime: "09:00" }),
    ]);
    expect(grouped.get("2026-07-14")!.map((e) => e.slotId)).toEqual(["early", "late"]);
  });

  it("CALENDAR_DAY_ORDER puts Monday first and Sunday last", () => {
    expect(CALENDAR_DAY_ORDER[0]).toBe(1);
    expect(CALENDAR_DAY_ORDER[6]).toBe(0);
    expect(CALENDAR_DAY_ORDER).toHaveLength(7);
  });
});
