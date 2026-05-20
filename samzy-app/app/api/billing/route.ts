import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (customers.data.length === 0) {
      return NextResponse.json({ error: "No billing account found for this email." }, { status: 404 });
    }
    const customer = customers.data[0];
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: "https://samzy-two.vercel.app/profile",
    });
    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
