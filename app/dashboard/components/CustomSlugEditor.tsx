"use client";

import { useState, useTransition } from "react";
import { setCustomStudentSlugAction } from "@/app/dashboard/actions";
import { IconPencil } from "@/app/components/icons";

export function CustomSlugEditor({ studentId, currentSlug }: { studentId: string; currentSlug: string }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(currentSlug);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full border border-cream-dark px-3 py-2 text-sm font-medium text-ink-soft transition active:scale-[0.98] hover:bg-cream-dark active:bg-cream-dark"
      >
        <IconPencil />
        Δικός μου σύνδεσμος
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-cream-dark p-3">
      <label className="text-xs text-ink-soft">
        Γράψε το κομμάτι του συνδέσμου που θέλεις μετά το όνομά σου (π.χ. &quot;gerdinos&quot;)
      </label>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value.toLowerCase())}
          className="flex-1 rounded-md border border-cream-dark px-3 py-2 text-base"
        />
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await setCustomStudentSlugAction(studentId, value);
              if (result.ok) setOpen(false);
              else setError(result.error);
            });
          }}
          className="rounded-full bg-ink px-3 py-2 text-sm font-semibold text-cream hover:opacity-90 active:opacity-80 disabled:opacity-50"
        >
          {isPending ? "..." : "Αποθήκευση"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setValue(currentSlug);
            setError(null);
          }}
          className="rounded-full border border-cream-dark px-3 py-2 text-sm font-medium text-ink-soft hover:bg-cream-dark active:bg-cream-dark"
        >
          Άκυρο
        </button>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
