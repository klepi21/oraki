"use client";

import { useState } from "react";
import { IconCopy, IconArrowRight } from "@/app/components/icons";

export function CopyLinkButton({ url, compact = false }: { url: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={copy}
        aria-label="Αντιγραφή συνδέσμου"
        title="Αντιγραφή συνδέσμου"
        className="flex shrink-0 items-center gap-1.5 rounded-full bg-ink px-3 py-2 text-xs font-semibold text-cream transition active:scale-95 hover:opacity-90 active:opacity-80"
      >
        {copied ? <IconArrowRight /> : <IconCopy />}
        {copied && "Έγινε!"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="flex items-center gap-1.5 rounded-full bg-ink px-3 py-2 text-sm font-semibold text-cream transition active:scale-[0.98] hover:opacity-90 active:opacity-80"
    >
      {copied ? <IconArrowRight /> : <IconCopy />}
      {copied ? "Αντιγράφηκε!" : "Αντιγραφή συνδέσμου"}
    </button>
  );
}
