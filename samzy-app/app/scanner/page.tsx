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

// ─── Types ────────────────────────────────────────────────────────────────────

interface Product {
  name: string;
  packSize: string;
  qty: number;
  costSIVA: number;
  itemCost: number;
  itemWT: number;
  civacp: number;
  shopSem: number;
  shopCom: number;
  special: number;
  bigWholesale: number;
  restCom: number;
  ivaRate: number;
  category: string;
  priceChange?: number;
  priceDirection?: "up" | "down" | "same" | "new";
}

interface InvoiceInfo {
  supplier: string;
  date: string;
  invoiceNumber: string;
  total: number;
  count: number;
}

interface PriceHistoryEntry {
  date: string;
  supplier: string;
  price: number;
  change?: number;
}

interface SupplierPrice {
  supplier: string;
  latestPrice: number;
  lastUpdated: string;
  avgPrice: number;
  isBest: boolean;
}

// ─── Sparkline Chart ──────────────────────────────────────────────────────────

function SparklineChart({ data }: { data: PriceHistoryEntry[] }) {
  if (data.length < 2) return null;
  const prices = data.map(d => d.price);
  const min = Math.min(...prices) * 0.98;
  const max = Math.max(...prices) * 1.02;
  const range = max - min || 1;
  const W = 320; const H = 100;
  const pts = prices.map((p, i) => {
    const x = (i / (prices.length - 1)) * W;
    const y = H - ((p - min) / range) * (H - 20) - 10;
    return { x, y, p };
  });
  const pathD = pts.map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`).join(" ");

  return (
    <div style={{ background: WARM_BG, borderRadius: 12, padding: "12px 8px 4px", marginBottom: 16 }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 100 }}>
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ORANGE} stopOpacity="0.15" />
            <stop offset="100%" stopColor={ORANGE} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${pathD} L ${W} ${H} L 0 ${H} Z`} fill="url(#grad)" />
        <path d={pathD} fill="none" stroke={ORANGE} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((pt, i) => (
          <circle key={i} cx={pt.x} cy={pt.y} r="4" fill={ORANGE} stroke={CARD_BG} strokeWidth="2" />
        ))}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "0 4px" }}>
        {data.filter((_, i) => i === 0 || i === Math.floor(data.length / 2) || i === data.length - 1).map((d, i) => (
          <span key={i} style={{ fontSize: 10, color: MUTED }}>{d.date}</span>
        ))}
      </div>
    </div>
  );
}

// ─── Product Detail Screen ─────────────────────────────────────────────────────

function ProductDetailScreen({
  product,
  storeId,
  onBack,
  onEditPrice,
}: {
  product: Product;
  storeId: string | null;
  onBack: () => void;
  onEditPrice: (price: number) => void;
}) {
  const [tab, setTab] = useState<"history" | "suppliers">("history");
  const [history, setHistory] = useState<PriceHistoryEntry[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPrice, setEditingPrice] = useState(false);
  const [newPrice, setNewPrice] = useState(product.costSIVA.toFixed(2));

  const lowestPrice = history.length > 0 ? Math.min(...history.map(h => h.price)) : product.costSIVA;
  const highestPrice = history.length > 0 ? Math.max(...history.map(h => h.price)) : product.costSIVA;
  const avgPrice = history.length > 0 ? Math.round(history.reduce((s, h) => s + h.price, 0) / history.length * 100) / 100 : product.costSIVA;
  const priceChange30d = history.length > 1 ? Math.round((history[history.length - 1].price - history[history.length - 2].price) / history[history.length - 2].price * 1000) / 10 : 0;

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data: hist } = await supabase
          .from("price_history")
          .select("*")
          .ilike("product_name", `%${product.name.substring(0, 15)}%`)
          .order("scanned_at", { ascending: true })
          .limit(30);

        if (hist && hist.length > 0) {
          const entries: PriceHistoryEntry[] = hist.map((h: any, i: number) => ({
            date: new Date(h.scanned_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" }),
            supplier: h.supplier_name,
            price: h.item_cost || h.cost_siva,
            change: i > 0 ? Math.round(((h.item_cost || h.cost_siva) - (hist[i - 1].item_cost || hist[i - 1].cost_siva)) / (hist[i - 1].item_cost || hist[i - 1].cost_siva) * 1000) / 10 : undefined,
          }));
          setHistory(entries);

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
          const supList: SupplierPrice[] = Object.entries(latestPerSupplier).map(([name, h]) => ({
            supplier: name,
            latestPrice: h.item_cost || h.cost_siva,
            lastUpdated: new Date(h.scanned_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
            avgPrice: Math.round(allPerSupplier[name].reduce((a: number, b: number) => a + b, 0) / allPerSupplier[name].length * 100) / 100,
            isBest: false,
          }));
          const minAvg = Math.min(...supList.map(s => s.avgPrice));
          supList.forEach(s => { s.isBest = s.avgPrice === minAvg; });
          supList.sort((a, b) => a.avgPrice - b.avgPrice);
          setSuppliers(supList);
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    }
    load();
  }, [product.name]);

  const aiInsight = history.length > 0
    ? product.costSIVA > avgPrice * 1.05
      ? `Current price (€${product.costSIVA.toFixed(2)}) is ${Math.round((product.costSIVA / avgPrice - 1) * 100)}% higher than the average price (€${avgPrice.toFixed(2)}).`
      : product.costSIVA < avgPrice * 0.95
        ? `Current price (€${product.costSIVA.toFixed(2)}) is ${Math.round((1 - product.costSIVA / avgPrice) * 100)}% below average — great deal!`
        : `Current price (€${product.costSIVA.toFixed(2)}) is in line with historical average (€${avgPrice.toFixed(2)}).`
    : "No price history yet. Apply this invoice to start tracking.";

  return (
    <div style={{ minHeight: "100vh", background: WARM_BG, fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" }}>
      {/* Header */}
      <div style={{ background: CARD_BG, borderBottom: "1px solid " + BORDER, padding: "0 20px", height: 56, display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: BLACK, padding: 0, display: "flex", alignItems: "center" }}>←</button>
        <span style={{ fontWeight: 700, fontSize: 16, color: BLACK }}>Product Details</span>
      </div>

      <div style={{ padding: "20px 20px 100px" }}>
        {/* Product header card */}
        <div style={{ background: CARD_BG, borderRadius: 16, padding: "20px", border: "1px solid " + BORDER, marginBottom: 20, display: "flex", gap: 16, alignItems: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: WARM_BG, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0 }}>
            {product.category === "Beverages" ? "🥤" : product.category === "Dairy" ? "🥛" : product.category === "Bakery" ? "🍞" : product.category === "Cleaning" ? "🧴" : "📦"}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: BLACK }}>{product.name}</div>
            <div style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>Category: {product.category}</div>
            <div style={{ fontSize: 13, color: MUTED }}>{product.packSize}</div>
          </div>
        </div>

        {/* Price overview */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
          <div style={{ background: CARD_BG, borderRadius: 14, padding: "14px 10px", textAlign: "center", border: "1px solid " + BORDER }}>
            <div style={{ fontWeight: 800, fontSize: 20, color: GREEN }}>€{lowestPrice.toFixed(2)}</div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 3 }}>Lowest Price</div>
          </div>
          <div style={{ background: CARD_BG, borderRadius: 14, padding: "14px 10px", textAlign: "center", border: "1px solid " + BORDER }}>
            <div style={{ fontWeight: 800, fontSize: 20, color: RED }}>€{highestPrice.toFixed(2)}</div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 3 }}>Highest Price</div>
          </div>
          <div style={{ background: CARD_BG, borderRadius: 14, padding: "14px 10px", textAlign: "center", border: "1px solid " + BORDER }}>
            <div style={{ fontWeight: 800, fontSize: 20, color: ORANGE }}>€{avgPrice.toFixed(2)}</div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 3 }}>Average Price</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", background: CARD_BG, borderRadius: 12, padding: 4, marginBottom: 20, border: "1px solid " + BORDER }}>
          {[{ id: "history", label: "Price History" }, { id: "suppliers", label: "Suppliers & Prices" }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              style={{ flex: 1, padding: "10px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 14, fontWeight: tab === t.id ? 700 : 400, background: tab === t.id ? ORANGE : "transparent", color: tab === t.id ? "#fff" : MUTED, transition: "all 0.2s" }}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: MUTED }}>Loading...</div>
        ) : (
          <>
            {/* Price History Tab */}
            {tab === "history" && (
              <div>
                {history.length > 1 && <SparklineChart data={history} />}

                {history.length > 0 ? (
                  <>
                    <div style={{ background: CARD_BG, borderRadius: 14, border: "1px solid " + BORDER, overflow: "hidden", marginBottom: 16 }}>
                      <div style={{ padding: "14px 16px", borderBottom: "1px solid " + BORDER }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: BLACK }}>Price History (Oldest to Recent)</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", padding: "8px 16px", background: WARM_BG }}>
                        {["Date", "Supplier", "Price", "Change"].map(h => (
                          <span key={h} style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: "uppercase" as const }}>{h}</span>
                        ))}
                      </div>
                      {history.map((entry, i) => (
                        <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", padding: "12px 16px", borderTop: "1px solid " + BORDER }}>
                          <span style={{ fontSize: 12, color: BLACK }}>{entry.date}</span>
                          <span style={{ fontSize: 12, color: BLACK }}>{entry.supplier}</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: BLACK }}>€{entry.price.toFixed(2)}</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: entry.change === undefined ? MUTED : entry.change > 0 ? RED : entry.change < 0 ? GREEN : MUTED }}>
                            {entry.change === undefined ? "—" : entry.change > 0 ? `+${entry.change}%` : `${entry.change}%`}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Summary */}
                    <div style={{ background: CARD_BG, borderRadius: 14, border: "1px solid " + BORDER, overflow: "hidden", marginBottom: 16 }}>
                      <div style={{ padding: "14px 16px", borderBottom: "1px solid " + BORDER }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: BLACK }}>Summary</span>
                      </div>
                      {[
                        { label: "Lowest Price", value: `€${lowestPrice.toFixed(2)}`, color: BLACK },
                        { label: "Highest Price", value: `€${highestPrice.toFixed(2)}`, color: BLACK },
                        { label: "Average Price", value: `€${avgPrice.toFixed(2)}`, color: BLACK },
                        { label: "Price Change (Last 30 Days)", value: priceChange30d > 0 ? `+${priceChange30d}%` : `${priceChange30d}%`, color: priceChange30d > 0 ? RED : priceChange30d < 0 ? GREEN : MUTED },
                      ].map((row, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", borderTop: i > 0 ? "1px solid " + BORDER : "none" }}>
                          <span style={{ fontSize: 13, color: MUTED }}>{row.label}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: row.color }}>{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: "center", padding: "40px 20px", background: CARD_BG, borderRadius: 14, border: "1px solid " + BORDER }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
                    <div style={{ fontWeight: 600, fontSize: 15, color: BLACK, marginBottom: 6 }}>No price history yet</div>
                    <div style={{ fontSize: 13, color: MUTED }}>Apply this invoice to start tracking price history.</div>
                  </div>
                )}
              </div>
            )}

            {/* Suppliers Tab */}
            {tab === "suppliers" && (
              <div>
                {suppliers.length > 0 ? (
                  <>
                    <div style={{ background: CARD_BG, borderRadius: 14, border: "1px solid " + BORDER, overflow: "hidden", marginBottom: 16 }}>
                      <div style={{ padding: "14px 16px", borderBottom: "1px solid " + BORDER }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: BLACK }}>Supplier Comparison</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "8px 16px", background: WARM_BG }}>
                        {["Supplier", "Latest", "Updated", "Avg"].map(h => (
                          <span key={h} style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: "uppercase" as const }}>{h}</span>
                        ))}
                      </div>
                      {suppliers.map((s, i) => (
                        <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "12px 16px", borderTop: "1px solid " + BORDER, background: s.isBest ? "#f0fdf4" : CARD_BG }}>
                          <span style={{ fontSize: 13, fontWeight: s.isBest ? 700 : 400, color: s.isBest ? GREEN : BLACK }}>{s.supplier}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: BLACK }}>€{s.latestPrice.toFixed(2)}</span>
                          <span style={{ fontSize: 11, color: MUTED }}>{s.lastUpdated}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: s.isBest ? GREEN : BLACK }}>€{s.avgPrice.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    {suppliers.find(s => s.isBest) && (
                      <div style={{ background: "#f0fdf4", borderRadius: 14, padding: "16px", display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 16, border: "1px solid #bbf7d0" }}>
                        <span style={{ fontSize: 24 }}>✅</span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: GREEN }}>Best Deal</div>
                          <div style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>
                            {suppliers.find(s => s.isBest)?.supplier} offers the best average price (€{suppliers.find(s => s.isBest)?.avgPrice.toFixed(2)}) for this product.
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ background: CARD_BG, borderRadius: 14, border: "1px solid " + BORDER, overflow: "hidden", marginBottom: 16 }}>
                      <div style={{ padding: "14px 16px", borderBottom: "1px solid " + BORDER }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: BLACK }}>Actions</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0 }}>
                        {[{ icon: "📞", label: "Call Supplier" }, { icon: "✉️", label: "Email Supplier" }, { icon: "📋", label: "Request Quote" }].map((a, i) => (
                          <button key={a.label} style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 8, padding: "20px 8px", border: "none", background: CARD_BG, cursor: "pointer", borderLeft: i > 0 ? "1px solid " + BORDER : "none" }}>
                            <span style={{ fontSize: 28 }}>{a.icon}</span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: BLACK }}>{a.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: "center", padding: "40px 20px", background: CARD_BG, borderRadius: 14, border: "1px solid " + BORDER }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🏪</div>
                    <div style={{ fontWeight: 600, fontSize: 15, color: BLACK, marginBottom: 6 }}>No supplier data yet</div>
                    <div style={{ fontSize: 13, color: MUTED }}>Apply invoices from multiple suppliers to compare.</div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* AI Insight */}
        <div style={{ background: "#fffbeb", borderRadius: 14, padding: "16px", display: "flex", gap: 12, marginBottom: 16, border: "1px solid #fde68a" }}>
          <span style={{ fontSize: 20 }}>💡</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#d97706", marginBottom: 4 }}>AI Insight</div>
            <div style={{ fontSize: 13, color: BLACK }}>{aiInsight}</div>
          </div>
        </div>

        {/* Edit Cost Price */}
        {editingPrice ? (
          <div style={{ display: "flex", gap: 10 }}>
            <input type="number" step="0.01" value={newPrice} onChange={e => setNewPrice(e.target.value)} autoFocus
              style={{ flex: 1, padding: "14px 16px", borderRadius: 12, border: "2px solid " + ORANGE, fontSize: 16, outline: "none", color: BLACK, background: CARD_BG }} />
            <button onClick={() => { onEditPrice(parseFloat(newPrice)); setEditingPrice(false); onBack(); }}
              style={{ padding: "14px 20px", borderRadius: 12, background: ORANGE, border: "none", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Save</button>
            <button onClick={() => setEditingPrice(false)}
              style={{ padding: "14px 16px", borderRadius: 12, background: WARM_BG, border: "1px solid " + BORDER, color: MUTED, cursor: "pointer" }}>Cancel</button>
          </div>
        ) : (
          <button onClick={() => setEditingPrice(true)}
            style={{ width: "100%", padding: "16px", borderRadius: 14, border: "1px solid " + BORDER, background: CARD_BG, color: BLACK, fontWeight: 600, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            ✏️ Edit Cost Price
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Action Sheet ─────────────────────────────────────────────────────────────

function ActionSheet({ product, onClose, onViewHistory, onViewSuppliers, onEditPrice }: {
  product: Product;
  onClose: () => void;
  onViewHistory: () => void;
  onViewSuppliers: () => void;
  onEditPrice: () => void;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "flex-end" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} onClick={onClose} />
      <div style={{ position: "relative", width: "100%", background: WARM_BG, borderRadius: "20px 20px 0 0", padding: "8px 0 40px", animation: "slideUp 0.25s ease" }}>
        <div style={{ width: 40, height: 4, background: BORDER, borderRadius: 2, margin: "8px auto 20px" }} />
        <div style={{ padding: "0 20px 16px", borderBottom: "1px solid " + BORDER, marginBottom: 8 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: CARD_BG, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>📦</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: BLACK }}>{product.name}</div>
              <div style={{ fontSize: 12, color: MUTED }}>{product.packSize}</div>
            </div>
          </div>
        </div>
        {[
          { icon: "📊", label: "View Price History", sub: "See oldest to recent prices", action: onViewHistory },
          { icon: "🏪", label: "View Suppliers & Prices", sub: "Compare suppliers and their prices", action: onViewSuppliers },
          { icon: "✏️", label: "Edit Cost Price", sub: "Update the price for this item", action: onEditPrice },
        ].map((item, i) => (
          <button key={i} onClick={item.action} style={{ width: "100%", display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", background: "none", border: "none", cursor: "pointer", textAlign: "left" as const, borderBottom: i < 2 ? "1px solid " + BORDER : "none" }}>
            <span style={{ fontSize: 22 }}>{item.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 15, color: BLACK }}>{item.label}</div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 1 }}>{item.sub}</div>
            </div>
            <span style={{ color: MUTED, fontSize: 16 }}>›</span>
          </button>
        ))}
        <div style={{ padding: "8px 20px 0" }}>
          <button onClick={onClose} style={{ width: "100%", padding: "16px", borderRadius: 14, background: CARD_BG, border: "1px solid " + BORDER, fontWeight: 700, fontSize: 15, color: MUTED, cursor: "pointer" }}>Cancel</button>
        </div>
      </div>
      <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
    </div>
  );
}

// ─── Main Scanner Page ─────────────────────────────────────────────────────────

export default function Scanner() {
  const isMobile = useIsMobile();
  const [step, setStep] = useState<"upload" | "success" | "items" | "detail">("upload");
  const [scanning, setScanning] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [invoiceInfo, setInvoiceInfo] = useState<InvoiceInfo | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [actionProduct, setActionProduct] = useState<Product | null>(null);
  const [actionIndex, setActionIndex] = useState<number | null>(null);
  const [detailTab, setDetailTab] = useState<"history" | "suppliers">("history");
  const [search, setSearch] = useState("");
  const [storeId, setStoreId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");
  const longPressTimer = useRef<any>(null);
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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => scanInvoice(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function scanInvoice(imageData: string) {
    setScanning(true);
    setMessage("");
    try {
      const res = await fetch("/api/pricing-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageData, transportPct: 4.15 }),
      });
      const data = await res.json();
      if (data.error) { setMessage(data.error); setScanning(false); return; }

      // Compare with history for price direction
      const enriched = await Promise.all((data.products || []).map(async (p: any) => {
        let priceDirection: Product["priceDirection"] = "new";
        let priceChange = 0;
        if (storeId) {
          const { data: last } = await supabase
            .from("price_history")
            .select("item_cost")
            .ilike("product_name", `%${p.name?.substring(0, 15)}%`)
            .order("scanned_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (last) {
            const cost = p.itemCost || p.costSIVA;
            const diff = cost - last.item_cost;
            priceChange = Math.round(diff / last.item_cost * 1000) / 10;
            priceDirection = Math.abs(diff) < 0.001 ? "same" : diff > 0 ? "up" : "down";
          }
        }
        return { ...p, priceDirection, priceChange, category: p.category || "Other" };
      }));

      setProducts(enriched);
      setInvoiceInfo({
        supplier: data.supplier || data.supplierName || "Unknown Supplier",
        date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
        invoiceNumber: `INV-${Date.now().toString().slice(-4)}`,
        total: data.total || enriched.reduce((s: number, p: any) => s + (p.costSIVA * p.qty), 0),
        count: enriched.length,
      });
      setStep("success");
    } catch (err: any) {
      setMessage("Could not scan invoice. Please try again.");
    }
    setScanning(false);
  }

  async function applyPricing() {
    if (!storeId || products.length === 0) return;
    setSaving(true);
    try {
      const supplier = invoiceInfo?.supplier || "Unknown Supplier";

      // Save to price_history
      await supabase.from("price_history").insert(
        products.map(p => ({
          store_id: storeId,
          product_name: p.name,
          supplier_name: supplier,
          cost_siva: p.costSIVA,
          item_cost: p.itemCost,
          itemwt: p.itemWT,
          civacp: p.civacp,
          shop_sem: p.shopSem,
          shop_com: p.shopCom,
          special: p.special,
          big_wholesale: p.bigWholesale,
          rest_com: p.restCom,
          transport_pct: 4.15,
          iva_pct: p.ivaRate,
        }))
      );

      // Upsert inventory
      for (const p of products) {
        const { data: existing } = await supabase
          .from("products")
          .select("id, stock_quantity")
          .eq("store_id", storeId)
          .ilike("name", `%${p.name.substring(0, 15)}%`)
          .maybeSingle();

        if (existing) {
          await supabase.from("products").update({
            price: p.civacp,
            stock_quantity: (existing.stock_quantity || 0) + p.qty,
          }).eq("id", existing.id);
        } else {
          await supabase.from("products").insert({
            store_id: storeId,
            name: p.name,
            category: p.category || "Other",
            stock_quantity: p.qty,
            price: p.civacp,
            reorder_threshold: 10,
          });
        }
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      setMessage(`✅ ${products.length} products updated in inventory!`);
    } catch (err) {
      setMessage("Error applying prices. Please try again.");
    }
    setSaving(false);
  }

  function handleLongPressStart(product: Product, index: number) {
    longPressTimer.current = setTimeout(() => {
      setActionProduct(product);
      setActionIndex(index);
    }, 500);
  }

  function handleLongPressEnd() {
    clearTimeout(longPressTimer.current);
  }

  function handleProductTap(product: Product, index: number) {
    setSelectedProduct(product);
    setSelectedIndex(index);
    setDetailTab("history");
    setStep("detail");
  }

  function handleEditPrice(price: number) {
    if (selectedIndex !== null) {
      setProducts(prev => prev.map((p, i) => i === selectedIndex ? { ...p, costSIVA: price, itemCost: price } : p));
    }
    if (actionIndex !== null) {
      setProducts(prev => prev.map((p, i) => i === actionIndex ? { ...p, costSIVA: price, itemCost: price } : p));
    }
  }

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const priceIncreases = products.filter(p => p.priceDirection === "up").length;
  const priceDrops = products.filter(p => p.priceDirection === "down").length;

  // ── Product Detail Screen ──
  if (step === "detail" && selectedProduct) {
    return (
      <ProductDetailScreen
        product={selectedProduct}
        storeId={storeId}
        onBack={() => setStep("items")}
        onEditPrice={handleEditPrice}
      />
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: WARM_BG, fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" }}>
      {/* Header */}
      <header style={{ background: CARD_BG, borderBottom: "1px solid " + BORDER, padding: isMobile ? "0 20px" : "0 40px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {step !== "upload" && (
            <button onClick={() => setStep(step === "items" ? "success" : step === "success" ? "upload" : "upload")}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: BLACK, marginRight: 4, padding: 0 }}>←</button>
          )}
          <Image src="/logo.png" alt="Samzy" width={28} height={28} />
          <span style={{ fontWeight: 700, fontSize: 16, color: BLACK }}>Samzy</span>
          <span style={{ background: ORANGE, color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6 }}>Scanner</span>
        </div>
        <a href="/" style={{ color: MUTED, fontSize: 13, textDecoration: "none" }}>Dashboard</a>
      </header>

      {/* ── UPLOAD SCREEN ── */}
      {step === "upload" && (
        <div style={{ maxWidth: 480, margin: "0 auto", padding: isMobile ? "32px 20px" : "48px 24px" }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: BLACK, margin: "0 0 8px" }}>Smart Scanner</h1>
          <p style={{ color: MUTED, fontSize: 14, marginBottom: 36 }}>Upload a supplier invoice — AI extracts products, calculates selling prices and updates inventory</p>

          {message && (
            <div style={{ background: "#fef2f2", color: RED, padding: "14px 18px", borderRadius: 12, marginBottom: 20, fontSize: 14, border: "1px solid #fecaca" }}>{message}</div>
          )}

          {scanning ? (
            <div style={{ background: CARD_BG, borderRadius: 20, padding: "48px 24px", textAlign: "center", border: "1px solid " + BORDER }}>
              <div style={{ fontSize: 48, marginBottom: 16, animation: "pulse 1.5s infinite" }}>🤖</div>
              <div style={{ fontWeight: 700, fontSize: 18, color: BLACK, marginBottom: 8 }}>AI is reading your invoice...</div>
              <div style={{ color: MUTED, fontSize: 14 }}>Extracting products, prices and quantities</div>
            </div>
          ) : (
            <>
              <div style={{ background: CARD_BG, borderRadius: 20, border: "2px dashed " + BORDER, padding: "48px 24px", textAlign: "center", marginBottom: 20 }}>
                <div style={{ fontSize: 56, marginBottom: 16 }}>📄</div>
                <div style={{ fontWeight: 700, fontSize: 18, color: BLACK, marginBottom: 8 }}>Upload Supplier Invoice</div>
                <div style={{ color: MUTED, fontSize: 14, marginBottom: 28 }}>PDF or image — AI does the rest</div>
                <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" as const }}>
                  <button onClick={() => cameraInputRef.current?.click()}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 24px", borderRadius: 12, background: ORANGE, border: "none", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
                    📷 Take Photo
                  </button>
                  <button onClick={() => fileInputRef.current?.click()}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 24px", borderRadius: 12, background: CARD_BG, border: "1px solid " + BORDER, color: BLACK, fontWeight: 600, fontSize: 15, cursor: "pointer" }}>
                    📁 Upload File
                  </button>
                </div>
                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} style={{ display: "none" }} />
                <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={handleFileChange} style={{ display: "none" }} />
              </div>

              <div style={{ background: CARD_BG, borderRadius: 16, padding: "20px 24px", border: "1px solid " + BORDER }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: BLACK, marginBottom: 12 }}>What SAMZY does automatically:</div>
                {[
                  "Extracts all products, quantities and prices",
                  "Calculates VAT, transport and selling prices",
                  "Detects price changes vs previous invoices",
                  "Updates inventory and price history",
                  "Compares supplier prices for best deals",
                ].map((tip, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                    <span style={{ color: ORANGE, fontWeight: 700, fontSize: 14 }}>✓</span>
                    <span style={{ fontSize: 13, color: MUTED }}>{tip}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── SUCCESS SCREEN ── */}
      {step === "success" && invoiceInfo && (
        <div style={{ maxWidth: 480, margin: "0 auto", padding: isMobile ? "32px 20px" : "48px 24px" }}>
          <div style={{ background: CARD_BG, borderRadius: 20, padding: "32px 24px", border: "1px solid " + BORDER, marginBottom: 20 }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, margin: "0 auto 16px" }}>✅</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: BLACK, textAlign: "center", margin: "0 0 8px" }}>Invoice uploaded successfully!</h2>
            <p style={{ color: MUTED, fontSize: 14, textAlign: "center", margin: "0 0 24px" }}>AI extracted {invoiceInfo.count} items from the invoice.</p>

            <div style={{ background: WARM_BG, borderRadius: 14, padding: "16px", marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                <span style={{ fontSize: 13, color: MUTED }}>Invoice #</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: BLACK }}>{invoiceInfo.invoiceNumber}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: "1px solid " + BORDER }}>
                <span style={{ fontSize: 13, color: MUTED }}>Supplier</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: BLACK }}>{invoiceInfo.supplier}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: "1px solid " + BORDER }}>
                <span style={{ fontSize: 13, color: MUTED }}>Date</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: BLACK }}>{invoiceInfo.date}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: "1px solid " + BORDER }}>
                <span style={{ fontSize: 13, color: MUTED }}>Total Amount</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: ORANGE }}>€{invoiceInfo.total.toFixed(2)}</span>
              </div>
            </div>

            {(priceIncreases > 0 || priceDrops > 0) && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                {priceIncreases > 0 && (
                  <div style={{ background: "#fef2f2", borderRadius: 12, padding: "12px", textAlign: "center", border: "1px solid #fecaca" }}>
                    <div style={{ fontWeight: 800, fontSize: 22, color: RED }}>↑{priceIncreases}</div>
                    <div style={{ fontSize: 11, color: RED }}>Price Increases</div>
                  </div>
                )}
                {priceDrops > 0 && (
                  <div style={{ background: "#f0fdf4", borderRadius: 12, padding: "12px", textAlign: "center", border: "1px solid #bbf7d0" }}>
                    <div style={{ fontWeight: 800, fontSize: 22, color: GREEN }}>↓{priceDrops}</div>
                    <div style={{ fontSize: 11, color: GREEN }}>Price Drops</div>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setStep("items")}
                style={{ flex: 1, padding: "14px", borderRadius: 14, background: WARM_BG, border: "1px solid " + BORDER, fontWeight: 600, fontSize: 15, color: BLACK, cursor: "pointer" }}>
                View Items
              </button>
              <button onClick={applyPricing} disabled={saving || saved}
                style={{ flex: 1, padding: "14px", borderRadius: 14, background: saved ? GREEN : ORANGE, border: "none", fontWeight: 700, fontSize: 15, color: "#fff", cursor: "pointer" }}>
                {saving ? "Saving..." : saved ? "✓ Done" : "Apply Pricing"}
              </button>
            </div>
          </div>

          {message && (
            <div style={{ background: message.includes("✅") ? "#f0fdf4" : "#fef2f2", color: message.includes("✅") ? GREEN : RED, padding: "14px 18px", borderRadius: 12, fontSize: 14, border: `1px solid ${message.includes("✅") ? "#bbf7d0" : "#fecaca"}` }}>
              {message}
            </div>
          )}
        </div>
      )}

      {/* ── ITEMS SCREEN ── */}
      {step === "items" && (
        <div style={{ maxWidth: 480, margin: "0 auto", padding: isMobile ? "20px 16px 100px" : "32px 24px 100px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 18, color: BLACK }}>{invoiceInfo?.supplier}</div>
              <div style={{ fontSize: 13, color: MUTED }}>{products.length} items · {invoiceInfo?.date}</div>
            </div>
            <button onClick={applyPricing} disabled={saving || saved}
              style={{ padding: "10px 18px", borderRadius: 12, background: saved ? GREEN : ORANGE, border: "none", fontWeight: 700, fontSize: 13, color: "#fff", cursor: "pointer" }}>
              {saving ? "..." : saved ? "✓ Done" : "Apply All"}
            </button>
          </div>

          {/* Search */}
          <div style={{ position: "relative", marginBottom: 16 }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: MUTED }}>🔍</span>
            <input
              type="text"
              placeholder="Search items..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: "100%", padding: "12px 12px 12px 44px", borderRadius: 12, border: "1px solid " + BORDER, fontSize: 14, outline: "none", background: CARD_BG, boxSizing: "border-box" as const, color: BLACK }}
            />
          </div>

          <div style={{ fontSize: 12, color: MUTED, marginBottom: 12, padding: "0 4px" }}>
            💡 Tap any product to view price history and suppliers
          </div>

          {/* Product list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filteredProducts.map((p, i) => (
              <div
                key={i}
                onClick={() => handleProductTap(p, products.indexOf(p))}
                onTouchStart={() => handleLongPressStart(p, products.indexOf(p))}
                onTouchEnd={handleLongPressEnd}
                onMouseDown={() => handleLongPressStart(p, products.indexOf(p))}
                onMouseUp={handleLongPressEnd}
                style={{ background: CARD_BG, borderRadius: 14, padding: "14px 16px", border: "1px solid " + BORDER, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
              >
                <div style={{ display: "flex", gap: 12, alignItems: "center", flex: 1 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: WARM_BG, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                    {p.category === "Beverages" ? "🥤" : p.category === "Dairy" ? "🥛" : p.category === "Cleaning" ? "🧴" : "📦"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: BLACK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{p.packSize} · Qty: {p.qty}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: BLACK }}>€{p.costSIVA.toFixed(2)}</div>
                    {p.priceDirection === "up" && <div style={{ fontSize: 10, fontWeight: 700, color: RED }}>↑{p.priceChange}%</div>}
                    {p.priceDirection === "down" && <div style={{ fontSize: 10, fontWeight: 700, color: GREEN }}>↓{Math.abs(p.priceChange || 0)}%</div>}
                    {p.priceDirection === "new" && <div style={{ fontSize: 10, fontWeight: 700, color: ORANGE }}>NEW</div>}
                  </div>
                  <span style={{ color: MUTED, fontSize: 18 }}>›</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Sheet */}
      {actionProduct && (
        <ActionSheet
          product={actionProduct}
          onClose={() => { setActionProduct(null); setActionIndex(null); }}
          onViewHistory={() => { setSelectedProduct(actionProduct); setSelectedIndex(actionIndex); setDetailTab("history"); setStep("detail"); setActionProduct(null); }}
          onViewSuppliers={() => { setSelectedProduct(actionProduct); setSelectedIndex(actionIndex); setDetailTab("suppliers"); setStep("detail"); setActionProduct(null); }}
          onEditPrice={() => { setSelectedProduct(actionProduct); setSelectedIndex(actionIndex); setStep("detail"); setActionProduct(null); }}
        />
      )}

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>
    </div>
  );
}