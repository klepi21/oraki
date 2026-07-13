"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { GREEK_DAY_LABELS, timeLabel, durationLabel, DURATION_OPTIONS, LESSON_STATUS_LABELS } from "@/lib/greek";
import { groupEntriesByDate, CALENDAR_DAY_ORDER, type CalendarEntry } from "@/lib/calendar";
import { TimeSelect } from "@/app/components/TimeSelect";
import { avatarColor } from "@/app/components/Avatar";
import type { ActionResult, LessonStatus } from "@/app/dashboard/actions";

type SlotInput = { dayOfWeek: number; startTime: string; durationMinutes: number };
type StatusInput = { slotId: string; occurrenceDate: string; durationMinutes: number; status: LessonStatus };

const SHORT_DAY_LABELS = ["Κυρ", "Δευ", "Τρί", "Τετ", "Πέμ", "Παρ", "Σάβ"];
const STATUS_OPTIONS: LessonStatus[] = ["scheduled", "in_progress", "done", "cancelled"];

function entryBoxClass(entry: CalendarEntry): string {
  if (entry.status === "done") return "border-2 border-green-500 bg-green-50";
  if (entry.status === "cancelled") return "border-2 border-red-300 bg-red-50 opacity-70";
  if (entry.status === "in_progress") return "border-2 border-blue-400 bg-blue-50";
  if (entry.moved) return "border-2 border-accent bg-accent-soft";
  return "border border-cream-dark bg-white";
}

/** Dates (day-of-month) for each weekday of the displayed week, keyed by ISO date. */
function weekDatesByIndex(weekDates: string[]): Record<number, { date: string; day: number }> {
  const out: Record<number, { date: string; day: number }> = {};
  for (const iso of weekDates) {
    const [, , d] = iso.split("-").map(Number);
    const weekday = new Date(iso + "T00:00:00Z").getUTCDay();
    out[weekday] = { date: iso, day: d };
  }
  return out;
}

export function CalendarView({
  entries,
  weekDates,
  weekLabel,
  prevHref,
  nextHref,
  onPrevWeek,
  onNextWeek,
  todayISO,
  onUpdate,
  onRemove,
  onStatusChange,
}: {
  entries: CalendarEntry[];
  /** The 7 ISO dates (Monday..Sunday) currently displayed. */
  weekDates: string[];
  weekLabel: string;
  prevHref: string;
  nextHref: string;
  /** When set, used instead of navigating prevHref/nextHref (e.g. a client-only demo). */
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
  todayISO: string;
  onUpdate: (slotId: string, input: SlotInput) => Promise<ActionResult>;
  onRemove: (slotId: string) => Promise<ActionResult>;
  onStatusChange: (input: StatusInput) => Promise<ActionResult>;
}) {
  const byDate = groupEntriesByDate(entries);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const byIndex = weekDatesByIndex(weekDates);
  const todayInWeek = weekDates.includes(todayISO);
  const [selectedDate, setSelectedDate] = useState(todayInWeek ? todayISO : weekDates[0]);

  const entryKey = (e: CalendarEntry) => `${e.slotId}|${e.date}`;

  function renderEntry(entry: CalendarEntry) {
    const key = entryKey(entry);
    if (editingKey === key) {
      return (
        <EditableEntry
          key={key}
          entry={entry}
          onCancel={() => setEditingKey(null)}
          onSave={async (input) => {
            const result = await onUpdate(entry.slotId, input);
            if (result.ok) setEditingKey(null);
            return result;
          }}
          onRemove={async () => {
            await onRemove(entry.slotId);
            setEditingKey(null);
          }}
        />
      );
    }

    return (
      <div
        key={key}
        style={{ borderLeftColor: avatarColor(entry.studentName), borderLeftWidth: 3 }}
        className={`flex flex-col gap-1.5 rounded-xl p-3 text-left shadow-sm ${entryBoxClass(entry)}`}
      >
        <button
          type="button"
          onClick={() => setEditingKey(key)}
          className="flex flex-col text-left transition active:scale-[0.98]"
        >
          <span className="text-sm font-semibold text-accent-dark">
            {timeLabel(entry.startTime)}
            {entry.moved && <span className="ml-1.5 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-cream">Νέα ώρα</span>}
          </span>
          <span className="text-sm font-medium text-ink">{entry.studentName}</span>
          <span className="text-xs text-ink-soft">{entry.subject}</span>
        </button>
        <select
          value={entry.status}
          onChange={(e) =>
            onStatusChange({
              slotId: entry.slotId,
              occurrenceDate: entry.date,
              durationMinutes: entry.durationMinutes,
              status: e.target.value as LessonStatus,
            })
          }
          className="rounded-md border border-cream-dark bg-white px-1.5 py-1 text-xs text-ink"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {LESSON_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
    );
  }

  const navButtonClass =
    "rounded-full border border-cream-dark px-3 py-1.5 text-sm text-ink-soft transition active:scale-95 hover:bg-cream-dark";

  const weekNav = (
    <div className="flex items-center justify-between">
      {onPrevWeek ? (
        <button type="button" onClick={onPrevWeek} className={navButtonClass}>
          ← Προηγούμενη
        </button>
      ) : (
        <Link href={prevHref} className={navButtonClass}>
          ← Προηγούμενη
        </Link>
      )}
      <span className="text-sm font-medium text-ink">{weekLabel}</span>
      {onNextWeek ? (
        <button type="button" onClick={onNextWeek} className={navButtonClass}>
          Επόμενη →
        </button>
      ) : (
        <Link href={nextHref} className={navButtonClass}>
          Επόμενη →
        </Link>
      )}
    </div>
  );

  if (entries.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        {weekNav}
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-cream-dark bg-white py-10 text-center">
          <p className="text-sm text-ink-soft">Δεν έχεις μαθήματα αυτή την εβδομάδα.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {weekNav}

      {/* Mobile: a day-picker strip + a single day's lessons. */}
      <div className="sm:hidden">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {CALENDAR_DAY_ORDER.map((dayIndex) => {
            const info = byIndex[dayIndex];
            if (!info) return null;
            const count = (byDate.get(info.date) ?? []).length;
            const isToday = info.date === todayISO;
            const isSelected = info.date === selectedDate;
            return (
              <button
                key={dayIndex}
                onClick={() => setSelectedDate(info.date)}
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
                  {info.day}
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
          {(byDate.get(selectedDate) ?? []).length === 0 ? (
            <p className="rounded-xl border border-dashed border-cream-dark px-3 py-6 text-center text-sm text-ink-soft">
              Χωρίς μάθημα αυτή τη μέρα
            </p>
          ) : (
            (byDate.get(selectedDate) ?? []).map(renderEntry)
          )}
        </div>
      </div>

      {/* Desktop: the full week at a glance. */}
      <div className="hidden sm:grid sm:grid-cols-7 sm:gap-3">
        {CALENDAR_DAY_ORDER.map((dayIndex) => {
          const info = byIndex[dayIndex];
          if (!info) return null;
          const dayEntries = byDate.get(info.date) ?? [];
          const isToday = info.date === todayISO;
          if (dayEntries.length === 0 && !isToday) return null;

          return (
            <div key={dayIndex} className="flex flex-col gap-2">
              <h3
                className={`rounded-full px-2 py-1 text-center text-xs font-semibold uppercase tracking-wide ${
                  isToday ? "bg-accent text-cream" : "text-ink-soft"
                }`}
              >
                {GREEK_DAY_LABELS[dayIndex]} {info.day}
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
    </div>
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
      <p className="text-xs text-ink-soft">Αλλαγές εδώ ισχύουν για το επαναλαμβανόμενο μάθημα κάθε εβδομάδα.</p>
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
