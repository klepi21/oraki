"use client";

import { useState, useTransition } from "react";
import { decideRescheduleRequestAction } from "@/app/dashboard/actions";

export function RescheduleDecisionButtons({ requestId }: { requestId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex w-full flex-col gap-1 sm:w-auto sm:items-end">
      <div className="flex w-full gap-2 sm:w-auto">
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await decideRescheduleRequestAction(requestId, "approve");
              setError(result.ok ? null : result.error);
            })
          }
          className="flex-1 rounded-full bg-accent px-3 py-2.5 text-sm font-semibold text-cream transition active:scale-[0.98] hover:bg-accent-dark active:bg-accent-dark disabled:opacity-50 sm:flex-none"
        >
          Έγκριση
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await decideRescheduleRequestAction(requestId, "decline");
              setError(result.ok ? null : result.error);
            })
          }
          className="flex-1 rounded-full border border-cream-dark px-3 py-2.5 text-sm font-medium text-ink-soft transition active:scale-[0.98] hover:bg-cream-dark active:bg-cream-dark disabled:opacity-50 sm:flex-none"
        >
          Απόρριψη
        </button>
      </div>
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
