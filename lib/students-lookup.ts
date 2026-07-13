import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type StudentPublicView = {
  id: string;
  name: string;
  subject: string;
  tutorName: string;
  tutorId: string;
  upcomingSlots: { id: string; dayOfWeek: number; startTime: string; durationMinutes: number }[];
  /** This student's own pending reschedule requests — so a parent revisiting
   * the link sees "request sent, waiting" instead of silence. */
  pendingRequests: { originalSlotId: string; newDate: string; newStartTime: string }[];
};

/**
 * Resolves a (tutorSlug, studentSlug) pair to exactly one student's own
 * data — never anything belonging to another student of the same tutor,
 * or any other tutor's data. This is the only entry point the
 * student-facing pages use; it never goes through RLS/Clerk because
 * students have no session at all.
 */
export async function resolveStudentBySlug(
  tutorSlug: string,
  studentSlug: string
): Promise<StudentPublicView | null> {
  const admin = createAdminSupabaseClient();

  const { data: tutor } = await admin.from("tutors").select("id, name").eq("slug", tutorSlug).maybeSingle();
  if (!tutor) return null;

  const { data: student } = await admin
    .from("students")
    .select("id, name, subject, tutor_id")
    .eq("tutor_id", tutor.id)
    .eq("magic_link_slug", studentSlug)
    .eq("active", true)
    .maybeSingle();

  if (!student) return null;

  const [{ data: slots }, { data: pending }] = await Promise.all([
    admin
      .from("slots")
      .select("id, day_of_week, start_time, duration_minutes")
      .eq("student_id", student.id)
      .eq("active", true),
    admin
      .from("reschedule_requests")
      .select("original_slot_id, new_date, new_start_time")
      .eq("student_id", student.id)
      .eq("status", "pending"),
  ]);

  return {
    id: student.id,
    name: student.name,
    subject: student.subject,
    tutorId: student.tutor_id,
    tutorName: tutor.name,
    upcomingSlots: (slots ?? []).map((s) => ({
      id: s.id,
      dayOfWeek: s.day_of_week,
      startTime: s.start_time,
      durationMinutes: s.duration_minutes,
    })),
    pendingRequests: (pending ?? []).map((r) => ({
      originalSlotId: r.original_slot_id,
      newDate: r.new_date,
      newStartTime: r.new_start_time,
    })),
  };
}
