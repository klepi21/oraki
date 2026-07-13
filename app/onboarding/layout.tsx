import type { Metadata } from "next";
import { ClerkShell } from "@/app/components/ClerkShell";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <ClerkShell>{children}</ClerkShell>;
}
