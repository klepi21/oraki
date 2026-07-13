import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const MAX_HITS = 20;
const WINDOW_SECONDS = 60;

/**
 * Rate-limits student link lookups per source IP. The student slug's
 * random suffix is what actually prevents guessing (see lib/slugs.ts) —
 * this is a second layer so an attacker can't brute-force it at high
 * volume even with low per-guess odds. Backed by Postgres (migration
 * 0004) so it holds across serverless instances.
 */
export async function checkStudentLookupRateLimit(ip: string): Promise<boolean> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_bucket_key: `student-lookup:${ip}`,
    p_max_hits: MAX_HITS,
    p_window_seconds: WINDOW_SECONDS,
  });

  if (error) {
    // Fail closed: if we can't verify the rate limit, don't allow the lookup.
    return false;
  }

  return data === true;
}
