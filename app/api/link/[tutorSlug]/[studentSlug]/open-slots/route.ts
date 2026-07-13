import { NextRequest, NextResponse } from "next/server";
import { resolveStudentBySlug } from "@/lib/students-lookup";
import { computeOpenSlotsForTutor } from "@/lib/schedule-db";
import { nextOccurrenceDate } from "@/lib/schedule";
import { checkStudentLookupRateLimit } from "@/lib/rate-limit";

export async function GET(
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

  const originalSlotId = request.nextUrl.searchParams.get("originalSlotId");
  const slot = student.upcomingSlots.find((s) => s.id === originalSlotId);
  if (!slot) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const openSlots = await computeOpenSlotsForTutor(student.tutorId, slot.durationMinutes);

  return NextResponse.json({
    originalDate: nextOccurrenceDate(slot.dayOfWeek),
    durationMinutes: slot.durationMinutes,
    openSlots,
  });
}
