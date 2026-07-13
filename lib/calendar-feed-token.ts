import { randomBytes } from "node:crypto";

/**
 * Bearer token for a tutor's phone-calendar subscription feed
 * (/api/calendar/[token].ics). Unlike a student slug, this has no
 * tutor-visible "label" component — it's pure read access to the whole
 * schedule, so it gets full random entropy like the old magic-link
 * tokens did, not the shorter enumeration-resistant-by-rate-limit scheme
 * used for student slugs.
 */
export function generateCalendarFeedToken(): string {
  return randomBytes(32).toString("base64url");
}
