import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { question, storeData } = await req.json();
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
        system: "You are Samzy AI, a smart business advisor for independent supermarket owners. Give short, specific, actionable advice based on the store data provided. Store data: " + JSON.stringify(storeData),
        messages: [{ role: "user", content: question }],
      }),
    });
    const data = await response.json();
    if (data.error) {
      return NextResponse.json({ answer: "API Error: " + data.error.message });
    }
    const answer = data.content?.[0]?.text || "No response received.";
    return NextResponse.json({ answer });
  } catch (err: any) {
    return NextResponse.json({ answer: "Error: " + err.message });
  }
}
