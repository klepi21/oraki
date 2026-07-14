"use client";

import { useState } from "react";
import Link from "next/link";
import { timeLabel, LESSON_STATUS_LABELS } from "@/lib/greek";
import { groupEntriesByDate, type CalendarEntry } from "@/lib/calendar";
import { avatarColor } from "@/app/components/Avatar";
import { EditableEntry, type SeriesInput, type SingleInput } from "@/app/dashboard/components/EditableEntry";
import type { ActionResult, LessonStatus } from "@/app/dashboard/actions";

type StatusInput = { slotId: string; occurrenceDate: string; durationMinutes: number; status: LessonStatus };

const SHORT_DAY_LABELS = ["Δευ", "Τρί", "Τετ", "Πέμ", "Παρ", "Σάβ", "Κυρ"];
const STATUS_OPTIONS: LessonStatus[] = ["scheduled", "in_progress", "done", "cancelled"];

function entryDotClass(entry: CalendarEntry): string {
  if (entry.status === "done") return "border-green-500 bg-green-50";
  if (entry.status === "cancelled") return "border-red-300 bg-red-50 opacity-70";
  if (entry.status === "in_progress") return "border-blue-400 bg-blue-50";
  if (entry.moved) return "border-accent bg-accent-soft";
  return "border-cream-dark bg-white";
}

export function MonthlyCalendarView({
  entries,
  gridDates,
  monthLabel,
  currentMonth,
  prevHref,
  nextHref,
  todayISO,
  onUpdateSeries,
  onUpdateSingle,
  onRemove,
  onStatusChange,
}: {
  entries: CalendarEntry[];
  /** All dates displayed in the grid (full weeks, Monday..Sunday), spanning the month. */
  gridDates: string[];
  monthLabel: string;
  /** "YYYY-MM" of the month actually being shown, to dim days outside it. */
  currentMonth: string;
  prevHref: string;
  nextHref: string;
  todayISO: string;
  onUpdateSeries: (slotId: string, input: SeriesInput) => Promise<ActionResult>;
  onUpdateSingle: (slotId: string, input: SingleInput) => Promise<ActionResult>;
  onRemove: (slotId: string) => Promise<ActionResult>;
  onStatusChange: (input: StatusInput) => Promise<ActionResult>;
}) {
  const byDate = groupEntriesByDate(entries);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const entryKey = (e: CalendarEntry) => `${e.slotId}|${e.date}`;

  const navButtonClass =
    "rounded-full border border-cream-dark px-3 py-1.5 text-sm text-ink-soft transition active:scale-95 hover:bg-cream-dark";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Link href={prevHref} className={navButtonClass}>
          ← Προηγούμενος
        </Link>
        <span className="text-sm font-medium text-ink">{monthLabel}</span>
        <Link href={nextHref} className={navButtonClass}>
          Επόμενος →
        </Link>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
        {SHORT_DAY_LABELS.map((label) => (
          <div key={label}>{label}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {gridDates.map((date) => {
          const dayEntries = byDate.get(date) ?? [];
          const inMonth = date.startsWith(currentMonth);
          const isToday = date === todayISO;
          const dayNum = Number(date.slice(8, 10));

          return (
            <div
              key={date}
              className={`flex min-h-20 flex-col gap-1 rounded-lg border p-1 sm:min-h-24 sm:p-1.5 ${
                inMonth ? "border-cream-dark bg-white" : "border-cream-dark/50 bg-cream/60"
              }`}
            >
              <span
                className={`self-end rounded-full px-1.5 text-[11px] font-semibold ${
                  isToday ? "bg-accent text-cream" : inMonth ? "text-ink-soft" : "text-ink-soft/50"
                }`}
              >
                {dayNum}
              </span>
              <div className="flex flex-col gap-1">
                {dayEntries.map((entry) => {
                  const key = entryKey(entry);
                  if (editingKey === key) {
                    return (
                      <div key={key} className="col-span-full">
                        <EditableEntry
                          entry={entry}
                          onCancel={() => setEditingKey(null)}
                          onSaveSeries={async (input) => {
                            const result = await onUpdateSeries(entry.slotId, input);
                            if (result.ok) setEditingKey(null);
                            return result;
                          }}
                          onSaveSingle={async (input) => {
                            const result = await onUpdateSingle(entry.slotId, input);
                            if (result.ok) setEditingKey(null);
                            return result;
                          }}
                          onRemove={async () => {
                            await onRemove(entry.slotId);
                            setEditingKey(null);
                          }}
                        />
                      </div>
                    );
                  }
                  return (
                    <div
                      key={key}
                      style={{ borderLeftColor: avatarColor(entry.studentName), borderLeftWidth: 2 }}
                      className={`flex flex-col gap-0.5 rounded px-1 py-0.5 text-[10px] leading-tight sm:text-[11px] ${entryDotClass(entry)}`}
                    >
                      <button
                        type="button"
                        onClick={() => setEditingKey(key)}
                        className="text-left transition active:scale-95"
                      >
                        <span className="font-semibold text-accent-dark">{timeLabel(entry.startTime)}</span>{" "}
                        <span className="text-ink">{entry.studentName.split(" ")[0]}</span>
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
                        className="w-full rounded border border-cream-dark bg-white text-[9px] sm:text-[10px]"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {LESSON_STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
