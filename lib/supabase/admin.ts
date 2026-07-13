import "server-only";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

/**
 * Service-role client — bypasses RLS entirely. Must NEVER be imported from
 * any client component or route that renders to the browser. Restricted to:
 *  - the tutor-signup bootstrap (creating the first `tutors` row, before a
 *    Clerk<->tutor link exists to scope RLS by)
 *  - the student magic-link API routes (student has no Clerk/RLS session)
 *  - Stripe webhook handlers (no user session at all)
 *  - the purge cron job
 */
export function createAdminSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
      // This client never uses realtime subscriptions, but the client
      // constructor still requires a WebSocket implementation, which
      // Node 20 (a common Vercel/CI runtime) doesn't provide natively.
      realtime: { transport: WebSocket as unknown as never },
    }
  );
}
