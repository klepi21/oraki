import { randomBytes } from "node:crypto";

// Excludes visually-confusable characters (0/O, 1/l/I) since these appear
// in URLs people copy by hand.
const SUFFIX_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";
const SUFFIX_LENGTH = 10;

export const RESERVED_TUTOR_SLUGS = new Set([
  "dashboard",
  "onboarding",
  "sign-in",
  "sign-up",
  "api",
  "s",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "_next",
]);

// Greek → Latin per ELOT-style transliteration, so "Μαρία Παπαδοπούλου"
// becomes "maria-papadopoulou" instead of collapsing to nothing (which
// made every Greek-named student fall back to the generic "mathitis").
const GREEK_TO_LATIN: Record<string, string> = {
  α: "a", β: "v", γ: "g", δ: "d", ε: "e", ζ: "z", η: "i", θ: "th",
  ι: "i", κ: "k", λ: "l", μ: "m", ν: "n", ξ: "x", ο: "o", π: "p",
  ρ: "r", σ: "s", ς: "s", τ: "t", υ: "y", φ: "f", χ: "ch", ψ: "ps", ω: "o",
};

/** Turns free text into a URL-safe handle: lowercase ascii letters, digits, hyphens. */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents (Greek tonos included, post-NFKD)
    .toLowerCase()
    .replace(/ου/g, "ou")
    .replace(/[α-ως]/g, (ch) => GREEK_TO_LATIN[ch] ?? "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/**
 * A short random suffix, unguessable but still convenient to type/share.
 * Its job is to make enumeration impractical (31 chars ^ 10 ≈ 8e14
 * combinations) in combination with the rate limiter in lib/rate-limit.ts.
 */
export function generateSlugSuffix(): string {
  const bytes = randomBytes(SUFFIX_LENGTH);
  let suffix = "";
  for (let i = 0; i < SUFFIX_LENGTH; i++) {
    suffix += SUFFIX_ALPHABET[bytes[i] % SUFFIX_ALPHABET.length];
  }
  return suffix;
}

/** Sanitizes a tutor-chosen student label for storage (magic_link_label). */
export function normalizeStudentLabel(label: string): string {
  return slugify(label) || "mathitis";
}

/** Combines a (normalized) label with a fresh random suffix, e.g. for regenerate. */
export function appendSlugSuffix(normalizedLabel: string): string {
  return `${normalizedLabel}-${generateSlugSuffix()}`;
}

/** Builds the public per-student slug from a tutor-chosen label. */
export function buildStudentSlug(label: string): string {
  return appendSlugSuffix(normalizeStudentLabel(label));
}

export function isValidTutorSlug(slug: string): boolean {
  return /^[a-z0-9-]{3,40}$/.test(slug) && !RESERVED_TUTOR_SLUGS.has(slug);
}

/**
 * Validates a fully custom student slug (tutor-chosen, no forced random
 * suffix). Looser length bound than the tutor slug since these aren't
 * app routes and don't need a reserved-word check. A custom slug without
 * a random component is easier to guess than the default
 * label-plus-suffix scheme — that trade-off is the tutor's call to make
 * per student, not something the app should silently prevent.
 */
export function isValidCustomStudentSlug(slug: string): boolean {
  return /^[a-z0-9-]{3,60}$/.test(slug);
}

export function studentLinkPath(tutorSlug: string, studentSlug: string): string {
  return `/${tutorSlug}/${studentSlug}`;
}
