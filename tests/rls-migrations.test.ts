import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const MIGRATIONS_DIR = path.resolve(__dirname, "../supabase/migrations");

function readAllMigrations(): string {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => readFileSync(path.join(MIGRATIONS_DIR, f), "utf8"))
    .join("\n");
}

describe("RLS enabled on every table (§5b: a table with policies but RLS disabled allows unrestricted access)", () => {
  const sql = readAllMigrations();

  const createdTables = [...sql.matchAll(/create table (\w+)/gi)].map((m) => m[1]);

  it("finds the expected application tables", () => {
    expect(createdTables).toEqual(
      expect.arrayContaining([
        "tutors",
        "students",
        "slots",
        "tutor_availability",
        "reschedule_requests",
        "lesson_exceptions",
        "rate_limit_hits",
      ])
    );
  });

  it.each(createdTables)("table `%s` has RLS explicitly enabled", (table) => {
    const pattern = new RegExp(`alter table ${table} enable row level security`, "i");
    expect(sql).toMatch(pattern);
  });

  it("the service-role-only rate_limit_hits table grants no policy to authenticated/anon", () => {
    // Only service-role (which bypasses RLS) should ever touch this table.
    expect(sql).not.toMatch(/create policy[^;]*on rate_limit_hits[^;]*to (authenticated|anon)/i);
  });
});
