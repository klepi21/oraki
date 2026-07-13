"use server";

import { revalidatePath } from "next/cache";
import { ensureTutorRecord, updateTutorSlug, regenerateCalendarFeedToken } from "@/lib/tutors";
import type { ActionResult } from "@/app/dashboard/actions";

export async function updateTutorSlugAction(formData: FormData): Promise<ActionResult> {
  const newSlug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const tutor = await ensureTutorRecord();

  const result = await updateTutorSlug(tutor.id, newSlug);
  if (result.ok) revalidatePath("/dashboard/settings");
  return result;
}

export async function regenerateCalendarFeedTokenAction(): Promise<
  { ok: true; token: string } | { ok: false; error: string }
> {
  const tutor = await ensureTutorRecord();
  const result = await regenerateCalendarFeedToken(tutor.id);
  if (result.ok) revalidatePath("/dashboard/settings");
  return result;
}
