"use client";
import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Signup() {
  const [storeName, setStoreName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSignup() {
    if (!storeName || !email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    setError("");
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { store_name: storeName } },
    });
    if (error) {
      setError(error.message);
    } else {
      await supabase.from("stores").insert([{ name: storeName, owner_email: email }]);
      setSuccess(true);
    }
    setLoading(false);
  }

  if (success) {
    return (
      <div style={{ minHeight: "100vh", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif" }}>
        <div style={{ background: "#1e293b", borderRadius: 16, padding: 40, width: 380, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
          <h2 style={{ color: "#fff", fontSize: 20, fontWeight: 700 }}>Welcome to Samzy!</h2>
          <p style={{ color: "#64748b", fontSize: 14, marginTop: 8 }}>Check your email to confirm your account, then sign in.</p>
          <a href="/onboarding" style={{ display: "block", marginTop: 24, padding: "13px", borderRadius: 8, background: "#3b82f6", color: "#fff", fontWeight: 700, fontSize: 15, textDecoration: "none" }}>Start Your Setup →</a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif" }}>
      <div style={{ background: "#1e293b", borderRadius: 16, padding: 40, width: 380, boxShadow: "0 4px 24px rgba(0,0,0,0.3)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🛒</div>
          <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 700, margin: 0 }}>Create your store</h1>
          <p style={{ color: "#64748b", fontSize: 14, marginTop: 6 }}>Get started with Samzy for free</p>
        </div>
        {error && <div style={{ background: "#fef2f2", color: "#ef4444", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>}
        <div style={{ marginBottom: 16 }}>
          <label style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>STORE NAME</label>
          <input value={storeName} onChange={e => setStoreName(e.target.value)} type="text" placeholder="e.g. Green Basket Market"
            style={{ width: "100%", padding: "12px 14px", borderRadius: 8, border: "1px solid #334155", background: "#0f172a", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>EMAIL</label>
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@example.com"
            style={{ width: "100%", padding: "12px 14px", borderRadius: 8, border: "1px solid #334155", background: "#0f172a", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>PASSWORD</label>
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Min. 6 characters"
            style={{ width: "100%", padding: "12px 14px", borderRadius: 8, border: "1px solid #334155", background: "#0f172a", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
        </div>
        <button onClick={handleSignup} disabled={loading}
          style={{ width: "100%", padding: "13px", borderRadius: 8, background: "#22c55e", border: "none", color: "#fff", fontWeight: 700, fontSize: 15, cursor: loading ? "not-allowed" : "pointer" }}>
          {loading ? "Creating account..." : "Create Account"}
        </button>
        <p style={{ textAlign: "center", color: "#64748b", fontSize: 13, marginTop: 20 }}>
          Already have an account? <a href="/login" style={{ color: "#3b82f6", textDecoration: "none" }}>Sign in</a>
        </p>
      </div>
    </div>
  );
}