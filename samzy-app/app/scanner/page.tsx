"use client";
import { useIsMobile } from "@/lib/useIsMobile";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
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
interface SupplierResult {
  name: string;
  invoice_amount: string;
  due_date: string;
  notes: string;
}
type Mode = "choose" | "inventory" | "supplier" | "receipt";
export default function Scanner() {
  const isMobile = useIsMobile();
  const [mode, setMode] = useState<Mode>("choose");
  const [image, setImage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [supplierResult, setSupplierResult] = useState<SupplierResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [step, setStep] = useState<"upload" | "review" | "done">("upload");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const modes = [
    { id: "pricing", icon: "📦", title: "Supplier Invoice", desc: "Upload a supplier invoice — AI extracts products, calculates selling prices and updates inventory" },
    { id: "receipt", icon: "🧾", title: "Sales Receipt", desc: "Scan a customer receipt to record sales and update stock" },
  ];
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result as string);
      scanDocument(reader.result as string);
    };
    reader.readAsDataURL(file);
  }
  async function scanDocument(imageData: string) {
    setScanning(true);
    setScannedItems([]);
    setSupplierResult(null);
    try {
      const res = await fetch("/api/scanner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageData, mode }),
      });
      const data = await res.json();
      if (data.error) { setMessage("Could not scan: " + data.error); setScanning(false); return; }
      if (mode === "supplier") {
        setSupplierResult(data.supplier);
      } else {
        setScannedItems(data.items || []);
      }
      setStep("review");
    } catch (err) {
      setMessage("Could not scan. Please try again with a clearer image.");
    }
    setScanning(false);
  }
  function updateItem(index: number, field: keyof ScannedItem, value: string | number) {
    setScannedItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  }
  function removeItem(index: number) {
    setScannedItems(prev => prev.filter((_, i) => i !== index));
  }
  async function saveResults() {
    setSaving(true);
    setMessage("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = "/login"; return; }
      const email = session.user.email || "";
      if (mode === "supplier" && supplierResult) {
        const { error } = await supabase.from("suppliers").insert([{ ...supplierResult, store_email: email, status: "pending" }]);
        if (error) { setMessage("Error: " + error.message); setSaving(false); return; }
        setMessage("Supplier saved successfully!");
      } else if (mode === "receipt") {
        const { data: store } = await supabase.from("stores").select("id").ilike("owner_email", email).single();
        if (!store) { setMessage("Store not found."); setSaving(false); return; }
        for (const item of scannedItems) {
          await supabase.from("sales").insert([{ store_id: store.id, store_email: email, product_name: item.name, category: item.category, quantity: item.quantity, price: item.price, total: item.quantity * item.price, sale_date: new Date().toISOString().split("T")[0] }]);
          const { data: existing } = await supabase.from("products").select("id, stock_quantity").eq("store_id", store.id).ilike("name", item.name).single();
          if (existing) {
            await supabase.from("products").update({ stock_quantity: Math.max(0, existing.stock_quantity - item.quantity) }).eq("id", existing.id);
          }
        }
        setMessage(`${scannedItems.length} sales recorded and stock updated!`);
      } else {
        const { data: store } = await supabase.from("stores").select("id").ilike("owner_email", email).single();
        if (!store) { setMessage("Store not found."); setSaving(false); return; }
        for (const item of scannedItems) {
          const { data: existing } = await supabase.from("products").select("id, stock_quantity, price").eq("store_id", store.id).ilike("name", item.name).single();
          if (existing) {
            await supabase.from("products").update({ stock_quantity: existing.stock_quantity + item.quantity, price: item.price || existing.price }).eq("id", existing.id);
          } else {
            await supabase.from("products").insert([{ store_id: store.id, name: item.name, category: item.category, stock_quantity: item.quantity, price: item.price, reorder_threshold: 10 }]);
          }
        }
        setMessage(`${scannedItems.length} products saved!`);
      }
      setStep("done");
    } catch (err) {
      setMessage("Error saving. Please try again.");
    }
    setSaving(false);
  }
  function reset() {
    setImage(null);
    setScannedItems([]);
    setSupplierResult(null);
    setMessage("");
    setStep("upload");
    setMode("choose");
  }
  const doneMessages: Record<string, string> = {
    inventory: "Products have been added to your inventory.",
    supplier: "Supplier invoice has been saved.",
    receipt: "Sales data has been recorded and stock updated.",

  };
  return (
    <div style={{ minHeight: "100vh", background: WARM_BG, fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" }}>
      <header style={{ background: CARD_BG, borderBottom: "1px solid " + BORDER, padding: isMobile ? "0 16px" : "0 40px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Image src="/logo.png" alt="Samzy" width={32} height={32} />
            <span style={{ color: BLACK, fontWeight: 700, fontSize: 16 }}>Samzy</span>
          </div>
          <span style={{ color: "#ccc" }}>|</span>
          <a href="/" style={{ color: MUTED, textDecoration: "none", fontSize: 13 }}>← Back to Dashboard</a>
        </div>
        <a href="/" style={{ color: ORANGE, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>Dashboard</a>
      </header>
      <div style={{ maxWidth: 680, margin: isMobile ? "24px auto" : "48px auto", padding: isMobile ? "0 16px" : "0 24px" }}>
        <div style={{ marginBottom: 36 }}>
          <h1 style={{ fontSize: isMobile ? 24 : 28, fontWeight: 700, color: BLACK, margin: 0, letterSpacing: -0.5 }}>Smart Scanner</h1>
          <p style={{ color: MUTED, fontSize: 14, marginTop: 6 }}>Scan any document — AI extracts and saves the data automatically</p>
        </div>
        {message && (
          <div style={{ background: message.includes("Error") || message.includes("Could not") ? "#fef2f2" : "#f0fdf4", color: message.includes("Error") || message.includes("Could not") ? "#dc2626" : "#16a34a", padding: "14px 18px", borderRadius: 10, marginBottom: 24, fontSize: 14, borderLeft: "3px solid " + (message.includes("Error") || message.includes("Could not") ? "#dc2626" : "#16a34a"), fontWeight: 500 }}>
            {message}
          </div>
        )}
        {/* STEP 0: Choose Mode */}
        {mode === "choose" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ color: MUTED, fontSize: 14, margin: "0 0 8px", fontWeight: 600 }}>What do you want to scan?</p>
            {modes.map(m => (
              <button key={m.id} onClick={() => m.id === 'pricing' ? window.location.href = '/pricing-tool' : setMode(m.id as Mode)} style={{ display: "flex", alignItems: "center", gap: 18, padding: "20px 24px", borderRadius: 14, background: CARD_BG, border: "1px solid " + BORDER, cursor: "pointer", textAlign: "left" as const, transition: "border-color 0.2s" }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: WARM_BG, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>{m.icon}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: BLACK, marginBottom: 4 }}>{m.title}</div>
                  <div style={{ fontSize: 13, color: MUTED }}>{m.desc}</div>
                </div>
                <div style={{ marginLeft: "auto", color: ORANGE, fontSize: 18 }}>→</div>
              </button>
            ))}
          </div>
        )}
        {/* STEP 1: Upload */}
        {mode !== "choose" && step === "upload" && (
          <div>
            <button onClick={() => setMode("choose")} style={{ background: "none", border: "none", color: MUTED, fontSize: 13, cursor: "pointer", marginBottom: 20, padding: 0 }}>← Choose different scan type</button>
            {!image ? (
              <div>
                <div style={{ background: CARD_BG, borderRadius: 16, border: "2px dashed " + BORDER, padding: "48px 24px", textAlign: "center", marginBottom: 20 }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>{modes.find(m => m.id === mode)?.icon}</div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: BLACK, margin: "0 0 8px" }}>Upload your {modes.find(m => m.id === mode)?.title}</h2>
                  <p style={{ color: MUTED, fontSize: 14, marginBottom: 28 }}>Take a photo or upload from your device</p>
                  <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" as const }}>
                    <button onClick={() => cameraInputRef.current?.click()} style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 24px", borderRadius: 10, background: ORANGE, border: "none", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>📷 Take Photo</button>
                    <button onClick={() => fileInputRef.current?.click()} style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 24px", borderRadius: 10, background: CARD_BG, border: "1px solid " + BORDER, color: BLACK, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>📁 Upload File</button>
                  </div>
                  <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} style={{ display: "none" }} />
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
                </div>
                <div style={{ background: CARD_BG, borderRadius: 14, padding: "20px 24px", border: "1px solid " + BORDER }}>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: BLACK, margin: "0 0 12px" }}>Tips for best results</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {["Make sure the document is flat and well lit", "All text should be clearly visible", "Supports JPG, PNG, HEIC formats", "Works best with clear, printed documents"].map((tip, i) => (
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
                <img src={image} alt="Document" style={{ maxWidth: "100%", maxHeight: 300, borderRadius: 10, objectFit: "contain" }} />
                {scanning && (
                  <div style={{ marginTop: 24 }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>✦</div>
                    <p style={{ color: BLACK, fontWeight: 600, fontSize: 16 }}>AI is scanning your document...</p>
                    <p style={{ color: MUTED, fontSize: 13 }}>Extracting data automatically</p>
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
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: BLACK, margin: 0 }}>Review Extracted Data</h2>
                  <p style={{ color: MUTED, fontSize: 13, marginTop: 4 }}>Check and edit if needed before saving</p>
                </div>
                <button onClick={() => { setStep("upload"); setImage(null); }} style={{ padding: "8px 16px", borderRadius: 8, background: WARM_BG, border: "1px solid " + BORDER, color: MUTED, fontSize: 13, cursor: "pointer" }}>Rescan</button>
              </div>
              {mode === "supplier" && supplierResult && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {[{ label: "Supplier Name", key: "name" }, { label: "Invoice Amount", key: "invoice_amount" }, { label: "Due Date", key: "due_date" }, { label: "Notes", key: "notes" }].map(f => (
                    <div key={f.key}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: MUTED, display: "block", marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>{f.label}</label>
                      <input value={(supplierResult as any)[f.key]} onChange={e => setSupplierResult(prev => prev ? { ...prev, [f.key]: e.target.value } : null)} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid " + BORDER, fontSize: 14, outline: "none", boxSizing: "border-box" as const, fontFamily: "-apple-system, sans-serif", color: BLACK, background: WARM_BG }} />
                    </div>
                  ))}
                </div>
              )}
              {mode !== "supplier" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {scannedItems.map((item, i) => (
                    <div key={i} style={{ background: WARM_BG, borderRadius: 12, padding: "16px", border: "1px solid " + BORDER }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                        <input value={item.name} onChange={e => updateItem(i, "name", e.target.value)} style={{ fontSize: 14, fontWeight: 600, color: BLACK, background: "none", border: "none", outline: "none", flex: 1, fontFamily: "inherit" }} />
                        <button onClick={() => removeItem(i)} style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 16, marginLeft: 8 }}>✕</button>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr", gap: 10 }}>
                        <div>
                          <label style={{ fontSize: 10, color: MUTED, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 0.5, display: "block", marginBottom: 4 }}>Qty</label>
                          <input type="number" value={item.quantity} onChange={e => updateItem(i, "quantity", parseInt(e.target.value))} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid " + BORDER, fontSize: 13, color: BLACK, background: CARD_BG, outline: "none", boxSizing: "border-box" as const }} />
                        </div>
                        <div>
                          <label style={{ fontSize: 10, color: MUTED, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 0.5, display: "block", marginBottom: 4 }}>Price €</label>
                          <input type="number" step="0.01" value={item.price} onChange={e => updateItem(i, "price", parseFloat(e.target.value))} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid " + BORDER, fontSize: 13, color: BLACK, background: CARD_BG, outline: "none", boxSizing: "border-box" as const }} />
                        </div>
                        <div>
                          <label style={{ fontSize: 10, color: MUTED, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 0.5, display: "block", marginBottom: 4 }}>Category</label>
                          <select value={item.category} onChange={e => updateItem(i, "category", e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid " + BORDER, fontSize: 13, color: BLACK, background: CARD_BG, outline: "none", boxSizing: "border-box" as const }}>
                            {["Dairy", "Bakery", "Beverages", "Produce", "Meat", "Pantry", "Frozen", "Cleaning", "Vegetables", "Fruits", "Beauty", "Other"].map(c => <option key={c}>{c}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button onClick={saveResults} disabled={saving} style={{ width: "100%", padding: "15px", borderRadius: 12, background: saving ? MUTED : ORANGE, border: "none", color: "#fff", fontWeight: 700, fontSize: 15, cursor: saving ? "not-allowed" : "pointer" }}>
              {saving ? "Saving..." : mode === "supplier" ? "Save Supplier Invoice →" : `Save ${scannedItems.length} Products →`}
            </button>
          </div>
        )}
        {/* STEP 3: Done */}
        {step === "done" && (
          <div style={{ background: CARD_BG, borderRadius: 16, padding: "48px 24px", border: "1px solid " + BORDER, textAlign: "center" }}>
            <div style={{ width: 64, height: 64, background: ORANGE, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 20px" }}>✓</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: BLACK, margin: "0 0 8px" }}>Saved Successfully!</h2>
            <p style={{ color: MUTED, fontSize: 15, marginBottom: 32 }}>{doneMessages[mode]}</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button onClick={reset} style={{ padding: "13px 24px", borderRadius: 10, background: WARM_BG, border: "1px solid " + BORDER, color: BLACK, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Scan Another</button>
              <a href="/" style={{ padding: "13px 24px", borderRadius: 10, background: ORANGE, color: "#fff", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>Go to Dashboard →</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
