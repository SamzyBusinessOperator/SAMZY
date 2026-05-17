import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { question, storeData } = await req.json();

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: `You are Samzy AI, a smart business advisor for independent supermarket owners. 
You have access to the store's real data and give short, specific, actionable advice.
Always be direct and practical. Use numbers from the data when relevant.
Store data: ${JSON.stringify(storeData)}`,
      messages: [{ role: "user", content: question }],
    }),
  });

  const data = await response.json();
  const answer = data.content?.[0]?.text || "Sorry, I couldn't get a response.";
  return NextResponse.json({ answer });
}
