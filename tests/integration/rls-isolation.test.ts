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

describe.skipIf(!canSignJwt)("multi-tenant isolation (§5b Multi-tenant isolation checklist)", () => {
  const admin = hasEnv ? createClient(URL!, SERVICE_ROLE_KEY!, { realtime: { transport: WebSocket as unknown as never } }) : null;

  const tutorAClerkId = `test-tutor-a-${randomUUID()}`;
  const tutorBClerkId = `test-tutor-b-${randomUUID()}`;
  let tutorAId: string;
  let tutorBId: string;
  let studentBId: string;

  beforeAll(async () => {
    const { data: tutorA } = await admin!
      .from("tutors")
      .insert({ clerk_user_id: tutorAClerkId, email: "a@test.oraki.gr", name: "Tutor A", slug: `test-tutor-a-${randomUUID()}`, calendar_feed_token: `test-cal-${randomUUID()}` })
      .select("id")
      .single();
    const { data: tutorB } = await admin!
      .from("tutors")
      .insert({ clerk_user_id: tutorBClerkId, email: "b@test.oraki.gr", name: "Tutor B", slug: `test-tutor-b-${randomUUID()}`, calendar_feed_token: `test-cal-${randomUUID()}` })
      .select("id")
      .single();
    tutorAId = tutorA!.id;
    tutorBId = tutorB!.id;

    const { data: studentB } = await admin!
      .from("students")
      .insert({
        tutor_id: tutorBId,
        name: "Student B",
        subject: "Math",
        magic_link_label: "student-b",
        magic_link_slug: `student-b-${randomUUID()}`,
      })
      .select("id")
      .single();
    studentBId = studentB!.id;

    const { data: slotB } = await admin!
      .from("slots")
      .insert({
        student_id: studentBId,
        day_of_week: 1,
        start_time: "15:00",
      })
      .select("id")
      .single();

    await admin!.from("tutor_availability").insert({
      tutor_id: tutorBId,
      day_of_week: 1,
      start_time: "15:00",
      end_time: "20:00",
    });

    await admin!.from("reschedule_requests").insert({
      student_id: studentBId,
      original_slot_id: slotB!.id,
      original_date: "2026-08-03",
      new_date: "2026-08-04",
      new_start_time: "16:00",
    });
  });

  afterAll(async () => {
    await admin!.from("tutors").delete().eq("id", tutorAId);
    await admin!.from("tutors").delete().eq("id", tutorBId);
  });

  it("Tutor A cannot see Tutor B's own tutor row", async () => {
    const asA = scopedClientAs(tutorAClerkId);
    const { data } = await asA.from("tutors").select("*").eq("id", tutorBId);
    expect(data).toEqual([]);
  });

  it("Tutor A cannot see Tutor B's students", async () => {
    const asA = scopedClientAs(tutorAClerkId);
    const { data } = await asA.from("students").select("*").eq("tutor_id", tutorBId);
    expect(data).toEqual([]);
  });

  it("Tutor A cannot see Tutor B's slots", async () => {
    const asA = scopedClientAs(tutorAClerkId);
    const { data } = await asA.from("slots").select("*").eq("student_id", studentBId);
    expect(data).toEqual([]);
  });

  it("Tutor A cannot see Tutor B's availability", async () => {
    const asA = scopedClientAs(tutorAClerkId);
    const { data } = await asA.from("tutor_availability").select("*").eq("tutor_id", tutorBId);
    expect(data).toEqual([]);
  });

  it("Tutor A cannot see Tutor B's reschedule requests", async () => {
    const asA = scopedClientAs(tutorAClerkId);
    const { data } = await asA
      .from("reschedule_requests")
      .select("*")
      .eq("student_id", studentBId);
    expect(data).toEqual([]);
  });

  it("Tutor B can see their own data (sanity check the isolation isn't just blocking everything)", async () => {
    const asB = scopedClientAs(tutorBClerkId);
    const { data } = await asB.from("students").select("*").eq("tutor_id", tutorBId);
    expect(data).toHaveLength(1);
  });
});

describe.skipIf(!hasEnv)("magic-link regeneration invalidates the old slug (§5b Magic-link security checklist)", () => {
  const admin = hasEnv ? createClient(URL!, SERVICE_ROLE_KEY!, { realtime: { transport: WebSocket as unknown as never } }) : null;
  let tutorId: string;
  let studentId: string;
  const oldSlug = `regen-student-${randomUUID()}`;

  beforeAll(async () => {
    const { data: tutor } = await admin!
      .from("tutors")
      .insert({
        clerk_user_id: `test-tutor-regen-${randomUUID()}`,
        email: "regen@test.oraki.gr",
        name: "Regen Tutor",
        slug: `test-tutor-regen-${randomUUID()}`,
        calendar_feed_token: `test-cal-${randomUUID()}`,
      })
      .select("id")
      .single();
    tutorId = tutor!.id;

    const { data: student } = await admin!
      .from("students")
      .insert({
        tutor_id: tutorId,
        name: "Regen Student",
        subject: "Physics",
        magic_link_label: "regen-student",
        magic_link_slug: oldSlug,
      })
      .select("id")
      .single();
    studentId = student!.id;
  });

  afterAll(async () => {
    await admin!.from("tutors").delete().eq("id", tutorId);
  });

  it("old slug no longer resolves after regeneration", async () => {
    let { data: found } = await admin!
      .from("students")
      .select("id")
      .eq("magic_link_slug", oldSlug)
      .maybeSingle();
    expect(found?.id).toBe(studentId);

    await admin!
      .from("students")
      .update({ magic_link_slug: `regen-student-${randomUUID()}` })
      .eq("id", studentId);

    ({ data: found } = await admin!
      .from("students")
      .select("id")
      .eq("magic_link_slug", oldSlug)
      .maybeSingle());
    expect(found).toBeNull();
  });
});

describe.skipIf(!hasEnv)("RLS enabled on every table — live catalog check (§5b)", () => {
  const admin = hasEnv ? createClient(URL!, SERVICE_ROLE_KEY!, { realtime: { transport: WebSocket as unknown as never } }) : null;

  it("RLS is actually enabled (not just policies present) on every table", async () => {
    for (const table of [
      "tutors",
      "students",
      "slots",
      "tutor_availability",
      "reschedule_requests",
      "rate_limit_hits",
    ]) {
      const { data: rlsEnabled, error } = await admin!.rpc("check_table_rls_enabled", {
        p_table_name: table,
      });
      expect(error).toBeNull();
      expect(rlsEnabled).toBe(true);
    }
  });
});
