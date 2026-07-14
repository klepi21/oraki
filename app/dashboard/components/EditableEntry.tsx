"use client";

import { useState, useTransition } from "react";
import { GREEK_DAY_LABELS, durationLabel, DURATION_OPTIONS, dateLabel } from "@/lib/greek";
import { TimeSelect } from "@/app/components/TimeSelect";
import type { CalendarEntry } from "@/lib/calendar";
import type { ActionResult } from "@/app/dashboard/actions";

export type SeriesInput = { dayOfWeek: number; startTime: string; durationMinutes: number; oneTimeDate?: string | null };
export type SingleInput = { date: string; startTime: string; durationMinutes: number };

/**
 * The tutor's edit form for one calendar occurrence. For a one-time lesson
 * (entry.oneTimeDate set) there's no recurring series to preserve, so it's
 * a single save. For a recurring lesson, two distinct actions are offered
 * — mirroring the "this event / all future events" choice from Apple
 * Calendar — since changing "just this Tuesday" and changing "every
 * Tuesday from now on" are different operations on different tables
 * (lesson_exceptions vs slots).
 */
export function EditableEntry({
  entry,
  onSaveSeries,
  onSaveSingle,
  onCancel,
  onRemove,
}: {
  entry: CalendarEntry;
  onSaveSeries: (input: SeriesInput) => Promise<ActionResult>;
  onSaveSingle: (input: SingleInput) => Promise<ActionResult>;
  onCancel: () => void;
  onRemove: () => Promise<void>;
}) {
  const isOneTime = Boolean(entry.oneTimeDate);
  const [dayOfWeek, setDayOfWeek] = useState(entry.dayOfWeek);
  const [oneTimeDate, setOneTimeDate] = useState(entry.oneTimeDate ?? entry.date);
  const [startTime, setStartTime] = useState(entry.startTime.slice(0, 5));
  const [durationMinutes, setDurationMinutes] = useState(entry.durationMinutes);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const durationChoices = DURATION_OPTIONS.includes(durationMinutes as (typeof DURATION_OPTIONS)[number])
    ? [...DURATION_OPTIONS]
    : [...DURATION_OPTIONS, durationMinutes].sort((a, b) => a - b);

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-accent bg-white p-3">
      <p className="text-sm font-medium text-ink">
        {entry.studentName} <span className="font-normal text-ink-soft">— {entry.subject}</span>
      </p>
      {isOneTime ? (
        <input
          type="date"
          value={oneTimeDate}
          onChange={(e) => setOneTimeDate(e.target.value)}
          className="rounded-md border border-cream-dark px-2 py-1.5 text-sm"
        />
      ) : (
        <>
          <p className="text-xs text-ink-soft">
            Η μέρα αλλάζει μόνο με «Όλα τα επόμενα». Για «Μόνο αυτό το μάθημα» η ημερομηνία (
            {dateLabel(entry.date)}) μένει ίδια, αλλάζει μόνο η ώρα/διάρκεια.
          </p>
          <select
            value={dayOfWeek}
            onChange={(e) => setDayOfWeek(Number(e.target.value))}
            className="rounded-md border border-cream-dark px-2 py-1.5 text-sm"
          >
            {GREEK_DAY_LABELS.map((label, i) => (
              <option key={i} value={i}>
                {label}
              </option>
            ))}
          </select>
        </>
      )}
      <TimeSelect
        value={startTime}
        onChange={setStartTime}
        className="rounded-md border border-cream-dark px-2 py-1.5 text-sm"
      />
      <select
        value={durationMinutes}
        onChange={(e) => setDurationMinutes(Number(e.target.value))}
        className="rounded-md border border-cream-dark px-2 py-1.5 text-sm"
      >
        {durationChoices.map((d) => (
          <option key={d} value={d}>
            {durationLabel(d)}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {isOneTime ? (
          <button
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const result = await onSaveSeries({ dayOfWeek, startTime, durationMinutes, oneTimeDate });
                if (!result.ok) setError(result.error);
              })
            }
            className="rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-cream transition active:scale-[0.98] hover:opacity-90 active:opacity-80 disabled:opacity-50"
          >
            Αποθήκευση
          </button>
        ) : (
          <>
            <button
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  const result = await onSaveSingle({ date: entry.date, startTime, durationMinutes });
                  if (!result.ok) setError(result.error);
                })
              }
              className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-cream transition active:scale-[0.98] hover:opacity-90 active:opacity-80 disabled:opacity-50"
            >
              Μόνο αυτό το μάθημα
            </button>
            <button
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  const result = await onSaveSeries({ dayOfWeek, startTime, durationMinutes });
                  if (!result.ok) setError(result.error);
                })
              }
              className="rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-cream transition active:scale-[0.98] hover:opacity-90 active:opacity-80 disabled:opacity-50"
            >
              Όλα τα επόμενα
            </button>
          </>
        )}
        <button
          onClick={onCancel}
          className="rounded-full border border-cream-dark px-3 py-1.5 text-xs font-medium text-ink-soft transition active:scale-[0.98] hover:bg-cream-dark active:bg-cream-dark"
        >
          Άκυρο
        </button>
        <button
          disabled={isPending}
          onClick={() => startTransition(onRemove)}
          className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 transition active:scale-[0.98] hover:bg-red-50 active:bg-red-50"
        >
          Διαγραφή
        </button>
      </div>
    </div>
  );
}
