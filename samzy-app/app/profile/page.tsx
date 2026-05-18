"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [storeId, setStoreId] = useState("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    country: "",
    pos_system: "",
    num_staff: "",
    store_size: "",
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = "/login"; return; }
      const email = session.user.email;
      supabase.from("stores").select("*").eq("owner_email", email).single().then(({ data }) => {
        if (data) {
          setStoreId(data.id);
          setForm({
            name: data.name || "",
            phone: data.phone || "",
            address: data.address || "",
            city: data.city || "",
            country: data.country || "",
            pos_system: data.pos_system || "",
            num_staff: data.num_staff || "",
            store_size: data.store_size || "",
          });
        }
        setLoading(false);
      });
    });
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage("");
    const { error } = await supabase.from("stores").update({
      name: form.name,
      phone: form.phone,
      address: form.address,
      city: form.city,
      country: form.country,
      pos_system: form.pos_system,
      num_staff: parseInt(form.num_staff as string) || null,
      store_size: form.store_size,
    }).eq("id", storeId);
    setSaving(false);
    setMessage(error ? "Error saving. Try again." : "Profile saved successfully!");
  }

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "#64748b", fontSize: 16 }}>Loading...</p>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "Georgia, serif" }}>
      <header style={{ background: "#0f172a", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <a href="/" style={{ color: "#64748b", textDecoration: "none", fontSize: 13 }}>← Back to Dashboard</a>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>🛒 Samzy</span>
        </div>
        <a href="/" style={{ color: "#3b82f6", textDecoration: "none", fontSize: 13 }}>Dashboard</a>
      </header>

      <div style={{ maxWidth: 680, margin: "40px auto", padding: "0 24px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>Store Profile</h1>
        <p style={{ color: "#64748b", fontSize: 14, marginBottom: 32 }}>Update your store information</p>

        {message && (
          <div style={{ background: message.includes("Error") ? "#fef2f2" : "#f0fdf4", color: message.includes("Error") ? "#ef4444" : "#22c55e", padding: "12px 16px", borderRadius: 8, marginBottom: 24, fontSize: 14 }}>
            {message}
          </div>
        )}

        <div style={{ background: "#fff", borderRadius: 14, padding: 32, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 20, paddingBottom: 12, borderBottom: "1px solid #f1f5f9" }}>Basic Information</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              <label style={{ color: "#64748b", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>STORE NAME</label>
              <input value={form.name} onChange={e => update("name", e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box", color: "#0f172a" }} />
            </div>
            <div>
              <label style={{ color: "#64748b", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>PHONE NUMBER</label>
              <input value={form.phone} onChange={e => update("phone", e.target.value)} placeholder="+351 000 000 000"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box", color: "#0f172a" }} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ color: "#64748b", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>ADDRESS</label>
              <input value={form.address} onChange={e => update("address", e.target.value)} placeholder="Street address"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box", color: "#0f172a" }} />
            </div>
            <div>
              <label style={{ color: "#64748b", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>CITY</label>
              <input value={form.city} onChange={e => update("city", e.target.value)} placeholder="Lisbon"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box", color: "#0f172a" }} />
            </div>
            <div>
              <label style={{ color: "#64748b", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>COUNTRY</label>
              <input value={form.country} onChange={e => update("country", e.target.value)} placeholder="Portugal"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box", color: "#0f172a" }} />
            </div>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 14, padding: 32, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 20, paddingBottom: 12, borderBottom: "1px solid #f1f5f9" }}>Store Details</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              <label style={{ color: "#64748b", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>POS SYSTEM</label>
              <select value={form.pos_system} onChange={e => update("pos_system", e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, outline: "none", background: "#fff", color: "#1e293b", boxSizing: "border-box" }}>
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
              <label style={{ color: "#64748b", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>NUMBER OF STAFF</label>
              <input value={form.num_staff} onChange={e => update("num_staff", e.target.value)} type="number" placeholder="5"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box", color: "#0f172a" }} />
            </div>
            <div>
              <label style={{ color: "#64748b", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>STORE SIZE</label>
              <select value={form.store_size} onChange={e => update("store_size", e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, outline: "none", background: "#fff", color: "#1e293b", boxSizing: "border-box" }}>
                <option value="">Select store size</option>
                <option value="small">Small (under 200m²)</option>
                <option value="medium">Medium (200–500m²)</option>
                <option value="large">Large (500m²+)</option>
              </select>
            </div>
          </div>
        </div>

        <button onClick={handleSave} disabled={saving}
          style={{ width: "100%", padding: "14px", borderRadius: 10, background: saving ? "#94a3b8" : "#3b82f6", border: "none", color: "#fff", fontWeight: 700, fontSize: 15, cursor: saving ? "not-allowed" : "pointer" }}>
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </div>
  );
}