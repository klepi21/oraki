import { NextRequest, NextResponse } from "next/server";
import { resolveStudentBySlug } from "@/lib/students-lookup";
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

  // Same generic response whether the slug is unknown, malformed, or
  // belongs to a deactivated student — never leak which case it was.
  if (!student) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    name: student.name,
    subject: student.subject,
    tutorName: student.tutorName,
    // Every one of the student's own recurring lessons, so the student
    // can pick WHICH one they're rescheduling if they have more than one
    // (see /open-slots and /reschedule, both keyed off slot id).
    upcomingSlots: student.upcomingSlots.map((s) => ({
      id: s.id,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      durationMinutes: s.durationMinutes,
    })),
    pendingRequests: student.pendingRequests,
  });
}
