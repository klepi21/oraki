import { describe, expect, it } from "vitest";
import {
  slugify,
  normalizeStudentLabel,
  generateSlugSuffix,
  appendSlugSuffix,
  buildStudentSlug,
  isValidTutorSlug,
  isValidCustomStudentSlug,
  RESERVED_TUTOR_SLUGS,
  studentLinkPath,
} from "@/lib/slugs";

describe("slugify / label normalization", () => {
  it("lowercases and hyphenates arbitrary text", () => {
    expect(slugify("Maria Papadopoulou")).toBe("maria-papadopoulou");
  });

  it("transliterates Greek names instead of collapsing them to nothing", () => {
    expect(slugify("Μαρία Παπαδοπούλου")).toBe("maria-papadopoulou");
    expect(slugify("Γιώργος")).toBe("giorgos");
    expect(slugify("Ελένη Νικολάου")).toBe("eleni-nikolaou");
  });

  it("strips characters outside a-z0-9", () => {
    expect(slugify("Γιώργος!!")).toMatch(/^[a-z0-9-]*$/);
  });

  it("falls back to a default when the label sanitizes to nothing", () => {
    expect(normalizeStudentLabel("!!!")).toBe("mathitis");
  });

  it("truncates very long input", () => {
    const long = "a".repeat(200);
    expect(slugify(long).length).toBeLessThanOrEqual(40);
  });
});

describe("random slug suffix (this is the actual security boundary, §5b Magic-link security checklist)", () => {
  it("generates suffixes of a consistent length", () => {
    expect(generateSlugSuffix()).toHaveLength(10);
  });

  it("never repeats across many calls", () => {
    const suffixes = new Set(Array.from({ length: 2000 }, () => generateSlugSuffix()));
    expect(suffixes.size).toBe(2000);
  });

  it("only uses unambiguous characters (no 0/O/1/l/I)", () => {
    const suffix = generateSlugSuffix();
    expect(suffix).not.toMatch(/[0oO1lI]/);
  });

  it("produces a different suffix each time for the same label", () => {
    expect(appendSlugSuffix("maria")).not.toBe(appendSlugSuffix("maria"));
  });

  it("builds a full slug combining the sanitized label and a suffix", () => {
    const slug = buildStudentSlug("Μαρία Παπαδοπούλου");
    expect(slug).toMatch(/^[a-z0-9-]+-[a-z2-9]{10}$/);
  });
});

describe("tutor slug validation (must never collide with an app route)", () => {
  it("accepts a normal handle", () => {
    expect(isValidTutorSlug("ger1")).toBe(true);
  });

  it("rejects reserved route names", () => {
    for (const reserved of RESERVED_TUTOR_SLUGS) {
      expect(isValidTutorSlug(reserved)).toBe(false);
    }
  });

  it("rejects slugs with disallowed characters", () => {
    expect(isValidTutorSlug("ger 1")).toBe(false);
    expect(isValidTutorSlug("Ger1")).toBe(false);
    expect(isValidTutorSlug("γιωργος")).toBe(false);
  });

  it("rejects too-short or too-long slugs", () => {
    expect(isValidTutorSlug("ab")).toBe(false);
    expect(isValidTutorSlug("a".repeat(41))).toBe(false);
  });
});

describe("custom student slug validation (tutor can fully override, not just accept the auto-generated one)", () => {
  it("accepts a plain custom handle with no random suffix", () => {
    expect(isValidCustomStudentSlug("gerdinos")).toBe(true);
  });

  it("rejects disallowed characters or casing", () => {
    expect(isValidCustomStudentSlug("Gerdinos")).toBe(false);
    expect(isValidCustomStudentSlug("gerdinos!")).toBe(false);
    expect(isValidCustomStudentSlug("γερντινος")).toBe(false);
  });

  it("rejects too-short or too-long slugs", () => {
    expect(isValidCustomStudentSlug("ab")).toBe(false);
    expect(isValidCustomStudentSlug("a".repeat(61))).toBe(false);
  });

  it("has no reserved-word restriction (student slugs aren't app routes)", () => {
    expect(isValidCustomStudentSlug("dashboard")).toBe(true);
  });
});

describe("studentLinkPath", () => {
  it("builds a two-segment path from tutor and student slugs", () => {
    expect(studentLinkPath("ger1", "gerdinos-x7fq2k9a2b")).toBe("/ger1/gerdinos-x7fq2k9a2b");
  });
});
