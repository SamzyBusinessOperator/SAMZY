"use client";
import { useState, useRef } from "react";
import { supabase } from "../../lib/supabase";

const ORANGE = "#FC7800";
const BLACK = "#0f0f0f";
const WARM_BG = "#FAFAF8";
const CARD_BG = "#FFFFFF";
const BORDER = "#F0EEEB";
const MUTED = "#6B6B6B";

interface ScannedItem {
  name: string;
  quantity: number;
  price: number;
  category: string;
}

export default function Scanner() {
  const [image, setImage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [step, setStep] = useState<"upload" | "review" | "done">("upload");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result as string);
      scanReceipt(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function scanReceipt(imageData: string) {
    setScanning(true);
    setScannedItems([]);
    try {
      const res = await fetch("/api/scanner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageData }),
      });
      const data = await res.json();
      if (data.error) { setMessage("Could not scan: " + data.error); setScanning(false); return; }
      setScannedItems(data.items);
      setStep("review");
    } catch (err) {
      setMessage("Could not scan receipt. Please try again with a clearer image.");
    }
    setScanning(false);
  }

  function updateItem(index: number, field: keyof ScannedItem, value: string | number) {
    setScannedItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  }

  function removeItem(index: number) {
    setScannedItems(prev => prev.filter((_, i) => i !== index));
  }

  async function saveToInventory() {
    setSaving(true);
    setMessage("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = "/login"; return; }

      const { data: store } = await supabase.from("stores").select("id").ilike("owner_email", session.user.email || "").single();
      if (!store) { setMessage("Store not found."); setSaving(false); return; }

      for (const item of scannedItems) {
        const { data: existing } = await supabase.from("products").select("id, stock_quantity, price").eq("store_id", store.id).ilike("name", item.name).single();
        if (existing) {
          await supabase.from("products").update({ stock_quantity: existing.stock_quantity + item.quantity, price: item.price || existing.price }).eq("id", existing.id);
        } else {
          await supabase.from("products").insert([{ store_id: store.id, name: item.name, category: item.category, stock_quantity: item.quantity, price: item.price, reorder_threshold: 10 }]);
        }
      }

      setStep("done");
      setMessage(`${scannedItems.length} products saved to inventory!`);
    } catch (err) {
      setMessage("Error saving. Please try again.");
    }
    setSaving(false);
  }

  function reset() {
    setImage(null);
    setScannedItems([]);
    setMessage("");
    setStep("upload");
  }

  return (
    <div style={{ minHeight: "100vh", background: WARM_BG, fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" }}>

      {/* Header */}
      <header style={{ background: CARD_BG, borderBottom: "1px solid " + BORDER, padding: "0 40px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, background: ORANGE, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>🛒</div>
            <span style={{ color: BLACK, fontWeight: 700, fontSize: 16 }}>Samzy</span>
          </div>
          <span style={{ color: "#ccc" }}>|</span>
          <a href="/" style={{ color: MUTED, textDecoration: "none", fontSize: 13 }}>← Back to Dashboard</a>
        </div>
        <a href="/" style={{ color: ORANGE, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>Dashboard</a>
      </header>

      <div style={{ maxWidth: 680, margin: "48px auto", padding: "0 24px" }}>

        <div style={{ marginBottom: 36 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: BLACK, margin: 0, letterSpacing: -0.5 }}>Receipt Scanner</h1>
          <p style={{ color: MUTED, fontSize: 14, marginTop: 6 }}>Take a photo or upload a receipt — AI extracts and saves to inventory</p>
        </div>

        {message && (
          <div style={{ background: message.includes("Error") || message.includes("Could not") ? "#fef2f2" : "#f0fdf4", color: message.includes("Error") || message.includes("Could not") ? "#dc2626" : "#16a34a", padding: "14px 18px", borderRadius: 10, marginBottom: 24, fontSize: 14, borderLeft: "3px solid " + (message.includes("Error") || message.includes("Could not") ? "#dc2626" : "#16a34a"), fontWeight: 500 }}>
            {message}
          </div>
        )}

        {/* STEP 1: Upload */}
        {step === "upload" && (
          <div>
            {!image ? (
              <div>
                <div style={{ background: CARD_BG, borderRadius: 16, border: "2px dashed " + BORDER, padding: "48px 24px", textAlign: "center", marginBottom: 20 }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: BLACK, margin: "0 0 8px" }}>Upload your receipt</h2>
                  <p style={{ color: MUTED, fontSize: 14, marginBottom: 28 }}>Take a photo or upload from your device</p>
                  <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                    <button onClick={() => cameraInputRef.current?.click()} style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 24px", borderRadius: 10, background: ORANGE, border: "none", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                      📷 Take Photo
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 24px", borderRadius: 10, background: CARD_BG, border: "1px solid " + BORDER, color: BLACK, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
                      📁 Upload File
                    </button>
                  </div>
                  <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} style={{ display: "none" }} />
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
                </div>
                <div style={{ background: CARD_BG, borderRadius: 14, padding: "20px 24px", border: "1px solid " + BORDER }}>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: BLACK, margin: "0 0 12px" }}>Tips for best results</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {["Make sure the receipt is flat and well lit", "All text should be clearly visible", "Works with supplier delivery notes too", "Supports JPG, PNG, HEIC formats"].map((tip, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ color: ORANGE, fontWeight: 700 }}>✓</span>
                        <span style={{ fontSize: 13, color: MUTED }}>{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ background: CARD_BG, borderRadius: 16, padding: "24px", border: "1px solid " + BORDER, textAlign: "center" }}>
                <img src={image} alt="Receipt" style={{ maxWidth: "100%", maxHeight: 300, borderRadius: 10, objectFit: "contain" }} />
                {scanning && (
                  <div style={{ marginTop: 24 }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>✦</div>
                    <p style={{ color: BLACK, fontWeight: 600, fontSize: 16 }}>AI is scanning your receipt...</p>
                    <p style={{ color: MUTED, fontSize: 13 }}>Extracting products, quantities and prices</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Review */}
        {step === "review" && (
          <div>
            <div style={{ background: CARD_BG, borderRadius: 16, padding: "24px", border: "1px solid " + BORDER, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: BLACK, margin: 0 }}>Review Scanned Items</h2>
                  <p style={{ color: MUTED, fontSize: 13, marginTop: 4 }}>{scannedItems.length} products found — edit if needed</p>
                </div>
                <button onClick={reset} style={{ padding: "8px 16px", borderRadius: 8, background: WARM_BG, border: "1px solid " + BORDER, color: MUTED, fontSize: 13, cursor: "pointer" }}>Rescan</button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {scannedItems.map((item, i) => (
                  <div key={i} style={{ background: WARM_BG, borderRadius: 12, padding: "16px", border: "1px solid " + BORDER }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <input value={item.name} onChange={e => updateItem(i, "name", e.target.value)}
                        style={{ fontSize: 14, fontWeight: 600, color: BLACK, background: "none", border: "none", outline: "none", flex: 1, fontFamily: "inherit" }} />
                      <button onClick={() => removeItem(i)} style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 16, marginLeft: 8 }}>✕</button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                      <div>
                        <label style={{ fontSize: 10, color: MUTED, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 0.5, display: "block", marginBottom: 4 }}>Qty</label>
                        <input type="number" value={item.quantity} onChange={e => updateItem(i, "quantity", parseInt(e.target.value))}
                          style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid " + BORDER, fontSize: 13, color: BLACK, background: CARD_BG, outline: "none", boxSizing: "border-box" as const }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, color: MUTED, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 0.5, display: "block", marginBottom: 4 }}>Price €</label>
                        <input type="number" step="0.01" value={item.price} onChange={e => updateItem(i, "price", parseFloat(e.target.value))}
                          style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid " + BORDER, fontSize: 13, color: BLACK, background: CARD_BG, outline: "none", boxSizing: "border-box" as const }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, color: MUTED, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 0.5, display: "block", marginBottom: 4 }}>Category</label>
                        <select value={item.category} onChange={e => updateItem(i, "category", e.target.value)}
                          style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid " + BORDER, fontSize: 13, color: BLACK, background: CARD_BG, outline: "none", boxSizing: "border-box" as const }}>
                          {["Dairy", "Bakery", "Beverages", "Produce", "Meat", "Pantry", "Frozen", "Cleaning", "Other"].map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={saveToInventory} disabled={saving || scannedItems.length === 0} style={{ width: "100%", padding: "15px", borderRadius: 12, background: saving ? MUTED : ORANGE, border: "none", color: "#fff", fontWeight: 700, fontSize: 15, cursor: saving ? "not-allowed" : "pointer" }}>
              {saving ? "Saving to inventory..." : `Save ${scannedItems.length} Products to Inventory →`}
            </button>
          </div>
        )}

        {/* STEP 3: Done */}
        {step === "done" && (
          <div style={{ background: CARD_BG, borderRadius: 16, padding: "48px 24px", border: "1px solid " + BORDER, textAlign: "center" }}>
            <div style={{ width: 64, height: 64, background: ORANGE, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 20px" }}>✓</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: BLACK, margin: "0 0 8px" }}>Inventory Updated!</h2>
            <p style={{ color: MUTED, fontSize: 15, marginBottom: 32 }}>{scannedItems.length} products have been saved to your inventory.</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button onClick={reset} style={{ padding: "13px 24px", borderRadius: 10, background: WARM_BG, border: "1px solid " + BORDER, color: BLACK, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
                Scan Another
              </button>
              <a href="/" style={{ padding: "13px 24px", borderRadius: 10, background: ORANGE, color: "#fff", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
                Go to Dashboard →
              </a>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}