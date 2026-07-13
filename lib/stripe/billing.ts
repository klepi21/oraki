export const FREE_STUDENT_COUNT = 2;
export const PRICE_PER_STUDENT_EUR = 2;
export const BILLED_STUDENT_CAP = 12; // 12 x €2 = €24, under the €25 ceiling

/**
 * Billed quantity for Stripe subscription_items.update. Never bill above
 * the cap regardless of actual active student count, and never below 0.
 */
export function billedQuantity(activeStudentCount: number): number {
  const overFree = Math.max(0, activeStudentCount - FREE_STUDENT_COUNT);
  return Math.min(overFree, BILLED_STUDENT_CAP);
}

export function monthlyChargeEur(activeStudentCount: number): number {
  return billedQuantity(activeStudentCount) * PRICE_PER_STUDENT_EUR;
}

/** Free tier: no Stripe subscription should exist at all below student #3. */
export function requiresSubscription(activeStudentCount: number): boolean {
  return activeStudentCount > FREE_STUDENT_COUNT;
}
