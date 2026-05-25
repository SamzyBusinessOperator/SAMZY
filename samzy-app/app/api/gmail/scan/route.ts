import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { accessToken, storeId, email } = await req.json();

    // Fetch emails with invoice-related subjects
    const searchRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=subject:(invoice OR fatura OR receipt OR delivery)&maxResults=10`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const searchData = await searchRes.json();

    if (!searchData.messages || searchData.messages.length === 0) {
      return NextResponse.json({ invoices: [], message: "No invoice emails found." });
    }

    const invoices = [];

    for (const msg of searchData.messages.slice(0, 5)) {
      // Get email content
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const msgData = await msgRes.json();

      // Extract email body
      let body = "";
      const parts = msgData.payload?.parts || [];
      for (const part of parts) {
        if (part.mimeType === "text/plain" && part.body?.data) {
          body = Buffer.from(part.body.data, "base64").toString("utf-8");
          break;
        }
      }
      if (!body && msgData.payload?.body?.data) {
        body = Buffer.from(msgData.payload.body.data, "base64").toString("utf-8");
      }

      const subject = msgData.payload?.headers?.find((h: any) => h.name === "Subject")?.value || "";
      const from = msgData.payload?.headers?.find((h: any) => h.name === "From")?.value || "";

      if (!body) continue;

      // Use Claude to extract invoice data
      const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY!,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `Extract invoice data from this email and return ONLY a JSON object with this exact structure:
{
  "supplier": "supplier name",
  "amount": 0.00,
  "currency": "EUR",
  "date": "YYYY-MM-DD",
  "due_date": "YYYY-MM-DD",
  "items": [{"name": "item name", "quantity": 1, "price": 0.00}],
  "invoice_number": "INV-001"
}
If this is not an invoice email, return {"not_invoice": true}`,
          messages: [{ role: "user", content: `Subject: ${subject}\nFrom: ${from}\n\n${body.slice(0, 3000)}` }],
        }),
      });

      const claudeData = await claudeRes.json();
      const text = claudeData.content?.[0]?.text || "{}";
      
      try {
        const clean = text.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(clean);
        if (!parsed.not_invoice) {
          invoices.push({ ...parsed, email_subject: subject, email_from: from, message_id: msg.id });
        }
      } catch {
        continue;
      }
    }

    return NextResponse.json({ invoices });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
