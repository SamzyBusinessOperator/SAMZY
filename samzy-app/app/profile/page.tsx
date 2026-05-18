"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

const ORANGE = "#FC7800";
const BLACK = "#0f0f0f";
const WARM_BG = "#FAFAF8";
const CARD_BG = "#FFFFFF";
const BORDER = "#F0EEEB";
const MUTED = "#6B6B6B";

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [form, setForm] = useState({
    name: "", phone: "", address: "", city: "", country: "",
    pos_system: "", num_staff: "", store_size: "",
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = "/login"; return; }
      const email = session.user.email || "";
      setOwnerEmail(email);
      supabase.from("stores").select("*").ilike("owner_email", email).single().then(({ data }) => {
        if (data) setForm({ name: data.name || "", phone: data.phone || "", address: data.address || "", city: data.city || "", country: data.country || "", pos_system: data.pos_system || "", num_staff: data.num_staff || "", store_size: data.store_size || "" });
        setLoading(false);
      });
    });
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage("");
    const { error } = await supabase.from("stores").update({
      name: form.name, phone: form.phone, address: form.address, city: form.city,
      country: form.country, pos_system: form.pos_system,
      num_staff: parseInt(form.num_staff as string) || null, store_size: form.store_size,
    }).ilike("owner_email", ownerEmail);
    setSaving(false);
    setMessage(error ? "Error saving. Try again." : "Profile saved successfully!");
    setTimeout(() => setMessage(""), 3000);
  }

  function update(field: string, value: string) { setForm(prev => ({ ...prev, [field]: value })); }

  const inputStyle = { width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid " + BORDER, fontSize: 14, outline: "none", color: BLACK, background: WARM_BG, boxSizing: "border-box" as const, fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif" };

  if (loading) return <div style={{ minHeight: "100vh", background: WARM_BG, display: "flex", alignItems: "center", justifyContent: "center" }}><p style={{ color: MUTED }}>Loading...</p></div>;

  return (
    <div style={{ minHeight: "100vh", background: WARM_BG, fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" }}>
      <header style={{ background: BLACK, padding: "0 40px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, background: ORANGE, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>🛒</div>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>Samzy</span>
          </div>
          <span style={{ color: "#333", fontSize: 13 }}>|</span>
          <a href="/" style={{ color: "#666", textDecoration: "none", fontSize: 13 }}>← Back to Dashboard</a>
        </div>
        <a href="/" style={{ color: ORANGE, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>Dashboard</a>
      </header>
      <div style={{ maxWidth: 700, margin: "48px auto", padding: "0 24px" }}>
        <div style={{ marginBottom: 36 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: BLACK, margin: 0, letterSpacing: -0.5 }}>Store Profile</h1>
          <p style={{ color: MUTED, fontSize: 14, marginTop: 6 }}>Manage your store information and settings</p>
        </div>
        {message && (
          <div style={{ background: message.includes("Error") ? "#fef2f2" : "#f0fdf4", color: message.includes("Error") ? "#dc2626" : "#16a34a", padding: "14px 18px", borderRadius: 10, marginBottom: 24, fontSize: 14, borderLeft: "3px solid " + (message.includes("Error") ? "#dc2626" : "#16a34a"), fontWeight: 500 }}>
            {message.includes("Error") ? "❌ " : "✓ "}{message}
          </div>
        )}
        <div style={{ background: CARD_BG, borderRadius: 16, padding: "28px 32px", border: "1px solid " + BORDER, marginBottom: 20, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: 3, background: ORANGE }} />
          <h2 style={{ fontSize: 15, fontWeight: 700, color: BLACK, margin: "0 0 24px" }}>Basic Information</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              <label style={{ color: MUTED, fontSize: 11, fontWeight: 700, display: "block", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Store Name</label>
              <input value={form.name} onChange={e => update("name", e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ color: MUTED, fontSize: 11, fontWeight: 700, display: "block", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Phone Number</label>
              <input value={form.phone} onChange={e => update("phone", e.target.value)} placeholder="+351 000 000 000" style={inputStyle} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ color: MUTED, fontSize: 11, fontWeight: 700, display: "block", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Address</label>
              <input value={form.address} onChange={e => update("address", e.target.value)} placeholder="Street address" style={inputStyle} />
            </div>
            <div>
              <label style={{ color: MUTED, fontSize: 11, fontWeight: 700, display: "block", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>City</label>
              <input value={form.city} onChange={e => update("city", e.target.value)} placeholder="Lisbon" style={inputStyle} />
            </div>
            <div>
              <label style={{ color: MUTED, fontSize: 11, fontWeight: 700, display: "block", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Country</label>
              <input value={form.country} onChange={e => update("country", e.target.value)} placeholder="Portugal" style={inputStyle} />
            </div>
          </div>
        </div>
        <div style={{ background: CARD_BG, borderRadius: 16, padding: "28px 32px", border: "1px solid " + BORDER, marginBottom: 28, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: 3, background: BLACK }} />
          <h2 style={{ fontSize: 15, fontWeight: 700, color: BLACK, margin: "0 0 24px" }}>Store Details</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              <label style={{ color: MUTED, fontSize: 11, fontWeight: 700, display: "block", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>POS System</label>
              <select value={form.pos_system} onChange={e => update("pos_system", e.target.value)} style={inputStyle}>
                <option value="">Select POS system</option>
                <option value="WebRest">WebRest</option>
                <option value="ZSRest">ZSRest</option>
                <option value="Square">Square</option>
                <option value="Lightspeed">Lightspeed</option>
                <option value="Clover">Clover</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label style={{ color: MUTED, fontSize: 11, fontWeight: 700, display: "block", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Number of Staff</label>
              <input value={form.num_staff} onChange={e => update("num_staff", e.target.value)} type="number" placeholder="5" style={inputStyle} />
            </div>
            <div>
              <label style={{ color: MUTED, fontSize: 11, fontWeight: 700, display: "block", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Store Size</label>
              <select value={form.store_size} onChange={e => update("store_size", e.target.value)} style={inputStyle}>
                <option value="">Select store size</option>
                <option value="small">Small (under 200m²)</option>
                <option value="medium">Medium (200-500m²)</option>
                <option value="large">Large (500m²+)</option>
              </select>
            </div>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving} style={{ width: "100%", padding: "15px", borderRadius: 12, background: saving ? MUTED : ORANGE, border: "none", color: "#fff", fontWeight: 700, fontSize: 15, cursor: saving ? "not-allowed" : "pointer", letterSpacing: -0.3 }}>
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </div>
  );
}