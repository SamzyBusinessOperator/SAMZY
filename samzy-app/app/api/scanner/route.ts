import { NextRequest, NextResponse } from "next/server";
export async function POST(req: NextRequest) {
  try {
    const { imageData, mode } = await req.json();
    const base64 = imageData.split(",")[1];
    const mediaType = imageData.split(";")[0].split(":")[1];
    const prompts: Record<string, string> = {
      inventory: `Analyze this delivery note or receipt and extract all products.
Return ONLY a JSON object with no extra text:
{"type":"inventory","items":[{"name":"Product Name","quantity":10,"price":2.50,"category":"Dairy"}]}
Categories: Dairy, Bakery, Beverages, Produce, Meat, Pantry, Frozen, Cleaning, Other.
If price not visible use 0. If quantity not visible use 1.`,
      supplier: `Analyze this supplier invoice and extract the details.
Return ONLY a JSON object with no extra text:
{"type":"supplier","supplier":{"name":"Supplier Company Name","invoice_amount":"€1,240","due_date":"May 30, 2026","notes":"Any relevant notes"}}
Extract the total amount due, supplier name, and payment due date. If due date not visible use "Not specified".`,
      receipt: `Analyze this sales receipt and extract the details.
Return ONLY a JSON object with no extra text:
{"type":"receipt","items":[{"name":"Product Name","quantity":1,"price":2.50,"category":"Other"}],"total":25.00}
Categories: Dairy, Bakery, Beverages, Produce, Meat, Pantry, Frozen, Cleaning, Other.`,
    };
    const prompt = prompts[mode] || prompts.inventory;
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
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
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
