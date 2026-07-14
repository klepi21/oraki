import Link from "next/link";
import { createTutorSupabaseClient } from "@/lib/supabase/server";
import { ensureTutorRecord } from "@/lib/tutors";
import { studentLinkPath } from "@/lib/slugs";
import { dayLabel, dateLabel, timeLabel, weekRangeLabel, hoursDoneLabel } from "@/lib/greek";
import { toISODate, mondayOf, parseISODate, addDays, computeOccurrences } from "@/lib/schedule";
import type { CalendarEntry } from "@/lib/calendar";
import { Avatar } from "@/app/components/Avatar";
import { Expandable } from "@/app/components/Expandable";
import { IconUsers, IconBell, IconClock } from "@/app/components/icons";
import { AddStudentForm } from "@/app/dashboard/components/AddStudentForm";
import { CopyLinkButton } from "@/app/dashboard/components/CopyLinkButton";
import { RegenerateLinkButton } from "@/app/dashboard/components/RegenerateLinkButton";
import { RemoveStudentButton, ReactivateStudentButton } from "@/app/dashboard/components/RemoveStudentButton";
import { CustomSlugEditor } from "@/app/dashboard/components/CustomSlugEditor";
import { RescheduleDecisionButtons } from "@/app/dashboard/components/RescheduleDecisionButtons";
import { CalendarView } from "@/app/dashboard/components/CalendarView";
import { AddLessonButton } from "@/app/dashboard/components/AddLessonButton";
import { ResetHoursButton } from "@/app/dashboard/components/ResetHoursButton";
import { updateSlotAction, removeSlotAction, setLessonStatusAction } from "@/app/dashboard/actions";

function relationToOne<T>(value: T | T[] | null): T | undefined {
  return Array.isArray(value) ? value[0] : (value ?? undefined);
}

function lessonSummary(slots: { day_of_week: number; start_time: string }[]): string {
  if (slots.length === 0) return "Χωρίς ώρα μαθήματος ακόμα";
  if (slots.length === 1) return `${dayLabel(slots[0].day_of_week)}, ${timeLabel(slots[0].start_time)}`;
  return `${slots.length} μαθήματα την εβδομάδα`;
}

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl border border-cream-dark bg-white p-3 text-center sm:flex-1 sm:flex-row sm:items-center sm:gap-3 sm:p-4 sm:text-left">
      <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-dark sm:flex">
        {icon}
      </div>
      <div>
        <p className="text-xl font-semibold leading-none text-ink sm:text-2xl">{value}</p>
        <p className="mt-1 text-[11px] leading-tight text-ink-soft sm:text-xs">{label}</p>
      </div>
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const tutor = await ensureTutorRecord();
  const supabase = await createTutorSupabaseClient();

  const weekStart = parseISODate(week) ?? mondayOf(new Date());
  const weekStartISO = toISODate(weekStart);
  const weekDates = Array.from({ length: 7 }, (_, i) => toISODate(addDays(weekStart, i)));
  const todayISO = toISODate(new Date());

  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select(
      "id, name, subject, active, magic_link_slug, hours_reset_at, slots(id, day_of_week, start_time, duration_minutes, active)"
    )
    .eq("tutor_id", tutor.id)
    .order("created_at", { ascending: true });

  if (studentsError) {
    // Most likely cause: migration 0007 (hours_reset_at / lesson_logs) hasn't
    // been applied to this Supabase project yet, so this select 42703s and
    // the whole dashboard would otherwise render as if there were no students.
    console.error("dashboard: failed to load students", studentsError);
  }

  const { data: pendingRequests } = await supabase
    .from("reschedule_requests")
    .select("id, new_date, new_start_time, students(name), original_slot:slots!original_slot_id(day_of_week, start_time)")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const { count: availabilityCount } = await supabase
    .from("tutor_availability")
    .select("id", { count: "exact", head: true })
    .eq("tutor_id", tutor.id);

  const activeSlotIds = (students ?? []).flatMap((s) => (s.slots ?? []).filter((sl) => sl.active).map((sl) => sl.id));

  const { data: upcomingExceptions } =
    activeSlotIds.length > 0
      ? await supabase
          .from("lesson_exceptions")
          .select("id, original_date, new_date, new_start_time, slots!original_slot_id(day_of_week, start_time, students(name, subject))")
          .in("original_slot_id", activeSlotIds)
          .gte("new_date", toISODate(new Date()))
          .order("new_date", { ascending: true })
      : { data: [] };

  // All exceptions for these slots (not just upcoming) so a week view can
  // reflect an occurrence moved in from, or out to, another week.
  const { data: allExceptions } =
    activeSlotIds.length > 0
      ? await supabase
          .from("lesson_exceptions")
          .select("original_slot_id, original_date, new_date, new_start_time, new_duration_minutes")
          .in("original_slot_id", activeSlotIds)
      : { data: [] };

  const { data: weekLogs } =
    activeSlotIds.length > 0
      ? await supabase
          .from("lesson_logs")
          .select("slot_id, occurrence_date, status")
          .in("slot_id", activeSlotIds)
          .gte("occurrence_date", weekDates[0])
          .lte("occurrence_date", weekDates[6])
      : { data: [] };

  const { data: doneLogs } =
    activeSlotIds.length > 0
      ? await supabase.from("lesson_logs").select("slot_id, occurrence_date, duration_minutes").eq("status", "done").in("slot_id", activeSlotIds)
      : { data: [] };

  const activeStudents = (students ?? []).filter((s) => s.active);
  const inactiveStudents = (students ?? []).filter((s) => !s.active);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://oraki.gr";

  const todayDayOfWeek = new Date().getDay();
  const lessonsToday = activeStudents.flatMap((s) => (s.slots ?? []).filter((sl) => sl.active && sl.day_of_week === todayDayOfWeek));

  // slotId -> student, for attaching names/subjects to computed occurrences.
  const studentBySlotId = new Map<string, { id: string; name: string; subject: string }>();
  for (const student of activeStudents) {
    for (const slot of student.slots ?? []) {
      if (slot.active) studentBySlotId.set(slot.id, { id: student.id, name: student.name, subject: student.subject });
    }
  }

  const recurringSlots = activeStudents.flatMap((student) =>
    (student.slots ?? [])
      .filter((slot) => slot.active)
      .map((slot) => ({
        id: slot.id,
        dayOfWeek: slot.day_of_week,
        startTime: slot.start_time,
        durationMinutes: slot.duration_minutes,
      }))
  );

  const exceptions = (allExceptions ?? []).map((e) => ({
    originalSlotId: e.original_slot_id,
    originalDate: e.original_date,
    newDate: e.new_date,
    newStartTime: e.new_start_time,
    newDurationMinutes: e.new_duration_minutes,
  }));

  const statusByKey = new Map<string, string>();
  for (const log of weekLogs ?? []) {
    statusByKey.set(`${log.slot_id}|${log.occurrence_date}`, log.status);
  }

  const occurrences = computeOccurrences(recurringSlots, exceptions, weekStart, 7);

  const calendarEntries: CalendarEntry[] = occurrences.flatMap((occ) => {
    const student = studentBySlotId.get(occ.slotId);
    if (!student) return [];
    return [
      {
        slotId: occ.slotId,
        studentId: student.id,
        studentName: student.name,
        subject: student.subject,
        date: occ.date,
        dayOfWeek: new Date(occ.date + "T00:00:00Z").getUTCDay(),
        startTime: occ.startTime,
        durationMinutes: occ.durationMinutes,
        moved: occ.moved,
        status: (statusByKey.get(`${occ.slotId}|${occ.date}`) as CalendarEntry["status"]) ?? "scheduled",
      },
    ];
  });

  // Hours done per student: sum of "done" lesson_logs, counting only from
  // the student's own hours_reset_at cutoff forward (if ever reset).
  const hoursDoneByStudent = new Map<string, number>();
  const resetAtByStudent = new Map<string, string | null>();
  for (const student of activeStudents) resetAtByStudent.set(student.id, student.hours_reset_at);
  for (const log of doneLogs ?? []) {
    const student = studentBySlotId.get(log.slot_id);
    if (!student) continue;
    const resetAt = resetAtByStudent.get(student.id);
    if (resetAt && log.occurrence_date <= resetAt.slice(0, 10)) continue;
    hoursDoneByStudent.set(student.id, (hoursDoneByStudent.get(student.id) ?? 0) + log.duration_minutes);
  }

  const prevWeekISO = toISODate(addDays(weekStart, -7));
  const nextWeekISO = toISODate(addDays(weekStart, 7));

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <section>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Γεια σου, {tutor.name.split(" ")[0]}</h1>
        <p className="mt-1 text-sm text-ink-soft">Να τι συμβαίνει στο πρόγραμμά σου αυτή τη στιγμή.</p>
      </section>

      <section className="grid grid-cols-3 gap-2 sm:flex sm:gap-3">
        <StatTile icon={<IconUsers />} label="Μαθητές" value={activeStudents.length} />
        <StatTile icon={<IconBell />} label="Αιτήματα" value={pendingRequests?.length ?? 0} />
        <StatTile icon={<IconClock />} label="Σήμερα" value={lessonsToday.length} />
      </section>

      {(availabilityCount ?? 0) === 0 && activeStudents.length > 0 && (
        <Link
          href="/dashboard/availability"
          className="rounded-2xl bg-accent-soft p-4 text-sm text-accent-dark transition active:scale-[0.99]"
        >
          Δεν έχεις ορίσει ακόμα πότε μπορείς να κάνεις μάθημα. Μέχρι τότε, οι μαθητές σου δεν
          μπορούν να ζητήσουν αλλαγή ώρας. <span className="font-semibold underline">Όρισέ το εδώ</span>
        </Link>
      )}

      {(pendingRequests?.length ?? 0) > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-ink">Αιτήματα αλλαγής ώρας</h2>
          {pendingRequests!.map((r) => {
            const student = relationToOne(r.students);
            const originalSlot = relationToOne(r.original_slot);
            return (
              <div
                key={r.id}
                className="flex flex-col gap-3 rounded-2xl border border-cream-dark bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={student?.name ?? "?"} />
                  <div>
                    <p className="text-lg font-semibold text-ink">{student?.name}</p>
                    <p className="text-sm text-ink-soft">
                      {originalSlot && `${dayLabel(originalSlot.day_of_week)} ${timeLabel(originalSlot.start_time)} → `}
                      <span className="font-medium text-accent-dark">
                        {dateLabel(r.new_date)}, {timeLabel(r.new_start_time)}
                      </span>
                    </p>
                  </div>
                </div>
                <RescheduleDecisionButtons requestId={r.id} />
              </div>
            );
          })}
        </section>
      )}

      {(upcomingExceptions?.length ?? 0) > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-ink">Προσωρινές αλλαγές (εγκεκριμένες)</h2>
          {upcomingExceptions!.map((exc) => {
            const slot = relationToOne(exc.slots);
            const student = slot ? relationToOne(slot.students) : undefined;
            return (
              <div key={exc.id} className="flex items-center gap-3 rounded-2xl border-2 border-accent bg-accent-soft p-4">
                <Avatar name={student?.name ?? "?"} />
                <div>
                  <p className="text-lg font-semibold text-ink">{student?.name}</p>
                  <p className="text-sm text-ink-soft">
                    {dateLabel(exc.original_date)} →{" "}
                    <span className="font-medium text-accent-dark">
                      {dateLabel(exc.new_date)}, {timeLabel(exc.new_start_time)}
                    </span>
                  </p>
                </div>
              </div>
            );
          })}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-ink">Εβδομαδιαίο πρόγραμμα</h2>
        <CalendarView
          entries={calendarEntries}
          weekDates={weekDates}
          weekLabel={weekRangeLabel(weekStartISO)}
          prevHref={`/dashboard?week=${prevWeekISO}`}
          nextHref={`/dashboard?week=${nextWeekISO}`}
          todayISO={todayISO}
          onUpdate={updateSlotAction}
          onRemove={removeSlotAction}
          onStatusChange={setLessonStatusAction}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-ink">Μαθητές</h2>
        {activeStudents.length === 0 && (
          <p className="text-sm text-ink-soft">Δεν έχεις προσθέσει ακόμα μαθητή.</p>
        )}
        {activeStudents.map((student) => {
          const link = `${appUrl}${studentLinkPath(tutor.slug, student.magic_link_slug)}`;
          const activeSlots = (student.slots ?? []).filter((sl) => sl.active);
          const hoursDone = hoursDoneByStudent.get(student.id) ?? 0;
          return (
            <Expandable
              key={student.id}
              header={
                <div className="flex items-center gap-3">
                  <Avatar name={student.name} size={40} />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">
                      {student.name} <span className="font-normal text-ink-soft">— {student.subject}</span>
                    </p>
                    <p className="truncate text-xs text-ink-soft">{lessonSummary(activeSlots)}</p>
                  </div>
                  <CopyLinkButton url={link} compact />
                </div>
              }
            >
              <div className="flex items-center gap-2 rounded-xl bg-accent-soft px-3 py-2 text-sm text-accent-dark">
                <IconClock />
                <span className="font-semibold">{hoursDoneLabel(hoursDone)}</span>
                <span className="text-accent-dark/80">ολοκληρωμένες από τον τελευταίο μηδενισμό</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <RegenerateLinkButton studentId={student.id} />
                <AddLessonButton studentId={student.id} />
                <RemoveStudentButton studentId={student.id} />
                <ResetHoursButton studentId={student.id} />
              </div>
              <CustomSlugEditor studentId={student.id} currentSlug={student.magic_link_slug} />
            </Expandable>
          );
        })}
      </section>

      {inactiveStudents.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-ink">Αφαιρεμένοι μαθητές</h2>
          {inactiveStudents.map((student) => (
            <div
              key={student.id}
              className="flex items-center justify-between rounded-2xl border border-cream-dark bg-white p-4 opacity-70"
            >
              <div className="flex items-center gap-3">
                <Avatar name={student.name} />
                <p className="text-ink-soft">
                  {student.name} — {student.subject}
                </p>
              </div>
              <ReactivateStudentButton studentId={student.id} />
            </div>
          ))}
        </section>
      )}

      <section>
        <AddStudentForm />
      </section>
    </div>
  );
}
