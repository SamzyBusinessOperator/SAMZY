"use client";
import Image from "next/image";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

const ORANGE = "#FC7800";
const BLACK = "#0f0f0f";
const WARM_BG = "#FAFAF8";
const CARD_BG = "#FFFFFF";
const BORDER = "#F0EEEB";
const MUTED = "#6B6B6B";

export default function Pricing() {
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("trial_expired")) setBanner("Your free trial has ended. Subscribe to continue using Samzy.");
    if (params.get("cancelled")) setBanner("Your subscription has been cancelled. Resubscribe to regain access.");
    if (params.get("past_due")) setBanner("Your last payment failed. Please update your billing details.");
  }, []);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) setEmail(session.user.email);
    });
  }, []);

  async function handleCheckout() {
    if (!email || !email.includes("@")) { setError("Please enter a valid email address."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/stripe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json(); console.log("Stripe response:", data);
      if (data.error) { setError(data.error); setLoading(false); return; }
      window.location.href = data.url;
    } catch (err) {
      setError("Something went wrong. Please try again."); alert("Error: " + err);
      setLoading(false);
    }
  }

  return (
    <>
    {banner && (
      <div style={{ background: "#fef2f2", borderBottom: "3px solid #dc2626", padding: "14px 24px", textAlign: "center" as const, fontSize: 14, color: "#dc2626", fontWeight: 600, fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif" }}>
        ⚠️ {banner}
      </div>
    )}
    <div style={{ minHeight: "100vh", background: WARM_BG, fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" }}>

      {/* Header */}
      <header style={{ background: CARD_BG, borderBottom: "1px solid " + BORDER, padding: "0 40px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Image src="/logo.png" alt="Samzy" width={32} height={32} />
          <span style={{ color: BLACK, fontWeight: 700, fontSize: 16 }}>Samzy</span>
        </div>
        <a href="/" style={{ color: MUTED, textDecoration: "none", fontSize: 13 }}>← Back to Dashboard</a>
      </header>

      <div style={{ maxWidth: 480, margin: "60px auto", padding: "0 24px", textAlign: "center" }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: BLACK, margin: "0 0 12px", letterSpacing: -1 }}>Upgrade to Samzy Pro</h1>
        <p style={{ color: MUTED, fontSize: 16, marginBottom: 40, lineHeight: 1.6 }}>Everything you need to run and grow your supermarket.</p>

        {error && (
          <div style={{ background: "#fef2f2", color: "#dc2626", padding: "12px 16px", borderRadius: 10, marginBottom: 24, fontSize: 14, borderLeft: "3px solid #dc2626" }}>
            {error}
          </div>
        )}

        <div style={{ background: CARD_BG, borderRadius: 20, padding: "40px", border: "2px solid " + ORANGE, position: "relative", overflow: "hidden", marginBottom: 24 }}>
          <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: 4, background: ORANGE }} />
          <div style={{ fontSize: 13, color: MUTED, marginBottom: 8, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" as const }}>Samzy Pro</div>
          <div style={{ fontSize: 56, fontWeight: 800, color: BLACK, marginBottom: 4, letterSpacing: -2 }}>€29<span style={{ fontSize: 20, fontWeight: 400, color: MUTED }}>/month</span></div>
          <p style={{ color: MUTED, fontSize: 14, marginBottom: 32 }}>Per store. Cancel anytime.</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32, textAlign: "left" }}>
            {[
              "Full dashboard with real-time data",
              "AI Advisor powered by Claude",
              "Inventory & stock alerts",
              "Receipt scanner",
              "Staff management",
              "Supplier invoice tracking",
              "Financial overview",
              "Email support",
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: ORANGE, fontWeight: 700, fontSize: 16 }}>✓</span>
                <span style={{ color: BLACK, fontSize: 14 }}>{item}</span>
              </div>
            ))}
          </div>

          <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="your@email.com" style={{ width: "100%", padding: "13px 16px", borderRadius: 10, border: "1px solid #F0EEEB", fontSize: 14, outline: "none", color: "#0f0f0f", background: "#FAFAF8", boxSizing: "border-box", marginBottom: 12, fontFamily: "inherit" }} />
          <button onClick={handleCheckout} disabled={loading} style={{
            width: "100%", padding: "16px", borderRadius: 12,
            background: loading ? MUTED : ORANGE, border: "none",
            color: "#fff", fontWeight: 700, fontSize: 16,
            cursor: loading ? "not-allowed" : "pointer", letterSpacing: -0.3,
          }}>
            {loading ? "Loading..." : "Start 14-Day Free Trial →"}
          </button>
          <p style={{ color: MUTED, fontSize: 12, marginTop: 12 }}>No credit card required for trial</p>
        </div>

        <div style={{ background: CARD_BG, borderRadius: 14, padding: "20px 24px", border: "1px solid " + BORDER }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: BLACK, margin: "0 0 12px" }}>100% safe & secure</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {["Payments processed by Stripe", "Cancel anytime — no questions asked", "Your data is always yours"].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: "#16a34a", fontWeight: 700 }}>✓</span>
                <span style={{ fontSize: 13, color: MUTED }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}