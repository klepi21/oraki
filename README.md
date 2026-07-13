# Oraki

Scheduling tool for private tutors (καθηγητές ιδιαιτέρων) — see
`../tutor-app-build-plan.md` for the full spec this app was built against.

## Stack

Next.js (App Router) · Clerk (tutor auth) · Supabase/Postgres (RLS-scoped
data) · Stripe (metered subscriptions) · Resend (email).

## First-time setup, once you have accounts for the services above

1. **Supabase**
   - Create a project, then apply everything in `supabase/migrations/` in
     order (`0001` → `0005`), via the SQL editor or `supabase db push`.
   - Under Authentication → Sign In / Providers → enable **Clerk as a
     third-party auth provider** (Supabase's native Clerk integration).
     This is what lets `auth.jwt()->>'sub'` in the RLS policies match a
     Clerk session token directly — no Supabase Auth accounts involved.

2. **Clerk**
   - Create an application (email + Google sign-in).
   - Under the Supabase integration setting in the Clerk dashboard, connect
     it to the same Supabase project from step 1.

3. **Stripe**
   - Create a recurring price for the per-student line item (€2/month,
     usage type: licensed/quantity — not metered-usage-based, since we set
     quantity explicitly via `subscriptionItems.update`).
   - Add a webhook endpoint pointing at `/api/webhooks/stripe`, subscribed
     to `customer.subscription.updated` and `invoice.payment_failed`.
     Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

4. **Resend**
   - Verify the `oraki.gr` sending domain, get an API key.

5. Copy `.env.example` to `.env.local` and fill in every value.

## Student links

Every tutor gets a short public handle (e.g. `oraki.gr/ger1`), chosen at
signup and editable under Settings. Every student gets a label under that
handle plus a random suffix the tutor never has to think about (e.g.
`oraki.gr/ger1/gerdinos-x7fq2k9a2b`) — see `lib/slugs.ts` for why the
suffix, not the label, is what actually prevents a parent from guessing
another family's link. Removing a student deactivates their row
immediately, which is also the moment their link stops resolving — there's
no separate expiry or cleanup job to run.

## Running locally

```bash
npm install
npm run dev
```

## Testing

```bash
npm test              # unit tests + static checks, no external services needed
npm run lint
npx tsc --noEmit
```

`tests/integration/` holds tests that need a real (disposable) Supabase
project — see `tests/integration/README.md`. They're skipped automatically
if the relevant env vars aren't set, so `npm test` is safe to run without
any live infrastructure.

## Safety checklist status

Every item in the build plan's §5b mandatory safety checklist has either
an automated test (`npm test`) or is called out explicitly in
`tests/integration/README.md` as needing a manual pass once real
Clerk/Stripe credentials exist (e.g. verifying an actual Clerk-issued JWT
is accepted by Supabase, or a real Stripe Test Clock dunning cycle).
