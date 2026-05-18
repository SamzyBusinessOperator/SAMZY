"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

const ORANGE = "#FC7800";
const BLACK = "#0f0f0f";
const WARM_BG = "#FAFAF8";
const CARD_BG = "#FFFFFF";
const BORDER = "#F0EEEB";
const MUTED = "#6B6B6B";

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
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
      setForm(prev => ({ ...prev, name: session.user.user_metadata?.store_name || "" }));
    });
  }, []);

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleNext() {
    if (step < 3) { setStep(step + 1); return; }
    setSaving(true);
    await supabase.from("stores").update({
      name: form.name, phone: form.phone, address: form.address,
      city: form.city, country: form.country, pos_system: form.pos_system,
      num_staff: parseInt(form.num_staff) || null, store_size: form.store_size,
      onboarding_complete: true,
    }).eq("owner_email", ownerEmail);
    setSaving(false);
    setStep(4);
  }

  const inputStyle = {
    width: "100%", padding: "13px 16px", borderRadius: 10,
    border: "1px solid " + BORDER, fontSize: 15, outline: "none",
    color: BLACK, background: WARM_BG, boxSizing: "border-box" as const,
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
  };

  const steps = ["Store Info", "Store Details", "Confirm"];

  return (
    <div style={{ minHeight: "100vh", background: WARM_BG, fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif", display: "flex", flexDirection: "column" }}>

      {/* Top bar */}
      <div style={{ padding: "20px 40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, background: ORANGE, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>🛒</div>
          <span style={{ color: BLACK, fontWeight: 700, fontSize: 16 }}>Samzy</span>
        </div>
        {step < 4 && <span style={{ color: MUTED, fontSize: 13 }}>Step {step} of 3</span>}
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ width: "100%", maxWidth: 520 }}>

          {/* Progress */}
          {step < 4 && (
            <div style={{ marginBottom: 40 }}>
              <div style={{ display: "flex", gap: 8 }}>
                {steps.map((label, i) => (
                  <div key={i} style={{ flex: 1 }}>
                    <div style={{ height: 4, borderRadius: 4, background: step > i ? ORANGE : BORDER, marginBottom: 8, transition: "background 0.3s" }} />
                    <span style={{ fontSize: 12, color: step > i ? ORANGE : step === i + 1 ? BLACK : MUTED, fontWeight: step === i + 1 ? 700 : 400 }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 1 */}
          {step === 1 && (
            <div>
              <div style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: 28, fontWeight: 700, color: BLACK, margin: 0, letterSpacing: -0.5 }}>Welcome to Samzy!</h1>
                <p style={{ color: MUTED, fontSize: 15, marginTop: 8 }}>Let's set up your store in 2 quick steps</p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ color: MUTED, fontSize: 11, fontWeight: 700, display: "block", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Store Name</label>
                  <input value={form.name} onChange={e => update("name", e.target.value)} placeholder="e.g. Mercado Central" style={inputStyle} />
                </div>
                <div>
                  <label style={{ color: MUTED, fontSize: 11, fontWeight: 700, display: "block", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Phone Number</label>
                  <input value={form.phone} onChange={e => update("phone", e.target.value)} placeholder="+351 000 000 000" style={inputStyle} />
                </div>
                <div>
                  <label style={{ color: MUTED, fontSize: 11, fontWeight: 700, display: "block", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Address</label>
                  <input value={form.address} onChange={e => update("address", e.target.value)} placeholder="Street address" style={inputStyle} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div>
              <div style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: 28, fontWeight: 700, color: BLACK, margin: 0, letterSpacing: -0.5 }}>Store Details</h1>
                <p style={{ color: MUTED, fontSize: 15, marginTop: 8 }}>Help us personalise Samzy for your store</p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ color: MUTED, fontSize: 11, fontWeight: 700, display: "block", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Which POS system do you use?</label>
                  <select value={form.pos_system} onChange={e => update("pos_system", e.target.value)} style={inputStyle}>
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
                  <label style={{ color: MUTED, fontSize: 11, fontWeight: 700, display: "block", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>How many staff do you have?</label>
                  <input value={form.num_staff} onChange={e => update("num_staff", e.target.value)} type="number" placeholder="e.g. 5" style={inputStyle} />
                </div>
                <div>
                  <label style={{ color: MUTED, fontSize: 11, fontWeight: 700, display: "block", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Store Size</label>
                  <select value={form.store_size} onChange={e => update("store_size", e.target.value)} style={inputStyle}>
                    <option value="">Select store size</option>
                    <option value="small">Small (under 200m²)</option>
                    <option value="medium">Medium (200–500m²)</option>
                    <option value="large">Large (500m²+)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div>
              <div style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: 28, fontWeight: 700, color: BLACK, margin: 0, letterSpacing: -0.5 }}>Looks good!</h1>
                <p style={{ color: MUTED, fontSize: 15, marginTop: 8 }}>Here's a summary of your store</p>
              </div>
              <div style={{ background: CARD_BG, borderRadius: 16, padding: "24px", border: "1px solid " + BORDER, marginBottom: 8 }}>
                {[
                  { label: "Store Name", value: form.name },
                  { label: "Location", value: form.city + ", " + form.country },
                  { label: "POS System", value: form.pos_system || "Not set" },
                  { label: "Staff", value: form.num_staff || "Not set" },
                  { label: "Store Size", value: form.store_size || "Not set" },
                ].map(item => (
                  <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid " + BORDER }}>
                    <span style={{ color: MUTED, fontSize: 14 }}>{item.label}</span>
                    <span style={{ color: BLACK, fontSize: 14, fontWeight: 600 }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 4 - Done */}
          {step === 4 && (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 72, height: 72, background: ORANGE, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, margin: "0 auto 24px" }}>🚀</div>
              <h1 style={{ fontSize: 28, fontWeight: 700, color: BLACK, margin: "0 0 12px", letterSpacing: -0.5 }}>Samzy is ready!</h1>
              <p style={{ color: MUTED, fontSize: 15, marginBottom: 36, lineHeight: 1.6 }}>Your store is set up. Let's start managing and growing your business.</p>
              <a href="/" style={{ display: "block", padding: "14px", borderRadius: 10, background: ORANGE, color: "#fff", fontWeight: 700, fontSize: 15, textDecoration: "none" }}>
                Go to My Dashboard →
              </a>
            </div>
          )}

          {/* Navigation */}
          {step < 4 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 32 }}>
              {step > 1 ? (
                <button onClick={() => setStep(step - 1)} style={{ padding: "13px 24px", borderRadius: 10, background: CARD_BG, border: "1px solid " + BORDER, color: MUTED, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
                  ← Back
                </button>
              ) : <div />}
              <button onClick={handleNext} disabled={saving} style={{
                padding: "13px 32px", borderRadius: 10,
                background: saving ? MUTED : ORANGE, border: "none",
                color: "#fff", fontWeight: 700, fontSize: 14,
                cursor: saving ? "not-allowed" : "pointer",
              }}>
                {saving ? "Saving..." : step === 3 ? "Complete Setup ✓" : "Next →"}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}