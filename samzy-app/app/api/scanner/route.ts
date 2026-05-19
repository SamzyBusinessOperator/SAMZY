import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { imageData } = await req.json();
    const base64 = imageData.split(",")[1];
    const mediaType = imageData.split(";")[0].split(":")[1];

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
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 }
            },
            {
              type: "text",
              text: `Analyze this receipt or delivery note and extract all products.
Return ONLY a JSON array with no extra text, like this:
[{"name": "Product Name", "quantity": 10, "price": 2.50, "category": "Dairy"}]
Categories: Dairy, Bakery, Beverages, Produce, Meat, Pantry, Frozen, Cleaning, Other.
If price not visible use 0. If quantity not visible use 1.`
            }
          ]
        }]
      }),
    });

    const data = await response.json();
    if (data.error) return NextResponse.json({ error: data.error.message }, { status: 400 });
    const text = data.content?.[0]?.text || "[]";
    const clean = text.replace(/```json|```/g, "").trim();
    const items = JSON.parse(clean);
    return NextResponse.json({ items });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}