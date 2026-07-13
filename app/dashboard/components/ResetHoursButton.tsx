"use client";

import { useTransition } from "react";
import { resetStudentHoursAction } from "@/app/dashboard/actions";
import { IconRefresh } from "@/app/components/icons";

export function ResetHoursButton({ studentId }: { studentId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!confirm("Οι ολοκληρωμένες ώρες θα μηδενιστούν (η ιστορικότητα δεν χάνεται). Συνέχεια;")) return;
        startTransition(() => {
          resetStudentHoursAction(studentId);
        });
      }}
      className="flex items-center gap-1.5 rounded-full border border-cream-dark px-3 py-2 text-sm font-medium text-ink-soft transition active:scale-[0.98] hover:bg-cream-dark active:bg-cream-dark disabled:opacity-50"
    >
      <IconRefresh />
      {isPending ? "..." : "Μηδενισμός ωρών (πληρώθηκα)"}
    </button>
  );
}
