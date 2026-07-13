import { describe, expect, it, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import Stripe from "stripe";

beforeAll(() => {
  process.env.STRIPE_SECRET_KEY = "sk_test_fake_key_for_unit_tests";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_fake_secret_for_unit_tests";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fake-project.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "fake-service-role-key";
});

function makeRequest(body: string, signatureHeader: string | null) {
  return new NextRequest("https://oraki.gr/api/webhooks/stripe", {
    method: "POST",
    headers: signatureHeader ? { "stripe-signature": signatureHeader } : {},
    body,
  });
}

describe("Stripe webhook signature verification (§4, §5b Billing checklist)", () => {
  it("rejects a request with no signature header", async () => {
    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const response = await POST(makeRequest(JSON.stringify({ type: "invoice.payment_failed" }), null));
    expect(response.status).toBe(400);
  });

  it("rejects a forged signature", async () => {
    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const body = JSON.stringify({ type: "invoice.payment_failed" });
    const response = await POST(makeRequest(body, "t=1,v1=not_a_real_signature"));
    expect(response.status).toBe(400);
  });

  it("accepts a genuinely signed payload", async () => {
    const body = JSON.stringify({
      id: "evt_test",
      object: "event",
      type: "customer.subscription.updated",
      data: { object: { id: "sub_test", status: "active", metadata: {} } },
    });
    const header = Stripe.webhooks.generateTestHeaderString({
      payload: body,
      secret: process.env.STRIPE_WEBHOOK_SECRET!,
    });

    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const response = await POST(makeRequest(body, header));
    // Reaches the switch statement (and 200s) rather than being rejected
    // at signature verification. Downstream Supabase calls will fail in
    // this unit-test context (no real project configured) but that's a
    // separate concern from signature verification, which is what this
    // test targets.
    expect(response.status).not.toBe(400);
  });
});
