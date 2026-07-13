"use client";

import { useState, useTransition } from "react";
import { GREEK_DAY_LABELS, timeLabel, durationLabel, DURATION_OPTIONS } from "@/lib/greek";
import { groupEntriesByDay, CALENDAR_DAY_ORDER, type CalendarEntry } from "@/lib/calendar";
import { TimeSelect } from "@/app/components/TimeSelect";
import { avatarColor } from "@/app/components/Avatar";
import type { ActionResult } from "@/app/dashboard/actions";

type SlotInput = { dayOfWeek: number; startTime: string; durationMinutes: number };

const SHORT_DAY_LABELS = ["Κυρ", "Δευ", "Τρί", "Τετ", "Πέμ", "Παρ", "Σάβ"];

/** Date-of-month for each weekday of the week containing today (local time). */
function currentWeekDates(): Record<number, number> {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const dates: Record<number, number> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates[d.getDay()] = d.getDate();
  }
  return dates;
}

export function CalendarView({
  entries,
  onUpdate,
  onRemove,
}: {
  entries: CalendarEntry[];
  onUpdate: (slotId: string, input: SlotInput) => Promise<ActionResult>;
  onRemove: (slotId: string) => Promise<ActionResult>;
}) {
  const byDay = groupEntriesByDay(entries);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const todayDayOfWeek = new Date().getDay();
  const [selectedDay, setSelectedDay] = useState(todayDayOfWeek);
  const weekDates = currentWeekDates();

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-cream-dark bg-white py-10 text-center">
        <p className="text-sm text-ink-soft">Δεν έχεις ακόμα μαθήματα στο πρόγραμμα.</p>
        <p className="text-xs text-ink-soft">Πρόσθεσε έναν μαθητή παρακάτω για να ξεκινήσεις.</p>
      </div>
    );
  }

  function renderEntry(entry: CalendarEntry) {
    return editingSlotId === entry.slotId ? (
      <EditableEntry
        key={entry.slotId}
        entry={entry}
        onCancel={() => setEditingSlotId(null)}
        onSave={async (input) => {
          const result = await onUpdate(entry.slotId, input);
          if (result.ok) setEditingSlotId(null);
          return result;
        }}
        onRemove={async () => {
          await onRemove(entry.slotId);
          setEditingSlotId(null);
        }}
      />
    ) : (
      <button
        key={entry.slotId}
        onClick={() => setEditingSlotId(entry.slotId)}
        style={{ borderLeftColor: avatarColor(entry.studentName), borderLeftWidth: 3 }}
        className="flex flex-col rounded-xl border border-cream-dark bg-white p-3 text-left shadow-sm transition active:scale-[0.98] hover:bg-cream-dark active:bg-cream-dark"
      >
        <span className="text-sm font-semibold text-accent-dark">{timeLabel(entry.startTime)}</span>
        <span className="text-sm font-medium text-ink">{entry.studentName}</span>
        <span className="text-xs text-ink-soft">{entry.subject}</span>
      </button>
    );
  }

  return (
    <>
      {/* Mobile: a day-picker strip + a single day's lessons, so there's
          no need to scroll past six other days to see today. */}
      <div className="sm:hidden">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {CALENDAR_DAY_ORDER.map((dayIndex) => {
            const count = byDay[dayIndex].length;
            const isToday = dayIndex === todayDayOfWeek;
            const isSelected = dayIndex === selectedDay;
            return (
              <button
                key={dayIndex}
                onClick={() => setSelectedDay(dayIndex)}
                className={`flex min-w-11 flex-1 flex-col items-center gap-0.5 rounded-2xl py-2 transition active:scale-95 ${
                  isSelected ? "bg-ink text-cream" : "bg-white text-ink-soft"
                }`}
              >
                <span className="text-[11px] font-medium">{SHORT_DAY_LABELS[dayIndex]}</span>
                <span
                  className={`text-base font-semibold leading-none ${
                    isSelected ? "text-cream" : isToday ? "text-accent-dark" : "text-ink"
                  }`}
                >
                  {weekDates[dayIndex]}
                </span>
                <span
                  className={`h-1 w-1 rounded-full ${
                    count > 0 ? (isSelected ? "bg-cream" : "bg-accent") : "bg-transparent"
                  }`}
                />
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {byDay[selectedDay].length === 0 ? (
            <p className="rounded-xl border border-dashed border-cream-dark px-3 py-6 text-center text-sm text-ink-soft">
              Χωρίς μάθημα αυτή τη μέρα
            </p>
          ) : (
            byDay[selectedDay].map(renderEntry)
          )}
        </div>
      </div>

      {/* Desktop: the full week at a glance. */}
      <div className="hidden sm:grid sm:grid-cols-7 sm:gap-3">
        {CALENDAR_DAY_ORDER.map((dayIndex) => {
          const dayEntries = byDay[dayIndex];
          const isToday = dayIndex === todayDayOfWeek;
          if (dayEntries.length === 0 && !isToday) return null;

          return (
            <div key={dayIndex} className="flex flex-col gap-2">
              <h3
                className={`rounded-full px-2 py-1 text-center text-xs font-semibold uppercase tracking-wide ${
                  isToday ? "bg-accent text-cream" : "text-ink-soft"
                }`}
              >
                {GREEK_DAY_LABELS[dayIndex]} {weekDates[dayIndex]}
              </h3>
              <div className="flex flex-col gap-2">
                {dayEntries.map(renderEntry)}
                {dayEntries.length === 0 && (
                  <p className="rounded-xl border border-dashed border-cream-dark px-3 py-4 text-center text-xs text-ink-soft">
                    Χωρίς μάθημα
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function EditableEntry({
  entry,
  onSave,
  onCancel,
  onRemove,
}: {
  entry: CalendarEntry;
  onSave: (input: SlotInput) => Promise<ActionResult>;
  onCancel: () => void;
  onRemove: () => Promise<void>;
}) {
  const [dayOfWeek, setDayOfWeek] = useState(entry.dayOfWeek);
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
        <button
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await onSave({ dayOfWeek, startTime, durationMinutes });
              if (!result.ok) setError(result.error);
            })
          }
          className="rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-cream transition active:scale-[0.98] hover:opacity-90 active:opacity-80 disabled:opacity-50"
        >
          Αποθήκευση
        </button>
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
