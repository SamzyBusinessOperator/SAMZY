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

function insightColor(type: string) {
  return ({ positive: "#22c55e", warning: "#f59e0b", alert: "#ef4444", tip: "#3b82f6" } as any)[type] || "#64748b";
}

export default function Home() {
  const [activeNav, setActiveNav] = useState("dashboard");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) window.location.href = "/login";
    });
  }, []);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dbStatus, setDbStatus] = useState("connecting");
  const [storeName, setStoreName] = useState("Your Store");
  const [userEmail, setUserEmail] = useState("");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<{q: string, a: string}[]>([]);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }
  const maxSale = Math.max(...mockData.weekSales.map((d) => d.amount));
  const salesGrowth = (((mockData.todaySales - mockData.yesterdaySales) / mockData.yesterdaySales) * 100).toFixed(1);

  useEffect(() => {
   setStoreName(user.user_metadata?.store_name || user.email || "My Store");
setDbStatus("connected");
      }
    });
  }, []);

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
    <div style={{ display: "flex", height: "100vh", background: "#f8fafc", fontFamily: "Georgia, serif", overflow: "hidden" }}>
      <aside style={{ background: "#0f172a", display: "flex", flexDirection: "column", width: sidebarOpen ? 220 : 64, transition: "width 0.2s", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 16px", borderBottom: "1px solid #1e293b" }}>
          {sidebarOpen && <span style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>🛒 Samzy</span>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 12 }}>
            {sidebarOpen ? "◀" : "▶"}
          </button>
        </div>
        <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {navItems.map((item) => (
            <button key={item.id} onClick={() => setActiveNav(item.id)} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px", borderRadius: 8,
              background: activeNav === item.id ? "#1e293b" : "none", border: "none",
              color: activeNav === item.id ? "#fff" : "#94a3b8", cursor: "pointer", fontSize: 13, textAlign: "left", width: "100%"
            }}>
              <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
        {sidebarOpen && (
          <div style={{ padding: 16, borderTop: "1px solid #1e293b" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: dbStatus === "connected" ? "#22c55e" : "#f59e0b" }} />
              <span style={{ fontSize: 11, color: "#94a3b8" }}>{dbStatus === "connected" ? "Live" : "Connecting..."}</span>
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{storeName}</div>
          </div>
        )}
      </aside>
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 32px 0" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: "#0f172a" }}>
              {activeNav === "dashboard" ? "Good morning 👋" : activeNav === "ai" ? "AI Advisor ✦" : activeNav.charAt(0).toUpperCase() + activeNav.slice(1)}
            </h1>
            <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 14 }}>
              {activeNav === "dashboard" ? "Here's what's happening at your store today" : "Manage your " + activeNav}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}><div style={{ background: "#f1f5f9", color: "#475569", padding: "6px 14px", borderRadius: 20, fontSize: 13 }}>Sunday, May 16, 2026</div><button onClick={handleLogout} style={{ padding: "6px 14px", borderRadius: 20, background: "#fef2f2", border: "none", color: "#ef4444", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Sign Out</button></div>
        </header>
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 32px 32px" }}>
          {activeNav === "dashboard" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 20 }}>
                {[
                  { title: "Today Sales", value: "$" + mockData.todaySales.toLocaleString(), sub: "+" + salesGrowth + "% vs yesterday", color: "#22c55e", icon: "💵" },
                  { title: "Monthly Revenue", value: "$" + mockData.monthSales.toLocaleString(), sub: "May 2026", color: "#3b82f6", icon: "📊" },
                  { title: "Cash Flow", value: "$" + mockData.cashFlow.toLocaleString(), sub: "Available", color: "#f59e0b", icon: "🏦" },
                  { title: "Low Stock Alerts", value: String(mockData.lowStock.length), sub: "Need reordering", color: "#ef4444", icon: "⚠️" },
                ].map((k) => (
                  <div key={k.title} style={{ background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>{k.icon}</div>
                    <div style={{ fontSize: 26, fontWeight: 700, color: k.color }}>{k.value}</div>
                    <div style={{ fontSize: 13, color: "#374151", fontWeight: 600 }}>{k.title}</div>
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>{k.sub}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                <div style={{ background: "#fff", borderRadius: 14, padding: 22, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                  <h2 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Weekly Sales</h2>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 140 }}>
                    {mockData.weekSales.map((d) => (
                      <div key={d.day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%" }}>
                        <div style={{ fontSize: 9, color: "#94a3b8", marginBottom: 4 }}>${(d.amount / 1000).toFixed(1)}k</div>
                        <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end" }}>
                          <div style={{ width: "100%", height: (d.amount / maxSale * 100) + "%", background: d.day === "Sun" ? "#22c55e" : "#3b82f6", borderRadius: "4px 4px 0 0" }} />
                        </div>
                        <div style={{ fontSize: 11, color: "#64748b", marginTop: 6 }}>{d.day}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ background: "#fff", borderRadius: 14, padding: 22, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                  <h2 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Top Products Today</h2>
                  {mockData.topProducts.map((p, i) => (
                    <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                      <span style={{ color: "#94a3b8", fontSize: 12, width: 24, textAlign: "center", fontWeight: 700 }}>#{i + 1}</span>
                      <span style={{ flex: 1, fontSize: 13, color: "#1e293b" }}>{p.name}</span>
                      <span style={{ fontSize: 12, color: "#94a3b8" }}>{p.sales} sold</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#22c55e" }}>${p.revenue}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background: "#fff", borderRadius: 14, padding: 22, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <h2 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>✦ AI Insights</h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {mockData.aiInsights.map((ins, i) => (
                    <div key={i} style={{ border: "1px solid " + insightColor(ins.type), borderRadius: 10, padding: 14, display: "flex", gap: 10 }}>
                      <span style={{ fontSize: 20 }}>{ins.icon}</span>
                      <p style={{ margin: 0, fontSize: 13, color: "#334155", lineHeight: 1.5 }}>{ins.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {activeNav === "inventory" && (
            <div style={{ background: "#fff", borderRadius: 14, padding: 22, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <h2 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Low Stock Alerts</h2>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["Product","Category","In Stock","Threshold","Status"].map(h => <th key={h} style={{ textAlign: "left", fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", padding: "8px 12px", borderBottom: "1px solid #f1f5f9" }}>{h}</th>)}</tr></thead>
                <tbody>{mockData.lowStock.map(item => (
                  <tr key={item.name}>
                    <td style={{ padding: 12, fontSize: 13 }}>{item.name}</td>
                    <td style={{ padding: 12 }}><span style={{ background: "#f1f5f9", color: "#475569", padding: "3px 8px", borderRadius: 6, fontSize: 11 }}>{item.category}</span></td>
                    <td style={{ padding: 12, fontSize: 13, color: "#ef4444", fontWeight: 700 }}>{item.stock}</td>
                    <td style={{ padding: 12, fontSize: 13 }}>{item.threshold}</td>
                    <td style={{ padding: 12 }}><span style={{ background: "#fef2f2", color: "#ef4444", padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>Reorder Now</span></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
          {activeNav === "staff" && (
            <div style={{ background: "#fff", borderRadius: 14, padding: 22, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <h2 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700 }}>Today Staff</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {mockData.staff.map(s => (
                  <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 14, padding: 16, borderRadius: 12, border: "1px solid #f1f5f9", background: "#fafafa" }}>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#0f172a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 }}>{s.name.split(" ").map((n: string) => n[0]).join("")}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{s.name}</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>{s.role}</div>
                      <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>🕐 {s.shift}</div>
                    </div>
                    <span style={{ background: s.status === "on" ? "#f0fdf4" : "#f8fafc", color: s.status === "on" ? "#22c55e" : "#94a3b8", padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{s.status === "on" ? "On Shift" : "Off"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {activeNav === "suppliers" && (
            <div style={{ background: "#fff", borderRadius: 14, padding: 22, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <h2 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700 }}>Supplier Invoices</h2>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["Supplier","Invoice","Due Date","Status"].map(h => <th key={h} style={{ textAlign: "left", fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", padding: "8px 12px", borderBottom: "1px solid #f1f5f9" }}>{h}</th>)}</tr></thead>
                <tbody>{mockData.suppliers.map(s => (
                  <tr key={s.name}>
                    <td style={{ padding: 12, fontSize: 13 }}>{s.name}</td>
                    <td style={{ padding: 12, fontSize: 13 }}>{s.invoice}</td>
                    <td style={{ padding: 12, fontSize: 13 }}>{s.due}</td>
                    <td style={{ padding: 12 }}><span style={{ background: s.status === "paid" ? "#f0fdf4" : s.status === "overdue" ? "#fef2f2" : "#fefce8", color: s.status === "paid" ? "#22c55e" : s.status === "overdue" ? "#ef4444" : "#f59e0b", padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{s.status.charAt(0).toUpperCase() + s.status.slice(1)}</span></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
          {activeNav === "finances" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
              {[
                { title: "Today Revenue", value: "$" + mockData.todaySales.toLocaleString(), color: "#22c55e", icon: "💵" },
                { title: "Monthly Revenue", value: "$" + mockData.monthSales.toLocaleString(), color: "#3b82f6", icon: "📊" },
                { title: "Cash Available", value: "$" + mockData.cashFlow.toLocaleString(), color: "#f59e0b", icon: "🏦" },
                { title: "Pending Invoices", value: "$4,900", color: "#ef4444", icon: "📄" },
              ].map(k => (
                <div key={k.title} style={{ background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{k.icon}</div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: k.color }}>{k.value}</div>
                  <div style={{ fontSize: 13, color: "#374151", fontWeight: 600 }}>{k.title}</div>
                </div>
              ))}
            </div>
          )}
          {activeNav === "ai" && (
            <div>
              <div style={{ background: "#fff", borderRadius: 14, padding: 22, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 20 }}>
                <h2 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700 }}>✦ AI Insights</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {mockData.aiInsights.map((ins, i) => (
                    <div key={i} style={{ background: "#f8fafc", borderLeft: "4px solid " + insightColor(ins.type), borderRadius: 10, padding: "16px 20px", display: "flex", gap: 14 }}>
                      <span style={{ fontSize: 28 }}>{ins.icon}</span>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: insightColor(ins.type), marginBottom: 4 }}>
                          {ins.type === "positive" ? "Good News" : ins.type === "warning" ? "Action Required" : ins.type === "alert" ? "Urgent Alert" : "Opportunity"}
                        </div>
                        <p style={{ color: "#1e293b", fontSize: 15, margin: 0 }}>{ins.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background: "linear-gradient(135deg, #0f172a, #1e3a5f)", borderRadius: 14, padding: 22 }}>
                <h2 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: "#fff" }}>✦ Ask your AI Advisor</h2>
                <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 20 }}>Powered by Claude — ask anything about your business</p>
                {chatHistory.length > 0 && (
                  <div style={{ marginBottom: 20, display: "flex", flexDirection: "column", gap: 16 }}>
                    {chatHistory.map((chat, i) => (
                      <div key={i}>
                        <div style={{ background: "#1e3a5f", borderRadius: 10, padding: "10px 14px", marginBottom: 8 }}>
                          <p style={{ margin: 0, color: "#e2e8f0", fontSize: 14 }}>🧑 {chat.q}</p>
                        </div>
                        <div style={{ background: "#0f2744", borderRadius: 10, padding: "12px 16px", borderLeft: "3px solid #3b82f6" }}>
                          <p style={{ margin: 0, color: "#cbd5e1", fontSize: 14, lineHeight: 1.6 }}>✦ {chat.a}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: "flex", gap: 10 }}>
                  <input
                    value={question}
                    onChange={e => setQuestion(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && askAdvisor()}
                    placeholder="e.g. What should I reorder this week?"
                    style={{ flex: 1, padding: "12px 16px", borderRadius: 10, border: "1px solid #334155", background: "#1e293b", color: "#e2e8f0", fontSize: 14, outline: "none" }}
                  />
                  <button onClick={askAdvisor} disabled={loading} style={{ padding: "12px 20px", borderRadius: 10, background: loading ? "#334155" : "#3b82f6", border: "none", color: "#fff", fontWeight: 700, fontSize: 14, cursor: loading ? "not-allowed" : "pointer" }}>
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
