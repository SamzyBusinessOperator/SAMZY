"use client";
import { useState } from "react";
import { supabase } from "../../lib/supabase";

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

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif" }}>
      <div style={{ background: "#1e293b", borderRadius: 16, padding: 40, width: 380, boxShadow: "0 4px 24px rgba(0,0,0,0.3)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🛒</div>
          <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 700, margin: 0 }}>Samzy</h1>
          <p style={{ color: "#64748b", fontSize: 14, marginTop: 6 }}>Sign in to your store</p>
        </div>
        {error && <div style={{ background: "#fef2f2", color: "#ef4444", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>}
        <div style={{ marginBottom: 16 }}>
          <label style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>EMAIL</label>
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@example.com"
            style={{ width: "100%", padding: "12px 14px", borderRadius: 8, border: "1px solid #334155", background: "#0f172a", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>PASSWORD</label>
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="••••••••"
            style={{ width: "100%", padding: "12px 14px", borderRadius: 8, border: "1px solid #334155", background: "#0f172a", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
        </div>
        <button onClick={handleLogin} disabled={loading}
          style={{ width: "100%", padding: "13px", borderRadius: 8, background: "#3b82f6", border: "none", color: "#fff", fontWeight: 700, fontSize: 15, cursor: loading ? "not-allowed" : "pointer" }}>
          {loading ? "Signing in..." : "Sign In"}
        </button>
        <p style={{ textAlign: "center", color: "#64748b", fontSize: 13, marginTop: 20 }}>
          No account? <a href="/signup" style={{ color: "#3b82f6", textDecoration: "none" }}>Create one</a>
        </p>
      </div>
    </div>
  );
}