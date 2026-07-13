import type { Metadata } from "next";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { ensureTutorRecord } from "@/lib/tutors";
import { ClerkShell } from "@/app/components/ClerkShell";
import { DashboardNav } from "@/app/dashboard/DashboardNav";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const tutor = await ensureTutorRecord();

  return (
    <ClerkShell>
    <div className="flex min-h-screen flex-col bg-cream text-ink">
      <DashboardNav right={<UserButton />} />
      {tutor.billing_grace_period_ends_at && (
        <div className="bg-accent-soft px-4 py-3 text-sm text-accent-dark sm:px-6">
          Η τελευταία χρέωση δεν πέρασε. Ενημέρωσε τα στοιχεία πληρωμής σου μέχρι{" "}
          {new Date(tutor.billing_grace_period_ends_at).toLocaleDateString("el-GR")} για να μη
          διακοπεί η πρόσβαση στο πρόγραμμά σου.{" "}
          <Link href="/dashboard/billing" className="font-medium underline">
            Ενημέρωση στοιχείων
          </Link>
        </div>
      )}
      <main className="flex-1 px-4 py-6 pb-24 sm:px-6 sm:pb-6">{children}</main>
    </div>
    </ClerkShell>
  );
}
