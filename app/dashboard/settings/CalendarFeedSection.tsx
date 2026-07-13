"use client";

import { useState, useTransition } from "react";
import { regenerateCalendarFeedTokenAction } from "@/app/dashboard/settings/actions";

export function CalendarFeedSection({ appHost, initialToken }: { appHost: string; initialToken: string }) {
  const [token, setToken] = useState(initialToken);
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  const httpsUrl = `https://${appHost}/api/calendar/${token}.ics`;
  const webcalUrl = `webcal://${appHost}/api/calendar/${token}.ics`;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-cream-dark bg-white p-4">
      <h3 className="text-lg font-semibold text-ink">Πρόγραμμα στο κινητό σου</h3>
      <p className="text-sm text-ink-soft">
        Πρόσθεσέ το μία φορά στο ημερολόγιο του κινητού σου (Google/Apple Calendar) — ενημερώνεται
        μόνο του κάθε φορά που αλλάζει κάτι, χωρίς να χρειάζεται να το ξανακάνεις.
      </p>
      <a
        href={webcalUrl}
        className="self-start rounded-full bg-ink px-4 py-3 text-base font-semibold text-cream transition active:scale-[0.98] hover:opacity-90 active:opacity-80"
      >
        Πρόσθεσε στο ημερολόγιο του κινητού
      </a>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={httpsUrl}
          className="min-w-0 flex-1 truncate rounded-md border border-cream-dark px-3 py-2 text-xs text-ink-soft"
        />
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(httpsUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="shrink-0 rounded-full border border-cream-dark px-3 py-2 text-sm font-medium text-ink-soft hover:bg-cream-dark active:bg-cream-dark"
        >
          {copied ? "Έγινε!" : "Αντιγραφή"}
        </button>
      </div>
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          if (!confirm("Ο παλιός σύνδεσμος ημερολογίου θα σταματήσει να δουλεύει. Συνέχεια;")) return;
          startTransition(async () => {
            const result = await regenerateCalendarFeedTokenAction();
            if (result.ok) setToken(result.token);
          });
        }}
        className="self-start rounded-full border border-cream-dark px-3 py-2 text-sm font-medium text-ink-soft hover:bg-cream-dark active:bg-cream-dark disabled:opacity-50"
      >
        {isPending ? "..." : "Νέος σύνδεσμος ημερολογίου"}
      </button>
    </div>
  );
}
