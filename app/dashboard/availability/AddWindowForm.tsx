"use client";

import { useRef, useState, useTransition } from "react";
import { addAvailabilityWindowAction } from "@/app/dashboard/availability/actions";
import { GREEK_DAY_LABELS } from "@/lib/greek";
import { TimeSelect } from "@/app/components/TimeSelect";
import { IconPlus } from "@/app/components/icons";

export function AddWindowForm() {
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
        Πρόσθεσε διαθεσιμότητα
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await addAvailabilityWindowAction(formData);
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
      <h3 className="text-lg font-semibold text-ink">Πρόσθεσε διαθεσιμότητα</h3>
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
          Μέρα
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
          Από
          <TimeSelect name="startTime" defaultValue="15:00" />
        </label>
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
          Έως
          <TimeSelect name="endTime" defaultValue="21:00" />
        </label>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-ink px-4 py-3 text-base font-semibold text-cream transition active:scale-[0.98] hover:opacity-90 active:opacity-80 disabled:opacity-50"
        >
          {isPending ? "Προσθήκη..." : "Προσθήκη"}
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
