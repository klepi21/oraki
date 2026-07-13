"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ResponsiveNav, type NavItem } from "@/app/components/ResponsiveNav";
import { Logo } from "@/app/components/Logo";
import { IconCalendarDays, IconClock, IconCreditCard, IconSettings } from "@/app/components/icons";

const LINKS: { href: string; label: string; shortLabel?: string; icon: React.ReactNode }[] = [
  { href: "/dashboard", label: "Πρόγραμμα", icon: <IconCalendarDays className="h-5 w-5 stroke-current" /> },
  { href: "/dashboard/availability", label: "Διαθεσιμότητα", shortLabel: "Ώρες", icon: <IconClock className="h-5 w-5 stroke-current" /> },
  { href: "/dashboard/billing", label: "Συνδρομή", icon: <IconCreditCard className="h-5 w-5 stroke-current" /> },
  { href: "/dashboard/settings", label: "Ρυθμίσεις", icon: <IconSettings className="h-5 w-5 stroke-current" /> },
];

export function DashboardNav({ right }: { right: React.ReactNode }) {
  const pathname = usePathname();

  const items: NavItem[] = LINKS.map((link) => ({
    key: link.href,
    label: link.label,
    shortLabel: link.shortLabel,
    href: link.href,
    icon: link.icon,
    active: link.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(link.href),
  }));

  return (
    <ResponsiveNav
      brand={
        <Link href="/dashboard" aria-label="Oraki">
          <Logo markClassName="h-7 w-7" textClassName="text-lg" />
        </Link>
      }
      items={items}
      right={right}
    />
  );
}
