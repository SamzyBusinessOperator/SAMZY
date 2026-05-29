"use client";
import { useIsMobile } from "@/lib/useIsMobile";
import { useState } from "react";
import { supabase } from "../../lib/supabase";
import Image from "next/image";

const ORANGE = "#FC7800";
const BLACK = "#0f0f0f";
const WARM_BG = "#FAFAF8";
const CARD_BG = "#FFFFFF";
const BORDER = "#F0EEEB";
const MUTED = "#6B6B6B";
const LIGHT_ORANGE = "#FFF5EB";
const GREEN = "#16a34a";
const RED = "#dc2626";

interface PricedProduct {
  name: string;
  packSize: string;
  qty: number;
  costSIVA: number;
  itemCost: number;
  itemWT: number;
  shopSem: number;
  civacp: number;
  shopCom: number;
  special: number;
  bigWholesale: number;
  restCom: number;
  ivaRate: number;
  publicPrice: number;
  oldCost?: number;
  priceChange?: number;
}

const DEFAULT_MARGINS = {
  transport: 0.0415,
  civacp: 0.20,
  shopSem: 0.41,
  shopCom: 0.20,
  special: 0.12,
  bigWholesale: 0.10,
  restCom: 0.55,
  ivaRate: 0.23,
};

export default function PricingTool() {
  const isMobile = useIsMobile();
  const [step, setStep] = useState<"upload" | "margins" | "review" | "done">("upload");
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState("");
  const [products, setProducts] = useState<PricedProduct[]>([]);
  const [margins, setMargins] = useState(DEFAULT_MARGINS);
  const [saving, setSaving] = useState(false);
  const [supplierName, setSupplierName] = useState("");
  const [invoiceTotal, setInvoiceTotal] = useState(0);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true);
    setMessage("AI is reading your invoice...");

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = (ev.target?.result as string);
      try {
        const res = await fetch("/api/pricing-scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageData: base64, margins }),
        });
        const data = await res.json();
        if (data.error) { setMessage("Error: " + data.error); setScanning(false); return; }
        setProducts(data.products);
        setSupplierName(data.supplier || "");
        setInvoiceTotal(data.total || 0);
        setStep("margins");
        setMessage("");
      } catch (err: any) {
        setMessage("Error: " + err.message);
      }
      setScanning(false);
    };
    reader.readAsDataURL(file);
  }

  function recalculate() {
    setProducts(prev => prev.map(p => {
      const itemWT = p.costSIVA * (1 + margins.transport);
      const civacp = itemWT * (1 + margins.civacp);
      const shopSem = itemWT * (1 + margins.shopSem);
      const shopCom = civacp * (1 + margins.shopCom);
      const special = civacp * (1 + margins.special);
      const bigWholesale = civacp * (1 + margins.bigWholesale);
      const restCom = civacp * (1 + margins.restCom);
      return { ...p, itemWT, civacp, shopSem, shopCom, special, bigWholesale, restCom };
    }));
    setStep("review");
  }

  async function applyPricing() {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const email = session?.user?.email || "";
      const { data: store } = await supabase.from("stores").select("id").ilike("owner_email", email).single();
      if (!store) { setMessage("Store not found."); setSaving(false); return; }

      for (const p of products) {
        const { data: existing } = await supabase.from("products").select("id, price").eq("store_id", store.id).ilike("name", p.name).single();
        if (existing) {
          await supabase.from("products").update({
            price: p.civacp,
            stock_quantity: existing.stock_quantity || p.qty,
          }).eq("id", existing.id);
        } else {
          await supabase.from("products").insert([{
            store_id: store.id,
            name: p.name,
            category: "Other",
            stock_quantity: p.qty,
            price: p.civacp,
            reorder_threshold: 10,
          }]);
        }
      }
      setStep("done");
    } catch (err: any) {
      setMessage("Error: " + err.message);
    }
    setSaving(false);
  }

  const inputStyle = {
    padding: "8px 12px", borderRadius: 8, border: "1px solid " + BORDER,
    fontSize: 13, outline: "none", background: WARM_BG, color: BLACK, width: "100%",
    boxSizing: "border-box" as const,
  };

  return (
    <div style={{ minHeight: "100vh", background: WARM_BG, fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" }}>
      {/* Header */}
      <header style={{ background: BLACK, padding: isMobile ? "0 16px" : "0 40px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <Image src="/logo.png" alt="Samzy" width={28} height={28} />
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>Samzy</span>
          </a>
          <span style={{ background: ORANGE, color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6 }}>Smart Pricing</span>
        </div>
        <a href="/" style={{ color: "#fff", fontSize: 13, textDecoration: "none", opacity: 0.7 }}>← Dashboard</a>
      </header>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: isMobile ? "24px 16px" : "40px 24px" }}>

        {/* Steps indicator */}
        <div style={{ display: "flex", gap: 8, marginBottom: 32, alignItems: "center" }}>
          {["Upload Invoice", "Set Margins", "Review Prices", "Done"].map((s, i) => {
            const steps = ["upload", "margins", "review", "done"];
            const active = steps[i] === step;
            const done = steps.indexOf(step) > i;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: done ? GREEN : active ? ORANGE : BORDER, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: done || active ? "#fff" : MUTED }}>
                    {done ? "✓" : i + 1}
                  </div>
                  {!isMobile && <span style={{ fontSize: 12, fontWeight: active ? 700 : 400, color: active ? BLACK : MUTED }}>{s}</span>}
                </div>
                {i < 3 && <div style={{ width: isMobile ? 16 : 32, height: 1, background: BORDER }} />}
              </div>
            );
          })}
        </div>

        {/* STEP 1: Upload */}
        {step === "upload" && (
          <div style={{ background: CARD_BG, borderRadius: 16, padding: isMobile ? "24px 20px" : "40px", border: "1px solid " + BORDER, textAlign: "center" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>📄</div>
            <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, color: BLACK, margin: "0 0 8px" }}>Smart Invoice Pricing</h1>
            <p style={{ color: MUTED, fontSize: 15, margin: "0 0 32px" }}>Upload a supplier invoice and Samzy will automatically calculate all your selling prices.</p>

            {scanning ? (
              <div style={{ padding: 32 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div>
                <p style={{ color: MUTED, fontSize: 15 }}>{message}</p>
              </div>
            ) : (
              <label style={{ display: "inline-block", background: ORANGE, color: "#fff", padding: "14px 32px", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
                📁 Upload Invoice (PDF or Image)
                <input type="file" accept="image/*,.pdf" onChange={handleFileUpload} style={{ display: "none" }} />
              </label>
            )}

            {message && !scanning && (
              <div style={{ marginTop: 16, padding: "12px 16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, color: RED, fontSize: 13 }}>{message}</div>
            )}
          </div>
        )}

        {/* STEP 2: Set Margins */}
        {step === "margins" && (
          <div>
            <div style={{ background: CARD_BG, borderRadius: 16, padding: isMobile ? "20px" : "32px", border: "1px solid " + BORDER, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap" as const, gap: 12 }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: BLACK, margin: "0 0 4px" }}>✅ Invoice Scanned — {products.length} products found</h2>
                  <p style={{ color: MUTED, fontSize: 13, margin: 0 }}>Supplier: <strong>{supplierName}</strong>{invoiceTotal > 0 ? ` · Total: €${invoiceTotal.toFixed(2)}` : ""}</p>
                </div>
              </div>

              <h3 style={{ fontSize: 15, fontWeight: 700, color: BLACK, margin: "0 0 16px" }}>⚙️ Adjust Pricing Margins</h3>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 12 }}>
                {[
                  { key: "transport", label: "Transport %", color: "#0071e3" },
                  { key: "shopSem", label: "Shop Sem %", color: ORANGE },
                  { key: "civacp", label: "C/IVACP %", color: GREEN },
                  { key: "shopCom", label: "Shop Com %", color: "#7c3aed" },
                  { key: "special", label: "Special %", color: "#db2777" },
                  { key: "bigWholesale", label: "Big Wholesale %", color: "#0891b2" },
                  { key: "restCom", label: "Rest Com %", color: "#d97706" },
                  { key: "ivaRate", label: "IVA Rate %", color: MUTED },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: f.color, display: "block", marginBottom: 4, textTransform: "uppercase" as const }}>{f.label}</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <input
                        type="number"
                        step="0.01"
                        value={(margins[f.key as keyof typeof margins] * 100).toFixed(1)}
                        onChange={e => setMargins(prev => ({ ...prev, [f.key]: parseFloat(e.target.value) / 100 || 0 }))}
                        style={{ ...inputStyle, width: "70%" }}
                      />
                      <span style={{ fontSize: 13, color: MUTED }}>%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={recalculate} style={{ width: "100%", background: ORANGE, color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
              Calculate All Prices →
            </button>
          </div>
        )}

        {/* STEP 3: Review */}
        {step === "review" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap" as const, gap: 12 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: BLACK, margin: "0 0 4px" }}>Review Pricing — {products.length} products</h2>
                <p style={{ color: MUTED, fontSize: 13, margin: 0 }}>Supplier: <strong>{supplierName}</strong></p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setStep("margins")} style={{ background: CARD_BG, border: "1px solid " + BORDER, borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", color: MUTED }}>← Back</button>
                <button onClick={applyPricing} disabled={saving} style={{ background: saving ? MUTED : GREEN, color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  {saving ? "Saving..." : "✅ Apply All Prices"}
                </button>
              </div>
            </div>

            {/* Table header */}
            <div style={{ background: BLACK, borderRadius: "12px 12px 0 0", padding: "12px 16px", display: "grid", gridTemplateColumns: isMobile ? "2fr 1fr 1fr 1fr" : "3fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr", gap: 8 }}>
              {["Product", "Cost", "C/IVACP", isMobile ? "" : "Shop Sem", isMobile ? "" : "Shop Com", isMobile ? "" : "Special", isMobile ? "" : "Wholesale", isMobile ? "" : "Rest Com"].filter(h => !isMobile || h !== "").map((h, i) => (
                <span key={i} style={{ fontSize: 10, fontWeight: 700, color: i === 2 ? ORANGE : "#fff", opacity: h ? 1 : 0, textTransform: "uppercase" as const }}>{h}</span>
              ))}
            </div>

            <div style={{ border: "1px solid " + BORDER, borderTop: "none", borderRadius: "0 0 12px 12px", overflow: "hidden" }}>
              {products.map((p, i) => {
                const hasIncrease = p.priceChange && p.priceChange > 5;
                const hasDecrease = p.priceChange && p.priceChange < -5;
                return (
                  <div key={i} style={{ padding: "12px 16px", borderBottom: i < products.length - 1 ? "1px solid " + BORDER : "none", background: hasIncrease ? "#fef2f2" : hasDecrease ? "#f0fdf4" : i % 2 === 0 ? CARD_BG : WARM_BG, display: "grid", gridTemplateColumns: isMobile ? "2fr 1fr 1fr 1fr" : "3fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr", gap: 8, alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: BLACK }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: MUTED }}>{p.packSize} · Qty: {p.qty}</div>
                      {p.priceChange !== undefined && Math.abs(p.priceChange) > 1 && (
                        <div style={{ fontSize: 10, fontWeight: 700, color: hasIncrease ? RED : GREEN }}>
                          {hasIncrease ? "▲" : "▼"} {Math.abs(p.priceChange).toFixed(1)}% price change
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: 12, color: MUTED }}>€{p.costSIVA.toFixed(3)}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: ORANGE }}>€{p.civacp.toFixed(2)}</span>
                    {!isMobile && <span style={{ fontSize: 12, color: BLACK }}>€{p.shopSem.toFixed(2)}</span>}
                    {!isMobile && <span style={{ fontSize: 12, color: BLACK }}>€{p.shopCom.toFixed(2)}</span>}
                    {!isMobile && <span style={{ fontSize: 12, color: BLACK }}>€{p.special.toFixed(2)}</span>}
                    {!isMobile && <span style={{ fontSize: 12, color: BLACK }}>€{p.bigWholesale.toFixed(2)}</span>}
                    {!isMobile && <span style={{ fontSize: 12, color: BLACK }}>€{p.restCom.toFixed(2)}</span>}
                  </div>
                );
              })}
            </div>

            {message && <div style={{ marginTop: 16, padding: "12px 16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, color: RED, fontSize: 13 }}>{message}</div>}
          </div>
        )}

        {/* STEP 4: Done */}
        {step === "done" && (
          <div style={{ background: CARD_BG, borderRadius: 16, padding: 40, textAlign: "center", border: "1px solid " + BORDER }}>
            <div style={{ width: 72, height: 72, borderRadius: 18, background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, margin: "0 auto 20px" }}>✅</div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: BLACK, margin: "0 0 8px" }}>Pricing Applied!</h2>
            <p style={{ color: MUTED, fontSize: 15, margin: "0 0 32px" }}>{products.length} products updated with new pricing.</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" as const }}>
              <button onClick={() => { setStep("upload"); setProducts([]); setMessage(""); }} style={{ background: ORANGE, color: "#fff", border: "none", borderRadius: 10, padding: "12px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>📁 Scan Another Invoice</button>
              <a href="/" style={{ background: BLACK, color: "#fff", borderRadius: 10, padding: "12px 24px", fontSize: 14, fontWeight: 700, textDecoration: "none", display: "inline-block" }}>← Go to Dashboard</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
