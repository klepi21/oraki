import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/onboarding(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  // Only the tutor-facing routes need Clerk at all. The landing page,
  // student links, and every API route (student lookup, Stripe webhook)
  // are deliberately Clerk-free — running Proxy there would add an
  // unnecessary Clerk handshake to flows that must never depend on it.
  matcher: ["/dashboard(.*)", "/onboarding(.*)"],
};
