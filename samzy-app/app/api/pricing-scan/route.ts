import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { imageData, margins } = await req.json();
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
        max_tokens: 8192,
        messages: [{
          role: "user",
          content: [
            contentBlock,
            {
              type: "text",
              text: `Extract ALL products from this supplier invoice. Return ONLY a JSON object:
{
  "supplier": "supplier company name",
  "total": 1234.56,
  "products": [
    {
      "name": "Product Name",
      "packSize": "24 x 100gr",
      "qty": 10,
      "costSIVA": 1.25,
      "ivaRate": 0.23
    }
  ]
}

Rules:
- costSIVA = unit price per item (divide case price by pack quantity if needed)
- qty = number of cases/boxes ordered
- packSize = as written on invoice (e.g. "24 x 100gr", "12 x 500ml")
- ivaRate = 0.23 for 23% VAT, 0.06 for 6%, 0 for exempt
- Extract EVERY product with a quantity > 0
- Skip items with 0.00 price or 0 quantity`
            }
          ]
        }]
      }),
    });

    const data = await response.json();
    if (data.error) return NextResponse.json({ error: data.error.message }, { status: 400 });

    const text = data.content?.[0]?.text || "{}";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    // Calculate all prices for each product
    const { transport, civacp, shopSem, shopCom, special, bigWholesale, restCom } = margins;

    const products = (parsed.products || []).map((p: any) => {
      const cost = parseFloat(p.costSIVA) || 0;
      const itemWT = cost * (1 + transport);
      const civacpPrice = itemWT * (1 + civacp);
      return {
        name: p.name,
        packSize: p.packSize || "",
        qty: p.qty || 1,
        costSIVA: cost,
        itemCost: cost,
        itemWT: itemWT,
        shopSem: itemWT * (1 + shopSem),
        civacp: civacpPrice,
        shopCom: civacpPrice * (1 + shopCom),
        special: civacpPrice * (1 + special),
        bigWholesale: civacpPrice * (1 + bigWholesale),
        restCom: civacpPrice * (1 + restCom),
        ivaRate: p.ivaRate || 0.23,
        publicPrice: civacpPrice * (1 + 0.23),
      };
    });

    return NextResponse.json({
      supplier: parsed.supplier || "",
      total: parsed.total || 0,
      products,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
