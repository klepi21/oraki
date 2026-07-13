import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { slugify, isValidTutorSlug, RESERVED_TUTOR_SLUGS } from "@/lib/slugs";
import { generateCalendarFeedToken } from "@/lib/calendar-feed-token";

export type Tutor = {
  id: string;
  clerk_user_id: string;
  email: string;
  name: string;
  slug: string;
  calendar_feed_token: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  billing_grace_period_ends_at: string | null;
};

/**
 * Finds a free tutor slug starting from a name-derived guess, appending a
 * numeric suffix on collision (ger, ger2, ger3, ...). Tutor slugs are not
 * a security boundary (see lib/slugs.ts) so predictability here is fine —
 * they're a vanity handle, not a credential.
 */
async function findAvailableTutorSlug(nameGuess: string): Promise<string> {
  const admin = createAdminSupabaseClient();
  const base = slugify(nameGuess) || "tutor";

  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = attempt === 0 ? base : `${base}${attempt + 1}`;
    if (RESERVED_TUTOR_SLUGS.has(candidate)) continue;
    const { data } = await admin.from("tutors").select("id").eq("slug", candidate).maybeSingle();
    if (!data) return candidate;
  }

  return `${base}-${Date.now()}`;
}

/**
 * Ensures a `tutors` row exists for the signed-in Clerk user, creating it
 * on first login. Uses the service-role client deliberately: before this
 * row exists there is nothing for RLS to scope an authenticated-tutor
 * session against, so bootstrap must happen server-side, once, here.
 */
export async function ensureTutorRecord(): Promise<Tutor> {
  const { userId } = await auth();
  if (!userId) throw new Error("not_authenticated");

  const admin = createAdminSupabaseClient();

  const { data: existing } = await admin
    .from("tutors")
    .select("*")
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (existing) return existing as Tutor;

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Καθηγητής";
  const slug = await findAvailableTutorSlug(name);
  const calendarFeedToken = generateCalendarFeedToken();

  const { data: created, error } = await admin
    .from("tutors")
    .insert({ clerk_user_id: userId, email, name, slug, calendar_feed_token: calendarFeedToken })
    .select("*")
    .single();

  if (error) throw error;
  return created as Tutor;
}

export async function regenerateCalendarFeedToken(tutorId: string): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  const admin = createAdminSupabaseClient();
  const token = generateCalendarFeedToken();

  const { error } = await admin.from("tutors").update({ calendar_feed_token: token }).eq("id", tutorId);
  if (error) return { ok: false, error: "Κάτι πήγε στραβά" };

  return { ok: true, token };
}

export async function updateTutorSlug(
  tutorId: string,
  newSlug: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isValidTutorSlug(newSlug)) {
    return { ok: false, error: "Ο σύνδεσμος πρέπει να έχει 3-40 λατινικούς χαρακτήρες/αριθμούς/παύλες" };
  }

  const admin = createAdminSupabaseClient();
  const { data: taken } = await admin
    .from("tutors")
    .select("id")
    .eq("slug", newSlug)
    .neq("id", tutorId)
    .maybeSingle();

  if (taken) return { ok: false, error: "Αυτός ο σύνδεσμος χρησιμοποιείται ήδη" };

  const { error } = await admin.from("tutors").update({ slug: newSlug }).eq("id", tutorId);
  if (error) return { ok: false, error: "Κάτι πήγε στραβά" };

  return { ok: true };
}
