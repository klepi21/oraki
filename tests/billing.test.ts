import { describe, expect, it } from "vitest";
import {
  billedQuantity,
  monthlyChargeEur,
  requiresSubscription,
  BILLED_STUDENT_CAP,
  FREE_STUDENT_COUNT,
  PRICE_PER_STUDENT_EUR,
} from "@/lib/stripe/billing";

describe("billing cap logic (§4, §5b Billing checklist)", () => {
  it("charges nothing for 0-2 students", () => {
    expect(billedQuantity(0)).toBe(0);
    expect(billedQuantity(1)).toBe(0);
    expect(billedQuantity(2)).toBe(0);
    expect(requiresSubscription(0)).toBe(false);
    expect(requiresSubscription(2)).toBe(false);
  });

  it("bills student_count - 2 in the normal range", () => {
    expect(billedQuantity(3)).toBe(1);
    expect(billedQuantity(5)).toBe(3);
    expect(requiresSubscription(3)).toBe(true);
  });

  it("never bills above the 12-student cap, however high the count goes", () => {
    expect(billedQuantity(14)).toBe(BILLED_STUDENT_CAP);
    expect(billedQuantity(50)).toBe(BILLED_STUDENT_CAP);
    expect(billedQuantity(1000)).toBe(BILLED_STUDENT_CAP);
  });

  it("stays under the €25 ceiling at the cap", () => {
    expect(monthlyChargeEur(1000)).toBe(BILLED_STUDENT_CAP * PRICE_PER_STUDENT_EUR);
    expect(monthlyChargeEur(1000)).toBeLessThan(25);
  });

  it("never goes negative for a count below the free tier (e.g. after removals)", () => {
    expect(billedQuantity(0)).toBe(0);
  });

  it("is stable across add/remove/re-add sequences at the cap boundary", () => {
    // 14 -> remove 5 -> 9 -> re-add 5 -> 14: billed quantity must match the
    // pure function of current count each time, never drift or accumulate.
    const sequence = [14, 9, 14, 11, 14];
    for (const count of sequence) {
      expect(billedQuantity(count)).toBe(Math.min(Math.max(0, count - FREE_STUDENT_COUNT), BILLED_STUDENT_CAP));
    }
  });
});
