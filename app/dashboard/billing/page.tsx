import { createTutorSupabaseClient } from "@/lib/supabase/server";
import { ensureTutorRecord } from "@/lib/tutors";
import {
  FREE_STUDENT_COUNT,
  BILLED_STUDENT_CAP,
  PRICE_PER_STUDENT_EUR,
  billedQuantity,
  monthlyChargeEur,
} from "@/lib/stripe/billing";

export default async function BillingPage() {
  const tutor = await ensureTutorRecord();
  const supabase = await createTutorSupabaseClient();

  const { count } = await supabase
    .from("students")
    .select("id", { count: "exact", head: true })
    .eq("tutor_id", tutor.id)
    .eq("active", true);

  const activeStudentCount = count ?? 0;
  const charge = monthlyChargeEur(activeStudentCount);
  const billedCount = billedQuantity(activeStudentCount);
  const nearLimit = activeStudentCount >= FREE_STUDENT_COUNT && activeStudentCount < FREE_STUDENT_COUNT + 1;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight text-ink">Η συνδρομή σου</h1>

      <div className="rounded-2xl border border-cream-dark p-4">
        <p className="text-sm text-ink-soft">Μαθητές αυτή τη στιγμή</p>
        <p className="text-2xl font-semibold text-ink">{activeStudentCount}</p>
      </div>

      <div className="rounded-2xl border border-cream-dark p-4">
        <p className="text-sm text-ink-soft">Μηνιαία χρέωση</p>
        <p className="text-2xl font-semibold text-ink">{charge}€ / μήνα</p>
        <p className="mt-1 text-sm text-ink-soft">
          Οι πρώτοι {FREE_STUDENT_COUNT} μαθητές είναι δωρεάν. Μετά, {PRICE_PER_STUDENT_EUR}€ ανά
          μαθητή τον μήνα, με ανώτατο όριο {BILLED_STUDENT_CAP * PRICE_PER_STUDENT_EUR}€.
        </p>
        {billedCount >= BILLED_STUDENT_CAP && (
          <p className="mt-1 text-sm text-ink-soft">
            Έχεις φτάσει το ανώτατο όριο χρέωσης — επιπλέον μαθητές δεν προσθέτουν κόστος.
          </p>
        )}
      </div>

      {nearLimit && (
        <div className="rounded-lg bg-accent-soft p-4 text-sm text-accent-dark">
          Ο επόμενος μαθητής που θα προσθέσεις θα ξεκινήσει τη χρέωση των {PRICE_PER_STUDENT_EUR}€/μήνα.
        </div>
      )}
    </div>
  );
}
