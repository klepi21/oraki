"use client";

import { useTransition } from "react";
import { removeStudentAction, reactivateStudentAction } from "@/app/dashboard/actions";
import { IconTrash, IconRefresh } from "@/app/components/icons";

export function RemoveStudentButton({ studentId }: { studentId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!confirm("Ο μαθητής θα αφαιρεθεί και ο σύνδεσμός του θα σταματήσει να δουλεύει. Συνέχεια;"))
          return;
        startTransition(() => {
          removeStudentAction(studentId);
        });
      }}
      className="flex items-center gap-1.5 rounded-full border border-red-200 px-3 py-2 text-sm font-medium text-red-700 transition active:scale-[0.98] hover:bg-red-50 active:bg-red-50 disabled:opacity-50"
    >
      <IconTrash />
      {isPending ? "..." : "Αφαίρεση"}
    </button>
  );
}

export function ReactivateStudentButton({ studentId }: { studentId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => { reactivateStudentAction(studentId); })}
      className="flex items-center gap-1.5 rounded-full border border-cream-dark px-3 py-2 text-sm font-medium text-ink-soft transition active:scale-[0.98] hover:bg-cream-dark active:bg-cream-dark disabled:opacity-50"
    >
      <IconRefresh />
      {isPending ? "..." : "Επαναφορά"}
    </button>
  );
}
