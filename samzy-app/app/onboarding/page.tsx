"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState("");
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
      const email = session.user.email || "";
      setOwnerEmail(email);
      setForm(prev => ({ ...prev, name: session.user.user_metadata?.store_name || "" }));
      supabase.from("stores").select("*").eq("owner_email", email).single().then(({ data }) => {
        if (data) setStoreId(data.id);
      });
    });
  }, []);

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleNext() {
    if (step < 3) { setStep(step + 1); return; }
    setSaving(true);
    await supabase.from("stores").update({
      name: form.name,
      phone: form.phone,
      address: form.address,
      city: form.city,
      country: form.country,
      pos_system: form.pos_system,
      num_staff: parseInt(form.num_staff) || null,
      store_size: form.store_size,
    }).eq("owner_email", ownerEmail);
    await supabase.from("stores").update({ onboarding_complete: true }).eq("owner_email", ownerEmail);
    setSaving(false);
    setStep(4);
  }

  const inputStyle = { width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14, outline: "none", color: "#1e293b", background: "#fff", boxSizing: "border-box" as const };
  const selectStyle = { ...inputStyle };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", padding: 24 }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 48, width: "100%", maxWidth: 520, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>

        {/* Progress bar */}
        {step < 4 && (
          <div style={{ marginBottom: 36 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              {["Store Info", "Store Details", "All Done!"].map((label, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: step > i + 1 ? "#22c55e" : step === i + 1 ? "#3b82f6" : "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: step >= i + 1 ? "#fff" : "#94a3b8" }}>
                    {step > i + 1 ? "✓" : i + 1}
                  </div>
                  <span style={{ fontSize: 12, color: step === i + 1 ? "#0f172a" : "#94a3b8", fontWeight: step === i + 1 ? 700 : 400 }}>{label}</span>
                </div>
              ))}
            </div>
            <div style={{ height: 4, background: "#f1f5f9", borderRadius: 4 }}>
              <div style={{ height: "100%", background: "#3b82f6", borderRadius: 4, width: `${((step - 1) / 2) * 100}%`, transition: "width 0.3s" }} />
            </div>
          </div>
        )}

        {/* Step 1 */}
        {step === 1 && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🛒</div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", margin: 0 }}>Welcome to Samzy!</h1>
              <p style={{ color: "#64748b", fontSize: 14, marginTop: 8 }}>Let's set up your store in 2 quick steps</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ color: "#64748b", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>STORE NAME</label>
                <input value={form.name} onChange={e => update("name", e.target.value)} placeholder="e.g. Mercado Central" style={inputStyle} />
              </div>
              <div>
                <label style={{ color: "#64748b", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>PHONE NUMBER</label>
                <input value={form.phone} onChange={e => update("phone", e.target.value)} placeholder="+351 000 000 000" style={inputStyle} />
              </div>
              <div>
                <label style={{ color: "#64748b", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>ADDRESS</label>
                <input value={form.address} onChange={e => update("address", e.target.value)} placeholder="Street address" style={inputStyle} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ color: "#64748b", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>CITY</label>
                  <input value={form.city} onChange={e => update("city", e.target.value)} placeholder="Lisbon" style={inputStyle} />
                </div>
                <div>
                  <label style={{ color: "#64748b", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>COUNTRY</label>
                  <input value={form.country} onChange={e => update("country", e.target.value)} placeholder="Portugal" style={inputStyle} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>⚙️</div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", margin: 0 }}>Store Details</h1>
              <p style={{ color: "#64748b", fontSize: 14, marginTop: 8 }}>Help us personalize Samzy for your store</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ color: "#64748b", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>WHICH POS SYSTEM DO YOU USE?</label>
                <select value={form.pos_system} onChange={e => update("pos_system", e.target.value)} style={selectStyle}>
                  <option value="">Select your POS system</option>
                  <option value="WebRest">WebRest</option>
                  <option value="ZSRest">ZSRest</option>
                  <option value="Square">Square</option>
                  <option value="Lightspeed">Lightspeed</option>
                  <option value="Clover">Clover</option>
                  <option value="None">I don't use one yet</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label style={{ color: "#64748b", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>HOW MANY STAFF DO YOU HAVE?</label>
                <input value={form.num_staff} onChange={e => update("num_staff", e.target.value)} type="number" placeholder="e.g. 5" style={inputStyle} />
              </div>
              <div>
                <label style={{ color: "#64748b", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>STORE SIZE</label>
                <select value={form.store_size} onChange={e => update("store_size", e.target.value)} style={selectStyle}>
                  <option value="">Select store size</option>
                  <option value="small">Small (under 200m²)</option>
                  <option value="medium">Medium (200–500m²)</option>
                  <option value="large">Large (500m²+)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 3 - Confirm */}
        {step === 3 && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", margin: 0 }}>You're all set!</h1>
            <p style={{ color: "#64748b", fontSize: 14, marginTop: 8, marginBottom: 32 }}>Here's a summary of your store</p>
            <div style={{ background: "#f8fafc", borderRadius: 12, padding: 20, textAlign: "left", marginBottom: 24 }}>
              {[
                { label: "Store Name", value: form.name },
                { label: "Location", value: `${form.city}, ${form.country}` },
                { label: "POS System", value: form.pos_system || "Not set" },
                { label: "Staff", value: form.num_staff || "Not set" },
                { label: "Store Size", value: form.store_size || "Not set" },
              ].map(item => (
                <div key={item.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ color: "#64748b", fontSize: 13 }}>{item.label}</span>
                  <span style={{ color: "#0f172a", fontSize: 13, fontWeight: 600 }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 4 - Done */}
        {step === 4 && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 64, marginBottom: 20 }}>🚀</div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0f172a", margin: 0 }}>Samzy is ready!</h1>
            <p style={{ color: "#64748b", fontSize: 15, marginTop: 12, marginBottom: 32 }}>Your store is set up. Let's start managing and growing your business.</p>
            <a href="/" style={{ display: "block", padding: "14px", borderRadius: 10, background: "#22c55e", color: "#fff", fontWeight: 700, fontSize: 16, textDecoration: "none" }}>
              Go to My Dashboard →
            </a>
          </div>
        )}

        {/* Navigation */}
        {step < 4 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 32 }}>
            {step > 1 ? (
              <button onClick={() => setStep(step - 1)} style={{ padding: "12px 24px", borderRadius: 10, background: "#f1f5f9", border: "none", color: "#64748b", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
                ← Back
              </button>
            ) : <div />}
            <button onClick={handleNext} disabled={saving} style={{ padding: "12px 32px", borderRadius: 10, background: step === 3 ? "#22c55e" : "#3b82f6", border: "none", color: "#fff", fontWeight: 700, fontSize: 14, cursor: saving ? "not-allowed" : "pointer" }}>
              {saving ? "Saving..." : step === 3 ? "Complete Setup ✓" : "Next →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}