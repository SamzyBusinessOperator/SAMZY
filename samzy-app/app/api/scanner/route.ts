import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { imageData, mode } = await req.json();
    const base64 = imageData.split(",")[1];
    const mediaType = imageData.split(";")[0].split(":")[1];
    const isPDF = mediaType === "application/pdf";

    const prompts: Record<string, string> = {
      inventory: `Analyze this delivery note and extract ALL products listed. IMPORTANT: Use the EXACT category name as written in the document - do not change or reclassify categories.
Return ONLY a JSON object with no extra text:
{"type":"inventory","items":[{"name":"Product Name","quantity":10,"price":2.50,"category":"Dairy"}]}
Use EXACT categories based on the product type:
- Dairy: milk, cheese, yogurt, butter, cream
- Vegetables: tomatoes, onions, potatoes, carrots, broccoli, spinach, peppers, cucumber, lettuce, zucchini, mushrooms, garlic, ginger, cauliflower, eggplant, leek
- Fruits: bananas, apples, oranges, grapes, strawberries, blueberries, mango, pineapple, kiwi, lemons, avocado, watermelon
- Beverages: juice, water, cola, energy drink, tea, coffee
- Bakery: bread, croissants, buns, bagels, pita, tortilla, baguette
- Frozen: frozen peas, frozen fries, ice cream, frozen pizza, frozen fish
- Meat: chicken, beef, pork, bacon, lamb
- Pantry: rice, pasta, oil, sauce, beans, flour, sugar, salt, honey, jam, ketchup, oats
- Beauty: shampoo, conditioner, body wash, hand soap, toothpaste, deodorant, moisturiser, sunscreen, shower gel, lip balm
- Cleaning: dish soap, laundry detergent, surface cleaner, bleach, sponges, trash bags, paper towels, toilet cleaner
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
