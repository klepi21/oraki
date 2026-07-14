"use client";

import { useEffect, useState } from "react";
import {
  IconUsers,
  IconLink,
  IconClock,
  IconCalendarDays,
  IconSettings,
  IconPencil,
} from "@/app/components/icons";

const STORAGE_KEY = "oraki_dashboard_onboarding_seen_v1";

const STEPS: { icon: React.ReactNode; title: string; body: string; note?: string }[] = [
  {
    icon: <IconUsers />,
    title: "Πρόσθεσε μαθητές",
    body:
      "Στο κάτω μέρος του dashboard πάτα «Πρόσθεσε μαθητή». Δώσε όνομα, μάθημα, και την ώρα/διάρκεια του μαθήματός του — εβδομαδιαία ή μία φορά για μια συγκεκριμένη ημερομηνία.",
  },
  {
    icon: <IconLink />,
    title: "Ο σύνδεσμος κάθε μαθητή",
    body:
      "Κάθε μαθητής παίρνει αυτόματα τον δικό του σύνδεσμο (π.χ. oraki.gr/εσύ/μαρπα). Πάτα «Αντιγραφή» στην κάρτα του για να τον στείλεις στον γονέα, «Νέος σύνδεσμος» για να τον ανανεώσεις, ή άλλαξέ τον χειροκίνητα από το μενού του μαθητή.",
  },
  {
    icon: <IconClock />,
    title: "Ώρες μαθήματος & πρόοδος",
    body:
      "Σε κάθε μάθημα στο πρόγραμμα άλλαξε την κατάσταση σε «Σε εξέλιξη», «Έγινε» ή «Ακυρώθηκε». Οι ολοκληρωμένες ώρες μετρούν αυτόματα ανά μαθητή — και τις μηδενίζεις μόλις πληρωθείς.",
  },
  {
    icon: <IconCalendarDays />,
    title: "Το πρόγραμμά σου",
    body:
      "Δες το πρόγραμμα εβδομαδιαία ή μηνιαία, με βέλη για επόμενη/προηγούμενη περίοδο. Οι εγκεκριμένες αλλαγές ώρας ξεχωρίζουν με χρώμα ώστε να τις προσέξεις εύκολα.",
  },
  {
    icon: <IconSettings />,
    title: "Πότε είσαι διαθέσιμος",
    body:
      "Στο μενού «Διαθεσιμότητα» όρισε τις ώρες που κάνεις μάθημα, ώστε οι μαθητές να βλέπουν μόνο ελεύθερες ώρες όταν ζητάνε αλλαγή. Μπορείς επίσης να προσθέσεις εξαιρέσεις για συγκεκριμένες ημερομηνίες.",
  },
  {
    icon: <IconPencil />,
    title: "Ο δικός σου σύνδεσμος",
    body:
      "Στις «Ρυθμίσεις» μπορείς να αλλάξεις το δικό σου δημόσιο link — αυτό που βλέπουν όλοι οι μαθητές σου.",
    note:
      "Σημείωση: για λόγους ιδιωτικότητας και ασφάλειας προτίμησε κάτι μη αναγνωρίσιμο αντί για το όνομά σου — κάτι σύντομο, π.χ. «math».",
  },
];

export function DashboardOnboarding() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Reading localStorage must happen post-mount (unavailable during SSR,
    // and matching the server-rendered "closed" markup avoids a hydration
    // mismatch) — a one-time sync from an external system, not app state.
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
    } catch {
      // localStorage unavailable (private mode, etc.) — just skip the popup.
    }
  }, []);

  function dismiss() {
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Nothing to do — worst case it shows again next time.
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-cream shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-cream-dark px-6 py-5">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-ink">Καλώς ήρθες στο Oraki! 👋</h2>
            <p className="mt-1 text-sm text-ink-soft">Ένας γρήγορος οδηγός για να ξεκινήσεις.</p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Κλείσιμο"
            className="shrink-0 rounded-full p-1.5 text-ink-soft transition hover:bg-cream-dark active:scale-95"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto px-6 py-5">
          {STEPS.map((step) => (
            <div key={step.title} className="flex gap-3 rounded-2xl border border-cream-dark bg-white p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-dark">
                {step.icon}
              </div>
              <div>
                <p className="font-semibold text-ink">{step.title}</p>
                <p className="mt-0.5 text-sm text-ink-soft">{step.body}</p>
                {step.note && (
                  <p className="mt-2 rounded-lg bg-accent-soft px-2.5 py-1.5 text-xs text-accent-dark">
                    {step.note}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-cream-dark px-6 py-4">
          <button
            type="button"
            onClick={dismiss}
            className="w-full rounded-full bg-ink px-4 py-3 text-base font-semibold text-cream transition active:scale-[0.98] hover:opacity-90 active:opacity-80"
          >
            Ξεκίνα!
          </button>
        </div>
      </div>
    </div>
  );
}
