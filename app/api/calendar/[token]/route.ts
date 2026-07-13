import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { buildICSFeed } from "@/lib/ics";
import { checkStudentLookupRateLimit } from "@/lib/rate-limit";

/**
 * The tutor's whole schedule as a phone-calendar subscription feed. No
 * Clerk session involved — a calendar app (Google/Apple Calendar) fetches
 * this URL directly and periodically, so it must be a bearer-token GET,
 * same trust model as the student magic links (see lib/calendar-feed-token.ts).
 */
export async function GET(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const allowed = await checkStudentLookupRateLimit(ip);
  if (!allowed) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }

  const { token } = await context.params;
  const rawToken = token.replace(/\.ics$/, "");

  const admin = createAdminSupabaseClient();
  const { data: tutor } = await admin
    .from("tutors")
    .select("id, name")
    .eq("calendar_feed_token", rawToken)
    .maybeSingle();

  if (!tutor) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: slotRows } = await admin
    .from("slots")
    .select("id, day_of_week, start_time, duration_minutes, students!inner(tutor_id, name, subject, active)")
    .eq("active", true)
    .eq("students.tutor_id", tutor.id)
    .eq("students.active", true);

  const lessons = (slotRows ?? []).map((s) => {
    const student = (Array.isArray(s.students) ? s.students[0] : s.students) as { name: string; subject: string };
    return {
      slotId: s.id,
      studentName: student.name,
      subject: student.subject,
      dayOfWeek: s.day_of_week,
      startTime: s.start_time,
      durationMinutes: s.duration_minutes,
    };
  });

  const slotIds = lessons.map((l) => l.slotId);
  const { data: exceptionRows } =
    slotIds.length > 0
      ? await admin
          .from("lesson_exceptions")
          .select("id, original_slot_id, original_date, new_date, new_start_time, new_duration_minutes")
          .in("original_slot_id", slotIds)
      : { data: [] };

  const exceptions = (exceptionRows ?? []).map((e) => ({
    id: e.id,
    originalSlotId: e.original_slot_id,
    originalDate: e.original_date,
    newDate: e.new_date,
    newStartTime: e.new_start_time,
    newDurationMinutes: e.new_duration_minutes,
  }));

  const ics = buildICSFeed(tutor.name, lessons, exceptions);

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="oraki-programma.ics"',
      "Cache-Control": "no-store",
    },
  });
}
