import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getStripeClient } from "@/lib/stripe/client";
import { billedQuantity, requiresSubscription } from "@/lib/stripe/billing";

/**
 * Recomputes the tutor's active student count and reconciles it against
 * Stripe: creates a subscription on student #3 (never before), and keeps
 * the billed quantity in sync afterward — capped, per §4, regardless of
 * actual count.
 */
export async function syncStripeSubscriptionForTutor(tutorId: string): Promise<void> {
  const admin = createAdminSupabaseClient();

  const { count } = await admin
    .from("students")
    .select("id", { count: "exact", head: true })
    .eq("tutor_id", tutorId)
    .eq("active", true);

  const activeStudentCount = count ?? 0;

  const { data: tutor } = await admin
    .from("tutors")
    .select("id, stripe_customer_id, stripe_subscription_id, email, name")
    .eq("id", tutorId)
    .single();

  if (!tutor) return;

  if (!requiresSubscription(activeStudentCount)) {
    // Free tier: no subscription should exist. If one exists (e.g. count
    // dropped back to <=2 after a removal), cancel it — no charge below
    // the free threshold.
    if (tutor.stripe_subscription_id) {
      const stripe = getStripeClient();
      await stripe.subscriptions.cancel(tutor.stripe_subscription_id);
      await admin.from("tutors").update({ stripe_subscription_id: null }).eq("id", tutorId);
    }
    return;
  }

  const stripe = getStripeClient();
  const quantity = billedQuantity(activeStudentCount);

  let customerId = tutor.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: tutor.email,
      name: tutor.name,
      metadata: { tutor_id: tutorId },
    });
    customerId = customer.id;
    await admin.from("tutors").update({ stripe_customer_id: customerId }).eq("id", tutorId);
  }

  if (!tutor.stripe_subscription_id) {
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: process.env.STRIPE_PRICE_ID_PER_STUDENT!, quantity }],
      metadata: { tutor_id: tutorId },
    });
    await admin
      .from("tutors")
      .update({ stripe_subscription_id: subscription.id })
      .eq("id", tutorId);
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(tutor.stripe_subscription_id);
  const item = subscription.items.data[0];
  if (item && item.quantity !== quantity) {
    await stripe.subscriptionItems.update(item.id, { quantity });
  }
}
