"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: "▦" },
  { id: "inventory", label: "Inventory", icon: "📦" },
  { id: "staff", label: "Staff", icon: "👥" },
  { id: "suppliers", label: "Suppliers", icon: "🚚" },
  { id: "finances", label: "Finances", icon: "💰" },
  { id: "ai", label: "AI Advisor", icon: "✦" },
  { id: "profile", label: "Profile", icon: "👤" },
];

const mockData = {
  todaySales: 4820, yesterdaySales: 4210, monthSales: 98340, cashFlow: 12450,
  lowStock: [
    { name: "Whole Milk 1L", stock: 4, threshold: 20, category: "Dairy" },
    { name: "Bread (White)", stock: 6, threshold: 15, category: "Bakery" },
    { name: "Eggs (12pk)", stock: 3, threshold: 10, category: "Dairy" },
  ],
  topProducts: [
    { name: "Coca-Cola 2L", sales: 142, revenue: 284 },
    { name: "Whole Milk 1L", sales: 98, revenue: 196 },
    { name: "White Bread", sales: 87, revenue: 130 },
    { name: "Orange Juice 1L", sales: 76, revenue: 228 },
  ],
  staff: [
    { name: "Maria Santos", role: "Cashier", shift: "08:00-16:00", status: "on" },
    { name: "Joao Ferreira", role: "Stock Manager", shift: "07:00-15:00", status: "on" },
    { name: "Ana Lima", role: "Cashier", shift: "14:00-22:00", status: "off" },
  ],
  suppliers: [
    { name: "FreshFarm Co.", invoice: "$1,240", due: "May 20", status: "pending" },
    { name: "Metro Wholesale", invoice: "$3,100", due: "May 18", status: "overdue" },
    { name: "Dairy Direct", invoice: "$560", due: "May 25", status: "paid" },
  ],
  aiInsights: [
    { icon: "📈", text: "Sales are up 14.5% vs yesterday. Promotion on beverages is working well.", type: "positive" },
    { icon: "⚠️", text: "Eggs and Milk will stock out within 2 days. Reorder now.", type: "warning" },
    { icon: "💡", text: "Tuesday afternoons are slow. Consider a 10% discount on near-expiry items.", type: "tip" },
    { icon: "🚨", text: "Metro Wholesale invoice is overdue. Pay to avoid supply disruption.", type: "alert" },
  ],
  weekSales: [
    { day: "Mon", amount: 3800 }, { day: "Tue", amount: 3200 }, { day: "Wed", amount: 4100 },
    { day: "Thu", amount: 3750 }, { day: "Fri", amount: 5200 }, { day: "Sat", amount: 6100 }, { day: "Sun", amount: 4820 },
  ],
};

const ORANGE = "#FC7800";
const BLACK = "#0f0f0f";
const WARM_BG = "#FAFAF8";
const CARD_BG = "#FFFFFF";
const BORDER = "#F0EEEB";
const MUTED = "#6B6B6B";
const LIGHT_ORANGE = "#FFF4E8";

function insightColor(type: string) {
  return ({ positive: "#16a34a", warning: "#d97706", alert: "#dc2626", tip: ORANGE } as any)[type] || MUTED;
}

function insightBg(type: string) {
  return ({ positive: "#f0fdf4", warning: "#fffbeb", alert: "#fef2f2", tip: LIGHT_ORANGE } as any)[type] || "#f8f8f8";
}

export default function Home() {
  const [activeNav, setActiveNav] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dbStatus, setDbStatus] = useState("connecting");
  const [storeName, setStoreName] = useState("Your Store");
  const [userEmail, setUserEmail] = useState("");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ q: string; a: string }[]>([]);
  const maxSale = Math.max(...mockData.weekSales.map((d) => d.amount));
  const salesGrowth = (((mockData.todaySales - mockData.yesterdaySales) / mockData.yesterdaySales) * 100).toFixed(1);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = "/landing"; return; }
      setStoreName(session.user.user_metadata?.store_name || session.user.email || "My Store");
      setDbStatus("connected");
      setTimeout(() => {
        supabase.from("stores").select("city, onboarding_complete").eq("owner_email", session.user.email || "").single().then(({ data }) => {
          if (data?.onboarding_complete === false) window.location.href = "/onboarding";
        });
      }, 500);
    });
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/landing";
  }

  async function askAdvisor() {
    if (!question.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, storeData: mockData }),
      });
      const data = await res.json();
      setChatHistory(prev => [...prev, { q: question, a: data.answer }]);
      setQuestion("");
    } catch {
      setChatHistory(prev => [...prev, { q: question, a: "Something went wrong. Please try again." }]);
    }
    setLoading(false);
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: WARM_BG, fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif", overflow: "hidden" }}>
      <aside style={{ background: BLACK, display: "flex", flexDirection: "column", width: sidebarOpen ? 240 : 72, transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: sidebarOpen ? "28px 24px 20px" : "28px 20px 20px", borderBottom: "1px solid #1a1a1a" }}>
          {sidebarOpen ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 30, height: 30, background: ORANGE, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🛒</div>
              <span style={{ color: "#fff", fontWeight: 700, fontSize: 17, letterSpacing: -0.3 }}>Samzy</span>
            </div>
          ) : (
            <div style={{ width: 30, height: 30, background: ORANGE, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🛒</div>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: "#1a1a1a", border: "none", color: "#666", cursor: "pointer", fontSize: 11, padding: "6px 8px", borderRadius: 6 }}>
            {sidebarOpen ? "◀" : "▶"}
          </button>
        </div>
        <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
          {navItems.map((item) => (
            <button key={item.id} onClick={() => item.id === "profile" ? window.location.href = "/profile" : setActiveNav(item.id)} style={{
              display: "flex", alignItems: "center", gap: 12, padding: sidebarOpen ? "11px 12px" : "11px",
              borderRadius: 10, background: activeNav === item.id ? "#1a1a1a" : "none", border: "none",
              color: activeNav === item.id ? "#fff" : "#666", cursor: "pointer", fontSize: 13.5,
              textAlign: "left", width: "100%", transition: "all 0.15s",
              borderLeft: activeNav === item.id ? "3px solid " + ORANGE : "3px solid transparent",
            }}>
              <span style={{ fontSize: 15, width: 20, textAlign: "center", flexShrink: 0 }}>{item.icon}</span>
              {sidebarOpen && <span style={{ fontWeight: activeNav === item.id ? 600 : 400 }}>{item.label}</span>}
            </button>
          ))}
        </nav>
        {sidebarOpen && (
          <div style={{ padding: "16px", borderTop: "1px solid #1a1a1a" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: dbStatus === "connected" ? "#22c55e" : "#f59e0b" }} />
              <span style={{ fontSize: 11, color: "#555" }}>{dbStatus === "connected" ? "Live" : "Connecting..."}</span>
            </div>
            <div style={{ fontSize: 12, color: "#444", fontWeight: 600, marginBottom: 2 }}>{storeName}</div>
            <button onClick={handleLogout} style={{ background: "none", border: "none", color: "#555", fontSize: 11, cursor: "pointer", padding: 0, marginTop: 4 }}>Sign out</button>
          </div>
        )}
      </aside>

      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "28px 40px 0", flexShrink: 0 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: BLACK, letterSpacing: -0.8 }}>
              {activeNav === "dashboard" && "Good morning 👋"}
              {activeNav === "inventory" && "Inventory"}
              {activeNav === "staff" && "Staff"}
              {activeNav === "suppliers" && "Suppliers"}
              {activeNav === "finances" && "Finances"}
              {activeNav === "ai" && "AI Advisor"}
            </h1>
            <p style={{ margin: "4px 0 0", color: MUTED, fontSize: 14 }}>
              {activeNav === "dashboard" ? "Here's what's happening at " + storeName + " today" : "Manage your " + activeNav}
            </p>
          </div>
          <div style={{ background: CARD_BG, border: "1px solid " + BORDER, color: MUTED, padding: "8px 16px", borderRadius: 20, fontSize: 13, fontWeight: 500 }}>
            {new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </div>
        </header>

        <div style={{ flex: 1, overflowY: "auto", padding: "24px 40px 40px" }}>

          {activeNav === "dashboard" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
                {[
                  { title: "Today's Sales", value: "$" + mockData.todaySales.toLocaleString(), sub: "+" + salesGrowth + "% vs yesterday", accent: ORANGE, icon: "💵" },
                  { title: "Monthly Revenue", value: "$" + mockData.monthSales.toLocaleString(), sub: "May 2026", accent: "#0071e3", icon: "📊" },
                  { title: "Cash Flow", value: "$" + mockData.cashFlow.toLocaleString(), sub: "Available balance", accent: "#16a34a", icon: "🏦" },
                  { title: "Low Stock Alerts", value: String(mockData.lowStock.length), sub: "Items need reorder", accent: "#dc2626", icon: "⚠️" },
                ].map((k) => (
                  <div key={k.title} style={{ background: CARD_BG, borderRadius: 16, padding: "24px", border: "1px solid " + BORDER, position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: 3, background: k.accent }} />
                    <div style={{ fontSize: 22, marginBottom: 12 }}>{k.icon}</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: BLACK, letterSpacing: -1, marginBottom: 2 }}>{k.value}</div>
                    <div style={{ fontSize: 13, color: BLACK, fontWeight: 600, marginBottom: 2 }}>{k.title}</div>
                    <div style={{ fontSize: 12, color: MUTED }}>{k.sub}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16, marginBottom: 24 }}>
                <div style={{ background: CARD_BG, borderRadius: 16, padding: "24px", border: "1px solid " + BORDER }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                    <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: BLACK }}>Weekly Sales</h2>
                    <span style={{ fontSize: 12, color: MUTED, background: WARM_BG, padding: "4px 10px", borderRadius: 20 }}>This week</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 140 }}>
                    {mockData.weekSales.map((d) => (
                      <div key={d.day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%" }}>
                        <div style={{ fontSize: 9, color: MUTED, marginBottom: 4 }}>${(d.amount / 1000).toFixed(1)}k</div>
                        <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end" }}>
                          <div style={{ width: "100%", height: (d.amount / maxSale * 100) + "%", background: d.day === "Sun" ? ORANGE : BORDER, borderRadius: "6px 6px 0 0" }} />
                        </div>
                        <div style={{ fontSize: 11, color: d.day === "Sun" ? ORANGE : MUTED, marginTop: 6, fontWeight: d.day === "Sun" ? 700 : 400 }}>{d.day}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ background: CARD_BG, borderRadius: 16, padding: "24px", border: "1px solid " + BORDER }}>
                  <h2 style={{ margin: "0 0 20px", fontSize: 15, fontWeight: 700, color: BLACK }}>Top Products Today</h2>
                  {mockData.topProducts.map((p, i) => (
                    <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < mockData.topProducts.length - 1 ? "1px solid " + BORDER : "none" }}>
                      <span style={{ width: 24, height: 24, background: i === 0 ? ORANGE : WARM_BG, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: i === 0 ? "#fff" : MUTED, flexShrink: 0 }}>{i + 1}</span>
                      <span style={{ flex: 1, fontSize: 13, color: BLACK, fontWeight: 500 }}>{p.name}</span>
                      <span style={{ fontSize: 12, color: MUTED }}>{p.sales} sold</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: ORANGE }}>${p.revenue}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background: CARD_BG, borderRadius: 16, padding: "24px", border: "1px solid " + BORDER }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                  <span style={{ fontSize: 16, color: ORANGE }}>✦</span>
                  <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: BLACK }}>AI Insights</h2>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {mockData.aiInsights.map((ins, i) => (
                    <div key={i} style={{ background: insightBg(ins.type), borderRadius: 12, padding: "16px", borderLeft: "3px solid " + insightColor(ins.type) }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <span style={{ fontSize: 18 }}>{ins.icon}</span>
                        <p style={{ margin: 0, fontSize: 13, color: BLACK, lineHeight: 1.6 }}>{ins.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeNav === "inventory" && (
            <div style={{ background: CARD_BG, borderRadius: 16, padding: "24px", border: "1px solid " + BORDER }}>
              <h2 style={{ margin: "0 0 20px", fontSize: 15, fontWeight: 700, color: BLACK }}>Low Stock Alerts</h2>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["Product","Category","In Stock","Threshold","Status"].map(h => <th key={h} style={{ textAlign: "left", fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, padding: "8px 12px", borderBottom: "1px solid " + BORDER }}>{h}</th>)}</tr></thead>
                <tbody>{mockData.lowStock.map(item => (
                  <tr key={item.name} style={{ borderBottom: "1px solid " + BORDER }}>
                    <td style={{ padding: "14px 12px", fontSize: 14, fontWeight: 500, color: BLACK }}>{item.name}</td>
                    <td style={{ padding: "14px 12px" }}><span style={{ background: WARM_BG, color: MUTED, padding: "3px 10px", borderRadius: 20, fontSize: 12 }}>{item.category}</span></td>
                    <td style={{ padding: "14px 12px", fontSize: 14, fontWeight: 700, color: "#dc2626" }}>{item.stock}</td>
                    <td style={{ padding: "14px 12px", fontSize: 14, color: MUTED }}>{item.threshold}</td>
                    <td style={{ padding: "14px 12px" }}><span style={{ background: "#fef2f2", color: "#dc2626", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>Reorder Now</span></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}

          {activeNav === "staff" && (
            <div style={{ background: CARD_BG, borderRadius: 16, padding: "24px", border: "1px solid " + BORDER }}>
              <h2 style={{ margin: "0 0 20px", fontSize: 15, fontWeight: 700, color: BLACK }}>Today's Staff</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {mockData.staff.map(s => (
                  <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px", borderRadius: 12, border: "1px solid " + BORDER, background: WARM_BG }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: BLACK, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{s.name.split(" ").map((n: string) => n[0]).join("")}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: BLACK }}>{s.name}</div>
                      <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{s.role}</div>
                      <div style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>🕐 {s.shift}</div>
                    </div>
                    <span style={{ background: s.status === "on" ? "#f0fdf4" : WARM_BG, color: s.status === "on" ? "#16a34a" : MUTED, padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{s.status === "on" ? "On Shift" : "Off"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeNav === "suppliers" && (
            <div style={{ background: CARD_BG, borderRadius: 16, padding: "24px", border: "1px solid " + BORDER }}>
              <h2 style={{ margin: "0 0 20px", fontSize: 15, fontWeight: 700, color: BLACK }}>Supplier Invoices</h2>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["Supplier","Invoice","Due Date","Status"].map(h => <th key={h} style={{ textAlign: "left", fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, padding: "8px 12px", borderBottom: "1px solid " + BORDER }}>{h}</th>)}</tr></thead>
                <tbody>{mockData.suppliers.map(s => (
                  <tr key={s.name} style={{ borderBottom: "1px solid " + BORDER }}>
                    <td style={{ padding: "14px 12px", fontSize: 14, fontWeight: 500, color: BLACK }}>{s.name}</td>
                    <td style={{ padding: "14px 12px", fontSize: 14, color: BLACK, fontWeight: 600 }}>{s.invoice}</td>
                    <td style={{ padding: "14px 12px", fontSize: 14, color: MUTED }}>{s.due}</td>
                    <td style={{ padding: "14px 12px" }}><span style={{ background: s.status === "paid" ? "#f0fdf4" : s.status === "overdue" ? "#fef2f2" : "#fffbeb", color: s.status === "paid" ? "#16a34a" : s.status === "overdue" ? "#dc2626" : "#d97706", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{s.status.charAt(0).toUpperCase() + s.status.slice(1)}</span></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}

          {activeNav === "finances" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
              {[
                { title: "Today's Revenue", value: "$" + mockData.todaySales.toLocaleString(), color: ORANGE, icon: "💵" },
                { title: "Monthly Revenue", value: "$" + mockData.monthSales.toLocaleString(), color: "#0071e3", icon: "📊" },
                { title: "Cash Available", value: "$" + mockData.cashFlow.toLocaleString(), color: "#16a34a", icon: "🏦" },
                { title: "Pending Invoices", value: "$4,900", color: "#dc2626", icon: "📄" },
              ].map(k => (
                <div key={k.title} style={{ background: CARD_BG, borderRadius: 16, padding: "24px", border: "1px solid " + BORDER, position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: 3, background: k.color }} />
                  <div style={{ fontSize: 22, marginBottom: 12 }}>{k.icon}</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: BLACK, letterSpacing: -1 }}>{k.value}</div>
                  <div style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>{k.title}</div>
                </div>
              ))}
            </div>
          )}

          {activeNav === "ai" && (
            <div>
              <div style={{ background: CARD_BG, borderRadius: 16, padding: "24px", border: "1px solid " + BORDER, marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                  <span style={{ color: ORANGE, fontSize: 16 }}>✦</span>
                  <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: BLACK }}>Today's Insights</h2>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {mockData.aiInsights.map((ins, i) => (
                    <div key={i} style={{ background: insightBg(ins.type), borderRadius: 12, padding: "16px 20px", borderLeft: "3px solid " + insightColor(ins.type), display: "flex", gap: 14 }}>
                      <span style={{ fontSize: 24 }}>{ins.icon}</span>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: insightColor(ins.type), marginBottom: 4 }}>
                          {ins.type === "positive" ? "Good News" : ins.type === "warning" ? "Action Required" : ins.type === "alert" ? "Urgent" : "Opportunity"}
                        </div>
                        <p style={{ color: BLACK, fontSize: 14, margin: 0, lineHeight: 1.6 }}>{ins.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background: BLACK, borderRadius: 16, padding: "28px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <span style={{ color: ORANGE, fontSize: 18 }}>✦</span>
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#fff" }}>Ask your AI Advisor</h2>
                </div>
                <p style={{ color: "#666", fontSize: 13, marginBottom: 24 }}>Powered by Claude — ask anything about your business</p>
                {chatHistory.length > 0 && (
                  <div style={{ marginBottom: 20, display: "flex", flexDirection: "column", gap: 14 }}>
                    {chatHistory.map((chat, i) => (
                      <div key={i}>
                        <div style={{ background: "#1a1a1a", borderRadius: 10, padding: "12px 16px", marginBottom: 8 }}>
                          <p style={{ margin: 0, color: "#aaa", fontSize: 13 }}>You: {chat.q}</p>
                        </div>
                        <div style={{ background: "#1a1a1a", borderRadius: 10, padding: "14px 18px", borderLeft: "3px solid " + ORANGE }}>
                          <p style={{ margin: 0, color: "#e5e5e5", fontSize: 14, lineHeight: 1.7 }}>✦ {chat.a}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: "flex", gap: 10 }}>
                  <input value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => e.key === "Enter" && askAdvisor()}
                    placeholder="e.g. What should I reorder this week?"
                    style={{ flex: 1, padding: "14px 18px", borderRadius: 10, border: "1px solid #2a2a2a", background: "#1a1a1a", color: "#fff", fontSize: 14, outline: "none" }} />
                  <button onClick={askAdvisor} disabled={loading}
                    style={{ padding: "14px 24px", borderRadius: 10, background: loading ? "#333" : ORANGE, border: "none", color: "#fff", fontWeight: 700, fontSize: 14, cursor: loading ? "not-allowed" : "pointer" }}>
                    {loading ? "..." : "Ask ✦"}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}