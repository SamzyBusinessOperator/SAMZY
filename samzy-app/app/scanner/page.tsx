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
  costSIVA: number;   // invoice price per case excl. VAT
  itemCost: number;   // working cost (used in all formulas)
  itemWT: number;     // itemCost × (1 + transport%)
  civacp: number;     // itemWT × (1 + iva%)
  shopSem: number;    // itemWT × (1 + shopSem%)
  shopCom: number;    // civacp × (1 + shopCom%)
  special: number;    // civacp × (1 + special%)
  bigWholesale: number;
  restCom: number;
  ivaRate: number;
  shopSemPct: number;
  shopComPct: number;
  specialPct: number;
  bigWholesalePct: number;
  restComPct: number;
  transportPct: number;
  category: string;
  totalUnits: number;
  totalCost: number;
  priceChange?: number;
  priceDirection?: "up" | "down" | "same" | "new";
}


interface SaleItem {
  name: string;
  quantity: number;
  price: number;
  category: string;
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

// ─── Formula engine ───────────────────────────────────────────────────────────

function calcAll(p: Partial<Product> & { itemCost: number; ivaRate: number; transportPct: number; shopSemPct: number; shopComPct: number; specialPct: number; bigWholesalePct: number; restComPct: number; qty: number; packSize: string }): Partial<Product> {
  const itemWT      = p.itemCost * (1 + p.transportPct);
  const civacp      = itemWT    * (1 + p.ivaRate);
  const shopSem     = itemWT    * (1 + p.shopSemPct);
  const shopCom     = civacp   * (1 + p.shopComPct);
  const special     = civacp   * (1 + p.specialPct);
  const bigWholesale = civacp  * (1 + p.bigWholesalePct);
  const restCom     = civacp   * (1 + p.restComPct);
  const units       = getUnits(p.packSize) * p.qty;
  return { itemWT, civacp, shopSem, shopCom, special, bigWholesale, restCom, totalUnits: units, totalCost: r2(p.itemCost * p.qty) };
}

function r2(n: number) { return Math.round(n * 100) / 100; }
function r3(n: number) { return Math.round(n * 1000) / 1000; }
function getUnits(ps: string) { const m = ps.match(/^(\d+)\s*[x×*]/i); return m ? parseInt(m[1]) : 1; }

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ data }: { data: PriceHistoryEntry[] }) {
  if (data.length < 2) return <div style={{ color: MUTED, fontSize: 12, padding: "20px 0", textAlign: "center" }}>No chart data yet</div>;
  const prices = data.map(d => d.price);
  const min = Math.min(...prices) * 0.97;
  const max = Math.max(...prices) * 1.03;
  const range = max - min || 1;
  const W = 300; const H = 90;
  const pts = prices.map((p, i) => ({ x: (i / (prices.length - 1)) * W, y: H - ((p - min) / range) * (H - 20) - 10 }));
  const pathD = pts.map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`).join(" ");
  return (
    <div style={{ background: WARM_BG, borderRadius: 12, padding: "12px 8px 4px", marginBottom: 16 }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 90 }}>
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ORANGE} stopOpacity="0.2" />
            <stop offset="100%" stopColor={ORANGE} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${pathD} L ${W} ${H} L 0 ${H} Z`} fill="url(#g)" />
        <path d={pathD} fill="none" stroke={ORANGE} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((pt, i) => <circle key={i} cx={pt.x} cy={pt.y} r="4" fill={ORANGE} stroke={CARD_BG} strokeWidth="2" />)}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "0 4px" }}>
        <span style={{ fontSize: 10, color: MUTED }}>{data[0]?.date}</span>
        <span style={{ fontSize: 10, color: MUTED }}>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}

// ─── Product Detail Sheet ─────────────────────────────────────────────────────

function ProductSheet({ product, onClose, onUpdate }: {
  product: Product;
  onClose: () => void;
  onUpdate: (updated: Product) => void;
}) {
  const [tab, setTab] = useState<"pricing" | "history" | "suppliers">("pricing");
  const [history, setHistory] = useState<PriceHistoryEntry[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [editField, setEditField] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");
  const [p, setP] = useState(product);

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
          const latestPer: Record<string, any> = {};
          const allPer: Record<string, number[]> = {};
          for (const h of hist) {
            const cost = h.item_cost || h.cost_siva;
            if (!latestPer[h.supplier_name] || h.scanned_at > latestPer[h.supplier_name].scanned_at) latestPer[h.supplier_name] = h;
            if (!allPer[h.supplier_name]) allPer[h.supplier_name] = [];
            allPer[h.supplier_name].push(cost);
          }
          const sups: SupplierPrice[] = Object.entries(latestPer).map(([name, h]) => ({
            supplier: name,
            latestPrice: h.item_cost || h.cost_siva,
            lastUpdated: new Date(h.scanned_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
            avgPrice: r2(allPer[name].reduce((a: number, b: number) => a + b, 0) / allPer[name].length),
            isBest: false,
          }));
          const minA = Math.min(...sups.map(s => s.avgPrice));
          sups.forEach(s => { s.isBest = s.avgPrice === minA; });
          sups.sort((a, b) => a.avgPrice - b.avgPrice);
          setSuppliers(sups);
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    }
    load();
  }, [product.name]);

  function handleEdit(field: string, val: string) {
    const num = parseFloat(val);
    if (isNaN(num)) return;
    const updated = { ...p, [field]: field.endsWith("Pct") ? num / 100 : num };
    // Recalculate prices if a rate/cost field changed
    const recalcFields = ["itemCost", "ivaRate", "transportPct", "shopSemPct", "shopComPct", "specialPct", "bigWholesalePct", "restComPct"];
    if (recalcFields.includes(field)) {
      const calced = calcAll({ ...updated });
      Object.assign(updated, calced);
    }
    // Back-calculate markup % if a selling price is edited directly
    if (field === "shopSem" && updated.itemWT > 0) updated.shopSemPct = r2((num / updated.itemWT) - 1);
    if (field === "civacp" && updated.itemWT > 0) updated.ivaRate = r2((num / updated.itemWT) - 1);
    if (field === "shopCom" && updated.civacp > 0) updated.shopComPct = r2((num / updated.civacp) - 1);
    if (field === "special" && updated.civacp > 0) updated.specialPct = r2((num / updated.civacp) - 1);
    if (field === "bigWholesale" && updated.civacp > 0) updated.bigWholesalePct = r2((num / updated.civacp) - 1);
    if (field === "restCom" && updated.civacp > 0) updated.restComPct = r2((num / updated.civacp) - 1);
    setP(updated as Product);
    onUpdate(updated as Product);
    setEditField(null);
  }

  const lowestPrice = history.length > 0 ? Math.min(...history.map(h => h.price)) : p.costSIVA;
  const highestPrice = history.length > 0 ? Math.max(...history.map(h => h.price)) : p.costSIVA;
  const avgPrice = history.length > 0 ? r2(history.reduce((s, h) => s + h.price, 0) / history.length) : p.costSIVA;
  const priceChange30d = history.length > 1 ? Math.round((history[history.length - 1].price - history[history.length - 2].price) / history[history.length - 2].price * 1000) / 10 : 0;
  const aiInsight = history.length > 0
    ? p.costSIVA > avgPrice * 1.05 ? `Current cost (€${p.costSIVA.toFixed(2)}) is ${Math.round((p.costSIVA / avgPrice - 1) * 100)}% above average (€${avgPrice.toFixed(2)}).`
    : p.costSIVA < avgPrice * 0.95 ? `Current cost (€${p.costSIVA.toFixed(2)}) is ${Math.round((1 - p.costSIVA / avgPrice) * 100)}% below average — great deal!`
    : `Current cost (€${p.costSIVA.toFixed(2)}) is in line with the historical average.`
    : "No history yet — apply invoice to start tracking.";

  function Cell({ label, value, field, decimals = 2, isPct = false, highlight = false }: { label: string; value: number; field: string; decimals?: number; isPct?: boolean; highlight?: boolean }) {
    const isEditing = editField === field;
    const display = isPct ? `${parseFloat((value * 100).toFixed(4)).toString()}%` : `€${value.toFixed(decimals)}`;
    if (isEditing) return (
      <div style={{ background: "#fff8f0", borderRadius: 10, padding: "10px 12px", border: "2px solid " + ORANGE }}>
        <div style={{ fontSize: 10, color: MUTED, marginBottom: 4, textTransform: "uppercase" as const }}>{label}</div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input autoFocus type="number" step="any" value={editVal}
            onChange={e => setEditVal(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleEdit(field, editVal || (isPct ? (value * 100).toString() : value.toString())); if (e.key === "Escape") setEditField(null); }}
            style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 15, fontWeight: 700, color: ORANGE }} />
          <button onClick={() => handleEdit(field, editVal || (isPct ? (value * 100).toString() : value.toString()))}
            style={{ background: ORANGE, color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>✓</button>
        </div>
      </div>
    );
    return (
      <div onClick={() => { setEditField(field); setEditVal(isPct ? (value * 100).toFixed(2) : value.toFixed(decimals)); }}
        style={{ background: highlight ? "#fff8f0" : WARM_BG, borderRadius: 10, padding: "10px 12px", border: `1px solid ${highlight ? ORANGE + "40" : BORDER}`, cursor: "pointer", transition: "all 0.15s" }}>
        <div style={{ fontSize: 10, color: highlight ? ORANGE : MUTED, textTransform: "uppercase" as const, marginBottom: 4, fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: highlight ? ORANGE : BLACK }}>{display}</div>
        <div style={{ fontSize: 9, color: MUTED, marginTop: 2 }}>tap to edit</div>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <div style={{ position: "relative", width: "100%", maxWidth: 520, background: CARD_BG, borderRadius: "24px 24px 0 0", maxHeight: "92vh", display: "flex", flexDirection: "column", animation: "slideUp 0.3s cubic-bezier(0.16,1,0.3,1)" }}>
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 12 }}>
          <div style={{ width: 44, height: 4, borderRadius: 2, background: BORDER }} />
        </div>
        {/* Header */}
        <div style={{ padding: "12px 20px 16px", borderBottom: "1px solid " + BORDER }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1, marginRight: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: BLACK, lineHeight: 1.3 }}>{p.name}</div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>{p.packSize} · Qty: {p.qty} cases · {p.totalUnits} units</div>
            </div>
            <button onClick={onClose} style={{ background: WARM_BG, border: "none", borderRadius: 20, width: 32, height: 32, cursor: "pointer", fontSize: 16, color: MUTED, flexShrink: 0 }}>✕</button>
          </div>
          {p.priceDirection === "up" && <div style={{ marginTop: 8, background: "#fef2f2", borderRadius: 8, padding: "6px 10px", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: RED }}>📈 Cost up {p.priceChange?.toFixed(1)}% vs last invoice</div>}
          {p.priceDirection === "down" && <div style={{ marginTop: 8, background: "#f0fdf4", borderRadius: 8, padding: "6px 10px", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: GREEN }}>📉 Cost down {Math.abs(p.priceChange || 0).toFixed(1)}% — good deal</div>}
          {p.priceDirection === "new" && <div style={{ marginTop: 8, background: "#eff6ff", borderRadius: 8, padding: "6px 10px", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "#3b82f6" }}>🆕 New product — no previous history</div>}
        </div>
        {/* Tabs */}
        <div style={{ display: "flex", padding: "8px 20px 0", gap: 4, background: CARD_BG }}>
          {[{ id: "pricing", label: "💰 Pricing" }, { id: "history", label: "📊 History" }, { id: "suppliers", label: "🏪 Suppliers" }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              style={{ flex: 1, padding: "8px 4px", borderRadius: "10px 10px 0 0", border: "none", cursor: "pointer", fontSize: 12, fontWeight: tab === t.id ? 700 : 400, background: tab === t.id ? WARM_BG : "transparent", color: tab === t.id ? ORANGE : MUTED, borderBottom: tab === t.id ? `2px solid ${ORANGE}` : "2px solid transparent" }}>
              {t.label}
            </button>
          ))}
        </div>
        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", background: WARM_BG, padding: "16px 20px 40px" }}>

          {/* PRICING TAB */}
          {tab === "pricing" && (
            <div>
              <div style={{ fontSize: 11, color: MUTED, marginBottom: 12, fontWeight: 600 }}>TAP ANY CELL TO EDIT · RECALCULATES AUTOMATICALLY</div>
              {/* Cost row */}
              <div style={{ fontSize: 12, fontWeight: 700, color: BLACK, marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Costs</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
                <Cell label="Cost S/IVA" value={p.costSIVA} field="costSIVA" decimals={3} />
                <Cell label="Item Cost" value={p.itemCost} field="itemCost" decimals={3} highlight />
                <Cell label="IVA %" value={p.ivaRate} field="ivaRate" isPct />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                <Cell label="Transport %" value={p.transportPct} field="transportPct" isPct />
                <Cell label="Item W/T" value={p.itemWT} field="itemWT" decimals={3} />
              </div>
              {/* Selling prices */}
              <div style={{ fontSize: 12, fontWeight: 700, color: BLACK, marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Selling Prices</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                <Cell label="C/IVACP" value={p.civacp} field="civacp" highlight />
                <Cell label="Shop Sem" value={p.shopSem} field="shopSem" />
                <Cell label="Shop Com" value={p.shopCom} field="shopCom" />
                <Cell label="Special" value={p.special} field="special" />
                <Cell label="Big Wholesale" value={p.bigWholesale} field="bigWholesale" />
                <Cell label="Rest Com" value={p.restCom} field="restCom" />
              </div>
              {/* Markup rates */}
              <div style={{ fontSize: 12, fontWeight: 700, color: BLACK, marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Markup Rates</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
                <Cell label="Shop Sem %" value={p.shopSemPct} field="shopSemPct" isPct />
                <Cell label="Shop Com %" value={p.shopComPct} field="shopComPct" isPct />
                <Cell label="Special %" value={p.specialPct} field="specialPct" isPct />
                <Cell label="Wholesale %" value={p.bigWholesalePct} field="bigWholesalePct" isPct />
                <Cell label="Rest Com %" value={p.restComPct} field="restComPct" isPct />
              </div>
              {/* Summary */}
              <div style={{ background: CARD_BG, borderRadius: 14, padding: "14px 16px", border: "1px solid " + BORDER }}>
                {[
                  { label: "Per Case Cost", value: `€${r3(p.itemCost)}` },
                  { label: "Total Cases", value: `${p.qty} cases` },
                  { label: "Total Stock Units", value: `${p.totalUnits} units` },
                  { label: "Total Invoice Cost", value: `€${r2(p.itemCost * p.qty).toFixed(2)}`, bold: true },
                ].map((row, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: i > 0 ? "1px solid " + BORDER : "none" }}>
                    <span style={{ fontSize: 13, color: MUTED }}>{row.label}</span>
                    <span style={{ fontSize: 13, fontWeight: row.bold ? 700 : 600, color: row.bold ? ORANGE : BLACK }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* HISTORY TAB */}
          {tab === "history" && (
            loading ? <div style={{ textAlign: "center", padding: 40, color: MUTED }}>Loading...</div> :
            <div>
              {history.length > 0 && <Sparkline data={history} />}
              {/* Price overview */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
                {[{ label: "Lowest", value: lowestPrice, color: GREEN }, { label: "Highest", value: highestPrice, color: RED }, { label: "Average", value: avgPrice, color: ORANGE }].map(c => (
                  <div key={c.label} style={{ background: CARD_BG, borderRadius: 12, padding: "12px", textAlign: "center", border: "1px solid " + BORDER }}>
                    <div style={{ fontWeight: 800, fontSize: 18, color: c.color }}>€{c.value.toFixed(2)}</div>
                    <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>{c.label}</div>
                  </div>
                ))}
              </div>
              {history.length > 0 ? (
                <>
                  <div style={{ background: CARD_BG, borderRadius: 14, border: "1px solid " + BORDER, overflow: "hidden", marginBottom: 12 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", padding: "8px 14px", background: WARM_BG }}>
                      {["Date", "Supplier", "Price", "Change"].map(h => <span key={h} style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: "uppercase" as const }}>{h}</span>)}
                    </div>
                    {history.map((e, i) => (
                      <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", padding: "10px 14px", borderTop: "1px solid " + BORDER }}>
                        <span style={{ fontSize: 12, color: BLACK }}>{e.date}</span>
                        <span style={{ fontSize: 12, color: BLACK }}>{e.supplier}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: BLACK }}>€{e.price.toFixed(2)}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: e.change === undefined ? MUTED : e.change > 0 ? RED : GREEN }}>
                          {e.change === undefined ? "—" : e.change > 0 ? `+${e.change}%` : `${e.change}%`}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: CARD_BG, borderRadius: 14, border: "1px solid " + BORDER, overflow: "hidden" }}>
                    {[{ label: "Price Change (30d)", value: priceChange30d > 0 ? `+${priceChange30d}%` : `${priceChange30d}%`, color: priceChange30d > 0 ? RED : GREEN }].map((row, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px" }}>
                        <span style={{ fontSize: 13, color: MUTED }}>{row.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: row.color }}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 12, background: "#fffbeb", borderRadius: 12, padding: "12px 14px", display: "flex", gap: 10, border: "1px solid #fde68a" }}>
                    <span>💡</span>
                    <div style={{ fontSize: 13, color: BLACK }}>{aiInsight}</div>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: "center", padding: "32px 20px", background: CARD_BG, borderRadius: 14, border: "1px solid " + BORDER }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>📊</div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: BLACK, marginBottom: 6 }}>No price history yet</div>
                  <div style={{ fontSize: 13, color: MUTED }}>Apply this invoice to start building history.</div>
                </div>
              )}
            </div>
          )}

          {/* SUPPLIERS TAB */}
          {tab === "suppliers" && (
            loading ? <div style={{ textAlign: "center", padding: 40, color: MUTED }}>Loading...</div> :
            suppliers.length > 0 ? (
              <div>
                <div style={{ background: CARD_BG, borderRadius: 14, border: "1px solid " + BORDER, overflow: "hidden", marginBottom: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "8px 14px", background: WARM_BG }}>
                    {["Supplier", "Latest", "Updated", "Avg"].map(h => <span key={h} style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: "uppercase" as const }}>{h}</span>)}
                  </div>
                  {suppliers.map((s, i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "12px 14px", borderTop: "1px solid " + BORDER, background: s.isBest ? "#f0fdf4" : CARD_BG }}>
                      <span style={{ fontSize: 13, fontWeight: s.isBest ? 700 : 400, color: s.isBest ? GREEN : BLACK }}>{s.supplier}</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>€{s.latestPrice.toFixed(2)}</span>
                      <span style={{ fontSize: 11, color: MUTED }}>{s.lastUpdated}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: s.isBest ? GREEN : BLACK }}>€{s.avgPrice.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                {suppliers.find(s => s.isBest) && (
                  <div style={{ background: "#f0fdf4", borderRadius: 12, padding: "14px", display: "flex", gap: 10, border: "1px solid #bbf7d0", marginBottom: 12 }}>
                    <span>✅</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: GREEN }}>Best Deal</div>
                      <div style={{ fontSize: 13, color: MUTED }}>{suppliers.find(s => s.isBest)?.supplier} offers the best average price (€{suppliers.find(s => s.isBest)?.avgPrice.toFixed(2)}).</div>
                    </div>
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[{ icon: "📞", label: "Call" }, { icon: "✉️", label: "Email" }, { icon: "📋", label: "Quote" }].map(a => (
                    <button key={a.label} style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 6, padding: "16px 8px", borderRadius: 12, border: "1px solid " + BORDER, background: CARD_BG, cursor: "pointer" }}>
                      <span style={{ fontSize: 24 }}>{a.icon}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: BLACK }}>{a.label} Supplier</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "32px 20px", background: CARD_BG, borderRadius: 14, border: "1px solid " + BORDER }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>🏪</div>
                <div style={{ fontWeight: 600, fontSize: 14, color: BLACK, marginBottom: 6 }}>No supplier data yet</div>
                <div style={{ fontSize: 13, color: MUTED }}>Apply invoices from multiple suppliers to compare prices.</div>
              </div>
            )
          )}
        </div>
      </div>
      <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
    </div>
  );
}

// ─── Main Scanner ─────────────────────────────────────────────────────────────

export default function Scanner() {
  const isMobile = useIsMobile();
  const [scannerMode, setScannerMode] = useState<"choose" | "invoice" | "receipt">("choose");
  const [step, setStep] = useState<"upload" | "success" | "table">("upload");
  const [receiptStep, setReceiptStep] = useState<"upload" | "review" | "done">("upload");
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [receiptScanning, setReceiptScanning] = useState(false);
  const [receiptMessage, setReceiptMessage] = useState("");
  const [receiptSaving, setReceiptSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [invoiceInfo, setInvoiceInfo] = useState<InvoiceInfo | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function getStore() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const email = session.user.email || "";
      const { data } = await supabase.from("stores").select("id").ilike("owner_email", email).single();
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

      const enriched: Product[] = await Promise.all((data.products || []).map(async (raw: any) => {
        // Use per-product markup rates from AI, or defaults
        const shopSemPct      = raw.shopSemPct ?? 0.30;
        const shopComPct      = raw.shopComPct ?? 0.20;
        const specialPct      = raw.specialPct ?? 0.12;
        const bigWholesalePct = raw.bigWholesalePct ?? 0.10;
        const restComPct      = raw.restComPct ?? 0.35;
        const ivaRate         = raw.ivaRate ?? 0.23;
        const transportPct    = 0.0415;
        const itemCost        = raw.itemCost || raw.costSIVA || 0;
        const costSIVA        = raw.costSIVA || itemCost;
        const packSize        = raw.packSize || "";
        const qty             = raw.qty || 1;

        const calced = calcAll({ itemCost, ivaRate, transportPct, shopSemPct, shopComPct, specialPct, bigWholesalePct, restComPct, qty, packSize });

        let priceDirection: Product["priceDirection"] = "new";
        let priceChange = 0;
        if (storeId) {
          const { data: last } = await supabase
            .from("price_history")
            .select("item_cost")
            .ilike("product_name", `%${String(raw.name).substring(0, 15)}%`)
            .order("scanned_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (last) {
            const diff = itemCost - last.item_cost;
            priceChange = Math.round(diff / last.item_cost * 1000) / 10;
            priceDirection = Math.abs(diff) < 0.001 ? "same" : diff > 0 ? "up" : "down";
          }
        }

        return {
          name: String(raw.name).trim(),
          packSize,
          qty,
          costSIVA,
          itemCost,
          ivaRate,
          shopSemPct,
          shopComPct,
          specialPct,
          bigWholesalePct,
          restComPct,
          transportPct,
          category: raw.category || "Other",
          priceDirection,
          priceChange,
          ...calced,
        } as Product;
      }));

      setProducts(enriched);
      setInvoiceInfo({
        supplier: data.supplier || data.supplierName || "Unknown Supplier",
        date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
        invoiceNumber: `INV-${Date.now().toString().slice(-4)}`,
        total: data.total || enriched.reduce((s, p) => s + (p.costSIVA * p.qty), 0),
        count: enriched.length,
      });
      setStep("success");
    } catch (err: any) {
      setMessage("Could not scan invoice. Please try again.");
    }
    setScanning(false);
  }

  async function scanReceipt(imageData: string) {
    setReceiptScanning(true);
    setReceiptMessage("");
    try {
      const res = await fetch("/api/scanner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageData, mode: "receipt" }),
      });
      const data = await res.json();
      if (data.error) { setReceiptMessage(data.error); setReceiptScanning(false); return; }
      setSaleItems(data.items || []);
      setReceiptStep("review");
    } catch (err) {
      setReceiptMessage("Could not scan receipt. Please try again.");
    }
    setReceiptScanning(false);
  }

  async function saveSales() {
    if (saleItems.length === 0) return;
    setReceiptSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const email = session.user.email || "";
      const { data: storeData } = await supabase.from("stores").select("id").ilike("owner_email", email).single();
      const sid = storeData?.id || storeId;
      if (!sid) { setReceiptMessage("Store not found."); setReceiptSaving(false); return; }
      for (const item of saleItems) {
        await supabase.from("sales").insert([{
          store_id: sid,
          store_email: email,
          product_name: item.name,
          category: item.category,
          quantity: item.quantity,
          price: item.price,
          total: item.quantity * item.price,
          sale_date: new Date().toISOString().split("T")[0],
        }]);
        const { data: existing } = await supabase.from("products")
          .select("id, stock_quantity")
          .eq("store_id", sid)
          .ilike("name", `%${item.name.substring(0, 15)}%`)
          .maybeSingle();
        if (existing) {
          await supabase.from("products").update({
            stock_quantity: Math.max(0, (existing.stock_quantity || 0) - item.quantity)
          }).eq("id", existing.id);
        }
      }
      setReceiptStep("done");
    } catch (err) {
      setReceiptMessage("Error saving sales. Please try again.");
    }
    setReceiptSaving(false);
  }

  function handleReceiptFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => scanReceipt(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function applyPricing() {
    if (!storeId || products.length === 0) return;
    setSaving(true);
    try {
      const supplier = invoiceInfo?.supplier || "Unknown Supplier";
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
          transport_pct: p.transportPct,
          iva_pct: p.ivaRate,
        }))
      );
      // Save supplier if not exists
      const { data: existingSupplier } = await supabase
        .from("suppliers")
        .select("id")
        .ilike("name", `%${supplier}%`)
        .maybeSingle();
      if (!existingSupplier) {
        const { data: { session: supSession } } = await supabase.auth.getSession();
        const supEmail = supSession?.user?.email || "";
        await supabase.from("suppliers").insert({
          store_email: supEmail,
          name: supplier,
          invoice_amount: `€${invoiceInfo?.total.toFixed(2) || "0"}`,
          due_date: "",
          status: "pending",
          notes: `Auto-added from invoice scan on ${new Date().toLocaleDateString("en-GB")}`,
        });
      }
      for (const p of products) {
        const { data: existing } = await supabase.from("products").select("id, stock_quantity").eq("store_id", storeId).ilike("name", `%${p.name.substring(0, 15)}%`).maybeSingle();
        if (existing) {
          await supabase.from("products").update({ price: p.civacp, stock_quantity: (existing.stock_quantity || 0) + p.qty }).eq("id", existing.id);
        } else {
          await supabase.from("products").insert({ store_id: storeId, name: p.name, category: p.category, stock_quantity: p.qty, price: p.civacp, reorder_threshold: 10 });
        }
      }
      setSaved(true);
      setMessage(`✅ ${products.length} products saved to inventory!`);
    } catch (err) {
      setMessage("Error applying prices. Please try again.");
    }
    setSaving(false);
  }

  function updateProduct(index: number, updated: Product) {
    setProducts(prev => prev.map((p, i) => i === index ? updated : p));
    if (selectedProduct) setSelectedProduct(updated);
  }

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  const priceUps = products.filter(p => p.priceDirection === "up").length;
  const priceDowns = products.filter(p => p.priceDirection === "down").length;

  return (
    <div style={{ minHeight: "100vh", background: WARM_BG, fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" }}>
      {/* Header */}
      <header style={{ background: CARD_BG, borderBottom: "1px solid " + BORDER, padding: isMobile ? "0 16px" : "0 40px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56, position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {(step !== "upload" || scannerMode !== "choose") && (
            <button onClick={() => { if (step === "table") setStep("success"); else if (step === "success") setStep("upload"); else setScannerMode("choose"); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: BLACK, padding: 0, marginRight: 4 }}>←</button>
          )}
          <Image src="/logo.png" alt="Samzy" width={26} height={26} />
          <span style={{ fontWeight: 700, fontSize: 15, color: BLACK }}>Samzy</span>
          <span style={{ background: ORANGE, color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5 }}>Scanner</span>
        </div>
        {step === "table" && !saved && (
          <button onClick={applyPricing} disabled={saving}
            style={{ padding: "8px 18px", borderRadius: 10, background: ORANGE, border: "none", fontWeight: 700, fontSize: 13, color: "#fff", cursor: "pointer" }}>
            {saving ? "Saving..." : "Apply All"}
          </button>
        )}
        {step !== "table" && <a href="/" style={{ color: MUTED, fontSize: 13, textDecoration: "none" }}>Dashboard</a>}
      </header>

      {/* ── MODE CHOOSER ── */}
      {scannerMode === "choose" && (
        <div style={{ maxWidth: 480, margin: "0 auto", padding: isMobile ? "28px 20px" : "48px 24px" }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: BLACK, margin: "0 0 6px" }}>Smart Scanner</h1>
          <p style={{ color: MUTED, fontSize: 14, marginBottom: 28 }}>What do you want to scan?</p>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 14 }}>
            <button onClick={() => setScannerMode("invoice")}
              style={{ display: "flex", alignItems: "center", gap: 18, padding: "20px 24px", borderRadius: 16, background: CARD_BG, border: "1px solid " + BORDER, cursor: "pointer", textAlign: "left" as const }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: "#fff8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0 }}>📦</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: BLACK, marginBottom: 4 }}>Supplier Invoice</div>
                <div style={{ fontSize: 13, color: MUTED }}>Upload invoice — AI extracts products, calculates selling prices and updates inventory</div>
              </div>
              <span style={{ color: ORANGE, fontSize: 20 }}>→</span>
            </button>
            <button onClick={() => setScannerMode("receipt")}
              style={{ display: "flex", alignItems: "center", gap: 18, padding: "20px 24px", borderRadius: 16, background: CARD_BG, border: "1px solid " + BORDER, cursor: "pointer", textAlign: "left" as const }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0 }}>🧾</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: BLACK, marginBottom: 4 }}>Sales Receipt</div>
                <div style={{ fontSize: 13, color: MUTED }}>Scan a customer receipt to record sales and automatically reduce stock</div>
              </div>
              <span style={{ color: ORANGE, fontSize: 20 }}>→</span>
            </button>
          </div>
        </div>
      )}

      {/* ── RECEIPT FLOW ── */}
      {scannerMode === "receipt" && (
        <div style={{ maxWidth: 480, margin: "0 auto", padding: isMobile ? "24px 20px 60px" : "40px 24px 60px" }}>

          {receiptStep === "upload" && (
            <>
              {receiptMessage && <div style={{ background: "#fef2f2", color: RED, padding: "12px 16px", borderRadius: 10, marginBottom: 16, fontSize: 13 }}>{receiptMessage}</div>}
              {receiptScanning ? (
                <div style={{ background: CARD_BG, borderRadius: 20, padding: "48px 24px", textAlign: "center", border: "1px solid " + BORDER }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
                  <div style={{ fontWeight: 700, fontSize: 17, color: BLACK, marginBottom: 6 }}>AI is reading the receipt...</div>
                  <div style={{ color: MUTED, fontSize: 13 }}>Extracting items and prices</div>
                </div>
              ) : (
                <div style={{ background: CARD_BG, borderRadius: 20, border: "2px dashed " + BORDER, padding: "44px 24px", textAlign: "center" }}>
                  <div style={{ fontSize: 52, marginBottom: 14 }}>🧾</div>
                  <div style={{ fontWeight: 700, fontSize: 17, color: BLACK, marginBottom: 6 }}>Upload Sales Receipt</div>
                  <div style={{ color: MUTED, fontSize: 13, marginBottom: 24 }}>Photo or image of any receipt</div>
                  <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" as const }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 22px", borderRadius: 12, background: ORANGE, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                      📷 Take Photo
                      <input type="file" accept="image/*" capture="environment" onChange={handleReceiptFile} style={{ display: "none" }} />
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 22px", borderRadius: 12, background: CARD_BG, border: "1px solid " + BORDER, color: BLACK, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
                      📁 Upload File
                      <input type="file" accept="image/*,.pdf" onChange={handleReceiptFile} style={{ display: "none" }} />
                    </label>
                  </div>
                </div>
              )}
            </>
          )}

          {receiptStep === "review" && (
            <div>
              <div style={{ background: CARD_BG, borderRadius: 16, padding: "20px", border: "1px solid " + BORDER, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: BLACK }}>{saleItems.length} items found</div>
                    <div style={{ fontSize: 13, color: MUTED }}>Review and edit before saving</div>
                  </div>
                  <button onClick={() => { setSaleItems([]); setReceiptStep("upload"); }}
                    style={{ padding: "8px 14px", borderRadius: 8, background: WARM_BG, border: "1px solid " + BORDER, color: MUTED, fontSize: 13, cursor: "pointer" }}>Rescan</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
                  {saleItems.map((item, i) => (
                    <div key={i} style={{ background: WARM_BG, borderRadius: 12, padding: "14px 16px", border: "1px solid " + BORDER }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <input value={item.name} onChange={e => setSaleItems(prev => prev.map((s, j) => j === i ? { ...s, name: e.target.value } : s))}
                          style={{ fontSize: 14, fontWeight: 600, color: BLACK, background: "none", border: "none", outline: "none", flex: 1 }} />
                        <button onClick={() => setSaleItems(prev => prev.filter((_, j) => j !== i))}
                          style={{ background: "none", border: "none", color: RED, cursor: "pointer", fontSize: 16 }}>✕</button>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <div>
                          <div style={{ fontSize: 10, color: MUTED, fontWeight: 700, textTransform: "uppercase" as const, marginBottom: 4 }}>Qty</div>
                          <input type="number" value={item.quantity} onChange={e => setSaleItems(prev => prev.map((s, j) => j === i ? { ...s, quantity: parseInt(e.target.value) || 1 } : s))}
                            style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid " + BORDER, fontSize: 13, color: BLACK, background: CARD_BG, outline: "none", boxSizing: "border-box" as const }} />
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: MUTED, fontWeight: 700, textTransform: "uppercase" as const, marginBottom: 4 }}>Price €</div>
                          <input type="number" step="0.01" value={item.price} onChange={e => setSaleItems(prev => prev.map((s, j) => j === i ? { ...s, price: parseFloat(e.target.value) || 0 } : s))}
                            style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid " + BORDER, fontSize: 13, color: BLACK, background: CARD_BG, outline: "none", boxSizing: "border-box" as const }} />
                        </div>

                      </div>
                      <div style={{ marginTop: 8, fontSize: 12, color: ORANGE, fontWeight: 600 }}>
                        Total: €{(item.quantity * item.price).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {receiptMessage && <div style={{ background: "#fef2f2", color: RED, padding: "12px 16px", borderRadius: 10, marginBottom: 12, fontSize: 13 }}>{receiptMessage}</div>}
              <div style={{ background: CARD_BG, borderRadius: 14, padding: "14px 16px", border: "1px solid " + BORDER, marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: BLACK }}>Total Sale</span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: ORANGE }}>€{saleItems.reduce((s, i) => s + i.quantity * i.price, 0).toFixed(2)}</span>
                </div>
              </div>
              <button onClick={saveSales} disabled={receiptSaving}
                style={{ width: "100%", padding: "15px", borderRadius: 14, background: receiptSaving ? MUTED : ORANGE, border: "none", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
                {receiptSaving ? "Saving..." : `✅ Save ${saleItems.length} Sales →`}
              </button>
            </div>
          )}

          {receiptStep === "done" && (
            <div style={{ background: CARD_BG, borderRadius: 20, padding: "40px 24px", border: "1px solid " + BORDER, textAlign: "center" }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, margin: "0 auto 16px" }}>✅</div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: BLACK, margin: "0 0 8px" }}>Sales Recorded!</h2>
              <p style={{ color: MUTED, fontSize: 14, margin: "0 0 8px" }}>{saleItems.length} items saved · Stock updated automatically.</p>
              <p style={{ color: ORANGE, fontWeight: 700, fontSize: 16, margin: "0 0 28px" }}>€{saleItems.reduce((s, i) => s + i.quantity * i.price, 0).toFixed(2)} total sale</p>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => { setSaleItems([]); setReceiptStep("upload"); }}
                  style={{ flex: 1, padding: "13px", borderRadius: 12, background: WARM_BG, border: "1px solid " + BORDER, fontWeight: 600, fontSize: 14, color: BLACK, cursor: "pointer" }}>Scan Another</button>
                <a href="/" style={{ flex: 1, padding: "13px", borderRadius: 12, background: ORANGE, color: "#fff", fontWeight: 700, fontSize: 14, textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>← Dashboard</a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── INVOICE FLOW ── */}
      {scannerMode === "invoice" && step === "upload" && (
        <div style={{ maxWidth: 480, margin: "0 auto", padding: isMobile ? "28px 20px" : "48px 24px" }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: BLACK, margin: "0 0 6px" }}>Smart Scanner</h1>
          <p style={{ color: MUTED, fontSize: 14, marginBottom: 28 }}>Upload a supplier invoice — AI extracts all products, calculates selling prices and updates inventory automatically.</p>
          {message && <div style={{ background: "#fef2f2", color: RED, padding: "12px 16px", borderRadius: 10, marginBottom: 16, fontSize: 13, border: "1px solid #fecaca" }}>{message}</div>}
          {scanning ? (
            <div style={{ background: CARD_BG, borderRadius: 20, padding: "48px 24px", textAlign: "center", border: "1px solid " + BORDER }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
              <div style={{ fontWeight: 700, fontSize: 17, color: BLACK, marginBottom: 6 }}>AI is reading your invoice...</div>
              <div style={{ color: MUTED, fontSize: 13 }}>Extracting products, prices & calculating margins</div>
            </div>
          ) : (
            <>
              <div style={{ background: CARD_BG, borderRadius: 20, border: "2px dashed " + BORDER, padding: "44px 24px", textAlign: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 52, marginBottom: 14 }}>📄</div>
                <div style={{ fontWeight: 700, fontSize: 17, color: BLACK, marginBottom: 6 }}>Upload Supplier Invoice</div>
                <div style={{ color: MUTED, fontSize: 13, marginBottom: 24 }}>PDF or image — AI does the rest</div>
                <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" as const }}>
                  <button onClick={() => cameraInputRef.current?.click()} style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 22px", borderRadius: 12, background: ORANGE, border: "none", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>📷 Take Photo</button>
                  <button onClick={() => fileInputRef.current?.click()} style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 22px", borderRadius: 12, background: CARD_BG, border: "1px solid " + BORDER, color: BLACK, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>📁 Upload File</button>
                </div>
                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} style={{ display: "none" }} />
                <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={handleFileChange} style={{ display: "none" }} />
              </div>
              <div style={{ background: CARD_BG, borderRadius: 16, padding: "18px 20px", border: "1px solid " + BORDER }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: BLACK, marginBottom: 10 }}>SAMZY automatically:</div>
                {["Extracts all products, quantities and prices", "Calculates VAT, transport and all selling prices", "Detects price changes vs previous invoices", "Updates inventory and stores price history", "Compares supplier prices for best deals"].map((t, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                    <span style={{ color: ORANGE, fontWeight: 700 }}>✓</span>
                    <span style={{ fontSize: 13, color: MUTED }}>{t}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {scannerMode === "invoice" && step === "success" && invoiceInfo && (
        <div style={{ maxWidth: 480, margin: "0 auto", padding: isMobile ? "28px 20px" : "48px 24px" }}>
          <div style={{ background: CARD_BG, borderRadius: 20, padding: "28px 24px", border: "1px solid " + BORDER, marginBottom: 16 }}>
            <div style={{ width: 60, height: 60, borderRadius: 18, background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, margin: "0 auto 14px" }}>✅</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: BLACK, textAlign: "center", margin: "0 0 6px" }}>Invoice uploaded successfully!</h2>
            <p style={{ color: MUTED, fontSize: 13, textAlign: "center", margin: "0 0 20px" }}>AI extracted {invoiceInfo.count} items from the invoice.</p>
            <div style={{ background: WARM_BG, borderRadius: 12, padding: "14px" }}>
              {[
                { label: "Supplier", value: invoiceInfo.supplier },
                { label: "Date", value: invoiceInfo.date },
                { label: "Total Amount", value: `€${invoiceInfo.total.toFixed(2)}`, orange: true },
              ].map((row, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderTop: i > 0 ? "1px solid " + BORDER : "none" }}>
                  <span style={{ fontSize: 13, color: MUTED }}>{row.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: (row as any).orange ? ORANGE : BLACK }}>{row.value}</span>
                </div>
              ))}
            </div>
            {(priceUps > 0 || priceDowns > 0) && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 }}>
                {priceUps > 0 && <div style={{ background: "#fef2f2", borderRadius: 10, padding: "10px", textAlign: "center", border: "1px solid #fecaca" }}>
                  <div style={{ fontWeight: 800, fontSize: 20, color: RED }}>↑{priceUps}</div>
                  <div style={{ fontSize: 11, color: RED }}>Price Increases</div>
                </div>}
                {priceDowns > 0 && <div style={{ background: "#f0fdf4", borderRadius: 10, padding: "10px", textAlign: "center", border: "1px solid #bbf7d0" }}>
                  <div style={{ fontWeight: 800, fontSize: 20, color: GREEN }}>↓{priceDowns}</div>
                  <div style={{ fontSize: 11, color: GREEN }}>Price Drops</div>
                </div>}
              </div>
            )}
          </div>
          {message && <div style={{ background: "#f0fdf4", color: GREEN, padding: "12px 16px", borderRadius: 10, marginBottom: 12, fontSize: 13, border: "1px solid #bbf7d0" }}>{message}</div>}
          <button onClick={() => setStep("table")} style={{ width: "100%", padding: "14px", borderRadius: 14, background: ORANGE, border: "none", fontWeight: 700, fontSize: 15, color: "#fff", cursor: "pointer" }}>📋 View Pricing Table →</button>
        </div>
      )}

      {scannerMode === "invoice" && step === "table" && (
        <div style={{ padding: isMobile ? "12px 0" : "20px 0" }}>
          {/* Invoice summary bar */}
          <div style={{ padding: "0 16px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" as const, gap: 8 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: BLACK }}>{invoiceInfo?.supplier}</div>
              <div style={{ fontSize: 12, color: MUTED }}>{products.length} products · €{invoiceInfo?.total.toFixed(2)} · {invoiceInfo?.date}</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {priceUps > 0 && <div style={{ background: "#fef2f2", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 700, color: RED }}>↑{priceUps} up</div>}
              {priceDowns > 0 && <div style={{ background: "#f0fdf4", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 700, color: GREEN }}>↓{priceDowns} down</div>}
            </div>
          </div>

          {/* Search */}
          <div style={{ padding: "0 16px 12px", position: "relative" }}>
            <span style={{ position: "absolute", left: 28, top: "50%", transform: "translateY(-60%)", fontSize: 14, color: MUTED }}>🔍</span>
            <input type="text" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: "100%", padding: "10px 12px 10px 40px", borderRadius: 12, border: "1px solid " + BORDER, fontSize: 13, outline: "none", background: CARD_BG, boxSizing: "border-box" as const, color: BLACK }} />
          </div>

          {saved && (
            <div style={{ margin: "0 16px 12px", background: "#f0fdf4", borderRadius: 14, padding: "16px 20px", border: "1px solid #bbf7d0" }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: GREEN, marginBottom: 4 }}>✅ {products.length} products saved to inventory!</div>
              <div style={{ fontSize: 13, color: MUTED, marginBottom: 14 }}>Prices, stock and history have been updated.</div>
              <div style={{ display: "flex", gap: 10 }}>
                <a href="/" style={{ flex: 1, padding: "11px", borderRadius: 10, background: ORANGE, color: "#fff", fontWeight: 700, fontSize: 13, textDecoration: "none", textAlign: "center" }}>← Dashboard</a>
                <a href="/?nav=inventory" style={{ flex: 1, padding: "11px", borderRadius: 10, background: "#fff", border: "1px solid #F0EEEB", color: "#0f0f0f", fontWeight: 700, fontSize: 13, textDecoration: "none", textAlign: "center" }}>📦 Check Inventory</a>
              </div>
            </div>
          )}
          {!saved && <div style={{ padding: "0 16px 8px", fontSize: 11, color: MUTED }}>💡 Tap any row to view & edit pricing details, history and supplier comparison</div>}

          {/* Horizontal scroll table */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: BLACK, color: "#fff" }}>
                  {["#", "PRODUCT", "S/IVA", "ITEM COST", "PER UNIT", "IVA%", "W/T", "C/IVACP", "SEM%", "SHOP SEM", "COM%", "SHOP COM", "SPL%", "SPECIAL", "WHL%", "WHOLESALE", "RST%", "REST COM", "QTY", "UNITS", "TOTAL"].map((h, i) => (
                    <th key={h} style={{ padding: "10px 10px", textAlign: "left", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap", color: h === "C/IVACP" || h === "ITEM COST" ? ORANGE : "#fff", minWidth: i === 1 ? 180 : i === 0 ? 32 : 80 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={i}
                    onClick={() => setSelectedProduct(p)}
                    style={{ borderBottom: "1px solid " + BORDER, background: i % 2 === 0 ? CARD_BG : WARM_BG, cursor: "pointer", transition: "background 0.1s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#fff8f0")}
                    onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? CARD_BG : WARM_BG)}
                  >
                    <td style={{ padding: "10px 10px", color: MUTED, fontWeight: 600 }}>{i + 1}</td>
                    <td style={{ padding: "10px 10px", minWidth: 180 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {p.priceDirection === "up" && <span style={{ background: "#fef2f2", color: RED, fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 4, flexShrink: 0 }}>↑{p.priceChange?.toFixed(0)}%</span>}
                        {p.priceDirection === "down" && <span style={{ background: "#f0fdf4", color: GREEN, fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 4, flexShrink: 0 }}>↓{Math.abs(p.priceChange || 0).toFixed(0)}%</span>}
                        {p.priceDirection === "new" && <span style={{ background: "#eff6ff", color: "#3b82f6", fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 4, flexShrink: 0 }}>NEW</span>}
                        <div>
                          <div style={{ fontWeight: 600, color: BLACK, fontSize: 12 }}>{p.name}</div>
                          <div style={{ color: MUTED, fontSize: 10 }}>{p.packSize}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "10px 10px", color: MUTED, whiteSpace: "nowrap" }}>€{p.costSIVA.toFixed(3)}</td>
                    <td style={{ padding: "10px 10px", fontWeight: 700, color: ORANGE, whiteSpace: "nowrap" }}>€{p.itemCost.toFixed(3)}</td>
                    <td style={{ padding: "10px 10px", color: BLACK, whiteSpace: "nowrap" }}>€{(p.itemCost / (p.packSize.match(/^(\d+)\s*[x×*]/i)?.[1] ? parseInt(p.packSize.match(/^(\d+)\s*[x×*]/i)![1]) : 1)).toFixed(3)}</td>
                    <td style={{ padding: "10px 10px", color: MUTED, whiteSpace: "nowrap" }}>{(p.ivaRate * 100).toFixed(0)}%</td>
                    <td style={{ padding: "10px 10px", color: BLACK, whiteSpace: "nowrap" }}>€{p.itemWT.toFixed(3)}</td>
                    <td style={{ padding: "10px 10px", fontWeight: 700, color: ORANGE, whiteSpace: "nowrap" }}>€{p.civacp.toFixed(2)}</td>
                    <td style={{ padding: "10px 10px", color: MUTED, whiteSpace: "nowrap" }}>{(p.shopSemPct * 100).toFixed(0)}%</td>
                    <td style={{ padding: "10px 10px", color: BLACK, whiteSpace: "nowrap" }}>€{p.shopSem.toFixed(2)}</td>
                    <td style={{ padding: "10px 10px", color: MUTED, whiteSpace: "nowrap" }}>{(p.shopComPct * 100).toFixed(0)}%</td>
                    <td style={{ padding: "10px 10px", color: BLACK, whiteSpace: "nowrap" }}>€{p.shopCom.toFixed(2)}</td>
                    <td style={{ padding: "10px 10px", color: MUTED, whiteSpace: "nowrap" }}>{(p.specialPct * 100).toFixed(0)}%</td>
                    <td style={{ padding: "10px 10px", color: BLACK, whiteSpace: "nowrap" }}>€{p.special.toFixed(2)}</td>
                    <td style={{ padding: "10px 10px", color: MUTED, whiteSpace: "nowrap" }}>{(p.bigWholesalePct * 100).toFixed(0)}%</td>
                    <td style={{ padding: "10px 10px", color: BLACK, whiteSpace: "nowrap" }}>€{p.bigWholesale.toFixed(2)}</td>
                    <td style={{ padding: "10px 10px", color: MUTED, whiteSpace: "nowrap" }}>{(p.restComPct * 100).toFixed(0)}%</td>
                    <td style={{ padding: "10px 10px", color: BLACK, whiteSpace: "nowrap" }}>€{p.restCom.toFixed(2)}</td>
                    <td style={{ padding: "10px 10px", color: MUTED, whiteSpace: "nowrap" }}>{p.qty}</td>
                    <td style={{ padding: "10px 10px", color: MUTED, whiteSpace: "nowrap" }}>{p.totalUnits}</td>
                    <td style={{ padding: "10px 10px", fontWeight: 600, color: BLACK, whiteSpace: "nowrap" }}>€{p.totalCost.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              {/* Totals row */}
              <tfoot>
                <tr style={{ background: "#0f0f0f", color: "#fff" }}>
                  <td colSpan={18} style={{ padding: "10px 10px", fontWeight: 700, fontSize: 12 }}>TOTALS</td>
                  <td style={{ padding: "10px 10px", fontWeight: 700, fontSize: 12 }}>{products.reduce((s, p) => s + p.qty, 0)}</td>
                  <td style={{ padding: "10px 10px", fontWeight: 700, fontSize: 12 }}>{products.reduce((s, p) => s + p.totalUnits, 0).toLocaleString()}</td>
                  <td style={{ padding: "10px 10px", fontWeight: 700, fontSize: 12, color: ORANGE }}>€{products.reduce((s, p) => s + p.totalCost, 0).toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Product Sheet */}
      {selectedProduct && (
        <ProductSheet
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onUpdate={(updated) => updateProduct(products.indexOf(selectedProduct), updated)}
        />
      )}
    </div>
  );
}