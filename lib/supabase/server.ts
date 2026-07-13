import "server-only";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

/**
 * RLS-scoped Supabase client for the currently signed-in tutor.
 * Uses Clerk's native Supabase third-party-auth integration: the Supabase
 * project trusts Clerk-issued session tokens directly, so RLS policies can
 * read `auth.jwt()->>'sub'` and match it against `tutors.clerk_user_id`.
 *
 * Never use this for the student-facing magic-link flow — students have no
 * Clerk session, so this client would simply have no rows visible to it.
 */
export async function createTutorSupabaseClient() {
  const { getToken } = await auth();

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      accessToken: async () => (await getToken()) ?? null,
      realtime: { transport: WebSocket as unknown as never },
    }
  );
}
