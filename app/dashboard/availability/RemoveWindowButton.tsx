"use client";

import { useTransition } from "react";
import { removeAvailabilityWindowAction } from "@/app/dashboard/availability/actions";

export function RemoveWindowButton({ windowId }: { windowId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => { removeAvailabilityWindowAction(windowId); })}
      className="rounded-full border border-cream-dark px-3 py-2 text-sm font-medium text-ink-soft hover:bg-cream-dark active:bg-cream-dark disabled:opacity-50"
    >
      {isPending ? "..." : "Αφαίρεση"}
    </button>
  );
}
