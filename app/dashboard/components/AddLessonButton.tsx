"use client";

import { useState, useTransition } from "react";
import { addSlotAction } from "@/app/dashboard/actions";
import { GREEK_DAY_LABELS, DURATION_OPTIONS, durationLabel } from "@/lib/greek";
import { TimeSelect } from "@/app/components/TimeSelect";
import { IconPlus } from "@/app/components/icons";

export function AddLessonButton({ studentId }: { studentId: string }) {
  const [open, setOpen] = useState(false);
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState("16:00");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full border border-cream-dark px-3 py-2 text-sm font-medium text-ink-soft transition active:scale-[0.98] hover:bg-cream-dark active:bg-cream-dark"
      >
        <IconPlus />
        Ώρα μαθήματος
      </button>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2 rounded-md border border-cream-dark p-3">
      <div className="flex gap-2">
        <select
          value={dayOfWeek}
          onChange={(e) => setDayOfWeek(Number(e.target.value))}
          className="flex-1 rounded-md border border-cream-dark px-2 py-1.5 text-sm"
        >
          {GREEK_DAY_LABELS.map((label, i) => (
            <option key={i} value={i}>
              {label}
            </option>
          ))}
        </select>
        <TimeSelect value={startTime} onChange={setStartTime} className="rounded-md border border-cream-dark px-2 py-1.5 text-sm" />
      </div>
      <select
        value={durationMinutes}
        onChange={(e) => setDurationMinutes(Number(e.target.value))}
        className="rounded-md border border-cream-dark px-2 py-1.5 text-sm"
      >
        {DURATION_OPTIONS.map((d) => (
          <option key={d} value={d}>
            {durationLabel(d)}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-700">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await addSlotAction(studentId, { dayOfWeek, startTime, durationMinutes });
              if (result.ok) setOpen(false);
              else setError(result.error);
            })
          }
          className="rounded-full bg-ink px-3 py-2 text-sm font-semibold text-cream hover:opacity-90 active:opacity-80 disabled:opacity-50"
        >
          Προσθήκη
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full border border-cream-dark px-3 py-2 text-sm font-medium text-ink-soft hover:bg-cream-dark active:bg-cream-dark"
        >
          Άκυρο
        </button>
      </div>
    </div>
  );
}
