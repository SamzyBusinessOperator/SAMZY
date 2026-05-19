import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const email = session.customer_email;
      const customerId = session.customer as string;
      if (email) {
        const { error: updateError } = await supabase.from("stores").update({
          subscription_status: "active",
          stripe_customer_id: customerId,
        }).ilike("owner_email", email);
        console.log("Webhook update:", updateError ? updateError.message : "success", "email:", email);
      }
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      await supabase.from("stores").update({
        subscription_status: "cancelled",
      }).eq("stripe_customer_id", customerId);
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      await supabase.from("stores").update({
        subscription_status: "past_due",
      }).eq("stripe_customer_id", customerId);
      break;
    }
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const status = subscription.status === "active" ? "active" : subscription.status;
      await supabase.from("stores").update({
        subscription_status: status,
      }).eq("stripe_customer_id", customerId);
      break;
    }
  }

  return NextResponse.json({ received: true });
}