"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createTutorSupabaseClient } from "@/lib/supabase/server";
import { ensureTutorRecord } from "@/lib/tutors";
import type { ActionResult } from "@/app/dashboard/actions";

const windowSchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});

export async function addAvailabilityWindowAction(formData: FormData): Promise<ActionResult> {
  const parsed = windowSchema.safeParse({
    dayOfWeek: formData.get("dayOfWeek"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
  });

  if (!parsed.success) {
    return { ok: false, error: "Μη έγκυρα στοιχεία" };
  }

  if (parsed.data.endTime <= parsed.data.startTime) {
    return { ok: false, error: "Η ώρα λήξης πρέπει να είναι μετά την ώρα έναρξης" };
  }

  const tutor = await ensureTutorRecord();
  const supabase = await createTutorSupabaseClient();

  const { error } = await supabase.from("tutor_availability").insert({
    tutor_id: tutor.id,
    day_of_week: parsed.data.dayOfWeek,
    start_time: parsed.data.startTime,
    end_time: parsed.data.endTime,
  });

  if (error) return { ok: false, error: "Κάτι πήγε στραβά" };

  revalidatePath("/dashboard/availability");
  return { ok: true };
}

export async function removeAvailabilityWindowAction(windowId: string): Promise<ActionResult> {
  const supabase = await createTutorSupabaseClient();

  const { error } = await supabase.from("tutor_availability").delete().eq("id", windowId);
  if (error) return { ok: false, error: "Κάτι πήγε στραβά" };

  revalidatePath("/dashboard/availability");
  return { ok: true };
}

const overrideSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  isAvailable: z.enum(["true", "false"]),
});

/**
 * A one-off exception for a specific date, layered on top of the
 * recurring weekly windows: "closed" carves time out of an otherwise-open
 * date, "extra" opens time on a date that wouldn't otherwise be
 * available. Doesn't touch the recurring pattern in tutor_availability.
 */
export async function addAvailabilityOverrideAction(formData: FormData): Promise<ActionResult> {
  const parsed = overrideSchema.safeParse({
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    isAvailable: formData.get("isAvailable"),
  });

  if (!parsed.success) {
    return { ok: false, error: "Μη έγκυρα στοιχεία" };
  }

  if (parsed.data.endTime <= parsed.data.startTime) {
    return { ok: false, error: "Η ώρα λήξης πρέπει να είναι μετά την ώρα έναρξης" };
  }

  const tutor = await ensureTutorRecord();
  const supabase = await createTutorSupabaseClient();

  const { error } = await supabase.from("availability_overrides").insert({
    tutor_id: tutor.id,
    date: parsed.data.date,
    start_time: parsed.data.startTime,
    end_time: parsed.data.endTime,
    is_available: parsed.data.isAvailable === "true",
  });

  if (error) return { ok: false, error: "Κάτι πήγε στραβά" };

  revalidatePath("/dashboard/availability");
  return { ok: true };
}

export async function removeAvailabilityOverrideAction(overrideId: string): Promise<ActionResult> {
  const supabase = await createTutorSupabaseClient();

  const { error } = await supabase.from("availability_overrides").delete().eq("id", overrideId);
  if (error) return { ok: false, error: "Κάτι πήγε στραβά" };

  revalidatePath("/dashboard/availability");
  return { ok: true };
}
