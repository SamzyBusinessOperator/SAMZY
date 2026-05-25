import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { accessToken } = await req.json();

    // Search for emails with attachments or invoice keywords
    const searchRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=has:attachment OR subject:(invoice OR fatura OR receipt OR delivery OR order)&maxResults=20`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const searchData = await searchRes.json();

    if (!searchData.messages || searchData.messages.length === 0) {
      return NextResponse.json({ invoices: [], message: "No invoice emails found." });
    }

    const invoices = [];

    for (const msg of searchData.messages.slice(0, 10)) {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const msgData = await msgRes.json();

      const subject = msgData.payload?.headers?.find((h: any) => h.name === "Subject")?.value || "";
      const from = msgData.payload?.headers?.find((h: any) => h.name === "From")?.value || "";

      // Extract text body
      const extractText = (payload: any): string => {
        if (payload?.body?.data) {
          return Buffer.from(payload.body.data, "base64").toString("utf-8");
        }
        if (payload?.parts) {
          for (const part of payload.parts) {
            if (part.mimeType === "text/plain" && part.body?.data) {
              return Buffer.from(part.body.data, "base64").toString("utf-8");
            }
          }
          for (const part of payload.parts) {
            if (part.mimeType === "text/html" && part.body?.data) {
              const html = Buffer.from(part.body.data, "base64").toString("utf-8");
              return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
            }
            if (part.parts) {
              const nested = extractText(part);
              if (nested) return nested;
            }
          }
        }
        return "";
      };

      // Find PDF attachments
      const findAttachments = (payload: any): any[] => {
        const attachments: any[] = [];
        if (payload?.parts) {
          for (const part of payload.parts) {
            if (part.filename && part.filename.toLowerCase().endsWith(".pdf") && part.body?.attachmentId) {
              attachments.push({ filename: part.filename, attachmentId: part.body.attachmentId });
            }
            if (part.parts) {
              attachments.push(...findAttachments(part));
            }
          }
        }
        return attachments;
      };

      const attachments = findAttachments(msgData.payload);
      let contentToAnalyze = extractText(msgData.payload);

      // If PDF attachment found, get it and send to Claude as base64
      if (attachments.length > 0) {
        const att = attachments[0];
        const attRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}/attachments/${att.attachmentId}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const attData = await attRes.json();
        const pdfBase64 = attData.data?.replace(/-/g, '+').replace(/_/g, '/');

        if (pdfBase64) {
          // Send PDF to Claude
          const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": process.env.ANTHROPIC_API_KEY!,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model: "claude-sonnet-4-20250514",
              max_tokens: 2000,
              system: `Extract invoice/delivery note data and return ONLY a JSON object:
{
  "supplier": "supplier name",
  "amount": 0.00,
  "currency": "EUR",
  "date": "YYYY-MM-DD",
  "due_date": "YYYY-MM-DD",
  "items": [{"name": "item name", "quantity": 1, "price": 0.00, "category": "category"}],
  "invoice_number": "INV-001"
}
If not an invoice/delivery note, return {"not_invoice": true}`,
              messages: [{
                role: "user",
                content: [
                  {
                    type: "document",
                    source: { type: "base64", media_type: "application/pdf", data: pdfBase64 }
                  },
                  { type: "text", text: `Subject: ${subject}\nFrom: ${from}\nExtract all invoice/delivery data.` }
                ]
              }],
            }),
          });

          const claudeData = await claudeRes.json();
          const text = claudeData.content?.[0]?.text || "{}";
          try {
            const clean = text.replace(/```json|```/g, "").trim();
            const parsed = JSON.parse(clean);
            if (!parsed.not_invoice) {
              invoices.push({ ...parsed, email_subject: subject, email_from: from, message_id: msg.id, has_attachment: true, filename: att.filename });
            }
          } catch { continue; }
          continue;
        }
      }

      // No PDF - analyze text body
      if (!contentToAnalyze) continue;

      const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY!,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          system: `Extract invoice data and return ONLY a JSON object:
{
  "supplier": "supplier name",
  "amount": 0.00,
  "currency": "EUR", 
  "date": "YYYY-MM-DD",
  "due_date": "YYYY-MM-DD",
  "items": [{"name": "item name", "quantity": 1, "price": 0.00, "category": "category"}],
  "invoice_number": "INV-001"
}
If not an invoice, return {"not_invoice": true}`,
          messages: [{ role: "user", content: `Subject: ${subject}\nFrom: ${from}\n\n${contentToAnalyze.slice(0, 3000)}` }],
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
      } catch { continue; }
    }

    return NextResponse.json({ invoices });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
