import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { resolveStudentBySlug } from "@/lib/students-lookup";
import { checkStudentLookupRateLimit } from "@/lib/rate-limit";
import { dayLabel, dateLabel, timeLabel } from "@/lib/greek";
import { RescheduleForm } from "@/app/[tutorSlug]/[studentSlug]/RescheduleForm";

export const metadata: Metadata = {
  title: "Το μάθημά σου",
  robots: { index: false, follow: false },
};

export default async function StudentPage({
  params,
}: {
  params: Promise<{ tutorSlug: string; studentSlug: string }>;
}) {
  const { tutorSlug, studentSlug } = await params;
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  const allowed = await checkStudentLookupRateLimit(ip);
  if (!allowed) {
    return (
      <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center p-6 text-center">
        <p className="text-ink-soft">Πολλές προσπάθειες. Δοκίμασε ξανά σε λίγο.</p>
      </main>
    );
  }

  const student = await resolveStudentBySlug(tutorSlug, studentSlug);
  if (!student) notFound();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-1 flex-col gap-6 bg-cream p-6">
      <div>
        <p className="text-sm text-ink-soft">Καθηγητής: {student.tutorName}</p>
        <h1 className="text-2xl font-bold tracking-tight text-ink">
          Γεια σου, {student.name.split(" ")[0]}!
        </h1>
        <p className="text-sm text-ink-soft">{student.subject}</p>
      </div>

      <section className="rounded-2xl border border-cream-dark bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-ink">
          {student.upcomingSlots.length > 1 ? "Τα μαθήματά σου" : "Το μάθημά σου"}
        </h2>
        {student.upcomingSlots.length === 0 && (
          <p className="mt-2 text-sm text-ink-soft">Δεν έχει οριστεί ακόμα ώρα μαθήματος.</p>
        )}
        <ul className="mt-2 flex flex-col gap-2 text-ink">
          {student.upcomingSlots.map((slot) => {
            const pending = student.pendingRequests.find((r) => r.originalSlotId === slot.id);
            return (
              <li key={slot.id}>
                {dayLabel(slot.dayOfWeek)}, {timeLabel(slot.startTime)} ({slot.durationMinutes}′)
                {pending && (
                  <p className="mt-0.5 w-fit rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent-dark">
                    Ζήτησες: {dateLabel(pending.newDate)}, {timeLabel(pending.newStartTime)} (περιμένει απάντηση)
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <RescheduleForm
        tutorSlug={tutorSlug}
        studentSlug={studentSlug}
        lessons={student.upcomingSlots}
        pendingSlotIds={student.pendingRequests.map((r) => r.originalSlotId)}
      />
    </main>
  );
}
