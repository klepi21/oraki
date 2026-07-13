import { describe, expect, it } from "vitest";
import { groupEntriesByDay, CALENDAR_DAY_ORDER } from "@/lib/calendar";

function entry(overrides: Partial<Parameters<typeof groupEntriesByDay>[0][number]>) {
  return {
    slotId: "s1",
    studentId: "st1",
    studentName: "Μαρία",
    subject: "Μαθηματικά",
    dayOfWeek: 1,
    startTime: "16:00",
    durationMinutes: 60,
    ...overrides,
  };
}

describe("groupEntriesByDay", () => {
  it("buckets entries into 7 day slots", () => {
    const grouped = groupEntriesByDay([entry({ dayOfWeek: 0 }), entry({ dayOfWeek: 6 })]);
    expect(grouped).toHaveLength(7);
    expect(grouped[0]).toHaveLength(1);
    expect(grouped[6]).toHaveLength(1);
    expect(grouped[1]).toHaveLength(0);
  });

  it("sorts entries within a day by start time", () => {
    const grouped = groupEntriesByDay([
      entry({ slotId: "late", dayOfWeek: 2, startTime: "18:00" }),
      entry({ slotId: "early", dayOfWeek: 2, startTime: "09:00" }),
    ]);
    expect(grouped[2].map((e) => e.slotId)).toEqual(["early", "late"]);
  });

  it("CALENDAR_DAY_ORDER puts Monday first and Sunday last", () => {
    expect(CALENDAR_DAY_ORDER[0]).toBe(1);
    expect(CALENDAR_DAY_ORDER[6]).toBe(0);
    expect(CALENDAR_DAY_ORDER).toHaveLength(7);
  });
});
