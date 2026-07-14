import { createTutorSupabaseClient } from "@/lib/supabase/server";
import { ensureTutorRecord } from "@/lib/tutors";
import { dayLabel, timeLabel, dateLabel } from "@/lib/greek";
import { toISODate } from "@/lib/schedule";
import { AddWindowForm } from "@/app/dashboard/availability/AddWindowForm";
import { RemoveWindowButton } from "@/app/dashboard/availability/RemoveWindowButton";
import { AddOverrideForm } from "@/app/dashboard/availability/AddOverrideForm";
import { RemoveOverrideButton } from "@/app/dashboard/availability/RemoveOverrideButton";

export default async function AvailabilityPage() {
  const tutor = await ensureTutorRecord();
  const supabase = await createTutorSupabaseClient();

  const [{ data: windows }, { data: overrides }] = await Promise.all([
    supabase
      .from("tutor_availability")
      .select("id, day_of_week, start_time, end_time")
      .eq("tutor_id", tutor.id)
      .order("day_of_week", { ascending: true }),
    supabase
      .from("availability_overrides")
      .select("id, date, start_time, end_time, is_available")
      .eq("tutor_id", tutor.id)
      .gte("date", toISODate(new Date()))
      .order("date", { ascending: true }),
  ]);

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
          <div
            key={w.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-cream-dark p-4"
          >
            <p className="min-w-0 break-words text-ink-soft">
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

      <div className="mt-2">
        <h2 className="text-lg font-semibold text-ink">Εξαιρέσεις σε συγκεκριμένες ημερομηνίες</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Για μεμονωμένες ημέρες που ξεφεύγουν από το συνηθισμένο πρόγραμμά σου — π.χ. κλειστό ένα
          απόγευμα, ή έξτρα διαθεσιμότητα ένα Σάββατο.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {(overrides ?? []).map((o) => (
          <div
            key={o.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-cream-dark p-4"
          >
            <p className="min-w-0 break-words text-ink-soft">
              {dateLabel(o.date)}: {timeLabel(o.start_time)}–{timeLabel(o.end_time)}{" "}
              <span
                className={`ml-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                  o.is_available ? "bg-accent-soft text-accent-dark" : "bg-red-50 text-red-700"
                }`}
              >
                {o.is_available ? "Έξτρα" : "Κλειστό"}
              </span>
            </p>
            <RemoveOverrideButton overrideId={o.id} />
          </div>
        ))}
        {(overrides ?? []).length === 0 && (
          <p className="text-sm text-ink-soft">Δεν έχεις ορίσει εξαιρέσεις.</p>
        )}
      </div>

      <AddOverrideForm />
    </div>
  );
}
