import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.redirect("https://samzyai.com/gmail?error=no_code");

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: "https://samzyai.com/api/gmail/callback",
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json();
    if (tokens.error) return NextResponse.redirect(`https://samzyai.com/gmail?error=${tokens.error}`);

    const accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token;

    return NextResponse.redirect(
      `https://samzyai.com/gmail?access_token=${accessToken}&refresh_token=${refreshToken || ""}`
    );
  } catch (err: any) {
    return NextResponse.redirect(`https://samzyai.com/gmail?error=${err.message}`);
  }
}
