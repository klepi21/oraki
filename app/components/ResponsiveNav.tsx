"use client";

import Link from "next/link";

export type NavItem = {
  key: string;
  label: string;
  /** Shorter label for the mobile bottom bar, where space is tight. */
  shortLabel?: string;
  href?: string;
  onClick?: () => void;
  active?: boolean;
  icon?: React.ReactNode;
};

/**
 * Single source of truth for the tutor-facing nav: an underlined tab row
 * on wider screens, and a floating bottom tab bar (icon + label, thumb
 * reachable) on mobile instead of a hamburger menu — a hamburger hides
 * navigation behind an extra tap and is a worse fit for something used
 * every day than a persistent bottom bar.
 */
export function ResponsiveNav({
  brand,
  items,
  right,
}: {
  brand: React.ReactNode;
  items: NavItem[];
  right?: React.ReactNode;
}) {
  return (
    <>
      <header className="sticky top-0 z-20 bg-cream/95 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-3 sm:px-6">
          {brand}
          <div className="flex items-center gap-2">
            <nav className="hidden items-center gap-1 sm:flex">
              {items.map((item) => {
                const className = `relative px-3 py-2 text-sm font-medium transition ${
                  item.active ? "text-ink" : "text-ink-soft hover:text-ink"
                }`;
                const underline = item.active && (
                  <span className="absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-accent" />
                );
                return item.href ? (
                  <Link key={item.key} href={item.href} className={className}>
                    {item.label}
                    {underline}
                  </Link>
                ) : (
                  <button key={item.key} onClick={item.onClick} className={className}>
                    {item.label}
                    {underline}
                  </button>
                );
              })}
            </nav>
            {right}
          </div>
        </div>
      </header>

      <nav
        style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        className="fixed inset-x-3 z-30 flex items-center justify-around gap-1 rounded-full bg-ink px-1.5 py-1.5 shadow-lg sm:hidden"
      >
        {items.map((item) => {
          const content = (
            <>
              {item.icon}
              <span className="text-[11px] font-medium leading-none">{item.shortLabel ?? item.label}</span>
            </>
          );
          const className = `flex flex-1 flex-col items-center gap-1 rounded-full py-2 transition active:scale-95 ${
            item.active ? "bg-accent text-cream" : "text-cream/60"
          }`;
          return item.href ? (
            <Link key={item.key} href={item.href} className={className}>
              {content}
            </Link>
          ) : (
            <button key={item.key} onClick={item.onClick} className={className}>
              {content}
            </button>
          );
        })}
      </nav>
    </>
  );
}
