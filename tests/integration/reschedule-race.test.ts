import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import WebSocket from "ws";
import { randomUUID, createHmac } from "node:crypto";

const URL = process.env.INTEGRATION_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.INTEGRATION_SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.INTEGRATION_SUPABASE_ANON_KEY;
// The project's JWT secret (Supabase: Settings -> API -> JWT Secret).
// Real projects validate token signatures, so simulating a signed-in
// tutor requires signing test tokens with this. Without it, only the
// admin-side tests run.
const JWT_SECRET = process.env.INTEGRATION_SUPABASE_JWT_SECRET;

const hasEnv = Boolean(URL && SERVICE_ROLE_KEY && ANON_KEY);
const canSignJwt = hasEnv && Boolean(JWT_SECRET);

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

/**
 * Builds an RLS-scoped client presenting an HS256 token signed with the
 * project's JWT secret, with `sub` set to the given clerk_user_id —
 * mirroring what Supabase's Clerk third-party-auth integration passes
 * through in production, without needing a real Clerk session per test.
 */
function scopedClientAs(clerkUserId: string): SupabaseClient {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64url(
    JSON.stringify({ sub: clerkUserId, role: "authenticated", aud: "authenticated", iat: now, exp: now + 3600 })
  );
  const signature = createHmac("sha256", JWT_SECRET!).update(`${header}.${payload}`).digest("base64url");
  const jwt = `${header}.${payload}.${signature}`;

  return createClient(URL!, ANON_KEY!, {
    accessToken: async () => jwt,
    realtime: { transport: WebSocket as unknown as never },
  });
}

describe.skipIf(!canSignJwt)(
  "reschedule race condition (§7 Phase 2, §5b Reschedule flow checklist)",
  () => {
    const admin = hasEnv ? createClient(URL!, SERVICE_ROLE_KEY!, { realtime: { transport: WebSocket as unknown as never } }) : null;
    const tutorClerkId = `test-tutor-race-${randomUUID()}`;
    let tutorId: string;
    let studentAId: string;
    let studentBId: string;
    let requestAId: string;
    let requestBId: string;

    beforeAll(async () => {
      const { data: tutor } = await admin!
        .from("tutors")
        .insert({
          clerk_user_id: tutorClerkId,
          email: "race@test.oraki.gr",
          name: "Race Tutor",
          slug: `test-tutor-race-${randomUUID()}`,
          calendar_feed_token: `test-cal-${randomUUID()}`,
        })
        .select("id")
        .single();
      tutorId = tutor!.id;

      const { data: studentA } = await admin!
        .from("students")
        .insert({
          tutor_id: tutorId,
          name: "Student A",
          subject: "Math",
          magic_link_label: "student-a",
          magic_link_slug: `student-a-${randomUUID()}`,
        })
        .select("id")
        .single();
      studentAId = studentA!.id;

      const { data: studentB } = await admin!
        .from("students")
        .insert({
          tutor_id: tutorId,
          name: "Student B",
          subject: "Math",
          magic_link_label: "student-b",
          magic_link_slug: `student-b-${randomUUID()}`,
        })
        .select("id")
        .single();
      studentBId = studentB!.id;

      const { data: slotA } = await admin!
        .from("slots")
        .insert({ student_id: studentAId, day_of_week: 1, start_time: "10:00" })
        .select("id")
        .single();
      const { data: slotB } = await admin!
        .from("slots")
        .insert({ student_id: studentBId, day_of_week: 2, start_time: "11:00" })
        .select("id")
        .single();

      // Two students independently request the exact same freshly-opened
      // occurrence within the same instant.
      const { data: reqA } = await admin!
        .from("reschedule_requests")
        .insert({
          student_id: studentAId,
          original_slot_id: slotA!.id,
          original_date: "2026-08-03",
          new_date: "2026-08-05",
          new_start_time: "17:00",
        })
        .select("id")
        .single();
      requestAId = reqA!.id;

      const { data: reqB } = await admin!
        .from("reschedule_requests")
        .insert({
          student_id: studentBId,
          original_slot_id: slotB!.id,
          original_date: "2026-08-04",
          new_date: "2026-08-05",
          new_start_time: "17:00",
        })
        .select("id")
        .single();
      requestBId = reqB!.id;
    });

    afterAll(async () => {
      await admin!.from("tutors").delete().eq("id", tutorId);
    });

    it("exactly one of two simultaneous approvals for the same slot succeeds", async () => {
      const asTutor = scopedClientAs(tutorClerkId);

      const [resultA, resultB] = await Promise.all([
        asTutor.rpc("approve_reschedule_request", { p_request_id: requestAId }),
        asTutor.rpc("approve_reschedule_request", { p_request_id: requestBId }),
      ]);

      const outcomes = [resultA.data, resultB.data];
      const successes = outcomes.filter((o) => o?.ok === true);
      const failures = outcomes.filter((o) => o?.ok === false);

      expect(successes).toHaveLength(1);
      expect(failures).toHaveLength(1);
      expect(failures[0]?.error).toBe("slot_taken");

      const { data: exceptions } = await admin!
        .from("lesson_exceptions")
        .select("id, original_slot_id")
        .eq("new_date", "2026-08-05")
        .eq("new_start_time", "17:00:00");
      expect(exceptions).toHaveLength(1);
    });
  }
);
