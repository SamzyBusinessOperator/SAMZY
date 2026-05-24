import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);
export async function POST(req: NextRequest) {
  try {
    const { email, storeName } = await req.json();
    const { data, error } = await resend.emails.send({
      from: "Samzy <onboarding@resend.dev>",
      to: email,
      subject: "Welcome to Samzy! Your store is ready",
      html: `
        <div style="max-width:560px;margin:40px auto;font-family:-apple-system,BlinkMacSystemFont,sans-serif;">
          <div style="background:#FC7800;padding:32px;text-align:center;border-radius:16px 16px 0 0;">
            <h1 style="color:#fff;font-size:24px;font-weight:800;margin:0;">Welcome to Samzy!</h1>
          </div>
          <div style="padding:40px 32px;background:#fff;border:1px solid #F0EEEB;">
            <p style="color:#0f0f0f;font-size:16px;font-weight:600;margin:0 0 12px;">Hi ${storeName}!</p>
            <p style="color:#6B6B6B;font-size:15px;line-height:1.7;margin:0 0 24px;">Your store is set up and ready. Your 14-day free trial has started!</p>
            <p style="color:#6B6B6B;font-size:14px;line-height:1.7;margin:0 0 24px;">With Samzy you can track sales, manage inventory, handle suppliers, and get AI-powered insights for your store.</p>
            <a href="https://samzyai.com" style="display:block;background:#FC7800;color:#fff;text-align:center;padding:15px;border-radius:10px;text-decoration:none;font-size:15px;font-weight:700;">Go to Your Dashboard</a>
          </div>
          <div style="padding:20px;text-align:center;">
            <p style="color:#6B6B6B;font-size:12px;margin:0;">2026 Samzy - samzyai.com</p>
          </div>
        </div>
      `,
    });
    if (error) { console.error("Resend error:", error); return NextResponse.json({ error }, { status: 400 }); }
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("Email error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
