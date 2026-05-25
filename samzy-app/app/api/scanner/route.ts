import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { imageData, mode } = await req.json();
    const base64 = imageData.split(",")[1];
    const mediaType = imageData.split(";")[0].split(":")[1];
    const isPDF = mediaType === "application/pdf";

    const prompts: Record<string, string> = {
      inventory: `Analyze this delivery note and extract ALL products listed.
Return ONLY a JSON object with no extra text:
{"type":"inventory","items":[{"name":"Product Name","quantity":10,"price":2.50,"category":"Dairy"}]}
Categories: Dairy, Bakery, Beverages, Produce, Meat, Pantry, Frozen, Cleaning, Beauty, Vegetables, Fruits, Other.
Extract every single product. If price not visible use 0. If quantity not visible use 1.`,
      supplier: `Analyze this supplier invoice and extract the details.
Return ONLY a JSON object with no extra text:
{"type":"supplier","supplier":{"name":"Supplier Company Name","invoice_amount":"1240","due_date":"May 30, 2026","notes":"Any relevant notes"}}
Extract the total amount due, supplier name, and payment due date. If due date not visible use "Not specified".`,
    };

    const prompt = prompts[mode] || prompts.inventory;

    const contentBlock = isPDF
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
      : { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } };

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 4096,
        messages: [{
          role: "user",
          content: [
            contentBlock,
            { type: "text", text: prompt }
          ]
        }]
      }),
    });

    const data = await response.json();
    if (data.error) return NextResponse.json({ error: data.error.message }, { status: 400 });
    const text = data.content?.[0]?.text || "{}";
    const clean = text.replace(/```json|```/g, "").trim();
    const result = JSON.parse(clean);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: "Could not scan: " + err.message }, { status: 500 });
  }
}
