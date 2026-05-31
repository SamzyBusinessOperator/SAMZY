import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { imageData, transportPct = 4.15 } = await req.json();

    const base64 = imageData.split(",")[1];
    const mediaType = imageData.split(";")[0].split(":")[1];
    const isPDF = mediaType === "application/pdf";

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
        max_tokens: 32000,
        messages: [{
          role: "user",
          content: [
            contentBlock,
            {
              type: "text",
              text: `Extract ALL products from this supplier invoice. Return ONLY valid JSON:
{
  "supplier": "supplier name",
  "total": 1234.56,
  "products": [
    {
      "name": "Product Name",
      "packSize": "24 x 100gr",
      "qty": 10,
      "costSIVA": 16.32,
      "ivaRate": 0.23,
      "category": "Other"
    }
  ]
}
Rules:
- costSIVA = price PER CASE excluding VAT
- qty = number of cases ordered
- ivaRate: 0.06 for food/spices/grains, 0.13 for oils/ghee, 0.23 for cosmetics/hygiene/drinks/default
- category: Beverages, Dairy, Bakery, Cleaning, Spices, Oils, Snacks, or Other
- Extract EVERY product line with quantity > 0
- Return ONLY the JSON, nothing else`
            }
          ]
        }]
      }),
    });

    const data = await response.json();
    if (data.error) return NextResponse.json({ error: data.error.message }, { status: 400 });

    const text = data.content?.[0]?.text || "{}";
    const clean = text.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();

    let parsed: any;
    try { parsed = JSON.parse(clean); }
    catch {
      const match = clean.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
      else throw new Error("Could not parse AI response");
    }

    const transport = transportPct / 100;

    const products = (parsed.products || [])
      .filter((p: any) => p.name && parseFloat(p.costSIVA) > 0)
      .map((p: any) => {
        const costSIVA = parseFloat(p.costSIVA) || 0;
        const ivaRate  = parseFloat(p.ivaRate) || 0.23;
        const itemCost = costSIVA;
        const itemWT   = itemCost * (1 + transport);
        const civacp   = itemWT * (1 + ivaRate);
        const shopSem  = itemWT * 1.30;
        const shopCom  = civacp * 1.20;
        const special  = civacp * 1.12;
        const bigWh    = civacp * 1.10;
        const restCom  = civacp * 1.35;

        return {
          name:         String(p.name).trim(),
          packSize:     String(p.packSize || "").trim(),
          qty:          parseInt(p.qty) || 1,
          costSIVA,
          itemCost,
          itemWT,
          civacp,
          shopSem,
          shopCom,
          special,
          bigWholesale: bigWh,
          restCom,
          ivaRate,
          category:     String(p.category || "Other"),
        };
      });

    return NextResponse.json({
      supplier: String(parsed.supplier || "").trim(),
      total: parseFloat(parsed.total) || 0,
      products,
      count: products.length,
    });

  } catch (err: any) {
    console.error("[pricing-scan]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}