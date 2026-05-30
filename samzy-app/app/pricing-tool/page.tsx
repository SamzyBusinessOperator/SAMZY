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
const GREEN = "#16a34a";
const RED = "#dc2626";

interface ScannedItem {
  name: string;
  quantity: number;
  price: number;
  category: string;
  packSize?: string;
  barcode?: string;
}

interface SupplierResult {
  name: string;
  invoice_amount: string;
  due_date: string;
  notes: string;
}

interface PriceHistoryEntry {
  date: string;
  supplier: string;
  price: number;
  change?: number;
}

interface SupplierPrice {
  supplier: string;
  latest_price: number;
  last_updated: string;
  avg_price: number;
  is_best: boolean;
}

interface ProductIntelligence {
  name: string;
  category: string;
  barcode?: string;
  packSize?: string;
  currentPrice: number;
  lowestPrice: number;
  highestPrice: number;
  avgPrice: number;
  priceChange30d: number;
  priceHistory: PriceHistoryEntry[];
  supplierPrices: SupplierPrice[];
  aiInsight: string;
}

type Mode = "choose" | "inventory" | "supplier" | "receipt";

// ─── Product Detail Sheet ─────────────────────────────────────────────────────

function ProductDetailSheet({
  item,
  storeId,
  onClose,
  onEditPrice,
}: {
  item: ScannedItem;
  storeId: string | null;
  onClose: () => void;
  onEditPrice: (price: number) => void;
}) {
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<"history" | "suppliers">("history");
  const [intel, setIntel] = useState<ProductIntelligence | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingPrice, setEditingPrice] = useState(false);
  const [newPrice, setNewPrice] = useState(item.price.toString());
  const [showActions, setShowActions] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // Fetch price history from price_history table
        const { data: hist } = await supabase
          .from("price_history")
          .select("*")
          .ilike("product_name", `%${item.name.substring(0, 15)}%`)
          .order("scanned_at", { ascending: true })
          .limit(30);

        if (hist && hist.length > 0) {
          // Build price history entries
          const priceHistory: PriceHistoryEntry[] = hist.map((h: any, i: number) => ({
            date: new Date(h.scanned_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" }),
            supplier: h.supplier_name,
            price: h.item_cost || h.cost_siva,
            change: i > 0
              ? Math.round(((h.item_cost || h.cost_siva) - (hist[i-1].item_cost || hist[i-1].cost_siva)) / (hist[i-1].item_cost || hist[i-1].cost_siva) * 1000) / 10
              : undefined,
          }));

          // Build supplier comparison
          const latestPerSupplier: Record<string, any> = {};
          const allPerSupplier: Record<string, number[]> = {};
          for (const h of hist) {
            const cost = h.item_cost || h.cost_siva;
            if (!latestPerSupplier[h.supplier_name] || h.scanned_at > latestPerSupplier[h.supplier_name].scanned_at) {
              latestPerSupplier[h.supplier_name] = h;
            }
            if (!allPerSupplier[h.supplier_name]) allPerSupplier[h.supplier_name] = [];
            allPerSupplier[h.supplier_name].push(cost);
          }

          const supplierList = Object.entries(latestPerSupplier).map(([name, h]) => ({
            supplier: name,
            latest_price: h.item_cost || h.cost_siva,
            last_updated: new Date(h.scanned_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
            avg_price: Math.round(allPerSupplier[name].reduce((a: number, b: number) => a + b, 0) / allPerSupplier[name].length * 100) / 100,
            is_best: false,
          }));

          const minPrice = Math.min(...supplierList.map(s => s.avg_price));
          supplierList.forEach(s => { s.is_best = s.avg_price === minPrice; });
          supplierList.sort((a, b) => a.avg_price - b.avg_price);

          const allPrices = hist.map((h: any) => h.item_cost || h.cost_siva);
          const lowest = Math.min(...allPrices);
          const highest = Math.max(...allPrices);
          const avg = Math.round(allPrices.reduce((a: number, b: number) => a + b, 0) / allPrices.length * 100) / 100;
          const recent = allPrices.slice(-2);
          const change30d = recent.length > 1
            ? Math.round((recent[1] - recent[0]) / recent[0] * 1000) / 10
            : 0;

          // AI insight
          let aiInsight = "";
          if (item.price > avg * 1.05) {
            aiInsight = `Current price (€${item.price.toFixed(2)}) is ${Math.round((item.price / avg - 1) * 100)}% higher than the average price (€${avg.toFixed(2)}).`;
          } else if (item.price < avg * 0.95) {
            aiInsight = `Current price (€${item.price.toFixed(2)}) is ${Math.round((1 - item.price / avg) * 100)}% below average — great deal!`;
          } else {
            aiInsight = `Current price (€${item.price.toFixed(2)}) is in line with the historical average (€${avg.toFixed(2)}).`;
          }
          if (supplierList.length > 1 && supplierList[0].is_best) {
            aiInsight += ` ${supplierList[0].supplier} offers the best average price (€${supplierList[0].avg_price.toFixed(2)}).`;
          }

          setIntel({
            name: item.name,
            category: item.category,
            barcode: item.barcode,
            packSize: item.packSize,
            currentPrice: item.price,
            lowestPrice: lowest,
            highestPrice: highest,
            avgPrice: avg,
            priceChange30d: change30d,
            priceHistory,
            supplierPrices: supplierList,
            aiInsight,
          });
        } else {
          // No history yet
          setIntel({
            name: item.name,
            category: item.category,
            barcode: item.barcode,
            packSize: item.packSize,
            currentPrice: item.price,
            lowestPrice: item.price,
            highestPrice: item.price,
            avgPrice: item.price,
            priceChange30d: 0,
            priceHistory: [],
            supplierPrices: [],
            aiInsight: "No price history yet. Scan more invoices to build intelligence.",
          });
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }
    load();
  }, [item.name]);

  // Simple sparkline chart using SVG
  function MiniChart({ data }: { data: PriceHistoryEntry[] }) {
    if (data.length < 2) return null;
    const prices = data.map(d => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    const w = 300; const h = 80;
    const pts = prices.map((p, i) => {
      const x = (i / (prices.length - 1)) * w;
      const y = h - ((p - min) / range) * (h - 16) - 8;
      return `${x},${y}`;
    }).join(" ");

    return (
      <div style={{ background: WARM_BG, borderRadius: 12, padding: "16px", marginTop: 12 }}>
        <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: 80 }}>
          <polyline points={pts} fill="none" stroke={ORANGE} strokeWidth="2.5" strokeLinejoin="round" />
          {prices.map((p, i) => {
            const x = (i / (prices.length - 1)) * w;
            const y = h - ((p - min) / range) * (h - 16) - 8;
            return <circle key={i} cx={x} cy={y} r="3.5" fill={ORANGE} />;
          })}
        </svg>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          <span style={{ fontSize: 11, color: MUTED }}>{data[0]?.date}</span>
          <span style={{ fontSize: 11, color: MUTED }}>{data[data.length - 1]?.date}</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      {/* Backdrop */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} onClick={onClose} />

      {/* Sheet */}
      <div style={{
        position: "relative", width: "100%", maxWidth: 480, background: CARD_BG,
        borderRadius: "20px 20px 0 0", maxHeight: "90vh", overflow: "hidden",
        display: "flex", flexDirection: "column",
        animation: "slideUp 0.3s cubic-bezier(0.16,1,0.3,1)",
      }}>
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 0" }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: BORDER }} />
        </div>

        {/* Header */}
        <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid " + BORDER }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: WARM_BG, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
                {item.category === "Beverages" ? "🥤" : item.category === "Dairy" ? "🥛" : item.category === "Bakery" ? "🍞" : "📦"}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: BLACK }}>{item.name}</div>
                <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                  {item.category}{item.packSize ? ` · ${item.packSize}` : ""}
                  {item.barcode ? ` · ${item.barcode}` : ""}
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{ background: WARM_BG, border: "none", borderRadius: 20, width: 32, height: 32, cursor: "pointer", fontSize: 16, color: MUTED }}>✕</button>
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
              <div style={{ fontSize: 32, animation: "spin 1s linear infinite" }}>✦</div>
            </div>
          ) : intel ? (
            <div style={{ padding: "16px 20px 32px" }}>

              {/* Price overview cards */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
                {[
                  { label: "Lowest Price", value: intel.lowestPrice, color: GREEN },
                  { label: "Highest Price", value: intel.highestPrice, color: RED },
                  { label: "Average Price", value: intel.avgPrice, color: ORANGE },
                ].map(card => (
                  <div key={card.label} style={{ background: WARM_BG, borderRadius: 12, padding: "12px 10px", textAlign: "center" }}>
                    <div style={{ fontWeight: 700, fontSize: 18, color: card.color }}>€{card.value.toFixed(2)}</div>
                    <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>{card.label}</div>
                  </div>
                ))}
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", gap: 4, background: WARM_BG, borderRadius: 10, padding: 4, marginBottom: 20 }}>
                {[{ id: "history", label: "Price History" }, { id: "suppliers", label: "Suppliers & Prices" }].map(t => (
                  <button key={t.id} onClick={() => setTab(t.id as any)}
                    style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: tab === t.id ? 700 : 400, background: tab === t.id ? CARD_BG : "transparent", color: tab === t.id ? ORANGE : MUTED, boxShadow: tab === t.id ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Price History Tab */}
              {tab === "history" && (
                <div>
                  {intel.priceHistory.length > 0 ? (
                    <>
                      <MiniChart data={intel.priceHistory} />
                      <div style={{ marginTop: 16 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Price History (Oldest to Recent)</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 0, marginBottom: 6 }}>
                          {["Date", "Supplier", "Price", "Change"].map(h => (
                            <div key={h} style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: "uppercase", padding: "4px 0" }}>{h}</div>
                          ))}
                        </div>
                        {intel.priceHistory.map((entry, i) => (
                          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 0, padding: "10px 0", borderTop: "1px solid " + BORDER }}>
                            <div style={{ fontSize: 12, color: BLACK }}>{entry.date}</div>
                            <div style={{ fontSize: 12, color: BLACK }}>{entry.supplier}</div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: BLACK }}>€{entry.price.toFixed(2)}</div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: entry.change === undefined ? MUTED : entry.change > 0 ? RED : entry.change < 0 ? GREEN : MUTED }}>
                              {entry.change === undefined ? "—" : entry.change > 0 ? `+${entry.change}%` : `${entry.change}%`}
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Summary */}
                      <div style={{ marginTop: 16, background: WARM_BG, borderRadius: 12, padding: 16 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: BLACK, marginBottom: 10 }}>Summary</div>
                        {[
                          { label: "Lowest Price", value: `€${intel.lowestPrice.toFixed(2)}` },
                          { label: "Highest Price", value: `€${intel.highestPrice.toFixed(2)}` },
                          { label: "Average Price", value: `€${intel.avgPrice.toFixed(2)}` },
                          { label: "Price Change (Last 30 Days)", value: intel.priceChange30d > 0 ? `+${intel.priceChange30d}%` : `${intel.priceChange30d}%`, color: intel.priceChange30d > 0 ? RED : intel.priceChange30d < 0 ? GREEN : MUTED },
                        ].map(row => (
                          <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: "1px solid " + BORDER }}>
                            <span style={{ fontSize: 13, color: MUTED }}>{row.label}</span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: row.color || BLACK }}>{row.value}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div style={{ textAlign: "center", padding: "40px 20px", color: MUTED }}>
                      <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: BLACK, marginBottom: 6 }}>No price history yet</div>
                      <div style={{ fontSize: 13 }}>Scan supplier invoices to build price intelligence.</div>
                    </div>
                  )}
                </div>
              )}

              {/* Suppliers Tab */}
              {tab === "suppliers" && (
                <div>
                  {intel.supplierPrices.length > 0 ? (
                    <>
                      <div style={{ fontSize: 12, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>Supplier Comparison</div>
                      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 0, marginBottom: 6 }}>
                        {["Supplier", "Latest", "Updated", "Avg"].map(h => (
                          <div key={h} style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: "uppercase", padding: "4px 0" }}>{h}</div>
                        ))}
                      </div>
                      {intel.supplierPrices.map((s, i) => (
                        <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", alignItems: "center", padding: s.is_best ? "12px 4px" : "12px 0", borderTop: "1px solid " + BORDER, background: s.is_best ? "#f0fdf4" : "transparent", borderRadius: s.is_best ? 8 : 0, margin: s.is_best ? "4px -4px" : 0 }}>
                          <div style={{ fontSize: 13, fontWeight: s.is_best ? 700 : 400, color: BLACK }}>{s.supplier}</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: BLACK }}>€{s.latest_price.toFixed(2)}</div>
                          <div style={{ fontSize: 11, color: MUTED }}>{s.last_updated}</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: s.is_best ? GREEN : BLACK }}>€{s.avg_price.toFixed(2)}</div>
                        </div>
                      ))}
                      {intel.supplierPrices.find(s => s.is_best) && (
                        <div style={{ marginTop: 16, background: "#f0fdf4", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 20 }}>✅</span>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: GREEN }}>Best Deal</div>
                            <div style={{ fontSize: 12, color: MUTED }}>{intel.supplierPrices.find(s => s.is_best)?.supplier} offers the best average price (€{intel.supplierPrices.find(s => s.is_best)?.avg_price.toFixed(2)}) for this product.</div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ textAlign: "center", padding: "40px 20px", color: MUTED }}>
                      <div style={{ fontSize: 32, marginBottom: 12 }}>🏪</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: BLACK, marginBottom: 6 }}>No supplier data yet</div>
                      <div style={{ fontSize: 13 }}>Scan invoices from different suppliers to compare prices.</div>
                    </div>
                  )}
                </div>
              )}

              {/* AI Insight */}
              <div style={{ marginTop: 20, background: "#fffbeb", borderRadius: 12, padding: "14px 16px", display: "flex", gap: 10 }}>
                <span style={{ fontSize: 18 }}>💡</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#d97706", marginBottom: 4 }}>AI Insight</div>
                  <div style={{ fontSize: 13, color: BLACK }}>{intel.aiInsight}</div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>Actions</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  {[
                    { icon: "📞", label: "Call Supplier" },
                    { icon: "✉️", label: "Email Supplier" },
                    { icon: "📋", label: "Request Quote" },
                  ].map(action => (
                    <button key={action.label} style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 6, padding: "14px 8px", borderRadius: 12, border: "1px solid " + BORDER, background: CARD_BG, cursor: "pointer" }}>
                      <span style={{ fontSize: 24 }}>{action.icon}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: BLACK }}>{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Edit Price */}
              {editingPrice ? (
                <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
                  <input
                    type="number"
                    step="0.01"
                    value={newPrice}
                    onChange={e => setNewPrice(e.target.value)}
                    style={{ flex: 1, padding: "12px 16px", borderRadius: 10, border: "1px solid " + ORANGE, fontSize: 15, outline: "none", color: BLACK }}
                    autoFocus
                  />
                  <button onClick={() => { onEditPrice(parseFloat(newPrice)); setEditingPrice(false); onClose(); }}
                    style={{ padding: "12px 20px", borderRadius: 10, background: ORANGE, border: "none", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                    Save
                  </button>
                  <button onClick={() => setEditingPrice(false)}
                    style={{ padding: "12px 16px", borderRadius: 10, background: WARM_BG, border: "1px solid " + BORDER, color: MUTED, cursor: "pointer" }}>
                    Cancel
                  </button>
                </div>
              ) : (
                <button onClick={() => setEditingPrice(true)}
                  style={{ marginTop: 16, width: "100%", padding: "14px", borderRadius: 12, border: "1px solid " + BORDER, background: WARM_BG, color: BLACK, fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  ✏️ Edit Cost Price
                </button>
              )}

            </div>
          ) : null}
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ─── Main Scanner Page ────────────────────────────────────────────────────────

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
  const [selectedItem, setSelectedItem] = useState<ScannedItem | null>(null);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [invoiceInfo, setInvoiceInfo] = useState<{ supplier: string; total: number; count: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function getStore() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase.from("stores").select("id").eq("user_id", session.user.id).single();
      if (data) setStoreId(data.id);
    }
    getStore();
  }, []);

  const modes = [
    { id: "inventory", icon: "📦", title: "Delivery Note", desc: "Scan a delivery note to auto-add products to inventory" },
    { id: "supplier", icon: "📄", title: "Supplier Invoice", desc: "Scan an invoice to auto-fill supplier details" },
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
    setInvoiceInfo(null);
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
        const items = data.items || [];
        setScannedItems(items);
        setInvoiceInfo({
          supplier: data.supplier || "",
          total: data.total || 0,
          count: items.length,
        });
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

  function openProductDetail(item: ScannedItem, index: number) {
    setSelectedItem(item);
    setSelectedItemIndex(index);
  }

  function handleEditPrice(price: number) {
    if (selectedItemIndex !== null) {
      updateItem(selectedItemIndex, "price", price);
    }
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
    setInvoiceInfo(null);
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
          <div style={{ background: message.includes("Error") || message.includes("Could not") ? "#fef2f2" : "#f0fdf4", color: message.includes("Error") || message.includes("Could not") ? RED : GREEN, padding: "14px 18px", borderRadius: 10, marginBottom: 24, fontSize: 14, borderLeft: "3px solid " + (message.includes("Error") || message.includes("Could not") ? RED : GREEN), fontWeight: 500 }}>
            {message}
          </div>
        )}

        {/* STEP 0: Choose Mode */}
        {mode === "choose" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ color: MUTED, fontSize: 14, margin: "0 0 8px", fontWeight: 600 }}>What do you want to scan?</p>
            {modes.map(m => (
              <button key={m.id} onClick={() => setMode(m.id as Mode)} style={{ display: "flex", alignItems: "center", gap: 18, padding: "20px 24px", borderRadius: 14, background: CARD_BG, border: "1px solid " + BORDER, cursor: "pointer", textAlign: "left" as const }}>
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
                  <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={handleFileChange} style={{ display: "none" }} />
                </div>
                <div style={{ background: CARD_BG, borderRadius: 14, padding: "20px 24px", border: "1px solid " + BORDER }}>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: BLACK, margin: "0 0 12px" }}>Tips for best results</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {["Make sure the document is flat and well lit", "All text should be clearly visible", "Supports JPG, PNG, PDF formats", "Works best with clear, printed documents"].map((tip, i) => (
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
            {/* Invoice success banner */}
            {invoiceInfo && mode !== "supplier" && (
              <div style={{ background: CARD_BG, borderRadius: 16, padding: "24px", border: "1px solid " + BORDER, marginBottom: 16, textAlign: "center" }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 12px" }}>✅</div>
                <div style={{ fontWeight: 700, fontSize: 18, color: BLACK, marginBottom: 4 }}>Invoice uploaded successfully!</div>
                <div style={{ fontSize: 13, color: MUTED, marginBottom: 16 }}>AI extracted {invoiceInfo.count} items from the invoice.</div>
                <div style={{ background: WARM_BG, borderRadius: 12, padding: "16px", textAlign: "left" }}>
                  {invoiceInfo.supplier && <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}><span style={{ fontSize: 13, color: MUTED }}>Supplier</span><span style={{ fontSize: 13, fontWeight: 600, color: BLACK }}>{invoiceInfo.supplier}</span></div>}
                  {invoiceInfo.total > 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: "1px solid " + BORDER }}><span style={{ fontSize: 13, color: MUTED }}>Total Amount</span><span style={{ fontSize: 13, fontWeight: 700, color: ORANGE }}>€{invoiceInfo.total.toFixed(2)}</span></div>}
                </div>
              </div>
            )}

            <div style={{ background: CARD_BG, borderRadius: 16, padding: "24px", border: "1px solid " + BORDER, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: BLACK, margin: 0 }}>
                    {mode === "supplier" ? "Review Supplier Data" : `${scannedItems.length} Items Found`}
                  </h2>
                  <p style={{ color: MUTED, fontSize: 13, marginTop: 4 }}>
                    {mode !== "supplier" ? "Tap any product to view price history & suppliers" : "Check and edit if needed"}
                  </p>
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
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {/* Hint */}
                  <div style={{ background: "#fffbeb", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 12, color: "#92400e" }}>
                    💡 Tap on any product to view price history and suppliers
                  </div>
                  {scannedItems.map((item, i) => (
                    <div key={i}>
                      {/* Tappable product row */}
                      <div
                        onClick={() => openProductDetail(item, i)}
                        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderRadius: 12, background: WARM_BG, border: "1px solid " + BORDER, marginBottom: 8, cursor: "pointer" }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ width: 40, height: 40, borderRadius: 10, background: CARD_BG, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                            {item.category === "Beverages" ? "🥤" : item.category === "Dairy" ? "🥛" : item.category === "Bakery" ? "🍞" : "📦"}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14, color: BLACK }}>{item.name}</div>
                            <div style={{ fontSize: 12, color: MUTED }}>{item.packSize || item.category} · Qty: {item.quantity}</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ fontWeight: 700, fontSize: 15, color: BLACK }}>€{item.price.toFixed(2)}</div>
                          <div style={{ color: ORANGE, fontSize: 16 }}>›</div>
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

      {/* Product Detail Sheet */}
      {selectedItem && (
        <ProductDetailSheet
          item={selectedItem}
          storeId={storeId}
          onClose={() => { setSelectedItem(null); setSelectedItemIndex(null); }}
          onEditPrice={handleEditPrice}
        />
      )}
    </div>
  );
}