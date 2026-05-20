"use client";
import { useState } from "react";
import Image from "next/image";
import { supabase } from "../../lib/supabase";

const ORANGE = "#FC7800";
const BLACK = "#0f0f0f";
const WARM_BG = "#FAFAF8";
const BORDER = "#F0EEEB";
const MUTED = "#6B6B6B";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
    } else {
      window.location.href = "/";
    }
    setLoading(false);
  }

  const inputStyle = {
    width: "100%", padding: "13px 16px", borderRadius: 10,
    border: "1px solid " + BORDER, fontSize: 15, outline: "none",
    color: BLACK, background: WARM_BG, boxSizing: "border-box" as const,
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
  };

  return (
    <div style={{ minHeight: "100vh", background: WARM_BG, display: "flex", flexDirection: "column", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" }}>
      
      {/* Top bar */}
      <div style={{ padding: "20px 40px", display: "flex", alignItems: "center", gap: 10 }}>
        <Image src="/logo.png" alt="Samzy" width={32} height={32} />
        <span style={{ color: BLACK, fontWeight: 700, fontSize: 16 }}>Samzy</span>
      </div>

      {/* Center */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          
          <div style={{ marginBottom: 36 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: BLACK, margin: 0, letterSpacing: -0.5 }}>Welcome back</h1>
            <p style={{ color: MUTED, fontSize: 15, marginTop: 8 }}>Sign in to your store dashboard</p>
          </div>

          {error && (
            <div style={{ background: "#fef2f2", color: "#dc2626", padding: "12px 16px", borderRadius: 10, marginBottom: 20, fontSize: 14, borderLeft: "3px solid #dc2626" }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ color: MUTED, fontSize: 11, fontWeight: 700, display: "block", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@example.com" style={inputStyle} />
          </div>

          <div style={{ marginBottom: 28 }}>
            <label style={{ color: MUTED, fontSize: 11, fontWeight: 700, display: "block", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Password</label>
            <input value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} type="password" placeholder="••••••••" style={inputStyle} />
          </div>

          <button onClick={handleLogin} disabled={loading} style={{
            width: "100%", padding: "14px", borderRadius: 10,
            background: loading ? MUTED : ORANGE, border: "none",
            color: "#fff", fontWeight: 700, fontSize: 15,
            cursor: loading ? "not-allowed" : "pointer", letterSpacing: -0.2,
          }}>
            {loading ? "Signing in..." : "Sign In →"}
          </button>

          <p style={{ textAlign: "center", color: MUTED, fontSize: 14, marginTop: 24 }}>
            No account?{" "}
            <a href="/signup" style={{ color: ORANGE, textDecoration: "none", fontWeight: 600 }}>Create one</a>
          </p>
        </div>
      </div>
    </div>
  );
}