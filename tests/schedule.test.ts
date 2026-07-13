import { describe, expect, it } from "vitest";
import {
  nextOccurrenceDate,
  computeOccurrences,
  computeOpenSlotsForDateRange,
  toISODate,
  addDays,
} from "@/lib/schedule";

// 2026-07-13 is a Monday (dayOfWeek=1), useful as a fixed anchor for tests.
const MONDAY = new Date(Date.UTC(2026, 6, 13));

describe("nextOccurrenceDate", () => {
  it("returns today when today already matches the weekday", () => {
    expect(nextOccurrenceDate(1, MONDAY)).toBe("2026-07-13");
  });

  it("returns the following date when the weekday is later this week", () => {
    expect(nextOccurrenceDate(3, MONDAY)).toBe("2026-07-15"); // Wednesday
  });

  it("wraps to next week when the weekday already passed", () => {
    expect(nextOccurrenceDate(0, MONDAY)).toBe("2026-07-19"); // next Sunday
  });
});

describe("computeOccurrences (§ reschedule model: one-time exceptions, not permanent changes)", () => {
  const slot = { id: "slot-1", dayOfWeek: 1, startTime: "16:00", durationMinutes: 60 }; // Mondays

  it("expands a recurring slot to every matching date in range", () => {
    const occurrences = computeOccurrences([slot], [], MONDAY, 14);
    const dates = occurrences.filter((o) => o.slotId === "slot-1").map((o) => o.date);
    expect(dates).toEqual(["2026-07-13", "2026-07-20"]);
  });

  it("an exception suppresses the normal occurrence on its original date only", () => {
    const exception = {
      originalSlotId: "slot-1",
      originalDate: "2026-07-13",
      newDate: "2026-07-14",
      newStartTime: "18:00",
      newDurationMinutes: 60,
    };
    const occurrences = computeOccurrences([slot], [exception], MONDAY, 14);
    const forSlot = occurrences.filter((o) => o.slotId === "slot-1");

    // The moved-away date is gone, the following week's normal occurrence
    // is untouched, and the new one-time date/time appears separately.
    expect(forSlot).toEqual(
      expect.arrayContaining([
        { slotId: "slot-1", date: "2026-07-14", startTime: "18:00", durationMinutes: 60, moved: true },
        { slotId: "slot-1", date: "2026-07-20", startTime: "16:00", durationMinutes: 60, moved: false },
      ])
    );
    expect(forSlot.some((o) => o.date === "2026-07-13")).toBe(false);
    expect(forSlot).toHaveLength(2);
  });
});

describe("computeOpenSlotsForDateRange", () => {
  const windows = [{ dayOfWeek: 1, startTime: "15:00", endTime: "17:00" }];

  it("offers open increments only on matching dates within range", () => {
    const open = computeOpenSlotsForDateRange(windows, [], 60, MONDAY, 14);
    expect(open).toEqual([
      { date: "2026-07-13", startTime: "15:00", durationMinutes: 60 },
      { date: "2026-07-13", startTime: "16:00", durationMinutes: 60 },
      { date: "2026-07-20", startTime: "15:00", durationMinutes: 60 },
      { date: "2026-07-20", startTime: "16:00", durationMinutes: 60 },
    ]);
  });

  it("excludes an increment already booked on that specific date, not on every week", () => {
    const booked = [{ slotId: "x", date: "2026-07-13", startTime: "15:00", durationMinutes: 60, moved: false }];
    const open = computeOpenSlotsForDateRange(windows, booked, 60, MONDAY, 14);
    // 2026-07-13 15:00 is gone, but the following Monday's 15:00 remains free.
    expect(open).toEqual([
      { date: "2026-07-13", startTime: "16:00", durationMinutes: 60 },
      { date: "2026-07-20", startTime: "15:00", durationMinutes: 60 },
      { date: "2026-07-20", startTime: "16:00", durationMinutes: 60 },
    ]);
  });
});

describe("date helpers", () => {
  it("toISODate/addDays round-trip", () => {
    expect(toISODate(addDays(MONDAY, 1))).toBe("2026-07-14");
  });
});
