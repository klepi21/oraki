"use client";

import { useState } from "react";
import { IconChevronDown } from "@/app/components/icons";

/**
 * Collapsed by default: `header` (which may itself contain interactive
 * buttons, e.g. a primary "copy link" action) always shows; everything
 * else — secondary/rarely-used actions — is hidden behind the chevron
 * until tapped. Avoids every row showing all of its controls all the
 * time regardless of whether they're needed right now.
 */
export function Expandable({
  header,
  children,
  defaultOpen = false,
}: {
  header: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl border border-cream-dark bg-white">
      <div className="flex items-center gap-2 p-4">
        <div className="min-w-0 flex-1">{header}</div>
        <button
          type="button"
          aria-label={open ? "Λιγότερα" : "Περισσότερα"}
          onClick={() => setOpen((o) => !o)}
          className="shrink-0 rounded-full p-2 text-ink-soft transition active:scale-95 hover:bg-cream-dark active:bg-cream-dark"
        >
          <IconChevronDown className={`h-5 w-5 stroke-current transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>
      {open && <div className="flex flex-col gap-3 border-t border-cream-dark p-4">{children}</div>}
    </div>
  );
}
