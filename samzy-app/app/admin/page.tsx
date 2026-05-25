"use client";
import { useIsMobile } from "@/lib/useIsMobile";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import Image from "next/image";

const ORANGE = "#FC7800";
const BLACK = "#0f0f0f";
const WARM_BG = "#FAFAF8";
const CARD_BG = "#FFFFFF";
const BORDER = "#F0EEEB";
const MUTED = "#6B6B6B";
const LIGHT_ORANGE = "#FFF5EB";
const ADMIN_EMAIL = "samzyaioperator@gmail.com";

export default function AdminPanel() {
  const isMobile = useIsMobile();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, trial: 0, active: 0, cancelled: 0, expired: 0, mrr: 0 });
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        setAuthorized(true);
        fetchData();
      } else {
        setLoading(false);
      }
    });
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data } = await supabase.from("stores").select("*").order("created_at", { ascending: false });
    if (data) {
      setStores(data);
      const now = new Date();
      const trial = data.filter(s => s.subscription_status === "trial");
      const active = data.filter(s => s.subscription_status === "active");
      const cancelled = data.filter(s => s.subscription_status === "cancelled");
      const expired = trial.filter(s => s.trial_ends_at && new Date(s.trial_ends_at) < now);
      const mrr = active.length * 29;
      setStats({ total: data.length, trial: trial.length, active: active.length, cancelled: cancelled.length, expired: expired.length, mrr });
    }
    setLoading(false);
  }

  function getStatusColor(store: any) {
    if (store.subscription_status === "active") return "#16a34a";
    if (store.subscription_status === "cancelled") return "#dc2626";
    if (store.subscription_status === "trial") {
      if (store.trial_ends_at && new Date(store.trial_ends_at) < new Date()) return "#dc2626";
      const days = store.trial_ends_at ? Math.ceil((new Date(store.trial_ends_at).getTime() - new Date().getTime()) / 86400000) : 14;
      if (days <= 3) return "#f59e0b";
      return "#0071e3";
    }
    return MUTED;
  }

  function getStatusLabel(store: any) {
    if (store.subscription_status === "active") return "✅ Active";
    if (store.subscription_status === "cancelled") return "❌ Cancelled";
    if (store.subscription_status === "trial") {
      if (store.trial_ends_at && new Date(store.trial_ends_at) < new Date()) return "⛔ Expired";
      const days = store.trial_ends_at ? Math.ceil((new Date(store.trial_ends_at).getTime() - new Date().getTime()) / 86400000) : 14;
      return `🔵 Trial (${days}d left)`;
    }
    return store.subscription_status || "Unknown";
  }

  function filteredStores() {
    const now = new Date();
    if (filter === "active") return stores.filter(s => s.subscription_status === "active");
    if (filter === "trial") return stores.filter(s => s.subscription_status === "trial" && (!s.trial_ends_at || new Date(s.trial_ends_at) >= now));
    if (filter === "expired") return stores.filter(s => s.subscription_status === "trial" && s.trial_ends_at && new Date(s.trial_ends_at) < now);
    if (filter === "cancelled") return stores.filter(s => s.subscription_status === "cancelled");
    return stores;
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: WARM_BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: 16, color: MUTED }}>Loading...</div>
    </div>
  );

  if (!authorized) return (
    <div style={{ minHeight: "100vh", background: WARM_BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: CARD_BG, borderRadius: 16, padding: 40, textAlign: "center", border: "1px solid " + BORDER }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: BLACK, margin: "0 0 8px" }}>Access Denied</h2>
        <p style={{ color: MUTED, margin: "0 0 24px" }}>This page is only accessible to Samzy admins.</p>
        <a href="/" style={{ background: ORANGE, color: "#fff", padding: "10px 24px", borderRadius: 10, textDecoration: "none", fontWeight: 700 }}>Go Home</a>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: WARM_BG, fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" }}>
      {/* Header */}
      <header style={{ background: BLACK, padding: isMobile ? "0 16px" : "0 40px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Image src="/logo.png" alt="Samzy" width={28} height={28} />
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>Samzy</span>
          <span style={{ background: ORANGE, color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6 }}>ADMIN</span>
        </div>
        <a href="/" style={{ color: "#fff", fontSize: 13, textDecoration: "none", opacity: 0.7 }}>← Dashboard</a>
      </header>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: isMobile ? "24px 16px" : "40px 24px" }}>
        <h1 style={{ fontSize: isMobile ? 24 : 30, fontWeight: 800, color: BLACK, margin: "0 0 8px", letterSpacing: -1 }}>Admin Panel</h1>
        <p style={{ color: MUTED, fontSize: 14, margin: "0 0 32px" }}>All Samzy customers and business metrics.</p>

        {/* KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(5, 1fr)", gap: isMobile ? 12 : 16, marginBottom: 32 }}>
          {[
            { label: "Total Stores", value: stats.total, color: BLACK, icon: "🏪" },
            { label: "Active (Paying)", value: stats.active, color: "#16a34a", icon: "✅" },
            { label: "On Trial", value: stats.trial - stats.expired, color: "#0071e3", icon: "🔵" },
            { label: "Expired/Cancelled", value: stats.expired + stats.cancelled, color: "#dc2626", icon: "⛔" },
            { label: "MRR", value: "€" + stats.mrr, color: ORANGE, icon: "💰" },
          ].map((k, i) => (
            <div key={i} style={{ background: CARD_BG, borderRadius: 14, padding: isMobile ? "16px" : "20px 24px", border: "1px solid " + BORDER }}>
              <div style={{ fontSize: isMobile ? 20 : 24, marginBottom: 8 }}>{k.icon}</div>
              <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, color: k.color, letterSpacing: -1 }}>{k.value}</div>
              <div style={{ fontSize: isMobile ? 11 : 12, color: MUTED, fontWeight: 600 }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* Filter Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" as const }}>
          {[
            { id: "all", label: `All (${stores.length})` },
            { id: "active", label: `Active (${stats.active})` },
            { id: "trial", label: `Trial (${stats.trial - stats.expired})` },
            { id: "expired", label: `Expired (${stats.expired})` },
            { id: "cancelled", label: `Cancelled (${stats.cancelled})` },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{ background: filter === f.id ? ORANGE : CARD_BG, color: filter === f.id ? "#fff" : MUTED, border: "1px solid " + (filter === f.id ? ORANGE : BORDER), borderRadius: 20, padding: "6px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Stores Table */}
        <div style={{ background: CARD_BG, borderRadius: 16, border: "1px solid " + BORDER, overflow: "hidden" }}>
          <div style={{ padding: "16px 24px", borderBottom: "1px solid " + BORDER, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: BLACK }}>{filteredStores().length} Stores</h2>
            <button onClick={fetchData} style={{ background: LIGHT_ORANGE, border: "none", color: ORANGE, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: "6px 14px", borderRadius: 8 }}>↻ Refresh</button>
          </div>

          {filteredStores().map((store, i) => (
            <div key={store.id} style={{ padding: isMobile ? "14px 16px" : "16px 24px", borderBottom: i < filteredStores().length - 1 ? "1px solid " + BORDER : "none", display: "flex", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", flexDirection: isMobile ? "column" as const : "row" as const, gap: isMobile ? 10 : 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: LIGHT_ORANGE, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: ORANGE, flexShrink: 0 }}>
                  {(store.name || store.owner_email || "?")[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: BLACK }}>{store.name || "Unnamed Store"}</div>
                  <div style={{ fontSize: 12, color: MUTED }}>{store.owner_email}</div>
                  {store.city && <div style={{ fontSize: 11, color: MUTED }}>{store.city}{store.country ? ", " + store.country : ""}</div>}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 12 : 24, flexWrap: "wrap" as const }}>
                <div style={{ textAlign: "right" as const }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: getStatusColor(store) }}>{getStatusLabel(store)}</div>
                  <div style={{ fontSize: 11, color: MUTED }}>Joined {store.created_at ? new Date(store.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Unknown"}</div>
                </div>
                {store.subscription_status === "active" && (
                  <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "4px 12px", fontSize: 12, fontWeight: 700, color: "#16a34a" }}>€29/mo</div>
                )}
              </div>
            </div>
          ))}

          {filteredStores().length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: MUTED, fontSize: 14 }}>No stores in this category.</div>
          )}
        </div>

        {/* MRR Projection */}
        <div style={{ background: BLACK, borderRadius: 16, padding: isMobile ? "24px 20px" : "32px", marginTop: 24, color: "#fff" }}>
          <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700 }}>💰 Revenue Projection</h2>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 16 }}>
            {[
              { label: "Current MRR", value: "€" + stats.mrr },
              { label: "Annual Run Rate", value: "€" + (stats.mrr * 12).toLocaleString() },
              { label: "If All Trials Convert", value: "€" + ((stats.active + stats.trial) * 29) + "/mo" },
              { label: "Trial Conv. Rate", value: stats.total > 0 ? Math.round((stats.active / stats.total) * 100) + "%" : "0%" },
            ].map((m, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: "16px" }}>
                <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: ORANGE }}>{m.value}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
