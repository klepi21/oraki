# Integration tests

These tests hit a **real Supabase project** (migrations applied) and are
gated behind env vars, because they can't run without live infrastructure:

- `INTEGRATION_SUPABASE_URL`
- `INTEGRATION_SUPABASE_SERVICE_ROLE_KEY`
- `INTEGRATION_SUPABASE_ANON_KEY`

They use a stubbed Clerk JWT (via `pgjwt`/manual `SET request.jwt.claims`)
rather than a real Clerk login, so no Clerk account is needed to run them —
just a disposable Supabase project with the migrations in
`supabase/migrations/` applied.

Run with:

```bash
INTEGRATION_SUPABASE_URL=... \
INTEGRATION_SUPABASE_SERVICE_ROLE_KEY=... \
INTEGRATION_SUPABASE_ANON_KEY=... \
npx vitest run tests/integration
```

Without those env vars set, every test in this directory is skipped (not
failed) — `npm test` on a fresh checkout with no Supabase project will not
try to run them.

## What's covered here vs. what still needs a manual pass

Covered by these automated tests (§5b checklist items):

- RLS is enabled on every table (live introspection, not just SQL source
  inspection — see `tests/rls-migrations.test.ts` for the static version)
- Tutor A's session can never read Tutor B's students/slots/availability/
  reschedule_requests
- Regenerating a student's magic link immediately invalidates the old
  token

Still requires a manual pass once Clerk/Stripe are live (can't be
meaningfully automated without those accounts):

- A real Clerk sign-in producing a session token that Supabase's
  third-party-auth integration actually accepts (this repo's tests stub
  the JWT claim directly in Postgres to test RLS policy logic in
  isolation from Clerk)
- Stripe webhook signature verification against a real webhook secret
  and the Stripe CLI's `stripe trigger` (structure is unit-testable, but
  the actual signing round-trip needs Stripe's own tooling)
- End-to-end soft-delete → link stops resolving → re-add reactivates,
  clicked through in a browser
