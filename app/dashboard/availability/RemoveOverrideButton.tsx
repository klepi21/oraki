"use client";

import { useTransition } from "react";
import { removeAvailabilityOverrideAction } from "@/app/dashboard/availability/actions";

export function RemoveOverrideButton({ overrideId }: { overrideId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => { removeAvailabilityOverrideAction(overrideId); })}
      className="rounded-full border border-cream-dark px-3 py-2 text-sm font-medium text-ink-soft hover:bg-cream-dark active:bg-cream-dark disabled:opacity-50"
    >
      {isPending ? "..." : "Αφαίρεση"}
    </button>
  );
}
