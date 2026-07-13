"use client";

import { useRef, useState, useTransition } from "react";
import { addStudentAction } from "@/app/dashboard/actions";
import { GREEK_DAY_LABELS, DURATION_OPTIONS, durationLabel } from "@/lib/greek";
import { TimeSelect } from "@/app/components/TimeSelect";
import { IconPlus } from "@/app/components/icons";

export function AddStudentForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-cream-dark bg-white px-4 py-4 text-base font-medium text-ink-soft transition active:scale-[0.98] hover:bg-cream-dark active:bg-cream-dark"
      >
        <IconPlus />
        Πρόσθεσε μαθητή
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await addStudentAction(formData);
          if (result.ok) {
            formRef.current?.reset();
            setOpen(false);
          } else {
            setError(result.error);
          }
        });
      }}
      className="flex flex-col gap-3 rounded-2xl border border-cream-dark bg-white p-4"
    >
      <h3 className="text-lg font-semibold text-ink">Πρόσθεσε μαθητή</h3>

      <label className="flex flex-col gap-1 text-sm">
        Όνομα
        <input
          name="name"
          required
          autoFocus
          className="rounded-md border border-cream-dark px-3 py-2 text-base"
          placeholder="π.χ. Μαρία Παπαδοπούλου"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Μάθημα
        <input
          name="subject"
          required
          className="rounded-md border border-cream-dark px-3 py-2 text-base"
          placeholder="π.χ. Μαθηματικά"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Email γονέα/μαθητή (προαιρετικό, για ειδοποιήσεις)
        <input
          name="contactEmail"
          type="email"
          className="rounded-md border border-cream-dark px-3 py-2 text-base"
          placeholder="email@example.com"
        />
      </label>

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
          Μέρα μαθήματος
          <select
            name="dayOfWeek"
            required
            defaultValue="1"
            className="w-full min-w-0 rounded-md border border-cream-dark px-3 py-2 text-base"
          >
            {GREEK_DAY_LABELS.map((label, i) => (
              <option key={i} value={i}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
          Ώρα
          <TimeSelect name="startTime" defaultValue="16:00" />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Διάρκεια μαθήματος
        <select
          name="durationMinutes"
          defaultValue={60}
          className="rounded-md border border-cream-dark px-3 py-2 text-base"
        >
          {DURATION_OPTIONS.map((d) => (
            <option key={d} value={d}>
              {durationLabel(d)}
            </option>
          ))}
        </select>
      </label>

      {error && <p className="text-sm text-red-700">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-ink px-4 py-3 text-base font-semibold text-cream transition active:scale-[0.98] hover:opacity-90 active:opacity-80 disabled:opacity-50"
        >
          {isPending ? "Προσθήκη..." : "Προσθήκη μαθητή"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full border border-cream-dark px-4 py-3 text-base font-medium text-ink-soft transition active:scale-[0.98] hover:bg-cream-dark active:bg-cream-dark"
        >
          Άκυρο
        </button>
      </div>
    </form>
  );
}
