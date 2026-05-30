'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from "../../lib/supabase"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const ORANGE = "#FC7800";
const BLACK = "#0f0f0f";
const WARM_BG = "#FAFAF8";
const CARD_BG = "#FFFFFF";
const BORDER = "#F0EEEB";
const MUTED = "#6B6B6B";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProductMarkups {
  iva_pct: number         // 0.06 | 0.13 | 0.23
  shop_sem_pct: number    // e.g. 0.41
  shop_com_pct: number    // e.g. 0.20
  special_pct: number     // e.g. 0.12
  big_wholesale_pct: number // e.g. 0.10
  rest_com_pct: number    // e.g. 0.55
}

interface ExtractedProduct extends ProductMarkups {
  name: string
  pack_size: string
  qty_cases: number
  cost_siva: number       // Col E — invoice price excl. VAT (display only)
  item_cost: number       // Col F — actual cost used in ALL formulas (editable)
  transport_pct: number   // 4.15 default
  // Calculated — derived from item_cost
  itemwt: number          // item_cost × (1 + transport%)
  civacp: number          // itemwt × (1 + iva%)
  shop_sem: number        // itemwt × (1 + shop_sem%)   ← NOT civacp
  shop_com: number        // civacp × (1 + shop_com%)
  special: number         // civacp × (1 + special%)
  big_wholesale: number   // civacp × (1 + big_wholesale%)
  rest_com: number        // civacp × (1 + rest_com%)
  // Meta
  total_stock_units: number
  total_cost: number      // item_cost × qty_cases
  // Intelligence
  price_change_pct?: number
  price_direction?: 'up' | 'down' | 'same' | 'new'
}

interface PriceHistoryRow {
  id: string
  product_name: string
  supplier_name: string
  item_cost: number
  civacp: number
  shop_sem: number
  shop_com: number
  special: number
  big_wholesale: number
  rest_com: number
  scanned_at: string
}

interface SupplierComparison {
  supplier_name: string
  item_cost: number
  civacp: number
  scanned_at: string
  is_cheapest: boolean
}

// ─── Formula Engine ───────────────────────────────────────────────────────────
// Exact replica of customer's Excel formulas

function calcPrices(item_cost: number, transport_pct: number, markups: ProductMarkups) {
  const itemwt        = item_cost * (1 + transport_pct / 100)
  const civacp        = itemwt   * (1 + markups.iva_pct)
  const shop_sem      = itemwt   * (1 + markups.shop_sem_pct)      // ← base is itemwt
  const shop_com      = civacp   * (1 + markups.shop_com_pct)
  const special       = civacp   * (1 + markups.special_pct)
  const big_wholesale = civacp   * (1 + markups.big_wholesale_pct)
  const rest_com      = civacp   * (1 + markups.rest_com_pct)
  return { itemwt, civacp, shop_sem, shop_com, special, big_wholesale, rest_com }
}

function r(n: number, d = 2) { return Math.round(n * Math.pow(10, d)) / Math.pow(10, d) }

// Default markups (most common in the Excel)
const DEFAULT_MARKUPS: ProductMarkups = {
  iva_pct: 0.23,
  shop_sem_pct: 0.30,
  shop_com_pct: 0.20,
  special_pct: 0.12,
  big_wholesale_pct: 0.10,
  rest_com_pct: 0.35,
}

// ─── Markup Editor (per-product expandable row) ───────────────────────────────

function MarkupEditor({
  product,
  index,
  onChange,
}: {
  product: ExtractedProduct
  index: number
  onChange: (index: number, field: string, value: number) => void
}) {
  const fields = [
    { key: 'iva_pct', label: 'IVA %', color: 'text-purple-600' },
    { key: 'shop_sem_pct', label: 'Shop Sem %', color: 'text-blue-600' },
    { key: 'shop_com_pct', label: 'Shop Com %', color: 'text-blue-600' },
    { key: 'special_pct', label: 'Special %', color: 'text-blue-600' },
    { key: 'big_wholesale_pct', label: 'Wholesale %', color: 'text-blue-600' },
    { key: 'rest_com_pct', label: 'Rest Com %', color: 'text-blue-600' },
  ] as const

  return (
    <tr className="bg-gray-50/70 border-b border-gray-100">
      <td colSpan={10} className="px-6 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Markup rates:</span>
          {fields.map(f => (
            <div key={f.key} className="flex items-center gap-1.5">
              <label className="text-xs text-gray-500">{f.label}</label>
              <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="5"
                  value={(product[f.key] * 100).toFixed(1)}
                  onChange={e => {
                    const v = parseFloat(e.target.value)
                    if (!isNaN(v)) onChange(index, f.key, v / 100)
                  }}
                  className="w-14 text-xs text-center py-1 px-1 outline-none"
                />
                <span className="text-xs text-gray-400 pr-1.5">%</span>
              </div>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-500">Item Cost €</label>
            <div className="flex items-center border border-[#FC7800] rounded-lg overflow-hidden bg-orange-50">
              <input
                type="number"
                step="0.001"
                min="0"
                value={product.item_cost.toFixed(3)}
                onChange={e => {
                  const v = parseFloat(e.target.value)
                  if (!isNaN(v) && v >= 0) onChange(index, 'item_cost', v)
                }}
                className="w-20 text-xs text-center py-1 px-1 outline-none bg-transparent font-semibold text-[#FC7800]"
              />
            </div>
            <span className="text-xs text-gray-400">(invoice: €{product.cost_siva.toFixed(3)})</span>
          </div>
        </div>
      </td>
    </tr>
  )
}

// ─── Intelligence Drawer ──────────────────────────────────────────────────────

function IntelligenceDrawer({
  product, storeId, supplierName, onClose,
}: {
  product: ExtractedProduct
  storeId: string
  supplierName: string
  onClose: () => void
}) {
  
  const [history, setHistory] = useState<PriceHistoryRow[]>([])
  const [comparisons, setComparisons] = useState<SupplierComparison[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data: hist } = await supabase
        .from('price_history')
        .select('*')
        .eq('store_id', storeId)
        .ilike('product_name', `%${product.name.substring(0, 18)}%`)
        .order('scanned_at', { ascending: true })
        .limit(60)

      if (hist) {
        setHistory(hist)
        const latestPerSupplier: Record<string, PriceHistoryRow> = {}
        for (const row of hist) {
          if (!latestPerSupplier[row.supplier_name] ||
              row.scanned_at > latestPerSupplier[row.supplier_name].scanned_at) {
            latestPerSupplier[row.supplier_name] = row
          }
        }
        const all = Object.values(latestPerSupplier)
        const minCost = Math.min(...all.map(s => s.item_cost))
        setComparisons(
          all.sort((a, b) => a.item_cost - b.item_cost).map(s => ({
            supplier_name: s.supplier_name,
            item_cost: s.item_cost,
            civacp: s.civacp,
            scanned_at: s.scanned_at,
            is_cheapest: s.item_cost === minCost,
          }))
        )
      }
      setLoading(false)
    }
    load()
  }, [product.name, storeId])

  const chartData = history
    .filter(h => h.supplier_name === supplierName)
    .map(h => ({
      date: new Date(h.scanned_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      cost: h.item_cost,
      retail: h.civacp,
    }))
  // Append current
  chartData.push({ date: 'Now', cost: product.item_cost, retail: product.civacp })

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white shadow-2xl flex flex-col overflow-hidden animate-slide-in-right">
        <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between bg-[#FAFAF8]">
          <div>
            <h2 className="font-semibold text-[#0f0f0f] text-base leading-tight">{product.name}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{product.pack_size} · {supplierName}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-2 border-[#FC7800] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="p-6 space-y-6">

              {/* Price direction alert */}
              {product.price_direction && product.price_direction !== 'new' && (
                <div className={`rounded-xl p-4 flex items-center gap-3 border ${
                  product.price_direction === 'up' ? 'bg-red-50 border-red-100' :
                  product.price_direction === 'down' ? 'bg-green-50 border-green-100' :
                  'bg-gray-50 border-gray-100'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${
                    product.price_direction === 'up' ? 'bg-red-100' :
                    product.price_direction === 'down' ? 'bg-green-100' : 'bg-gray-100'}`}>
                    {product.price_direction === 'up' ? '📈' : product.price_direction === 'down' ? '📉' : '➡️'}
                  </div>
                  <div>
                    <p className={`font-semibold text-sm ${
                      product.price_direction === 'up' ? 'text-red-700' :
                      product.price_direction === 'down' ? 'text-green-700' : 'text-gray-700'}`}>
                      {product.price_direction === 'up'
                        ? `Cost up ${product.price_change_pct?.toFixed(1)}% from last invoice`
                        : product.price_direction === 'down'
                        ? `Cost down ${Math.abs(product.price_change_pct ?? 0).toFixed(1)}% — good deal`
                        : 'Cost unchanged'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Item Cost now €{product.item_cost.toFixed(3)} · Invoice €{product.cost_siva.toFixed(3)}
                    </p>
                  </div>
                </div>
              )}
              {product.price_direction === 'new' && (
                <div className="rounded-xl p-4 flex items-center gap-3 bg-blue-50 border border-blue-100">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-lg">🆕</div>
                  <div>
                    <p className="font-semibold text-sm text-blue-700">First time seeing this product</p>
                    <p className="text-xs text-gray-500 mt-0.5">This scan becomes the baseline</p>
                  </div>
                </div>
              )}

              {/* Two costs */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Cost Breakdown</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg px-3 py-2.5 bg-gray-50">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide">Invoice Cost S/IVA</p>
                    <p className="font-semibold text-sm mt-0.5 text-gray-500">€{product.cost_siva.toFixed(3)}</p>
                  </div>
                  <div className="rounded-lg px-3 py-2.5 bg-orange-50 border border-orange-100">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide">Item Cost (working)</p>
                    <p className="font-semibold text-sm mt-0.5 text-[#FC7800]">€{product.item_cost.toFixed(3)}</p>
                  </div>
                  <div className="rounded-lg px-3 py-2.5 bg-gray-50">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide">Item W/T (+{(product.transport_pct).toFixed(2)}%)</p>
                    <p className="font-semibold text-sm mt-0.5 text-[#0f0f0f]">€{product.itemwt.toFixed(3)}</p>
                  </div>
                  <div className="rounded-lg px-3 py-2.5 bg-[#FC7800]/10 border border-[#FC7800]/20">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide">C/IVACP (+{(product.iva_pct * 100).toFixed(0)}% IVA)</p>
                    <p className="font-semibold text-sm mt-0.5 text-[#FC7800]">€{product.civacp.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* All selling prices */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Selling Prices</h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Shop Sem', value: product.shop_sem, pct: product.shop_sem_pct },
                    { label: 'Shop Com', value: product.shop_com, pct: product.shop_com_pct },
                    { label: 'Special', value: product.special, pct: product.special_pct },
                    { label: 'Big Wholesale', value: product.big_wholesale, pct: product.big_wholesale_pct },
                    { label: 'Rest Com', value: product.rest_com, pct: product.rest_com_pct },
                  ].map(item => (
                    <div key={item.label} className="rounded-lg px-3 py-2.5 bg-gray-50">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wide">
                        {item.label} <span className="text-gray-400">(+{(item.pct * 100).toFixed(0)}%)</span>
                      </p>
                      <p className="font-semibold text-sm mt-0.5 text-[#0f0f0f]">€{item.value.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price history chart */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Cost History · {supplierName}
                </h3>
                {chartData.length > 1 ? (
                  <div className="bg-gray-50 rounded-xl p-3">
                    <ResponsiveContainer width="100%" height={150}>
                      <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -15 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                        <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
                        <Tooltip
                          contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }}
                          formatter={(v: unknown) => [`€${Number(v).toFixed(3)}`, '']}
                        />
                        <Line type="monotone" dataKey="cost" stroke="#FC7800" strokeWidth={2}
                          dot={{ r: 3, fill: '#FC7800' }} name="Item Cost" />
                        <Line type="monotone" dataKey="retail" stroke="#0f0f0f" strokeWidth={1.5}
                          strokeDasharray="4 2" dot={false} name="C/IVACP" />
                      </LineChart>
                    </ResponsiveContainer>
                    <div className="flex gap-4 mt-2 justify-center">
                      <span className="flex items-center gap-1.5 text-[10px] text-gray-500">
                        <span className="w-4 h-0.5 bg-[#FC7800] inline-block rounded" /> Item Cost
                      </span>
                      <span className="flex items-center gap-1.5 text-[10px] text-gray-500">
                        <span className="w-4 h-0.5 bg-[#0f0f0f] inline-block rounded" /> C/IVACP
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-xl p-6 text-center">
                    <p className="text-sm text-gray-400">No previous scans for this supplier.</p>
                    <p className="text-xs text-gray-400 mt-1">Apply prices to start building history.</p>
                  </div>
                )}
              </div>

              {/* Supplier comparison */}
              {comparisons.length > 1 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Supplier Comparison</h3>
                  <div className="space-y-2">
                    {comparisons.map((comp, i) => (
                      <div key={comp.supplier_name}
                        className={`rounded-xl px-4 py-3 flex items-center justify-between border ${
                          comp.is_cheapest ? 'bg-green-50 border-green-200' :
                          comp.supplier_name === supplierName ? 'bg-orange-50 border-orange-200' :
                          'bg-white border-gray-100'}`}>
                        <div className="flex items-center gap-2.5">
                          <span className="text-base">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                          <div>
                            <p className="text-sm font-medium text-[#0f0f0f]">{comp.supplier_name}</p>
                            <p className="text-xs text-gray-400">
                              {new Date(comp.scanned_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold text-sm ${comp.is_cheapest ? 'text-green-700' : 'text-[#0f0f0f]'}`}>
                            €{comp.item_cost.toFixed(3)}
                          </p>
                          {comp.is_cheapest
                            ? <span className="text-[10px] text-green-600 font-medium">Cheapest</span>
                            : <span className="text-[10px] text-gray-400">+€{(comp.item_cost - comparisons[0].item_cost).toFixed(3)}</span>
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Editable Price Cell ──────────────────────────────────────────────────────

function EditableCell({
  value, highlight, decimals = 2, onSave,
}: {
  value: number
  highlight?: boolean
  decimals?: number
  onSave: (v: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editing && ref.current) ref.current.select() }, [editing])

  function commit() {
    const v = parseFloat(draft)
    if (!isNaN(v) && v >= 0) onSave(v)
    setEditing(false)
  }

  if (editing) return (
    <td className="px-3 py-2.5 whitespace-nowrap">
      <input ref={ref} type="number" step={decimals === 3 ? '0.001' : '0.01'}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') setEditing(false)
        }}
        className="w-20 text-sm font-semibold text-[#FC7800] border border-[#FC7800] rounded-md px-2 py-1 outline-none bg-orange-50"
      />
    </td>
  )

  return (
    <td
      className={`px-3 py-2.5 whitespace-nowrap text-sm cursor-pointer group ${highlight ? 'font-bold text-[#FC7800]' : 'text-[#0f0f0f]'}`}
      onClick={() => { setDraft(value.toFixed(decimals)); setEditing(true) }}
      title="Click to edit"
    >
      <span className="flex items-center gap-0.5">
        €{value.toFixed(decimals)}
        <svg className="w-2.5 h-2.5 text-gray-300 group-hover:text-[#FC7800] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </span>
    </td>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PricingToolPage() {
  
  const isMobile = useIsMobile();
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<ExtractedProduct[]>([])
  const [supplierName, setSupplierName] = useState('')
  const [transportPct, setTransportPct] = useState(4.15)
  const [storeId, setStoreId] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<ExtractedProduct | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const [applyingAll, setApplyingAll] = useState(false)
  const [saved, setSaved] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function getStore() {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) return
      const { data } = await supabase.from('stores').select('id').eq('user_id', user.id).single()
      if (data) setStoreId(data.id)
    }
    getStore()
  }, [])

  // ── Recalculate a product row ──────────────────────────────────────────────
  function recalc(p: ExtractedProduct, overrides: Partial<ExtractedProduct> = {}): ExtractedProduct {
    const merged = { ...p, ...overrides }
    const prices = calcPrices(merged.item_cost, merged.transport_pct, merged)
    const units  = getUnitsFromPackSize(merged.pack_size)
    return {
      ...merged,
      ...prices,
      total_stock_units: units * merged.qty_cases,
      total_cost: r(merged.item_cost * merged.qty_cases, 2),
    }
  }

  // ── Field change handler ───────────────────────────────────────────────────
  function handleFieldChange(index: number, field: string, value: number) {
    setProducts(prev => prev.map((p, i) => {
      if (i !== index) return p
      return recalc(p, { [field]: value } as Partial<ExtractedProduct>)
    }))
  }

  // ── Override a computed price manually (breaks formula link for that cell) ─
  function handleComputedPriceEdit(index: number, field: keyof ExtractedProduct, value: number) {
    setProducts(prev => prev.map((p, i) =>
      i === index ? { ...p, [field]: value } : p
    ))
  }

  // ── Toggle markup editor row ───────────────────────────────────────────────
  function toggleExpanded(index: number) {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  // ── Extract with AI ────────────────────────────────────────────────────────
  async function handleExtract() {
    if (!file) return
    setLoading(true)
    setProducts([])
    setSaved(false)
    setExpandedRows(new Set())

    try {
      const base64Data = await fileToBase64Full(file)
      const res = await fetch('/api/pricing-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData: base64Data,
          
          transportPct,
        }),
      })
      const data = await res.json()
      if (!data.products) throw new Error('No products extracted')

      const extractedSupplier = data.supplierName || (data as any).supplier || ''
      if (extractedSupplier) setSupplierName(extractedSupplier)

      // Build product list with correct formulas + history comparison
      const enriched: ExtractedProduct[] = await Promise.all(
        (data.products as Partial<ExtractedProduct>[]).map(async (raw) => {
          const base: ExtractedProduct = {
            name: raw.name || '',
            pack_size: raw.pack_size || (raw as any).packSize || '',
            qty_cases: raw.qty_cases || (raw as any).qty || 1,
            cost_siva: raw.cost_siva ?? (raw as any).costSIVA ?? 0,
            // item_cost: use what AI returns, default to cost_siva if missing
            item_cost: raw.item_cost ?? raw.cost_siva ?? (raw as any).costSIVA ?? 0,
            transport_pct: transportPct,
            // Per-product markups — AI returns these, else defaults
            iva_pct: raw.iva_pct ?? DEFAULT_MARKUPS.iva_pct,
            shop_sem_pct: raw.shop_sem_pct ?? DEFAULT_MARKUPS.shop_sem_pct,
            shop_com_pct: raw.shop_com_pct ?? DEFAULT_MARKUPS.shop_com_pct,
            special_pct: raw.special_pct ?? DEFAULT_MARKUPS.special_pct,
            big_wholesale_pct: raw.big_wholesale_pct ?? DEFAULT_MARKUPS.big_wholesale_pct,
            rest_com_pct: raw.rest_com_pct ?? DEFAULT_MARKUPS.rest_com_pct,
            // will be filled by recalc
            itemwt: 0, civacp: 0, shop_sem: 0, shop_com: 0,
            special: 0, big_wholesale: 0, rest_com: 0,
            total_stock_units: 0, total_cost: 0,
            price_direction: 'new',
            price_change_pct: 0,
          }

          const calculated = recalc(base)

          // History comparison
          if (storeId) {
            const { data: lastScan } = await supabase
              .from('price_history')
              .select('item_cost')
              .eq('store_id', storeId)
              .ilike('product_name', `%${base.name.substring(0, 15)}%`)
              .ilike('supplier_name', `%${(extractedSupplier || supplierName).substring(0, 10)}%`)
              .order('scanned_at', { ascending: false })
              .limit(1)
              .maybeSingle()

            if (lastScan) {
              const diff = calculated.item_cost - lastScan.item_cost
              const pct = r((diff / lastScan.item_cost) * 100, 1)
              calculated.price_change_pct = pct
              calculated.price_direction = Math.abs(diff) < 0.001 ? 'same' : diff > 0 ? 'up' : 'down'
            }
          }

          return calculated
        })
      )

      setProducts(enriched)
    } catch (err) {
      console.error(err)
      alert('Failed to extract invoice. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Apply All Prices ───────────────────────────────────────────────────────
  async function handleApplyAll() {
    if (!storeId || products.length === 0) return
    setApplyingAll(true)
    try {
      const finalSupplier = supplierName || 'Unknown Supplier'

      // 1. Save to price_history
      await supabase.from('price_history').insert(
        products.map(p => ({
          store_id: storeId,
          product_name: p.name,
          supplier_name: finalSupplier,
          cost_siva: p.cost_siva,
          item_cost: p.item_cost,
          itemwt: p.itemwt,
          civacp: p.civacp,
          shop_sem: p.shop_sem,
          shop_com: p.shop_com,
          special: p.special,
          big_wholesale: p.big_wholesale,
          rest_com: p.rest_com,
          transport_pct: p.transport_pct,
          iva_pct: p.iva_pct,
          shop_sem_pct: p.shop_sem_pct,
          shop_com_pct: p.shop_com_pct,
          special_pct: p.special_pct,
          big_wholesale_pct: p.big_wholesale_pct,
          rest_com_pct: p.rest_com_pct,
        }))
      )

      // 2. Upsert inventory
      for (const p of products) {
        const { data: existing } = await supabase
          .from('products')
          .select('id')
          .eq('store_id', storeId)
          .ilike('name', `%${p.name.substring(0, 15)}%`)
          .maybeSingle()

        if (existing) {
          await supabase.from('products').update({
            cost_price: p.item_cost,
            selling_price: p.shop_com,
          }).eq('id', existing.id)
        } else {
          await supabase.from('products').insert({
            store_id: storeId,
            name: p.name,
            cost_price: p.item_cost,
            selling_price: p.shop_com,
            supplier: finalSupplier,
            stock: p.total_stock_units,
          })
        }
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error(err)
      alert('Failed to save prices.')
    } finally {
      setApplyingAll(false)
    }
  }

  // ── Exports ────────────────────────────────────────────────────────────────
  function exportExcel() {
    const rows = products.map(p => ({
      'SR': products.indexOf(p) + 1,
      'Product': p.name,
      'Pack Size': p.pack_size,
      'Qty Cases': p.qty_cases,
      'COST S/IVA': p.cost_siva,
      'ITEM COST': p.item_cost,
      'IVA %': `${(p.iva_pct * 100).toFixed(0)}%`,
      'ITEM W/T': r(p.itemwt, 3),
      'C/IVACP': r(p.civacp, 2),
      'SHOP SEM': r(p.shop_sem, 2),
      'SHOP COM': r(p.shop_com, 2),
      'SPECIAL': r(p.special, 2),
      'BIG WHOLESALE': r(p.big_wholesale, 2),
      'REST COM': r(p.rest_com, 2),
      'Total Stock Units': p.total_stock_units,
      'Total Cost': p.total_cost,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Pricing')
    XLSX.writeFile(wb, `samzy-pricing-${supplierName || 'invoice'}.xlsx`)
  }

  function exportPDF() {
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(14)
    doc.text(`Samzy Pricing — ${supplierName || 'Invoice'}`, 14, 15)
    doc.setFontSize(8)
    doc.text(`Transport: ${transportPct}% · Generated ${new Date().toLocaleDateString('en-GB')}`, 14, 22)
    autoTable(doc, {
      startY: 27,
      head: [['Product', 'Pack', 'Qty', 'S/IVA', 'Item Cost', 'IVA', 'W/T', 'C/IVACP', 'Shop Sem', 'Shop Com', 'Special', 'Wholesale', 'Rest Com']],
      body: products.map(p => [
        p.name, p.pack_size, p.qty_cases,
        `€${p.cost_siva.toFixed(3)}`,
        `€${p.item_cost.toFixed(3)}`,
        `${(p.iva_pct * 100).toFixed(0)}%`,
        `€${p.itemwt.toFixed(3)}`,
        `€${p.civacp.toFixed(2)}`,
        `€${p.shop_sem.toFixed(2)}`,
        `€${p.shop_com.toFixed(2)}`,
        `€${p.special.toFixed(2)}`,
        `€${p.big_wholesale.toFixed(2)}`,
        `€${p.rest_com.toFixed(2)}`,
      ]),
      styles: { fontSize: 6.5 },
      headStyles: { fillColor: [252, 120, 0] },
    })
    doc.save(`samzy-pricing-${supplierName || 'invoice'}.pdf`)
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalInvoice  = products.reduce((s, p) => s + p.total_cost, 0)
  const totalUnits    = products.reduce((s, p) => s + p.total_stock_units, 0)
  const priceAlerts   = products.filter(p => p.price_direction === 'up').length
  const priceDrops    = products.filter(p => p.price_direction === 'down').length

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#FAFAF8]">

      {/* Samzy Header */}
      <header style={{ background: CARD_BG, borderBottom: "1px solid " + BORDER, padding: isMobile ? "0 16px" : "0 40px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <Image src="/logo.png" alt="Samzy" width={28} height={28} />
            <span style={{ color: BLACK, fontWeight: 700, fontSize: 16 }}>Samzy</span>
          </a>
          <span style={{ background: ORANGE, color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6 }}>Smart Pricing</span>
        </div>
        <a href="/" style={{ color: MUTED, fontSize: 13, textDecoration: "none" }}>← Back to Dashboard</a>
      </header>

      {/* Action bar */}
      <div className="bg-white border-b border-gray-100 px-6 py-3">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Upload invoice · AI extracts products · Correct formulas · Apply to inventory</p>
          </div>
          {products.length > 0 && (
            <div className="flex items-center gap-2">
              <button onClick={exportExcel}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Excel
              </button>
              <button onClick={exportPDF}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                PDF
              </button>
              <button
                onClick={handleApplyAll}
                disabled={applyingAll || saved}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  saved ? 'bg-green-500 text-white' : 'bg-[#FC7800] text-white hover:bg-orange-600'}`}>
                {applyingAll
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : saved
                  ? <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Saved!</>
                  : 'Apply All Prices'
                }
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-5">

        {/* Upload card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* File */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Invoice File</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-4 cursor-pointer transition-colors text-center ${
                  file ? 'border-[#FC7800] bg-orange-50' : 'border-gray-200 hover:border-[#FC7800] hover:bg-orange-50/30'}`}>
                <input ref={fileInputRef} type="file" accept=".pdf,image/*" className="hidden"
                  onChange={e => setFile(e.target.files?.[0] || null)} />
                {file ? (
                  <>
                    <p className="text-sm font-medium text-[#FC7800]">{file.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{(file.size / 1024).toFixed(0)} KB</p>
                  </>
                ) : (
                  <>
                    <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-sm text-gray-400">PDF or image</p>
                    <p className="text-xs text-gray-300 mt-0.5">click to browse</p>
                  </>
                )}
              </div>
            </div>

            {/* Supplier + transport */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Supplier Name</label>
                <input type="text" placeholder="e.g. KRG Asian Food" value={supplierName}
                  onChange={e => setSupplierName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FC7800]/30 focus:border-[#FC7800]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Transport % <span className="normal-case font-normal text-gray-400">(default 4.15%)</span>
                </label>
                <input type="number" step="0.01" value={transportPct}
                  onChange={e => setTransportPct(isNaN(parseFloat(e.target.value)) ? 4.15 : parseFloat(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FC7800]/30 focus:border-[#FC7800]" />
              </div>
            </div>

            {/* Extract button */}
            <div className="flex flex-col justify-end gap-2">
              <button
                onClick={handleExtract}
                disabled={!file || loading}
                className="w-full py-3 bg-[#0f0f0f] text-white rounded-xl font-semibold text-sm hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                {loading
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Extracting…</>
                  : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>Extract with AI</>
                }
              </button>
              {products.length > 0 && (
                <p className="text-center text-xs text-gray-400">{products.length} products · click ⚙ to edit markups per product</p>
              )}
            </div>
          </div>
        </div>

        {/* Stats banner */}
        {products.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-gray-100 px-4 py-3">
              <p className="text-xs text-gray-500">Invoice Total</p>
              <p className="text-lg font-bold text-[#0f0f0f] mt-0.5">€{totalInvoice.toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 px-4 py-3">
              <p className="text-xs text-gray-500">Total Units</p>
              <p className="text-lg font-bold text-[#0f0f0f] mt-0.5">{totalUnits.toLocaleString()}</p>
            </div>
            <div className={`rounded-xl border px-4 py-3 ${priceAlerts > 0 ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100'}`}>
              <p className="text-xs text-gray-500">Cost Increases</p>
              <p className={`text-lg font-bold mt-0.5 ${priceAlerts > 0 ? 'text-red-600' : 'text-[#0f0f0f]'}`}>
                {priceAlerts}{priceAlerts > 0 ? ' ⚠️' : ''}
              </p>
            </div>
            <div className={`rounded-xl border px-4 py-3 ${priceDrops > 0 ? 'bg-green-50 border-green-100' : 'bg-white border-gray-100'}`}>
              <p className="text-xs text-gray-500">Cost Drops</p>
              <p className={`text-lg font-bold mt-0.5 ${priceDrops > 0 ? 'text-green-600' : 'text-[#0f0f0f]'}`}>
                {priceDrops}{priceDrops > 0 ? ' ✅' : ''}
              </p>
            </div>
          </div>
        )}

        {/* Products table */}
        {products.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <span className="text-sm font-semibold text-[#0f0f0f]">
                Supplier: {supplierName || '—'}
                <span className="text-xs font-normal text-gray-400 ml-2">· Click any price to edit · Click product name for intelligence · ⚙ to edit markups</span>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#0f0f0f] text-white">
                    <th className="px-3 py-3 text-left text-xs font-semibold tracking-wider w-8"></th>
                    <th className="px-3 py-3 text-left text-xs font-semibold tracking-wider min-w-[200px]">PRODUCT</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold tracking-wider">S/IVA</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold tracking-wider text-orange-300">ITEM COST</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold tracking-wider">IVA</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold tracking-wider">ITEM W/T</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold tracking-wider text-[#FC7800]">C/IVACP</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold tracking-wider">SHOP SEM</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold tracking-wider">SHOP COM</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold tracking-wider">SPECIAL</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold tracking-wider">WHOLESALE</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold tracking-wider">REST COM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {products.map((p, i) => (
                    <>
                      <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                        {/* Expand toggle */}
                        <td className="px-3 py-2.5 text-center">
                          <button
                            onClick={() => toggleExpanded(i)}
                            className={`text-gray-400 hover:text-[#FC7800] transition-colors text-base leading-none ${expandedRows.has(i) ? 'text-[#FC7800]' : ''}`}
                            title="Edit markup rates">
                            ⚙
                          </button>
                        </td>

                        {/* Product name */}
                        <td className="px-3 py-2.5">
                          <button onClick={() => setSelectedProduct(p)} className="text-left group w-full">
                            <div className="flex items-start gap-1.5">
                              {p.price_direction === 'up' && (
                                <span className="text-[10px] bg-red-100 text-red-600 rounded-full px-1.5 py-0.5 font-semibold flex-shrink-0 mt-0.5">
                                  ↑{p.price_change_pct?.toFixed(0)}%
                                </span>
                              )}
                              {p.price_direction === 'down' && (
                                <span className="text-[10px] bg-green-100 text-green-600 rounded-full px-1.5 py-0.5 font-semibold flex-shrink-0 mt-0.5">
                                  ↓{Math.abs(p.price_change_pct ?? 0).toFixed(0)}%
                                </span>
                              )}
                              {p.price_direction === 'new' && (
                                <span className="text-[10px] bg-blue-100 text-blue-600 rounded-full px-1.5 py-0.5 font-semibold flex-shrink-0 mt-0.5">NEW</span>
                              )}
                              <div>
                                <p className="font-medium text-[#0f0f0f] group-hover:text-[#FC7800] transition-colors leading-tight">{p.name}</p>
                                <p className="text-[11px] text-[#FC7800] mt-0.5">{p.pack_size} · {p.qty_cases} cases</p>
                                <p className="text-[11px] text-blue-500">{p.total_stock_units} units · €{p.total_cost.toFixed(2)}</p>
                              </div>
                            </div>
                          </button>
                        </td>

                        {/* S/IVA — display only (invoice price) */}
                        <td className="px-3 py-2.5 text-gray-400 text-sm whitespace-nowrap">
                          €{p.cost_siva.toFixed(3)}
                        </td>

                        {/* ITEM COST — editable, drives everything */}
                        <EditableCell value={p.item_cost} decimals={3} highlight
                          onSave={v => handleFieldChange(i, 'item_cost', v)} />

                        {/* IVA % — display only (edit in markup panel) */}
                        <td className="px-3 py-2.5 text-gray-500 text-sm whitespace-nowrap">
                          {(p.iva_pct * 100).toFixed(0)}%
                        </td>

                        {/* ITEM W/T — computed, display only */}
                        <td className="px-3 py-2.5 text-[#0f0f0f] text-sm whitespace-nowrap">
                          €{p.itemwt.toFixed(3)}
                        </td>

                        {/* C/IVACP — computed, editable override */}
                        <EditableCell value={p.civacp} highlight
                          onSave={v => handleComputedPriceEdit(i, 'civacp', v)} />

                        {/* Selling prices — all editable overrides */}
                        <EditableCell value={p.shop_sem}
                          onSave={v => handleComputedPriceEdit(i, 'shop_sem', v)} />
                        <EditableCell value={p.shop_com}
                          onSave={v => handleComputedPriceEdit(i, 'shop_com', v)} />
                        <EditableCell value={p.special}
                          onSave={v => handleComputedPriceEdit(i, 'special', v)} />
                        <EditableCell value={p.big_wholesale}
                          onSave={v => handleComputedPriceEdit(i, 'big_wholesale', v)} />
                        <EditableCell value={p.rest_com}
                          onSave={v => handleComputedPriceEdit(i, 'rest_com', v)} />
                      </tr>

                      {/* Expandable markup editor */}
                      {expandedRows.has(i) && (
                        <MarkupEditor key={`markup-${i}`} product={p} index={i} onChange={handleFieldChange} />
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Intelligence drawer */}
      {selectedProduct && storeId && (
        <IntelligenceDrawer
          product={selectedProduct}
          storeId={storeId}
          supplierName={supplierName}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      <style jsx global>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────



function getUnitsFromPackSize(packSize: string): number {
  if (!packSize) return 1
  const match = packSize.match(/^(\d+)\s*[x×*]/i)
  return match ? parseInt(match[1]) : 1
}

// Keeps the full data:...;base64,... prefix (needed by /api/pricing-scan)
function fileToBase64Full(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}