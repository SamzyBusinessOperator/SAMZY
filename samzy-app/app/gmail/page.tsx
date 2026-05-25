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

export default function GmailPage() {
  const isMobile = useIsMobile();
  const [accessToken, setAccessToken] = useState("");
  const [scanning, setScanning] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("access_token");
    const error = params.get("error");
    if (token) {
      setAccessToken(token);
      setMessage("✅ Gmail connected! Click 'Scan for Invoices' to begin.");
    }
    if (error) setMessage("❌ Error: " + error);
  }, []);

  async function scanEmails() {
    if (!accessToken) return;
    setScanning(true);
    setMessage("Scanning your Gmail for invoices...");
    setInvoices([]);
    try {
      const res = await fetch("/api/gmail/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken }),
      });
      const data = await res.json();
      if (data.error) { setMessage("❌ " + data.error); return; }
      if (data.invoices.length === 0) { setMessage(data.message || "No invoices found in recent emails."); return; }
      setInvoices(data.invoices);
      setMessage(`Found ${data.invoices.length} invoice(s). Review and save below.`);
    } catch (err: any) {
      setMessage("❌ " + err.message);
    }
    setScanning(false);
  }

  async function saveInvoice(invoice: any) {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const email = session?.user?.email || "";
      const { data: store } = await supabase.from("stores").select("id").ilike("owner_email", email).single();
      if (!store) { alert("Store not found."); return; }

      // Save to suppliers
      await supabase.from("suppliers").insert([{
        store_email: email,
        name: invoice.supplier,
        invoice_amount: invoice.amount,
        invoice_number: invoice.invoice_number || "",
        status: "pending",
        due_date: invoice.due_date || null,
      }]);

      // Save items to products
      for (const item of (invoice.items || [])) {
        const { data: existing } = await supabase.from("products").select("id, stock_quantity").eq("store_id", store.id).ilike("name", item.name).single();
        if (existing) {
          await supabase.from("products").update({ stock_quantity: existing.stock_quantity + item.quantity }).eq("id", existing.id);
        } else {
          await supabase.from("products").insert([{ store_id: store.id, name: item.name, category: "Other", stock_quantity: item.quantity, price: item.price || 0, reorder_threshold: 10 }]);
        }
      }

      setSavedCount(c => c + 1);
      setInvoices(prev => prev.filter(i => i.message_id !== invoice.message_id));
      if (invoices.length === 1) setMessage("✅ All invoices saved to Samzy!");
    } catch (err: any) {
      alert("Error: " + err.message);
    }
    setSaving(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: WARM_BG, fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" }}>
      <header style={{ background: CARD_BG, borderBottom: "1px solid " + BORDER, padding: isMobile ? "0 16px" : "0 40px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <Image src="/logo.png" alt="Samzy" width={28} height={28} />
            <span style={{ color: BLACK, fontWeight: 700, fontSize: 16 }}>Samzy</span>
          </a>
          <span style={{ color: MUTED, fontSize: 14 }}>/ Gmail Scanner</span>
        </div>
        <a href="/" style={{ color: MUTED, fontSize: 13, textDecoration: "none" }}>← Back to Dashboard</a>
      </header>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: isMobile ? "24px 16px" : "48px 24px" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: isMobile ? 24 : 28, fontWeight: 700, color: BLACK, margin: "0 0 8px", letterSpacing: -0.5 }}>📧 Gmail Invoice Scanner</h1>
          <p style={{ color: MUTED, fontSize: 15, margin: 0 }}>Automatically scan your Gmail for supplier invoices and add them to Samzy.</p>
        </div>

        {/* Connect Gmail */}
        {!accessToken && (
          <div style={{ background: CARD_BG, borderRadius: 16, padding: isMobile ? "24px 20px" : "32px", border: "1px solid " + BORDER, marginBottom: 20, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📬</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: BLACK, margin: "0 0 8px" }}>Connect your Gmail</h2>
            <p style={{ color: MUTED, fontSize: 14, margin: "0 0 24px", lineHeight: 1.6 }}>Samzy will scan your inbox for supplier invoices and automatically extract the data.</p>
            <a href="/api/gmail/auth" style={{ display: "inline-block", background: ORANGE, color: "#fff", padding: "12px 32px", borderRadius: 10, textDecoration: "none", fontSize: 15, fontWeight: 700 }}>
              Connect Gmail →
            </a>
          </div>
        )}

        {/* Connected - Scan */}
        {accessToken && (
          <div style={{ background: CARD_BG, borderRadius: 16, padding: isMobile ? "24px 20px" : "32px", border: "1px solid " + BORDER, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e" }} />
              <span style={{ fontSize: 14, color: BLACK, fontWeight: 600 }}>Gmail Connected</span>
            </div>
            {message && (
              <div style={{ background: message.startsWith("❌") ? "#fef2f2" : LIGHT_ORANGE, border: "1px solid " + (message.startsWith("❌") ? "#fecaca" : "#fed7aa"), borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 14, color: message.startsWith("❌") ? "#dc2626" : "#92400e" }}>
                {message}
              </div>
            )}
            <button onClick={scanEmails} disabled={scanning} style={{ background: scanning ? MUTED : ORANGE, color: "#fff", border: "none", borderRadius: 10, padding: "12px 24px", fontSize: 15, fontWeight: 700, cursor: scanning ? "not-allowed" : "pointer", width: "100%" }}>
              {scanning ? "Scanning..." : "🔍 Scan for Invoices"}
            </button>
          </div>
        )}

        {/* Results */}
        {invoices.map((invoice, i) => (
          <div key={i} style={{ background: CARD_BG, borderRadius: 16, padding: isMobile ? "20px" : "28px", border: "2px solid " + BORDER, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: BLACK, margin: "0 0 4px" }}>{invoice.supplier}</h3>
                <p style={{ color: MUTED, fontSize: 13, margin: 0 }}>{invoice.email_from}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: ORANGE }}>€{invoice.amount?.toFixed(2)}</div>
                {invoice.due_date && <div style={{ fontSize: 12, color: MUTED }}>Due: {invoice.due_date}</div>}
              </div>
            </div>

            {invoice.items?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: MUTED, margin: "0 0 8px", textTransform: "uppercase" }}>Items</p>
                {invoice.items.map((item: any, j: number) => (
                  <div key={j} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: j < invoice.items.length - 1 ? "1px solid " + BORDER : "none", fontSize: 14 }}>
                    <span style={{ color: BLACK }}>{item.name} × {item.quantity}</span>
                    <span style={{ color: MUTED }}>€{item.price?.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}

            <button onClick={() => saveInvoice(invoice)} disabled={saving} style={{ background: BLACK, color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer", width: "100%" }}>
              {saving ? "Saving..." : "✅ Save to Samzy"}
            </button>
          </div>
        ))}

        {savedCount > 0 && invoices.length === 0 && (
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 16, padding: 24, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
            <p style={{ color: "#16a34a", fontWeight: 700, fontSize: 16, margin: "0 0 16px" }}>{savedCount} invoice(s) saved to Samzy!</p>
            <a href="/" style={{ background: ORANGE, color: "#fff", padding: "10px 24px", borderRadius: 10, textDecoration: "none", fontSize: 14, fontWeight: 700 }}>Go to Dashboard →</a>
          </div>
        )}
      </div>
    </div>
  );
}
