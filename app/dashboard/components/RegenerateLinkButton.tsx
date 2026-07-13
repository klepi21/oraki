"use client";

import { useTransition } from "react";
import { regenerateStudentLinkAction } from "@/app/dashboard/actions";
import { IconRefresh } from "@/app/components/icons";

export function RegenerateLinkButton({ studentId }: { studentId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!confirm("Ο παλιός σύνδεσμος θα σταματήσει να δουλεύει αμέσως. Συνέχεια;")) return;
        startTransition(() => {
          regenerateStudentLinkAction(studentId);
        });
      }}
      className="flex items-center gap-1.5 rounded-full border border-cream-dark px-3 py-2 text-sm font-medium text-ink-soft transition active:scale-[0.98] hover:bg-cream-dark active:bg-cream-dark disabled:opacity-50"
    >
      <IconRefresh />
      {isPending ? "..." : "Νέος σύνδεσμος"}
    </button>
  );
}
