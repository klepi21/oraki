import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveStudentBySlug } from "@/lib/students-lookup";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { checkStudentLookupRateLimit } from "@/lib/rate-limit";
import { sendRescheduleRequestedEmail } from "@/lib/email/resend";
import { nextOccurrenceDate } from "@/lib/schedule";
import { dateLabel, timeLabel } from "@/lib/greek";

const bodySchema = z.object({
  originalSlotId: z.string().uuid(),
  newDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  newStartTime: z.string().regex(/^\d{2}:\d{2}$/),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ tutorSlug: string; studentSlug: string }> }
) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const allowed = await checkStudentLookupRateLimit(ip);
  if (!allowed) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }

  const { tutorSlug, studentSlug } = await context.params;
  const student = await resolveStudentBySlug(tutorSlug, studentSlug);
  if (!student) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  // The lesson being changed must be one of THIS student's own lessons —
  // never trust a slot id from the client without checking ownership.
  // Duration and "which occurrence" (original_date) are derived from the
  // slot itself server-side, never taken from the client.
  const slot = student.upcomingSlots.find((s) => s.id === parsed.data.originalSlotId);
  if (!slot) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const admin = createAdminSupabaseClient();
  const originalDate = nextOccurrenceDate(slot.dayOfWeek);

  // A duplicate pending request would also be blocked by the unique
  // index below, but that path returns "slot just taken" — misleading
  // for this case. Check explicitly so the parent gets the true reason.
  const alreadyPending = student.pendingRequests.some((r) => r.originalSlotId === slot.id);
  if (alreadyPending) {
    return NextResponse.json(
      {
        error: "already_pending",
        message: "Έχεις ήδη στείλει αίτημα για αυτό το μάθημα. Περίμενε την απάντηση του καθηγητή.",
      },
      { status: 409 }
    );
  }

  const { data: request_, error } = await admin
    .from("reschedule_requests")
    .insert({
      student_id: student.id,
      original_slot_id: slot.id,
      original_date: originalDate,
      new_date: parsed.data.newDate,
      new_start_time: parsed.data.newStartTime,
      duration_minutes: slot.durationMinutes,
    })
    .select("id")
    .single();

  if (error) {
    // Unique partial index (one pending request per occurrence) can
    // legitimately trigger here under a genuine race — same message either way.
    return NextResponse.json(
      { error: "slot_just_taken", message: "Η ώρα μόλις καταλήφθηκε, δοκίμασε άλλη" },
      { status: 409 }
    );
  }

  const { data: tutor } = await admin
    .from("tutors")
    .select("email")
    .eq("id", student.tutorId)
    .single();

  if (tutor?.email) {
    await sendRescheduleRequestedEmail({
      tutorEmail: tutor.email,
      studentName: student.name,
      requestedDayLabel: dateLabel(parsed.data.newDate),
      requestedTimeLabel: timeLabel(parsed.data.newStartTime),
    });
  }

  return NextResponse.json({ ok: true, requestId: request_.id });
}
