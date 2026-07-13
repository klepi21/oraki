import { ClerkProvider } from "@clerk/nextjs";
import { elGR } from "@clerk/localizations";

/**
 * ClerkProvider lives here — in the layouts of the few routes that
 * actually authenticate (sign-in/up, dashboard, onboarding) — instead of
 * the root layout, so the public pages (landing, student links, preview)
 * never download ClerkJS. A parent opening their child's lesson link
 * should not pay for an auth bundle they can never use.
 */
export function ClerkShell({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider localization={elGR} afterSignOutUrl="/">
      {children}
    </ClerkProvider>
  );
}
