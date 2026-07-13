import { createTutorSupabaseClient } from "@/lib/supabase/server";
import { ensureTutorRecord } from "@/lib/tutors";
import { dayLabel, timeLabel } from "@/lib/greek";
import { AddWindowForm } from "@/app/dashboard/availability/AddWindowForm";
import { RemoveWindowButton } from "@/app/dashboard/availability/RemoveWindowButton";

export default async function AvailabilityPage() {
  const tutor = await ensureTutorRecord();
  const supabase = await createTutorSupabaseClient();

  const { data: windows } = await supabase
    .from("tutor_availability")
    .select("id, day_of_week, start_time, end_time")
    .eq("tutor_id", tutor.id)
    .order("day_of_week", { ascending: true });

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Πότε μπορείς να κάνεις μάθημα</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Οι μαθητές θα βλέπουν μόνο ελεύθερες ώρες μέσα σε αυτά τα διαστήματα, όταν ζητάνε αλλαγή.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {(windows ?? []).map((w) => (
          <div key={w.id} className="flex items-center justify-between rounded-2xl border border-cream-dark p-4">
            <p className="text-ink-soft">
              {dayLabel(w.day_of_week)}: {timeLabel(w.start_time)}–{timeLabel(w.end_time)}
            </p>
            <RemoveWindowButton windowId={w.id} />
          </div>
        ))}
        {(windows ?? []).length === 0 && (
          <p className="text-sm text-ink-soft">Δεν έχεις ορίσει ακόμα διαθεσιμότητα.</p>
        )}
      </div>

      <AddWindowForm />
    </div>
  );
}
