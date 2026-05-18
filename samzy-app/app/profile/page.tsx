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
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [form, setForm] = useState({
    name: "", phone: "", address: "", city: "", country: "",
    pos_system: "", num_staff: "", store_size: "",
  });
  const [saved, setSaved] = useState({ ...form });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = "/login"; return; }
      const email = session.user.email || "";
      setOwnerEmail(email);
      supabase.from("stores").select("*").ilike("owner_email", email).single().then(({ data }) => {
        if (data) {
          const vals = { name: data.name || "", phone: data.phone || "", address: data.address || "", city: data.city || "", country: data.country || "", pos_system: data.pos_system || "", num_staff: data.num_staff || "", store_size: data.store_size || "" };
          setForm(vals);
          setSaved(vals);
        }
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
    if (error) {
      setMessage("Error saving. Try again.");
    } else {
      setSaved({ ...form });
      setEditing(false);
      setMessage("Profile saved successfully!");
      setTimeout(() => setMessage(""), 3000);
    }
  }

  function handleCancel() {
    setForm({ ...saved });
    setEditing(false);
  }

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  const inputStyle = {
    width: "100%", padding: "12px 14px", borderRadius: 10,
    border: "1px solid " + BORDER, fontSize: 14, outline: "none",
    color: BLACK, background: editing ? WARM_BG : CARD_BG,
    boxSizing: "border-box" as const,
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
    cursor: editing ? "text" : "default",
  };

  const readStyle = {
    ...inputStyle,
    border: "1px solid transparent",
    background: "transparent",
    padding: "12px 0",
    color: BLACK,
    fontWeight: 500,
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: WARM_BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: MUTED }}>Loading...</p>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: WARM_BG, fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" }}>

      {/* Header */}
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

        {/* Page Title */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 36 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: BLACK, margin: 0, letterSpacing: -0.5 }}>Store Profile</h1>
            <p style={{ color: MUTED, fontSize: 14, marginTop: 6 }}>
              {editing ? "Edit mode — make your changes and save" : "Your store information"}
            </p>
          </div>
          {!editing && (
            <button onClick={() => setEditing(true)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10, background: CARD_BG, border: "1px solid " + BORDER, color: BLACK, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
              ✏️ Edit Profile
            </button>
          )}
        </div>

        {/* Message */}
        {message && (
          <div style={{ background: message.includes("Error") ? "#fef2f2" : "#f0fdf4", color: message.includes("Error") ? "#dc2626" : "#16a34a", padding: "14px 18px", borderRadius: 10, marginBottom: 24, fontSize: 14, borderLeft: "3px solid " + (message.includes("Error") ? "#dc2626" : "#16a34a"), fontWeight: 500 }}>
            {message.includes("Error") ? "❌ " : "✓ "}{message}
          </div>
        )}

        {/* Basic Information */}
        <div style={{ background: CARD_BG, borderRadius: 16, padding: "28px 32px", border: "1px solid " + BORDER, marginBottom: 20, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: 3, background: ORANGE }} />
          <h2 style={{ fontSize: 15, fontWeight: 700, color: BLACK, margin: "0 0 24px" }}>Basic Information</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {[
              { label: "Store Name", field: "name", placeholder: "e.g. Mercado Central" },
              { label: "Phone Number", field: "phone", placeholder: "+351 000 000 000" },
            ].map(item => (
              <div key={item.field}>
                <label style={{ color: MUTED, fontSize: 11, fontWeight: 700, display: "block", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>{item.label}</label>
                {editing ? (
                  <input value={(form as any)[item.field]} onChange={e => update(item.field, e.target.value)} placeholder={item.placeholder} style={inputStyle} />
                ) : (
                  <div style={{ ...readStyle, color: (form as any)[item.field] ? BLACK : MUTED }}>{(form as any)[item.field] || "Not set"}</div>
                )}
              </div>
            ))}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ color: MUTED, fontSize: 11, fontWeight: 700, display: "block", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Address</label>
              {editing ? (
                <input value={form.address} onChange={e => update("address", e.target.value)} placeholder="Street address" style={inputStyle} />
              ) : (
                <div style={{ ...readStyle, color: form.address ? BLACK : MUTED }}>{form.address || "Not set"}</div>
              )}
            </div>
            {[
              { label: "City", field: "city", placeholder: "Lisbon" },
              { label: "Country", field: "country", placeholder: "Portugal" },
            ].map(item => (
              <div key={item.field}>
                <label style={{ color: MUTED, fontSize: 11, fontWeight: 700, display: "block", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>{item.label}</label>
                {editing ? (
                  <input value={(form as any)[item.field]} onChange={e => update(item.field, e.target.value)} placeholder={item.placeholder} style={inputStyle} />
                ) : (
                  <div style={{ ...readStyle, color: (form as any)[item.field] ? BLACK : MUTED }}>{(form as any)[item.field] || "Not set"}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Store Details */}
        <div style={{ background: CARD_BG, borderRadius: 16, padding: "28px 32px", border: "1px solid " + BORDER, marginBottom: 28, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: 3, background: BLACK }} />
          <h2 style={{ fontSize: 15, fontWeight: 700, color: BLACK, margin: "0 0 24px" }}>Store Details</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              <label style={{ color: MUTED, fontSize: 11, fontWeight: 700, display: "block", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>POS System</label>
              {editing ? (
                <select value={form.pos_system} onChange={e => update("pos_system", e.target.value)} style={inputStyle}>
                  <option value="">Select POS system</option>
                  <option value="WebRest">WebRest</option>
                  <option value="ZSRest">ZSRest</option>
                  <option value="Square">Square</option>
                  <option value="Lightspeed">Lightspeed</option>
                  <option value="Clover">Clover</option>
                  <option value="Other">Other</option>
                </select>
              ) : (
                <div style={{ ...readStyle, color: form.pos_system ? BLACK : MUTED }}>{form.pos_system || "Not set"}</div>
              )}
            </div>
            <div>
              <label style={{ color: MUTED, fontSize: 11, fontWeight: 700, display: "block", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Number of Staff</label>
              {editing ? (
                <input value={form.num_staff} onChange={e => update("num_staff", e.target.value)} type="number" placeholder="5" style={inputStyle} />
              ) : (
                <div style={{ ...readStyle, color: form.num_staff ? BLACK : MUTED }}>{form.num_staff || "Not set"}</div>
              )}
            </div>
            <div>
              <label style={{ color: MUTED, fontSize: 11, fontWeight: 700, display: "block", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Store Size</label>
              {editing ? (
                <select value={form.store_size} onChange={e => update("store_size", e.target.value)} style={inputStyle}>
                  <option value="">Select store size</option>
                  <option value="small">Small (under 200m²)</option>
                  <option value="medium">Medium (200–500m²)</option>
                  <option value="large">Large (500m²+)</option>
                </select>
              ) : (
                <div style={{ ...readStyle, color: form.store_size ? BLACK : MUTED }}>{form.store_size || "Not set"}</div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {editing && (
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={handleCancel} style={{ flex: 1, padding: "14px", borderRadius: 12, background: CARD_BG, border: "1px solid " + BORDER, color: MUTED, fontWeight: 600, fontSize: 15, cursor: "pointer" }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: "14px", borderRadius: 12, background: saving ? MUTED : ORANGE, border: "none", color: "#fff", fontWeight: 700, fontSize: 15, cursor: saving ? "not-allowed" : "pointer" }}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}