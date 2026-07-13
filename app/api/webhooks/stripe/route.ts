import { NextRequest, NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe/client";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { sendPaymentFailedEmail } from "@/lib/email/resend";

const GRACE_PERIOD_DAYS = 5;

export async function POST(request: NextRequest) {
  const stripe = getStripeClient();
  const signature = request.headers.get("stripe-signature");
  const body = await request.text();

  if (!signature) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    // Signature verification failed: reject unsigned/forged webhook calls.
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();

  switch (event.type) {
    case "customer.subscription.updated": {
      const subscription = event.data.object;
      const tutorId = subscription.metadata?.tutor_id;
      if (tutorId && subscription.status === "active") {
        await admin
          .from("tutors")
          .update({ billing_grace_period_ends_at: null })
          .eq("id", tutorId);
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object;
      const subscriptionDetails =
        invoice.parent?.type === "subscription_details" ? invoice.parent.subscription_details : null;
      const subscriptionId =
        typeof subscriptionDetails?.subscription === "string"
          ? subscriptionDetails.subscription
          : subscriptionDetails?.subscription?.id;
      if (subscriptionId) {
        const { data: tutor } = await admin
          .from("tutors")
          .select("id, email")
          .eq("stripe_subscription_id", subscriptionId)
          .maybeSingle();

        if (tutor) {
          const graceEndsAt = new Date();
          graceEndsAt.setDate(graceEndsAt.getDate() + GRACE_PERIOD_DAYS);

          await admin
            .from("tutors")
            .update({ billing_grace_period_ends_at: graceEndsAt.toISOString() })
            .eq("id", tutor.id);

          // Grace period banner, not an immediate hard lock (see §4).
          await sendPaymentFailedEmail({
            tutorEmail: tutor.email,
            graceDaysLeft: GRACE_PERIOD_DAYS,
          });
        }
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
