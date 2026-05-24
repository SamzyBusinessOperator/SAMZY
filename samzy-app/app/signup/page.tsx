"use client";
import Image from "next/image";
import { useState } from "react";
import { supabase } from "../../lib/supabase";

const ORANGE = "#FC7800";
const BLACK = "#0f0f0f";
const WARM_BG = "#FAFAF8";
const BORDER = "#F0EEEB";
const MUTED = "#6B6B6B";

export default function Signup() {
  const [storeName, setStoreName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [consent, setConsent] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSignup() {
    if (!storeName || !email || !password) { setError("Please fill in all fields."); return; }
    if (!consent) { setError("Please agree to the Terms and Privacy Policy to continue."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { store_name: storeName } },
    });
    if (error) {
      setError(error.message);
    } else {
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 14);
      await supabase.from("stores").insert([{ name: storeName, owner_email: email, subscription_status: "trial", trial_ends_at: trialEnd.toISOString() }]);
      setSuccess(true);
      // Send welcome email
      fetch("/api/email/welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, storeName }),
      });
    }
    setLoading(false);
  }

  const inputStyle = {
    width: "100%", padding: "13px 16px", borderRadius: 10,
    border: "1px solid " + BORDER, fontSize: 15, outline: "none",
    color: BLACK, background: WARM_BG, boxSizing: "border-box" as const,
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
  };

  if (success) return (
    <div style={{ minHeight: "100vh", background: WARM_BG, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif" }}>
      <div style={{ textAlign: "center", maxWidth: 400, padding: 24 }}>
        <div style={{ width: 64, height: 64, background: ORANGE, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 24px" }}>🎉</div>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: BLACK, margin: "0 0 12px", letterSpacing: -0.5 }}>Welcome to Samzy!</h2>
        <p style={{ color: MUTED, fontSize: 15, marginBottom: 32, lineHeight: 1.6 }}>Your account is ready. Click below to set up your store.</p>
        <a href="/onboarding" style={{ display: "block", padding: "14px", borderRadius: 10, background: ORANGE, color: "#fff", fontWeight: 700, fontSize: 15, textDecoration: "none" }}>
          Start Your Setup →
        </a>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: WARM_BG, display: "flex", flexDirection: "column", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" }}>
      <div style={{ padding: "20px 40px", display: "flex", alignItems: "center", gap: 10 }}>
        <Image src="/logo.png" alt="Samzy" width={32} height={32} />
        <span style={{ color: BLACK, fontWeight: 700, fontSize: 16 }}>Samzy</span>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          <div style={{ marginBottom: 36 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: BLACK, margin: 0, letterSpacing: -0.5 }}>Create your store</h1>
            <p style={{ color: MUTED, fontSize: 15, marginTop: 8 }}>Get started with Samzy in minutes</p>
          </div>
          {error && (
            <div style={{ background: "#fef2f2", color: "#dc2626", padding: "12px 16px", borderRadius: 10, marginBottom: 20, fontSize: 14, borderLeft: "3px solid #dc2626" }}>
              {error}
            </div>
          )}
          <div style={{ marginBottom: 16 }}>
            <label style={{ color: MUTED, fontSize: 11, fontWeight: 700, display: "block", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Store Name</label>
            <input value={storeName} onChange={e => setStoreName(e.target.value)} placeholder="e.g. Mercado Central" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ color: MUTED, fontSize: 11, fontWeight: 700, display: "block", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@example.com" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 28 }}>
            <label style={{ color: MUTED, fontSize: 11, fontWeight: 700, display: "block", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Password</label>
            <input value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSignup()} type="password" placeholder="Min. 6 characters" style={inputStyle} />
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 20, padding: "14px 16px", background: "#fff", borderRadius: 10, border: "1px solid " + BORDER }}>
            <input type="checkbox" id="consent" checked={consent} onChange={e => setConsent(e.target.checked)} style={{ marginTop: 2, accentColor: ORANGE, width: 16, height: 16, cursor: "pointer", flexShrink: 0 }} />
            <label htmlFor="consent" style={{ fontSize: 13, color: MUTED, lineHeight: 1.6, cursor: "pointer" }}>
              I agree to Samzy's{" "}
              <a href="/terms" target="_blank" style={{ color: ORANGE, textDecoration: "none", fontWeight: 600 }}>Terms of Service</a>{" "}and{" "}
              <a href="/privacy" target="_blank" style={{ color: ORANGE, textDecoration: "none", fontWeight: 600 }}>Privacy Policy</a>.
              I understand my data will be processed as described.
            </label>
          </div>
          <button onClick={handleSignup} disabled={loading} style={{ width: "100%", padding: "14px", borderRadius: 10, background: loading ? MUTED : ORANGE, border: "none", color: "#fff", fontWeight: 700, fontSize: 15, cursor: loading ? "not-allowed" : "pointer", letterSpacing: -0.2 }}>
            {loading ? "Creating account..." : "Create Account →"}
          </button>
          <p style={{ textAlign: "center", color: MUTED, fontSize: 14, marginTop: 24 }}>
            Already have an account?{" "}
            <a href="/login" style={{ color: ORANGE, textDecoration: "none", fontWeight: 600 }}>Sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
}