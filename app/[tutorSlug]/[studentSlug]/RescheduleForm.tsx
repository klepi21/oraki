"use client";

import { useEffect, useMemo, useState } from "react";
import { dayLabel, dateLabel, timeLabel } from "@/lib/greek";

type Lesson = { id: string; dayOfWeek: number; startTime: string; durationMinutes: number };
type OpenSlot = { date: string; startTime: string; durationMinutes: number };

export function RescheduleForm({
  tutorSlug,
  studentSlug,
  lessons,
  pendingSlotIds = [],
}: {
  tutorSlug: string;
  studentSlug: string;
  lessons: Lesson[];
  pendingSlotIds?: string[];
}) {
  // A lesson with a pending request can't get a second one — offer only
  // the rest, and if nothing is left say so instead of showing a button
  // that would fail.
  const availableLessons = lessons.filter((l) => !pendingSlotIds.includes(l.id));

  const [open, setOpen] = useState(false);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(
    availableLessons.length === 1 ? availableLessons[0].id : null
  );
  const [openSlots, setOpenSlots] = useState<OpenSlot[] | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const basePath = `/api/link/${tutorSlug}/${studentSlug}`;

  useEffect(() => {
    if (!open || !selectedLessonId || openSlots) return;
    fetch(`${basePath}/open-slots?originalSlotId=${selectedLessonId}`)
      .then((res) => res.json())
      .then((data) => setOpenSlots(data.openSlots ?? []));
  }, [open, selectedLessonId, openSlots, basePath]);

  // One decision at a time: first the day, then the time — not one flat
  // list of every open slot across two weeks.
  const slotsByDate = useMemo(() => {
    const map = new Map<string, OpenSlot[]>();
    for (const slot of openSlots ?? []) {
      const list = map.get(slot.date) ?? [];
      list.push(slot);
      map.set(slot.date, list);
    }
    return map;
  }, [openSlots]);

  const dates = useMemo(() => [...slotsByDate.keys()].sort(), [slotsByDate]);
  // First available day is preselected so most students only make one tap.
  const activeDate = selectedDate ?? dates[0] ?? null;

  async function submit() {
    if (!selectedLessonId || !activeDate || !selectedTime) return;
    setStatus("submitting");
    const res = await fetch(`${basePath}/reschedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        originalSlotId: selectedLessonId,
        newDate: activeDate,
        newStartTime: selectedTime,
      }),
    });
    if (res.ok) {
      setStatus("done");
      setMessage("Το αίτημά σου στάλθηκε. Θα ενημερωθείς μόλις απαντήσει ο καθηγητής.");
    } else {
      const data = await res.json().catch(() => null);
      setStatus("error");
      setMessage(data?.message ?? "Κάτι πήγε στραβά, δοκίμασε ξανά.");
    }
  }

  if (status === "done") {
    return <p className="rounded-2xl bg-accent-soft p-4 text-accent-dark">{message}</p>;
  }

  if (availableLessons.length === 0) {
    return (
      <p className="rounded-2xl bg-accent-soft p-4 text-sm text-accent-dark">
        Το αίτημά σου έχει σταλεί. Θα ενημερωθείς μόλις απαντήσει ο καθηγητής.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-full bg-ink px-4 py-4 text-base font-semibold text-cream transition active:scale-[0.98] hover:opacity-90 active:opacity-80"
      >
        Ζήτησε άλλη ώρα
      </button>
    );
  }

  if (!selectedLessonId) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-ink">Για ποιο μάθημα θέλεις άλλη ώρα;</p>
        <div className="flex flex-col gap-2">
          {availableLessons.map((lesson) => (
            <button
              key={lesson.id}
              onClick={() => setSelectedLessonId(lesson.id)}
              className="rounded-xl border border-cream-dark bg-white px-4 py-3 text-left text-base text-ink transition hover:bg-cream-dark active:bg-cream-dark"
            >
              {dayLabel(lesson.dayOfWeek)}, {timeLabel(lesson.startTime)}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {!openSlots && <p className="text-sm text-ink-soft">Φόρτωση διαθέσιμων ωρών...</p>}
      {openSlots && dates.length === 0 && (
        <p className="text-sm text-ink-soft">Δεν υπάρχουν διαθέσιμες ώρες τις επόμενες μέρες.</p>
      )}

      {dates.length > 0 && (
        <>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-ink">Διάλεξε μέρα</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {dates.map((date) => (
                <button
                  key={date}
                  onClick={() => {
                    setSelectedDate(date);
                    setSelectedTime(null);
                  }}
                  className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-medium transition active:scale-95 ${
                    activeDate === date
                      ? "bg-ink text-cream"
                      : "border border-cream-dark bg-white text-ink-soft"
                  }`}
                >
                  {dateLabel(date)}
                </button>
              ))}
            </div>
          </div>

          {activeDate && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-ink">Διάλεξε ώρα</p>
              <div className="grid grid-cols-3 gap-2">
                {(slotsByDate.get(activeDate) ?? []).map((slot) => (
                  <button
                    key={slot.startTime}
                    onClick={() => setSelectedTime(slot.startTime)}
                    className={`rounded-xl px-3 py-3 text-base font-medium transition active:scale-95 ${
                      selectedTime === slot.startTime
                        ? "bg-accent text-cream"
                        : "border border-cream-dark bg-white text-ink"
                    }`}
                  >
                    {timeLabel(slot.startTime)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {message && status === "error" && <p className="text-sm text-red-700">{message}</p>}

      <button
        type="button"
        disabled={!selectedTime || status === "submitting"}
        onClick={submit}
        className="rounded-full bg-ink px-4 py-4 text-base font-semibold text-cream transition active:scale-[0.98] hover:opacity-90 active:opacity-80 disabled:opacity-50"
      >
        {status === "submitting" ? "Αποστολή..." : "Επιβεβαίωση αιτήματος"}
      </button>
    </div>
  );
}
