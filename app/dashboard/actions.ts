"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createTutorSupabaseClient } from "@/lib/supabase/server";
import { ensureTutorRecord } from "@/lib/tutors";
import { normalizeStudentLabel, appendSlugSuffix, isValidCustomStudentSlug } from "@/lib/slugs";
import { syncStripeSubscriptionForTutor } from "@/lib/stripe/sync";

const addStudentSchema = z.object({
  name: z.string().trim().min(1, "Το όνομα είναι υποχρεωτικό").max(100),
  subject: z.string().trim().min(1, "Το μάθημα είναι υποχρεωτικό").max(100),
  contactEmail: z.string().trim().email().optional().or(z.literal("")),
  linkLabel: z.string().trim().max(40).optional().or(z.literal("")),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  durationMinutes: z.coerce.number().int().min(15).max(240).default(60),
});

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function addStudentAction(formData: FormData): Promise<ActionResult> {
  const parsed = addStudentSchema.safeParse({
    name: formData.get("name"),
    subject: formData.get("subject"),
    contactEmail: formData.get("contactEmail") ?? "",
    linkLabel: formData.get("linkLabel") ?? "",
    dayOfWeek: formData.get("dayOfWeek"),
    startTime: formData.get("startTime"),
    durationMinutes: formData.get("durationMinutes") ?? 60,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Μη έγκυρα στοιχεία" };
  }

  const tutor = await ensureTutorRecord();
  const supabase = await createTutorSupabaseClient();

  const label = normalizeStudentLabel(parsed.data.linkLabel || parsed.data.name);
  const slug = appendSlugSuffix(label);

  const { data: student, error: studentError } = await supabase
    .from("students")
    .insert({
      tutor_id: tutor.id,
      name: parsed.data.name,
      subject: parsed.data.subject,
      contact_email: parsed.data.contactEmail || null,
      magic_link_label: label,
      magic_link_slug: slug,
    })
    .select("id")
    .single();

  if (studentError || !student) {
    return { ok: false, error: "Κάτι πήγε στραβά, δοκίμασε ξανά" };
  }

  const { error: slotError } = await supabase.from("slots").insert({
    student_id: student.id,
    day_of_week: parsed.data.dayOfWeek,
    start_time: parsed.data.startTime,
    duration_minutes: parsed.data.durationMinutes,
  });

  if (slotError) {
    return { ok: false, error: "Ο μαθητής προστέθηκε αλλά η ώρα μαθήματος όχι, πρόσθεσέ την ξανά" };
  }

  await syncStripeSubscriptionForTutor(tutor.id);

  revalidatePath("/dashboard");
  return { ok: true };
}

export async function removeStudentAction(studentId: string): Promise<ActionResult> {
  const tutor = await ensureTutorRecord();
  const supabase = await createTutorSupabaseClient();

  const { error } = await supabase
    .from("students")
    .update({ active: false, deactivated_at: new Date().toISOString() })
    .eq("id", studentId);

  if (error) return { ok: false, error: "Δεν μπόρεσε να αφαιρεθεί ο μαθητής" };

  await syncStripeSubscriptionForTutor(tutor.id);

  revalidatePath("/dashboard");
  return { ok: true };
}

export async function reactivateStudentAction(studentId: string): Promise<ActionResult> {
  const tutor = await ensureTutorRecord();
  const supabase = await createTutorSupabaseClient();

  const { error } = await supabase
    .from("students")
    .update({ active: true, deactivated_at: null })
    .eq("id", studentId);

  if (error) return { ok: false, error: "Δεν μπόρεσε να ενεργοποιηθεί ο μαθητής" };

  await syncStripeSubscriptionForTutor(tutor.id);

  revalidatePath("/dashboard");
  return { ok: true };
}

export async function regenerateStudentLinkAction(studentId: string): Promise<ActionResult> {
  const supabase = await createTutorSupabaseClient();

  const { data: student } = await supabase
    .from("students")
    .select("magic_link_label")
    .eq("id", studentId)
    .single();

  if (!student) return { ok: false, error: "Δεν βρέθηκε ο μαθητής" };

  const { error } = await supabase
    .from("students")
    .update({ magic_link_slug: appendSlugSuffix(student.magic_link_label) })
    .eq("id", studentId);

  if (error) return { ok: false, error: "Δεν μπόρεσε να ανανεωθεί ο σύνδεσμος" };

  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Lets a tutor set a fully custom student link instead of the default
 * auto-generated label-plus-random-suffix. A custom slug without a random
 * component is easier to guess than the default scheme — that trade-off
 * is the tutor's call to make per student, not something the app should
 * silently prevent.
 */
export async function setCustomStudentSlugAction(
  studentId: string,
  customSlug: string
): Promise<ActionResult> {
  const normalized = customSlug.trim().toLowerCase();

  if (!isValidCustomStudentSlug(normalized)) {
    return {
      ok: false,
      error: "Ο σύνδεσμος πρέπει να έχει 3-60 λατινικούς χαρακτήρες, αριθμούς ή παύλες",
    };
  }

  const supabase = await createTutorSupabaseClient();

  const { error } = await supabase
    .from("students")
    .update({ magic_link_slug: normalized })
    .eq("id", studentId);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Αυτός ο σύνδεσμος χρησιμοποιείται ήδη, δοκίμασε άλλον" };
    }
    return { ok: false, error: "Κάτι πήγε στραβά" };
  }

  revalidatePath("/dashboard");
  return { ok: true };
}

const slotSchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  durationMinutes: z.coerce.number().int().min(15).max(240),
});

/**
 * Tutor-initiated slot changes — add, move, or remove a confirmed lesson
 * directly, independent of whether the student ever filed a reschedule
 * request. The request/approve flow (decideRescheduleRequestAction above)
 * is one way a slot changes; this is the other, and neither requires the
 * other to have happened first.
 */
export async function addSlotAction(
  studentId: string,
  input: { dayOfWeek: number; startTime: string; durationMinutes: number }
): Promise<ActionResult> {
  const parsed = slotSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Μη έγκυρα στοιχεία" };

  const supabase = await createTutorSupabaseClient();
  const { error } = await supabase.from("slots").insert({
    student_id: studentId,
    day_of_week: parsed.data.dayOfWeek,
    start_time: parsed.data.startTime,
    duration_minutes: parsed.data.durationMinutes,
  });

  if (error) return { ok: false, error: "Κάτι πήγε στραβά" };

  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateSlotAction(
  slotId: string,
  input: { dayOfWeek: number; startTime: string; durationMinutes: number }
): Promise<ActionResult> {
  const parsed = slotSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Μη έγκυρα στοιχεία" };

  const supabase = await createTutorSupabaseClient();
  const { error } = await supabase
    .from("slots")
    .update({
      day_of_week: parsed.data.dayOfWeek,
      start_time: parsed.data.startTime,
      duration_minutes: parsed.data.durationMinutes,
    })
    .eq("id", slotId);

  if (error) return { ok: false, error: "Κάτι πήγε στραβά" };

  revalidatePath("/dashboard");
  return { ok: true };
}

export async function removeSlotAction(slotId: string): Promise<ActionResult> {
  const supabase = await createTutorSupabaseClient();
  const { error } = await supabase.from("slots").update({ active: false }).eq("id", slotId);

  if (error) return { ok: false, error: "Κάτι πήγε στραβά" };

  revalidatePath("/dashboard");
  return { ok: true };
}

export async function decideRescheduleRequestAction(
  requestId: string,
  decision: "approve" | "decline"
): Promise<ActionResult> {
  const supabase = await createTutorSupabaseClient();

  if (decision === "approve") {
    const { data, error } = await supabase.rpc("approve_reschedule_request", {
      p_request_id: requestId,
    });
    if (error || !data?.ok) {
      revalidatePath("/dashboard");
      return { ok: false, error: "Η ώρα μόλις καταλήφθηκε, ζήτησε άλλη" };
    }
  } else {
    const { error } = await supabase
      .from("reschedule_requests")
      .update({ status: "declined", decided_at: new Date().toISOString() })
      .eq("id", requestId)
      .eq("status", "pending");
    if (error) return { ok: false, error: "Κάτι πήγε στραβά" };
  }

  revalidatePath("/dashboard");
  return { ok: true };
}
