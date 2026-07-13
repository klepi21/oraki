/**
 * The Oraki mark: a calendar tile with a bold confirmation check, which
 * is literally what the product does (a lesson time, agreed). Drawn
 * inline so it inherits theme colors and costs zero requests.
 */
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect x="2" y="5" width="28" height="25" rx="8" fill="var(--color-accent)" />
      <rect x="8" y="1.5" width="4" height="7.5" rx="2" fill="var(--color-ink)" />
      <rect x="20" y="1.5" width="4" height="7.5" rx="2" fill="var(--color-ink)" />
      <path
        d="M10 18.2l4.3 4.3 8-9"
        stroke="var(--color-cream)"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function Logo({
  markClassName = "h-8 w-8",
  textClassName = "text-xl",
}: {
  markClassName?: string;
  textClassName?: string;
}) {
  return (
    <span className="flex items-center gap-2">
      <LogoMark className={markClassName} />
      <span className={`${textClassName} font-extrabold tracking-tight text-ink`}>Oraki</span>
    </span>
  );
}
