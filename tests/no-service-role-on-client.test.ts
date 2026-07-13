import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const SCAN_DIRS = ["app", "lib"];

function walk(dir: string): string[] {
  const entries = readdirSync(dir);
  let files: string[] = [];
  for (const entry of entries) {
    if (entry === "node_modules" || entry === ".next") continue;
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) files = files.concat(walk(full));
    else if (/\.(ts|tsx)$/.test(entry)) files.push(full);
  }
  return files;
}

describe("service-role key never reaches client code (§5b General checklist)", () => {
  const files = SCAN_DIRS.flatMap((d) => walk(path.join(ROOT, d)));

  it("no 'use client' file imports the admin (service-role) Supabase client", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const content = readFileSync(file, "utf8");
      const isClientComponent = /^["']use client["'];?/m.test(content.trimStart());
      if (isClientComponent && content.includes("lib/supabase/admin")) {
        offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("no source file references NEXT_PUBLIC_ env vars for secret keys", () => {
    const offenders: string[] = [];
    const secretPatterns = [
      /NEXT_PUBLIC_.*SERVICE_ROLE/i,
      /NEXT_PUBLIC_.*STRIPE_SECRET/i,
      /NEXT_PUBLIC_.*CLERK_SECRET/i,
    ];
    for (const file of files) {
      const content = readFileSync(file, "utf8");
      if (secretPatterns.some((p) => p.test(content))) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });

  it("the admin client module is marked server-only", () => {
    const content = readFileSync(path.join(ROOT, "lib/supabase/admin.ts"), "utf8");
    expect(content).toMatch(/^import "server-only";/m);
  });
});
