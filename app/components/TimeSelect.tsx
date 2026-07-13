"use client";

import { useState } from "react";

const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
const MINUTES = ["00", "15", "30", "45"];

/**
 * Always renders/edits time in 24-hour format (16:00, not 4:00 PM),
 * regardless of the visitor's browser or OS locale. A native
 * `<input type="time">` looked like the simpler choice, but Chrome
 * derives its 12h/24h display from the browser's UI language setting —
 * not the page's `lang` attribute — so it can't be forced to 24h from
 * application code. Two plain `<select>`s sidestep that entirely, and
 * are also bigger, easier mobile tap targets than the native picker.
 */
export function TimeSelect({
  name,
  value,
  defaultValue,
  onChange,
  className,
}: {
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  className?: string;
}) {
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState(defaultValue ?? "16:00");
  const current = isControlled ? value! : internal;
  const [hour, minute] = current.split(":");

  function set(nextHour: string, nextMinute: string) {
    const next = `${nextHour}:${nextMinute}`;
    if (!isControlled) setInternal(next);
    onChange?.(next);
  }

  const selectClass = `${className ?? "rounded-md border border-slate-300 px-3 py-2 text-base"} min-w-0 flex-1`;

  return (
    <div className="flex w-full min-w-0 gap-2">
      <select value={hour} onChange={(e) => set(e.target.value, minute)} className={selectClass}>
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <select value={minute} onChange={(e) => set(hour, e.target.value)} className={selectClass}>
        {MINUTES.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      {name && <input type="hidden" name={name} value={current} />}
    </div>
  );
}
