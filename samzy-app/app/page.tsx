"use client";
import { useIsMobile } from "@/lib/useIsMobile";
import Image from "next/image";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useLanguage } from "../lib/LanguageContext";
import { languages } from "../lib/translations";
import PageLoader from "./components/PageLoader";

const ORANGE = "#FC7800";
const BLACK = "#0f0f0f";
const WARM_BG = "#FAFAF8";
const CARD_BG = "#FFFFFF";
const BORDER = "#F0EEEB";
const MUTED = "#6B6B6B";
const LIGHT_ORANGE = "#FFF4E8";


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
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  const [staff, setStaff] = useState<any[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [productForm, setProductForm] = useState({ name: "", category: "Other", stock_quantity: "", price: "", reorder_threshold: "10" });
  const [inventoryTab, setInventoryTab] = useState<"all" | "low">("all");
  const [realStats, setRealStats] = useState({ todaySales: 0, yesterdaySales: 0, monthSales: 0, cashFlow: 0 });
  const [weekSalesData, setWeekSalesData] = useState<{day: string, amount: number}[]>([]);
  const [topProducts, setTopProducts] = useState<{name: string, sales: number, revenue: number}[]>([]);
  const [deleteModal, setDeleteModal] = useState<{ id: string; name: string; type: "product" | "staff" | "supplier" } | null>(null);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [supplierForm, setSupplierForm] = useState({ name: "", invoice_amount: "", due_date: "", status: "pending", notes: "" });
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [staffForm, setStaffForm] = useState({ name: "", role: "", shift: "", status: "on", phone: "" });
  const [products, setProducts] = useState<any[]>([]);
  const isMobile = useIsMobile();
  const { lang, setLang, tr } = useLanguage();
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: "▦" },
    { id: "inventory", label: tr.inventory, icon: "📦" },
    { id: "staff", label: tr.staff, icon: "👥" },
    { id: "suppliers", label: tr.suppliers, icon: "🚚" },
    { id: "finances", label: tr.finances, icon: "💰" },
    { id: "ai", label: tr.ai, icon: "✦" },
    { id: "scanner", label: "Scanner", icon: "📷" },
    { id: "profile", label: "Profile", icon: "👤" },
  ];
  async function fetchStaff(email: string) {
    if (!email) return;
    setStaffLoading(true);
    try {
      const { data, error } = await supabase.from("staff").select("*").ilike("store_email", email).order("created_at", { ascending: false });
      if (error) { console.error("fetchStaff error:", error.message); }
      else { console.log("fetchStaff success:", data?.length, "records for", email); }
      setStaff(data || []);
    } catch(e: any) {
      console.error("fetchStaff exception:", e.message);
    }
    setStaffLoading(false);
  }
  async function handleAddStaff() {
    if (!staffForm.name || !staffForm.role || !staffForm.shift) return;
    const { data: { session } } = await supabase.auth.getSession();
    const email = session?.user?.email || "";
    const { error: insertError } = await supabase.from("staff").insert([{ ...staffForm, store_email: email }]);
    console.log("Insert result:", insertError ? insertError.message : "success", "email:", email, "form:", staffForm);
    if (insertError) { alert("Error: " + insertError.message); return; }
    setShowAddStaff(false);
    setStaffForm({ name: "", role: "", shift: "", status: "on", phone: "" });
    fetchStaff(email);
  }
  async function handleEditStaff() {
    if (!editingStaff) return;
    const { data: { session } } = await supabase.auth.getSession();
    const email = session?.user?.email || "";
    await supabase.from("staff").update({ name: staffForm.name, role: staffForm.role, shift: staffForm.shift, status: staffForm.status, phone: staffForm.phone }).eq("id", editingStaff.id);
    setEditingStaff(null);
    setStaffForm({ name: "", role: "", shift: "", status: "on", phone: "" });
    fetchStaff(email);
  }
  async function handleDeleteStaff(id: string) {
    const { data: { session } } = await supabase.auth.getSession();
    const email = session?.user?.email || "";
    await supabase.from("staff").delete().eq("id", id);
    fetchStaff(email);
  }
  async function fetchSuppliers(email: string) {
    if (!email) return;
    setSuppliersLoading(true);
    try {
      const { data, error } = await supabase.from("suppliers").select("*").ilike("store_email", email).order("created_at", { ascending: false });
      if (error) console.error("fetchSuppliers error:", error.message);
      setSuppliers(data || []);
    } catch(e: any) { console.error("fetchSuppliers exception:", e.message); }
    setSuppliersLoading(false);
  }
  async function handleAddSupplier() {
    if (!supplierForm.name || !supplierForm.invoice_amount || !supplierForm.due_date) return;
    const { data: { session } } = await supabase.auth.getSession();
    const email = session?.user?.email || "";
    const { error } = await supabase.from("suppliers").insert([{ ...supplierForm, store_email: email }]);
    if (error) { alert("Error: " + error.message); return; }
    setShowAddSupplier(false);
    setSupplierForm({ name: "", invoice_amount: "", due_date: "", status: "pending", notes: "" });
    fetchSuppliers(email);
  }
  async function handleEditSupplier() {
    if (!editingSupplier) return;
    const { data: { session } } = await supabase.auth.getSession();
    const email = session?.user?.email || "";
    await supabase.from("suppliers").update({ name: supplierForm.name, invoice_amount: supplierForm.invoice_amount, due_date: supplierForm.due_date, status: supplierForm.status, notes: supplierForm.notes }).eq("id", editingSupplier.id);
    setEditingSupplier(null);
    setSupplierForm({ name: "", invoice_amount: "", due_date: "", status: "pending", notes: "" });
    fetchSuppliers(email);
  }
  async function handleDeleteSupplier(id: string) {
    const { data: { session } } = await supabase.auth.getSession();
    const email = session?.user?.email || "";
    await supabase.from("suppliers").delete().eq("id", id);
    fetchSuppliers(email);
  }
  async function fetchRealStats(email: string) {
    try {
      const { data: store } = await supabase.from("stores").select("id").ilike("owner_email", email).single();
      if (!store) return;
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
      const { data: storeData } = await supabase.from("stores").select("id").ilike("owner_email", email).single();
      if (!storeData) return;
      const sid = storeData.id;
      const { data: todaySalesData } = await supabase.from("sales").select("total").eq("store_id", sid).eq("sale_date", today);
      const { data: yesterdaySalesData } = await supabase.from("sales").select("total").eq("store_id", sid).eq("sale_date", yesterday);
      const { data: monthSalesData } = await supabase.from("sales").select("total").eq("store_id", sid).gte("sale_date", monthStart);
      const { data: supplierData } = await supabase.from("suppliers").select("invoice_amount").ilike("store_email", email).eq("status", "pending");
      const todayTotal = (todaySalesData || []).reduce((sum: number, s: any) => sum + parseFloat(s.total || 0), 0);
      const yesterdayTotal = (yesterdaySalesData || []).reduce((sum: number, s: any) => sum + parseFloat(s.total || 0), 0);
      const monthTotal = (monthSalesData || []).reduce((sum: number, s: any) => sum + parseFloat(s.total || 0), 0);
      const pendingInvoices = (supplierData || []).reduce((sum: number, s: any) => {
        const amt = parseFloat(String(s.invoice_amount).replace(/[^0-9.]/g, "")) || 0;
        return sum + amt;
      }, 0);
      setRealStats({ todaySales: todayTotal, yesterdaySales: yesterdayTotal, monthSales: monthTotal, cashFlow: monthTotal - pendingInvoices });
      // Week sales
      const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
      const weekData = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        const dateStr = d.toISOString().split("T")[0];
        const { data: daySales } = await supabase.from("sales").select("total").eq("store_id", store.id).eq("sale_date", dateStr);
        const total = (daySales || []).reduce((sum: number, s: any) => sum + parseFloat(s.total || 0), 0);
        weekData.push({ day: days[d.getDay()], amount: total });
      }
      setWeekSalesData(weekData);
      // Top products
      const { data: allSales } = await supabase.from("sales").select("product_name, quantity, total").eq("store_id", sid).gte("sale_date", monthStart);
      const productMap: Record<string, {sales: number, revenue: number}> = {};
      (allSales || []).forEach((s: any) => {
        if (!productMap[s.product_name]) productMap[s.product_name] = { sales: 0, revenue: 0 };
        productMap[s.product_name].sales += s.quantity;
        productMap[s.product_name].revenue += parseFloat(s.total || 0);
      });
      const topProds = Object.entries(productMap).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
      setTopProducts(topProds);
    } catch(e: any) { console.error("fetchRealStats error:", e.message); }
  }
  async function fetchProducts() {
    const { data: { session } } = await supabase.auth.getSession();
    const email = session?.user?.email || "";
    const { data: store } = await supabase.from("stores").select("id").ilike("owner_email", email).single();
    if (!store) return;
    const { data } = await supabase.from("products").select("*").eq("store_id", store.id);
    if (data) setProducts(data);
  }
  async function handleAddProduct() {
    if (!productForm.name || !productForm.stock_quantity) return;
    const { data: { session } } = await supabase.auth.getSession();
    const email = session?.user?.email || "";
    const { data: store } = await supabase.from("stores").select("id").ilike("owner_email", email).single();
    if (!store) { alert("Store not found."); return; }
    const storeId = store.id;
    const { error } = await supabase.from("products").insert([{ store_id: storeId, name: productForm.name, category: productForm.category, stock_quantity: parseInt(productForm.stock_quantity), price: parseFloat(productForm.price) || 0, reorder_threshold: parseInt(productForm.reorder_threshold) || 10 }]);
    if (error) { alert("Error: " + error.message); return; }
    setShowAddProduct(false);
    setProductForm({ name: "", category: "Other", stock_quantity: "", price: "", reorder_threshold: "10" });
    const { data } = await supabase.from("products").select("*").eq("store_id", storeId);
    if (data) setProducts(data);
  }
  async function handleEditProduct() {
    if (!editingProduct) return;
    const { data: { session } } = await supabase.auth.getSession();
    const email = session?.user?.email || "";
    const { data: store } = await supabase.from("stores").select("id").ilike("owner_email", email).single();
    if (!store) { alert("Store not found."); return; }
    const storeId = store.id;
    await supabase.from("products").update({ name: productForm.name, category: productForm.category, stock_quantity: parseInt(productForm.stock_quantity), price: parseFloat(productForm.price) || 0, reorder_threshold: parseInt(productForm.reorder_threshold) || 10 }).eq("id", editingProduct.id);
    setEditingProduct(null);
    setProductForm({ name: "", category: "Other", stock_quantity: "", price: "", reorder_threshold: "10" });
    const { data } = await supabase.from("products").select("*").eq("store_id", storeId);
    if (data) setProducts(data);
  }
  async function confirmDelete() {
    if (!deleteModal) return;
    const { id, type } = deleteModal;
    setDeleteModal(null);
    if (type === "product") {
      await supabase.from("products").delete().eq("id", id);
      setProducts(prev => prev.filter(p => String(p.id) !== String(id)));
    } else if (type === "staff") {
      const { data: { session } } = await supabase.auth.getSession();
      const email = session?.user?.email || "";
      await supabase.from("staff").delete().eq("id", id);
      fetchStaff(email);
    } else if (type === "supplier") {
      const { data: { session } } = await supabase.auth.getSession();
      const email = session?.user?.email || "";
      await supabase.from("suppliers").delete().eq("id", id);
      fetchSuppliers(email);
    }
  }
  async function handleDeleteProduct(id: string) {
    setEditingProduct(null);
    setShowAddProduct(false);

    const { error } = await supabase.from("products").delete().eq("id", id);
    console.log("Delete result:", error ? error.message : "success", "id:", id);
    const { data: { session } } = await supabase.auth.getSession();
    const email = session?.user?.email || "";
    const { data: store } = await supabase.from("stores").select("id").ilike("owner_email", email).single();
    fetchProducts();
  }
  const maxSale = Math.max(...mockData.weekSales.map((d) => d.amount));
  const salesGrowth = (((mockData.todaySales - mockData.yesterdaySales) / mockData.yesterdaySales) * 100).toFixed(1);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const params = new URLSearchParams(window.location.search); if (!session && !params.get("subscribed")) { window.location.href = "/landing"; return; }
      if (!session) return;
      setStoreName(session.user.user_metadata?.store_name || session.user.email || "My Store");
      setUserEmail(session.user.email || "");
      setDbStatus("connected");
      fetchStaff(session.user.email || "");
      fetchSuppliers(session.user.email || "");
      fetchRealStats(session.user.email || "");
        supabase.from("stores").select("id").ilike("owner_email", session.user.email || "").single().then(({ data: store }) => {
          if (store) supabase.from("products").select("*").eq("store_id", store.id).then(({ data }) => { if (data) setProducts(data); });
        });
      setTimeout(() => {
        supabase.from("stores").select("city, onboarding_complete, subscription_status, trial_ends_at").ilike("owner_email", session.user.email || "").single().then(({ data }) => {
          if (data?.onboarding_complete === false) { window.location.href = "/onboarding"; return; }
          if (data?.subscription_status === "trial") { const trialEnd = data?.trial_ends_at ? new Date(data.trial_ends_at) : new Date(Date.now() + 14 * 86400000); const days = Math.ceil((trialEnd.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)); setTrialDaysLeft(Math.max(0, days)); }
          if (data?.subscription_status === "trial" && data?.trial_ends_at && new Date(data.trial_ends_at) < new Date()) { window.location.href = "/pricing?trial_expired=true"; }
          if (data?.subscription_status === "cancelled") { window.location.href = "/pricing?cancelled=true"; }
          if (data?.subscription_status === "past_due") { window.location.href = "/pricing?past_due=true"; }
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
        body: JSON.stringify({ question, storeData: {
          todaySales: realStats.todaySales,
          yesterdaySales: realStats.yesterdaySales,
          monthSales: realStats.monthSales,
          cashFlow: realStats.cashFlow,
          lowStock: products.filter(p => p.stock_quantity <= p.reorder_threshold),
          topProducts: topProducts,
          weekSales: weekSalesData,
          staff: staff,
          suppliers: suppliers,
        }}),
      });
      const data = await res.json();
      setChatHistory(prev => [...prev, { q: question, a: data.answer }]);
      setQuestion("");
    } catch {
      setChatHistory(prev => [...prev, { q: question, a: "Something went wrong. Please try again." }]);
    }
    setLoading(false);
  }

  const pad = isMobile ? "16px" : "24px 40px 40px";
  const headerPad = isMobile ? "16px 16px 0" : "28px 40px 0";

  return (
    <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", height: "100vh", background: WARM_BG, fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif", overflow: "hidden" }}>

      {/* DESKTOP SIDEBAR */}
      {!isMobile && (
        <aside style={{ background: CARD_BG, borderRight: "1px solid " + BORDER, display: "flex", flexDirection: "column", width: sidebarOpen ? 240 : 72, transition: "width 0.25s", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: sidebarOpen ? "28px 24px 20px" : "28px 20px 20px", borderBottom: "1px solid " + BORDER }}>
            {sidebarOpen ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Image src="/logo.png" alt="Samzy" width={30} height={30} />
                <span style={{ color: BLACK, fontWeight: 700, fontSize: 17 }}>Samzy</span>
              </div>
            ) : (
              <Image src="/logo.png" alt="Samzy" width={30} height={30} />
            )}
            <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: WARM_BG, border: "none", color: MUTED, cursor: "pointer", fontSize: 11, padding: "6px 8px", borderRadius: 6 }}>
              {sidebarOpen ? "◀" : "▶"}
            </button>
          </div>
          <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
            {navItems.map((item) => (
              <button key={item.id} onClick={() => item.id === "profile" ? window.location.href = "/profile" : item.id === "scanner" ? window.location.href = "/scanner" : setActiveNav(item.id)} style={{
                display: "flex", alignItems: "center", gap: 12, padding: sidebarOpen ? "11px 12px" : "11px",
                borderRadius: 10, background: activeNav === item.id ? LIGHT_ORANGE : "none", border: "none",
                color: activeNav === item.id ? ORANGE : MUTED, cursor: "pointer", fontSize: 13.5,
                textAlign: "left", width: "100%", transition: "all 0.15s",
                borderLeft: activeNav === item.id ? "3px solid " + ORANGE : "3px solid transparent",
              }}>
                <span style={{ fontSize: 15, width: 20, textAlign: "center", flexShrink: 0 }}>{item.icon}</span>
                {sidebarOpen && <span style={{ fontWeight: activeNav === item.id ? 600 : 400 }}>{item.label}</span>}
              </button>
            ))}
          </nav>
          {sidebarOpen && (
            <div style={{ padding: "16px", borderTop: "1px solid " + BORDER }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: dbStatus === "connected" ? "#22c55e" : "#f59e0b" }} />
                <span style={{ fontSize: 11, color: MUTED }}>{dbStatus === "connected" ? "Live" : "Connecting..."}</span>
              </div>
              <div style={{ fontSize: 12, color: BLACK, fontWeight: 600, marginBottom: 2 }}>{storeName}</div>
              <button onClick={handleLogout} style={{ background: "none", border: "none", color: MUTED, fontSize: 11, cursor: "pointer", padding: 0, marginTop: 4 }}>{tr.signOut}</button>

              {trialDaysLeft !== null && trialDaysLeft > 0 && (
                <a href="/pricing" style={{ display: "block", marginTop: 12, background: ORANGE, color: "#fff", padding: "8px 12px", borderRadius: 8, textDecoration: "none", fontSize: 12, fontWeight: 700, textAlign: "center" as const }}>{tr.upgradeToPro}</a>
              )}
            </div>
          )}
        </aside>
      )}

      {/* MOBILE HEADER */}
      {isMobile && (
        <header style={{ background: CARD_BG, borderBottom: "1px solid " + BORDER, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Image src="/logo.png" alt="Samzy" width={32} height={32} />
            <span style={{ color: BLACK, fontWeight: 700, fontSize: 16 }}>Samzy</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>

            <div style={{ display: "flex", gap: 3 }}>
              {languages.map(l => (
                <button key={l.code} onClick={() => setLang(l.code as any)} title={l.label} style={{ background: lang === l.code ? ORANGE : "transparent", border: lang === l.code ? "1px solid " + ORANGE : "none", borderRadius: 4, padding: "1px 3px", fontSize: 14, cursor: "pointer" }}>{l.flag}</button>
              ))}
            </div>

            <button onClick={handleLogout} style={{ background: LIGHT_ORANGE, border: "none", color: ORANGE, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: "6px 12px", borderRadius: 8 }}>Out</button>
          </div>
        </header>
      )}

      {/* MAIN CONTENT */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Desktop header */}
        {/* Trial Banner */}
        {trialDaysLeft !== null && trialDaysLeft > 0 && (
          <div style={{ background: trialDaysLeft <= 3 ? "#fef2f2" : "#fffbeb", borderBottom: "1px solid " + (trialDaysLeft <= 3 ? "#fecaca" : "#fde68a"), padding: "10px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <span style={{ fontSize: 13, color: trialDaysLeft <= 3 ? "#dc2626" : "#d97706", fontWeight: 600 }}>{trialDaysLeft <= 3 ? "⚠️" : "ℹ️"} {trialDaysLeft} day{trialDaysLeft === 1 ? "" : "s"} left in your free trial</span>
            <a href="/pricing" style={{ fontSize: 12, fontWeight: 700, color: "#fff", background: trialDaysLeft <= 3 ? "#dc2626" : ORANGE, padding: "6px 14px", borderRadius: 8, textDecoration: "none" }}>Upgrade Now →</a>
          </div>
        )}
        {!isMobile && (
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: headerPad, flexShrink: 0 }}>
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
              {new Date().toLocaleDateString("en-GB", { weekday: "short", month: "short", day: "numeric" })}
            </div>
          </header>
        )}

        {/* Mobile page title */}
        {isMobile && (
          <div style={{ padding: "16px 16px 0" }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: BLACK, letterSpacing: -0.5 }}>
              {activeNav === "dashboard" && "Good morning 👋"}
              {activeNav === "inventory" && "Inventory"}
              {activeNav === "staff" && "Staff"}
              {activeNav === "suppliers" && "Suppliers"}
              {activeNav === "finances" && "Finances"}
              {activeNav === "ai" && "AI Advisor"}
            </h1>
          </div>
        )}

        <div style={{ flex: 1, overflowY: "auto", padding: pad, paddingBottom: isMobile ? "80px" : "40px" }}>

          {/* DASHBOARD */}
          {activeNav === "dashboard" && (
            <div>
              {/* KPI Grid — 2 cols on mobile, 4 on desktop */}
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: isMobile ? 12 : 16, marginBottom: isMobile ? 16 : 24 }}>
                {[
                  { title: tr.todaySales, value: "€" + realStats.todaySales.toFixed(2), sub: realStats.yesterdaySales > 0 ? (((realStats.todaySales - realStats.yesterdaySales) / realStats.yesterdaySales) * 100).toFixed(1) + "% vs yesterday" : tr.noSalesYet, accent: ORANGE, icon: "💵" },
                  { title: tr.monthlyRevenue, value: "€" + realStats.monthSales.toFixed(2), sub: new Date().toLocaleString("default", { month: "long", year: "numeric" }), accent: "#0071e3", icon: "📊" },
                  { title: tr.cashFlow, value: "€" + Math.max(0, realStats.cashFlow).toFixed(2), sub: realStats.cashFlow < 0 ? tr.invoicesExceedRevenue : tr.afterPendingInvoices, accent: realStats.cashFlow < 0 ? "#dc2626" : "#16a34a", icon: "🏦" },
                  { title: tr.lowStock, value: String(products.filter(p => p.stock_quantity !== null && p.reorder_threshold !== null && p.stock_quantity <= p.reorder_threshold).length), sub: tr.itemsNeedReorder, accent: "#dc2626", icon: "⚠️" },
                ].map((k) => (
                  <div key={k.title} style={{ background: CARD_BG, borderRadius: 14, padding: isMobile ? "16px" : "24px", border: "1px solid " + BORDER, position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: 3, background: k.accent }} />
                    <div style={{ fontSize: isMobile ? 18 : 22, marginBottom: isMobile ? 8 : 12 }}>{k.icon}</div>
                    <div style={{ fontSize: isMobile ? 20 : 28, fontWeight: 700, color: BLACK, letterSpacing: -1, marginBottom: 2 }}>{k.value}</div>
                    <div style={{ fontSize: isMobile ? 11 : 13, color: BLACK, fontWeight: 600, marginBottom: 2 }}>{k.title}</div>
                    <div style={{ fontSize: 11, color: MUTED }}>{k.sub}</div>
                  </div>
                ))}
              </div>

              {/* Chart + Products — stacked on mobile */}
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.2fr 1fr", gap: isMobile ? 12 : 16, marginBottom: isMobile ? 16 : 24 }}>
                <div style={{ background: CARD_BG, borderRadius: 14, padding: isMobile ? "16px" : "24px", border: "1px solid " + BORDER }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: BLACK }}>Weekly Sales</h2>
                    <span style={{ fontSize: 11, color: MUTED, background: WARM_BG, padding: "3px 8px", borderRadius: 20 }}>This week</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: isMobile ? 6 : 8, height: isMobile ? 100 : 140 }}>
                    {weekSalesData.map((d) => (
                      <div key={d.day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%" }}>
                        <div style={{ fontSize: 8, color: MUTED, marginBottom: 3 }}>${(d.amount / 1000).toFixed(1)}k</div>
                        <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end" }}>
                          <div style={{ width: "100%", height: (d.amount / maxSale * 100) + "%", background: d.day === "Sun" ? ORANGE : BORDER, borderRadius: "4px 4px 0 0" }} />
                        </div>
                        <div style={{ fontSize: 10, color: d.day === "Sun" ? ORANGE : MUTED, marginTop: 4, fontWeight: d.day === "Sun" ? 700 : 400 }}>{d.day}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ background: CARD_BG, borderRadius: 14, padding: isMobile ? "16px" : "24px", border: "1px solid " + BORDER }}>
                  <h2 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: BLACK }}>Top Products</h2>
                  {topProducts.map((p, i) => (
                    <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < topProducts.length - 1 ? "1px solid " + BORDER : "none" }}>
                      <span style={{ width: 20, height: 20, background: i === 0 ? ORANGE : WARM_BG, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: i === 0 ? "#fff" : MUTED, flexShrink: 0 }}>{i + 1}</span>
                      <span style={{ flex: 1, fontSize: 12, color: BLACK, fontWeight: 500 }}>{p.name}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: ORANGE }}>${p.revenue}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Insights */}
              <div style={{ background: CARD_BG, borderRadius: 14, padding: isMobile ? "16px" : "24px", border: "1px solid " + BORDER }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <span style={{ fontSize: 14, color: ORANGE }}>✦</span>
                  <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: BLACK }}>AI Insights</h2>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
                  {([] as any[]).map((ins, i) => (
                    <div key={i} style={{ background: insightBg(ins.type), borderRadius: 10, padding: "14px", borderLeft: "3px solid " + insightColor(ins.type) }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <span style={{ fontSize: 16 }}>{ins.icon}</span>
                        <p style={{ margin: 0, fontSize: 13, color: BLACK, lineHeight: 1.5 }}>{ins.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* INVENTORY */}
          {activeNav === "inventory" && (
            <div style={{ background: CARD_BG, borderRadius: 14, padding: isMobile ? "16px" : "24px", border: "1px solid " + BORDER }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: BLACK }}>Inventory ({products.length} products)</h2>
                <button onClick={() => { setShowAddProduct(true); setEditingProduct(null); setProductForm({ name: "", category: "Other", stock_quantity: "", price: "", reorder_threshold: "10" }); }} style={{ background: ORANGE, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Add Product</button>
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                {(["all", "low"] as const).map(tab => (
                  <button key={tab} onClick={() => { setInventoryTab(tab); fetchProducts(); }} style={{ padding: "7px 16px", borderRadius: 8, border: "1px solid " + (inventoryTab === tab ? ORANGE : BORDER), background: inventoryTab === tab ? ORANGE : "#fff", color: inventoryTab === tab ? "#fff" : MUTED, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    {tab === "all" ? "All Products" : `Low Stock (${products.filter(p => p.stock_quantity <= p.reorder_threshold).length})`}
                  </button>
                ))}
              </div>
              {(showAddProduct || editingProduct) && (
                <div style={{ background: WARM_BG, borderRadius: 12, padding: "20px", border: "1px solid " + BORDER, marginBottom: 20 }}>
                  <h3 style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 700, color: BLACK }}>{editingProduct ? "Edit Product" : "Add New Product"}</h3>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                    {[{ label: "Product Name", key: "name", placeholder: "Whole Milk 1L" }, { label: "Price (€)", key: "price", placeholder: "1.99" }, { label: "Stock Quantity", key: "stock_quantity", placeholder: "50" }, { label: "Reorder At", key: "reorder_threshold", placeholder: "10" }].map(f => (
                      <div key={f.key}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: MUTED, display: "block", marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>{f.label}</label>
                        <input value={(productForm as any)[f.key]} onChange={e => setProductForm(prev => ({ ...prev, [f.key]: e.target.value }))} placeholder={f.placeholder} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid " + BORDER, fontSize: 13, outline: "none", boxSizing: "border-box" as const, fontFamily: "-apple-system, sans-serif" }} />
                      </div>
                    ))}
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: MUTED, display: "block", marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Category</label>
                      <select value={productForm.category} onChange={e => setProductForm(prev => ({ ...prev, category: e.target.value }))} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid " + BORDER, fontSize: 13, outline: "none", background: "#fff", fontFamily: "-apple-system, sans-serif" }}>
                        {["Dairy", "Bakery", "Beverages", "Produce", "Meat", "Pantry", "Frozen", "Cleaning", "Other"].map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                    <button onClick={() => { setShowAddProduct(false); setEditingProduct(null); }} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid " + BORDER, background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: MUTED }}>Cancel</button>
                    <button onClick={editingProduct ? handleEditProduct : handleAddProduct} style={{ flex: 2, padding: "10px", borderRadius: 8, border: "none", background: ORANGE, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{editingProduct ? "Save Changes" : "Add Product"}</button>
                  </div>
                </div>
              )}
              {products.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>📦</div>
                  <p style={{ color: MUTED, fontSize: 14, margin: 0 }}>No products yet. Add manually or use the Scanner to scan a delivery note.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {(inventoryTab === "all" ? products : products.filter(p => p.stock_quantity <= p.reorder_threshold)).map(item => (
                    <div key={item.id} style={{ padding: "14px 16px", borderRadius: 12, border: "1px solid " + (item.stock_quantity <= item.reorder_threshold ? "#fecaca" : BORDER), background: item.stock_quantity <= item.reorder_threshold ? "#fef2f2" : WARM_BG }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: isMobile ? 10 : 0 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: BLACK }}>{item.name}</div>
                          <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{item.category || "General"} · €{parseFloat(item.price || 0).toFixed(2)}</div>
                        </div>
                        <div style={{ textAlign: "center" as const }}>
                          <div style={{ fontSize: 16, fontWeight: 700, color: item.stock_quantity <= item.reorder_threshold ? "#dc2626" : BLACK }}>{item.stock_quantity}</div>
                          <div style={{ fontSize: 10, color: MUTED }}>in stock</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        {item.stock_quantity <= item.reorder_threshold && <span style={{ background: "#fef2f2", color: "#dc2626", padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, flex: 1 }}>Reorder needed</span>}
                        {!(item.stock_quantity <= item.reorder_threshold) && <div style={{ flex: 1 }} />}
                        <button onClick={() => { setEditingProduct(item); setShowAddProduct(false); setProductForm({ name: item.name, category: item.category || "Other", stock_quantity: String(item.stock_quantity), price: String(item.price || ""), reorder_threshold: String(item.reorder_threshold || 10) }); }} style={{ background: "transparent", border: "1px solid " + BORDER, borderRadius: 8, padding: "6px 12px", fontSize: 12, cursor: "pointer", color: BLACK }}>Edit</button>
                        <button onClick={() => setDeleteModal({ id: item.id, name: item.name, type: "product" })} style={{ background: "transparent", border: "1px solid #fecaca", borderRadius: 8, padding: "6px 12px", fontSize: 12, cursor: "pointer", color: "#dc2626" }}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STAFF */}
          {activeNav === "staff" && (
            <div style={{ background: CARD_BG, borderRadius: 14, padding: isMobile ? "16px" : "24px", border: "1px solid " + BORDER }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: BLACK }}>Staff ({staff.length})</h2>
                <button onClick={() => { setShowAddStaff(true); setEditingStaff(null); setStaffForm({ name: "", role: "", shift: "", status: "on", phone: "" }); }} style={{ background: ORANGE, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Add Staff</button>
              </div>
              {(showAddStaff || editingStaff) && (
                <div style={{ background: WARM_BG, borderRadius: 12, padding: "20px", border: "1px solid " + BORDER, marginBottom: 20 }}>
                  <h3 style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 700, color: BLACK }}>{editingStaff ? "Edit Staff Member" : "Add New Staff Member"}</h3>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                    {[{ label: "Full Name", key: "name", placeholder: "Maria Santos" }, { label: "Role", key: "role", placeholder: "Cashier" }, { label: "Shift", key: "shift", placeholder: "08:00-16:00" }, { label: "Phone", key: "phone", placeholder: "+351 000 000 000" }].map(f => (
                      <div key={f.key}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: MUTED, display: "block", marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>{f.label}</label>
                        <input value={(staffForm as any)[f.key]} onChange={e => setStaffForm(prev => ({ ...prev, [f.key]: e.target.value }))} placeholder={f.placeholder} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid " + BORDER, fontSize: 13, outline: "none", boxSizing: "border-box" as const, fontFamily: "-apple-system, sans-serif" }} />
                      </div>
                    ))}
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: MUTED, display: "block", marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Status</label>
                      <select value={staffForm.status} onChange={e => setStaffForm(prev => ({ ...prev, status: e.target.value }))} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid " + BORDER, fontSize: 13, outline: "none", background: "#fff", fontFamily: "-apple-system, sans-serif" }}>
                        <option value="on">On Shift</option>
                        <option value="off">Off Shift</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                    <button onClick={() => { setShowAddStaff(false); setEditingStaff(null); }} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid " + BORDER, background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: MUTED }}>Cancel</button>
                    <button onClick={editingStaff ? handleEditStaff : handleAddStaff} style={{ flex: 2, padding: "10px", borderRadius: 8, border: "none", background: ORANGE, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{editingStaff ? "Save Changes" : "Add Staff Member"}</button>
                  </div>
                </div>
              )}
              {staffLoading ? (
                <p style={{ color: MUTED, fontSize: 14, textAlign: "center", padding: "24px 0" }}>Loading staff...</p>
              ) : staff.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>👥</div>
                  <p style={{ color: MUTED, fontSize: 14, margin: 0 }}>No staff added yet. Click Add Staff to get started.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {staff.map(s => (
                    <div key={s.id} style={{ padding: "16px", borderRadius: 12, border: "1px solid " + BORDER, background: WARM_BG }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: BLACK, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{s.name.split(" ").map((n: string) => n[0]).join("")}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: BLACK }}>{s.name}</div>
                          <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{s.role} · {s.shift}</div>
                        </div>
                        <span style={{ background: s.status === "on" ? "#f0fdf4" : WARM_BG, color: s.status === "on" ? "#16a34a" : MUTED, padding: "5px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, flexShrink: 0 }}>{s.status === "on" ? "On" : "Off"}</span>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <div style={{ flex: 1 }} />
                        <button onClick={() => { setEditingStaff(s); setShowAddStaff(false); setStaffForm({ name: s.name, role: s.role, shift: s.shift, status: s.status, phone: s.phone || "" }); }} style={{ background: "transparent", border: "1px solid " + BORDER, borderRadius: 8, padding: "6px 12px", fontSize: 12, cursor: "pointer", color: BLACK }}>Edit</button>
                        <button onClick={() => setDeleteModal({ id: s.id, name: s.name, type: "staff" })} style={{ background: "transparent", border: "1px solid #fecaca", borderRadius: 8, padding: "6px 12px", fontSize: 12, cursor: "pointer", color: "#dc2626" }}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SUPPLIERS */}
          {activeNav === "suppliers" && (
            <div style={{ background: CARD_BG, borderRadius: 14, padding: isMobile ? "16px" : "24px", border: "1px solid " + BORDER }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: BLACK }}>Supplier Invoices ({suppliers.length})</h2>
                <button onClick={() => { setShowAddSupplier(true); setEditingSupplier(null); setSupplierForm({ name: "", invoice_amount: "", due_date: "", status: "pending", notes: "" }); }} style={{ background: ORANGE, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Add Supplier</button>
              </div>
              {(showAddSupplier || editingSupplier) && (
                <div style={{ background: WARM_BG, borderRadius: 12, padding: "20px", border: "1px solid " + BORDER, marginBottom: 20 }}>
                  <h3 style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 700, color: BLACK }}>{editingSupplier ? "Edit Supplier" : "Add New Supplier"}</h3>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                    {[{ label: "Supplier Name", key: "name", placeholder: "FreshFarm Co." }, { label: "Invoice Amount", key: "invoice_amount", placeholder: "€1,240" }, { label: "Due Date", key: "due_date", placeholder: "May 30, 2026" }, { label: "Notes", key: "notes", placeholder: "Optional notes" }].map(f => (
                      <div key={f.key}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: MUTED, display: "block", marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>{f.label}</label>
                        <input value={(supplierForm as any)[f.key]} onChange={e => setSupplierForm(prev => ({ ...prev, [f.key]: e.target.value }))} placeholder={f.placeholder} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid " + BORDER, fontSize: 13, outline: "none", boxSizing: "border-box" as const, fontFamily: "-apple-system, sans-serif" }} />
                      </div>
                    ))}
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: MUTED, display: "block", marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Status</label>
                      <select value={supplierForm.status} onChange={e => setSupplierForm(prev => ({ ...prev, status: e.target.value }))} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid " + BORDER, fontSize: 13, outline: "none", background: "#fff", fontFamily: "-apple-system, sans-serif" }}>
                        <option value="pending">Pending</option>
                        <option value="paid">Paid</option>
                        <option value="overdue">Overdue</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                    <button onClick={() => { setShowAddSupplier(false); setEditingSupplier(null); }} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid " + BORDER, background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: MUTED }}>Cancel</button>
                    <button onClick={editingSupplier ? handleEditSupplier : handleAddSupplier} style={{ flex: 2, padding: "10px", borderRadius: 8, border: "none", background: ORANGE, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{editingSupplier ? "Save Changes" : "Add Supplier"}</button>
                  </div>
                </div>
              )}
              {suppliersLoading ? (
                <p style={{ color: MUTED, fontSize: 14, textAlign: "center", padding: "24px 0" }}>Loading suppliers...</p>
              ) : suppliers.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>🚚</div>
                  <p style={{ color: MUTED, fontSize: 14, margin: 0 }}>No suppliers added yet. Click Add Supplier to get started.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {suppliers.map(s => (
                    <div key={s.id} style={{ padding: "16px", borderRadius: 12, border: "1px solid " + BORDER, background: WARM_BG }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: BLACK }}>{s.name}</div>
                          <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>Due: {s.due_date}</div>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: BLACK, marginLeft: 12 }}>{s.invoice_amount}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ background: s.status === "paid" ? "#f0fdf4" : s.status === "overdue" ? "#fef2f2" : "#fffbeb", color: s.status === "paid" ? "#16a34a" : s.status === "overdue" ? "#dc2626" : "#d97706", padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, flex: 1 }}>{s.status.charAt(0).toUpperCase() + s.status.slice(1)}</span>
                        <button onClick={() => { setEditingSupplier(s); setShowAddSupplier(false); setSupplierForm({ name: s.name, invoice_amount: s.invoice_amount, due_date: s.due_date, status: s.status, notes: s.notes || "" }); }} style={{ background: "transparent", border: "1px solid " + BORDER, borderRadius: 8, padding: "6px 12px", fontSize: 12, cursor: "pointer", color: BLACK }}>Edit</button>
                        <button onClick={() => setDeleteModal({ id: s.id, name: s.name, type: "supplier" })} style={{ background: "transparent", border: "1px solid #fecaca", borderRadius: 8, padding: "6px 12px", fontSize: 12, cursor: "pointer", color: "#dc2626" }}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* FINANCES */}
          {activeNav === "finances" && (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: isMobile ? 12 : 16 }}>
              {[
                { title: "Today's Revenue", value: "€" + realStats.todaySales.toFixed(2), color: ORANGE, icon: "💵" },
                { title: "Monthly Revenue", value: "€" + realStats.monthSales.toFixed(2), color: "#0071e3", icon: "📊" },
                { title: "Cash Available", value: "€" + realStats.cashFlow.toFixed(2), color: "#16a34a", icon: "🏦" },
                { title: "Pending Invoices", value: "€" + (realStats.monthSales - realStats.cashFlow).toFixed(2), color: "#dc2626", icon: "📄" },
              ].map(k => (
                <div key={k.title} style={{ background: CARD_BG, borderRadius: 14, padding: isMobile ? "16px" : "24px", border: "1px solid " + BORDER, position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: 3, background: k.color }} />
                  <div style={{ fontSize: isMobile ? 18 : 22, marginBottom: 8 }}>{k.icon}</div>
                  <div style={{ fontSize: isMobile ? 20 : 28, fontWeight: 700, color: BLACK, letterSpacing: -1 }}>{k.value}</div>
                  <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>{k.title}</div>
                </div>
              ))}
            </div>
          )}

          {/* AI ADVISOR */}
          {activeNav === "ai" && (
            <div>
              <div style={{ background: CARD_BG, borderRadius: 14, padding: isMobile ? "16px" : "24px", border: "1px solid " + BORDER, marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <span style={{ color: ORANGE, fontSize: 14 }}>✦</span>
                  <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: BLACK }}>Today's Insights</h2>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {([] as any[]).map((ins, i) => (
                    <div key={i} style={{ background: insightBg(ins.type), borderRadius: 10, padding: "14px", borderLeft: "3px solid " + insightColor(ins.type), display: "flex", gap: 12 }}>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{ins.icon}</span>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 0.5, color: insightColor(ins.type), marginBottom: 3 }}>
                          {ins.type === "positive" ? "Good News" : ins.type === "warning" ? "Action Required" : ins.type === "alert" ? "Urgent" : "Opportunity"}
                        </div>
                        <p style={{ color: BLACK, fontSize: 13, margin: 0, lineHeight: 1.5 }}>{ins.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background: BLACK, borderRadius: 14, padding: isMobile ? "16px" : "24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ color: ORANGE, fontSize: 16 }}>✦</span>
                  <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#fff" }}>Ask your AI Advisor</h2>
                </div>
                <p style={{ color: "#666", fontSize: 12, marginBottom: 16 }}>Powered by Claude</p>
                {chatHistory.length > 0 && (
                  <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                    {chatHistory.map((chat, i) => (
                      <div key={i}>
                        <div style={{ background: "#1a1a1a", borderRadius: 8, padding: "10px 14px", marginBottom: 6 }}>
                          <p style={{ margin: 0, color: "#aaa", fontSize: 12 }}>You: {chat.q}</p>
                        </div>
                        <div style={{ background: "#1a1a1a", borderRadius: 8, padding: "12px 14px", borderLeft: "3px solid " + ORANGE }}>
                          <p style={{ margin: 0, color: "#e5e5e5", fontSize: 13, lineHeight: 1.6 }}>✦ {chat.a}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => e.key === "Enter" && askAdvisor()}
                    placeholder="Ask anything about your business..."
                    style={{ flex: 1, padding: "12px 14px", borderRadius: 10, border: "1px solid #2a2a2a", background: "#1a1a1a", color: "#fff", fontSize: 14, outline: "none" }} />
                  <button onClick={askAdvisor} disabled={loading}
                    style={{ padding: "12px 18px", borderRadius: 10, background: loading ? "#333" : ORANGE, border: "none", color: "#fff", fontWeight: 700, fontSize: 14, cursor: loading ? "not-allowed" : "pointer" }}>
                    {loading ? "..." : "Ask"}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* MOBILE BOTTOM NAV */}
      {isMobile && (
        <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: CARD_BG, borderTop: "1px solid " + BORDER, display: "flex", zIndex: 100 }}>
          {navItems.map((item) => (
            <button key={item.id} onClick={() => item.id === "profile" ? window.location.href = "/profile" : item.id === "scanner" ? window.location.href = "/scanner" : setActiveNav(item.id)} style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              padding: "10px 4px", background: "none", border: "none", cursor: "pointer",
              color: activeNav === item.id ? ORANGE : MUTED,
              borderTop: activeNav === item.id ? "2px solid " + ORANGE : "2px solid transparent",
            }}>
              <span style={{ fontSize: 18, marginBottom: 2 }}>{item.icon}</span>
              <span style={{ fontSize: 9, fontWeight: activeNav === item.id ? 700 : 400 }}>{item.label}</span>
            </button>
          ))}
        </nav>
      )}


    {deleteModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "36px 32px", maxWidth: 400, width: "100%", textAlign: "center" as const, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 20px" }}>🗑️</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f0f0f", margin: "0 0 10px" }}>Delete {deleteModal.type === "product" ? "Product" : deleteModal.type === "staff" ? "Staff Member" : "Supplier"}?</h2>
            <p style={{ color: "#6B6B6B", fontSize: 14, margin: "0 0 28px", lineHeight: 1.6 }}>Are you sure you want to delete <strong>{deleteModal.name}</strong>? This cannot be undone.</p>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setDeleteModal(null)} style={{ flex: 1, padding: "12px", borderRadius: 10, border: "1px solid #F0EEEB", background: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", color: "#6B6B6B" }}>Cancel</button>
              <button onClick={confirmDelete} style={{ flex: 1, padding: "12px", borderRadius: 10, border: "none", background: "#dc2626", fontSize: 14, fontWeight: 700, cursor: "pointer", color: "#fff" }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}