"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addStudentAction } from "@/app/dashboard/actions";
import { GREEK_DAY_LABELS } from "@/lib/greek";
import { TimeSelect } from "@/app/components/TimeSelect";

export function OnboardingForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <form
      ref={formRef}
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await addStudentAction(formData);
          if (result.ok) {
            router.push("/dashboard");
          } else {
            setError(result.error);
          }
        });
      }}
      className="flex flex-col gap-4"
    >
      <label className="flex flex-col gap-1 text-sm">
        Όνομα μαθητή
        <input
          name="name"
          required
          autoFocus
          className="rounded-md border border-cream-dark px-4 py-3 text-base"
          placeholder="π.χ. Μαρία Παπαδοπούλου"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Μάθημα
        <input
          name="subject"
          required
          className="rounded-md border border-cream-dark px-4 py-3 text-base"
          placeholder="π.χ. Μαθηματικά"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Email γονέα/μαθητή (προαιρετικό)
        <input
          name="contactEmail"
          type="email"
          className="rounded-md border border-cream-dark px-4 py-3 text-base"
        />
      </label>

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Μέρα
          <select
            name="dayOfWeek"
            required
            defaultValue="1"
            className="rounded-md border border-cream-dark px-4 py-3 text-base"
          >
            {GREEK_DAY_LABELS.map((label, i) => (
              <option key={i} value={i}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Ώρα
          <TimeSelect
            name="startTime"
            defaultValue="16:00"
            className="rounded-md border border-cream-dark px-4 py-3 text-base"
          />
        </label>
      </div>

      <input type="hidden" name="durationMinutes" value={60} />

      {error && <p className="text-sm text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-ink px-4 py-4 text-base font-semibold text-cream transition active:scale-[0.98] hover:opacity-90 active:opacity-80 disabled:opacity-50"
      >
        {isPending ? "Προσθήκη..." : "Συνέχεια"}
      </button>
    </form>
  );
}
