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
        max_tokens: 8192,
        messages: [{
          role: "user",
          content: [
            contentBlock,
            {
              type: "text",
              text: `You are extracting data from a supplier invoice for an Asian supermarket in Lisbon, Portugal.

Extract EVERY product line from this invoice. Return ONLY a valid JSON object — no markdown, no backticks, no explanation:

{
  "supplierName": "supplier company name from invoice header",
  "products": [
    {
      "name": "full product name exactly as on invoice",
      "pack_size": "e.g. 24 x 100 gr",
      "qty_cases": 10,
      "cost_siva": 1.25,
      "item_cost": 1.25,
      "iva_pct": 0.23,
      "shop_sem_pct": 0.30,
      "shop_com_pct": 0.20,
      "special_pct": 0.12,
      "big_wholesale_pct": 0.10,
      "rest_com_pct": 0.35
    }
  ]
}

RULES:
1. cost_siva = price PER CASE as printed on the invoice, excluding VAT
2. item_cost = same as cost_siva (unless you see a separate net/discounted price column, then use that)
3. qty_cases = number of cases/boxes ordered
4. pack_size = exactly as written on invoice e.g. "24 x 100 gr", "12*200gm"
5. iva_pct — VAT rate for Portugal:
   - 0.06 = basic food: spices, flour, rice, seeds, grains, dried goods, snacks, pani puri, chutneys
   - 0.13 = oils: coconut oil, sesame oil, almond oil, castor oil, ghee
   - 0.23 = cosmetics, hair products, face wash, toothpaste, soaps, drinks, sauces (default)
6. Markup percentages — use these defaults unless you can read different values from the invoice:
   - shop_sem_pct: 0.30, shop_com_pct: 0.20, special_pct: 0.12
   - big_wholesale_pct: 0.10, rest_com_pct: 0.35
7. Extract ALL product lines including similar products with different sizes
8. Skip lines with 0 price or 0 quantity
9. Return ONLY the JSON — nothing else`
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
    try {
      parsed = JSON.parse(clean);
    } catch {
      const match = clean.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
      else throw new Error("Could not parse AI response as JSON");
    }

    const transport = transportPct / 100;

    // ── Correct formula engine (exact replica of customer's Excel) ──
    // ITEM W/T   = item_cost × (1 + transport%)
    // C/IVACP    = ITEM_W/T  × (1 + iva%)
    // SHOP SEM   = ITEM_W/T  × (1 + shop_sem%)   ← base is W/T not C/IVACP
    // SHOP COM   = C/IVACP   × (1 + shop_com%)
    // SPECIAL    = C/IVACP   × (1 + special%)
    // WHOLESALE  = C/IVACP   × (1 + big_wholesale%)
    // REST COM   = C/IVACP   × (1 + rest_com%)

    const products = (parsed.products || [])
      .filter((p: any) => p.name && parseFloat(p.cost_siva) > 0)
      .map((p: any) => {
        const cost_siva        = parseFloat(p.cost_siva) || 0;
        const item_cost        = parseFloat(p.item_cost) || cost_siva;
        const iva_pct          = parseFloat(p.iva_pct) || 0.23;
        const shop_sem_pct     = parseFloat(p.shop_sem_pct) || 0.30;
        const shop_com_pct     = parseFloat(p.shop_com_pct) || 0.20;
        const special_pct      = parseFloat(p.special_pct) || 0.12;
        const big_wholesale_pct = parseFloat(p.big_wholesale_pct) || 0.10;
        const rest_com_pct     = parseFloat(p.rest_com_pct) || 0.35;

        const itemwt        = item_cost * (1 + transport);
        const civacp        = itemwt    * (1 + iva_pct);
        const shop_sem      = itemwt    * (1 + shop_sem_pct);
        const shop_com      = civacp    * (1 + shop_com_pct);
        const special       = civacp    * (1 + special_pct);
        const big_wholesale = civacp    * (1 + big_wholesale_pct);
        const rest_com      = civacp    * (1 + rest_com_pct);

        return {
          name:               String(p.name).trim(),
          pack_size:          String(p.pack_size || "").trim(),
          qty_cases:          parseInt(p.qty_cases) || 1,
          cost_siva,
          item_cost,
          itemwt,
          civacp,
          shop_sem,
          shop_com,
          special,
          big_wholesale,
          rest_com,
          iva_pct,
          shop_sem_pct,
          shop_com_pct,
          special_pct,
          big_wholesale_pct,
          rest_com_pct,
          transport_pct:      transportPct,
          total_stock_units:  (parseInt(p.qty_cases) || 1) * getUnitsFromPackSize(String(p.pack_size || "")),
          total_cost:         Math.round(item_cost * (parseInt(p.qty_cases) || 1) * 100) / 100,
          price_direction:    "new" as const,
          price_change_pct:   0,
        };
      });

    return NextResponse.json({
      supplierName: String(parsed.supplierName || "").trim(),
      products,
      count: products.length,
    });

  } catch (err: any) {
    console.error("[pricing-scan]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function getUnitsFromPackSize(packSize: string): number {
  if (!packSize) return 1;
  const match = packSize.match(/^(\d+)\s*[x×*]/i);
  return match ? parseInt(match[1]) : 1;
}