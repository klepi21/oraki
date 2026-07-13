"use client";

import { useState, useTransition } from "react";
import { updateTutorSlugAction } from "@/app/dashboard/settings/actions";

export function TutorSlugForm({ currentSlug, appUrl }: { currentSlug: string; appUrl: string }) {
  const [slug, setSlug] = useState(currentSlug);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        setError(null);
        setSuccess(false);
        startTransition(async () => {
          const result = await updateTutorSlugAction(formData);
          if (result.ok) setSuccess(true);
          else setError(result.error);
        });
      }}
      className="flex flex-col gap-3 rounded-2xl border border-cream-dark p-4"
    >
      <h3 className="text-lg font-semibold text-ink">Ο δικός σου σύνδεσμος</h3>
      <p className="text-sm text-ink-soft">
        Αυτό είναι το πρώτο κομμάτι του συνδέσμου κάθε μαθητή σου: {appUrl}/
        <span className="font-medium">{slug || "..."}</span>/...
      </p>
      <input
        name="slug"
        value={slug}
        onChange={(e) => setSlug(e.target.value.toLowerCase())}
        required
        pattern="[a-z0-9-]{3,40}"
        className="rounded-md border border-cream-dark px-3 py-2 text-base"
      />
      {error && <p className="text-sm text-red-700">{error}</p>}
      {success && <p className="text-sm text-accent-dark">Αποθηκεύτηκε!</p>}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-ink px-4 py-3 text-base font-semibold text-cream transition active:scale-[0.98] hover:opacity-90 active:opacity-80 disabled:opacity-50 self-start"
      >
        {isPending ? "Αποθήκευση..." : "Αποθήκευση"}
      </button>
    </form>
  );
}
