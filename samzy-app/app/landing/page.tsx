"use client";
import { useIsMobile } from "@/lib/useIsMobile";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";

const ORANGE = "#FC7800";
const BLACK = "#0f0f0f";
const WARM_BG = "#FAFAF8";
const CARD_BG = "#FFFFFF";
const BORDER = "#F0EEEB";
const MUTED = "#6B6B6B";
const DARK = "#111111";

export default function Landing() {
  const isMobile = useIsMobile();
  const [scrollY, setScrollY] = useState(0);
  const [activeSection, setActiveSection] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const services = [
    {
      icon: "📱",
      title: "Custom Business App",
      desc: "Your store, your brand, your app. We build a fully branded management system — with your logo, your colors, your business name. Installed on your phone like any app.",
      features: ["Your logo & brand colors", "Your business name", "Installed on iOS & Android", "No technical knowledge needed"],
    },
    {
      icon: "🧠",
      title: "AI-Powered Intelligence",
      desc: "Every morning you wake up knowing exactly what happened in your business yesterday. Sales, stock, cash flow — all summarized by AI in plain language.",
      features: ["Daily business summary", "Ask AI anything", "Price change alerts", "Profit margin insights"],
    },
    {
      icon: "📦",
      title: "Smart Inventory & Pricing",
      desc: "Upload a supplier invoice — AI reads it, extracts all products, calculates your selling prices using your exact formulas. What used to take hours takes seconds.",
      features: ["Invoice scanning", "Auto price calculation", "Stock tracking", "Low stock alerts"],
    },
    {
      icon: "📊",
      title: "Supplier Intelligence",
      desc: "Know which supplier gives you the best price for every product. See price history, compare suppliers, and make better purchasing decisions with real data.",
      features: ["Price history tracking", "Supplier comparison", "Best deal alerts", "Purchase decision support"],
    },
  ];

  const process = [
    { step: "01", title: "Discovery Call", desc: "We learn about your business — your suppliers, your products, how you currently manage pricing and inventory." },
    { step: "02", title: "Custom Setup", desc: "We configure your branded app with your logo, colors, and business name. We upload your products and suppliers." },
    { step: "03", title: "Training", desc: "We show you how to use the app in 30 minutes. Simple enough that any staff member can use it from day one." },
    { step: "04", title: "Ongoing Support", desc: "We're always available. New features, fixes, questions — we handle everything. You focus on running your business." },
  ];

  const clients = [
    { name: "Tranquilpolis LDA", type: "Asian Supermarket", location: "Intendente, Lisbon", result: "Processes KRG Asian Food invoices (€49,168) in seconds instead of hours", logo: "🏪" },
  ];

  const stats = [
    { value: "95", label: "Products extracted from a single invoice", suffix: "" },
    { value: "€49K", label: "Invoice processed in one scan", suffix: "" },
    { value: "3", label: "Seconds to calculate all selling prices", suffix: "s" },
    { value: "100%", label: "Branded with your business identity", suffix: "" },
  ];

  return (
    <div style={{ fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif", color: BLACK, background: WARM_BG, overflowX: "hidden" }}>

      {/* ── NAV ── */}
      <nav style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: isMobile ? "16px 20px" : "20px 60px",
        position: "sticky", top: 0, zIndex: 100,
        background: scrollY > 50 ? "rgba(250,250,248,0.95)" : "transparent",
        backdropFilter: scrollY > 50 ? "blur(20px)" : "none",
        borderBottom: scrollY > 50 ? "1px solid " + BORDER : "none",
        transition: "all 0.3s ease",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Image src="/logo.png" alt="Samzy" width={32} height={32} />
          <span style={{ fontSize: 16, fontWeight: 800, color: BLACK }}>Samzy</span>
        </div>
        {!isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
            {["Services", "How it Works", "Clients", "Contact"].map(item => (
              <a key={item} href={`#${item.toLowerCase().replace(" ", "-")}`}
                style={{ fontSize: 14, color: MUTED, textDecoration: "none", fontWeight: 500 }}>
                {item}
              </a>
            ))}
          </div>
        )}
        <a href="/login" style={{
          background: ORANGE, color: "#fff", padding: "10px 20px", borderRadius: 10,
          textDecoration: "none", fontSize: 14, fontWeight: 700,
        }}>
          Client Login →
        </a>
      </nav>

      {/* ── HERO ── */}
      <section style={{ padding: isMobile ? "60px 20px 80px" : "100px 60px 120px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 40 : 80, alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fff8f0", border: "1px solid #fde8cc", borderRadius: 20, padding: "6px 14px", marginBottom: 24 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: ORANGE, display: "inline-block" }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: ORANGE }}>Custom Business Software Agency</span>
            </div>
            <h1 style={{ fontSize: isMobile ? 36 : 56, fontWeight: 900, color: BLACK, margin: "0 0 20px", lineHeight: 1.1, letterSpacing: -1.5 }}>
              Your Business.<br />
              <span style={{ color: ORANGE }}>Your Brand.</span><br />
              Your App.
            </h1>
            <p style={{ fontSize: isMobile ? 16 : 18, color: MUTED, lineHeight: 1.7, margin: "0 0 36px", maxWidth: 480 }}>
              We build custom-branded business management software for supermarkets and retail stores. AI-powered. Mobile-first. Ready in days, not months.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" as const }}>
              <a href="#contact" style={{
                background: BLACK, color: "#fff", padding: "15px 28px", borderRadius: 12,
                textDecoration: "none", fontSize: 15, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 8,
              }}>
                Get Your Custom App →
              </a>
              <a href="#services" style={{
                background: CARD_BG, color: BLACK, padding: "15px 28px", borderRadius: 12, border: "1px solid " + BORDER,
                textDecoration: "none", fontSize: 15, fontWeight: 600,
              }}>
                See What We Build
              </a>
            </div>
          </div>
          {/* App preview mockup */}
          <div style={{ flex: 1, display: "flex", justifyContent: "center", position: "relative" }}>
            <div style={{
              width: isMobile ? 280 : 320, background: BLACK, borderRadius: 36, padding: "10px",
              boxShadow: "0 40px 80px rgba(0,0,0,0.25)",
            }}>
              <div style={{ background: WARM_BG, borderRadius: 28, overflow: "hidden", aspectRatio: "9/19" }}>
                {/* Fake phone screen */}
                <div style={{ background: BLACK, padding: "12px 20px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Image src="/logo.png" alt="" width={20} height={20} />
                  <span style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>Your Store</span>
                  <span style={{ color: ORANGE, fontSize: 10, fontWeight: 700 }}>LIVE</span>
                </div>
                <div style={{ padding: "16px" }}>
                  <div style={{ fontSize: 12, color: MUTED, marginBottom: 4 }}>Good morning 👋</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: BLACK, marginBottom: 16 }}>Your Business</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                    {[
                      { label: "Today's Sales", value: "€2,144", color: ORANGE },
                      { label: "Monthly Revenue", value: "€51,313", color: "#0071e3" },
                      { label: "Cash Flow", value: "€51,313", color: "#16a34a" },
                      { label: "Low Stock", value: "29 items", color: "#dc2626" },
                    ].map(k => (
                      <div key={k.label} style={{ background: CARD_BG, borderRadius: 10, padding: "10px", border: "1px solid " + BORDER }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: k.color }}>{k.value}</div>
                        <div style={{ fontSize: 9, color: MUTED, marginTop: 2 }}>{k.label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: CARD_BG, borderRadius: 10, padding: "10px", border: "1px solid " + BORDER }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: BLACK, marginBottom: 6 }}>Top Products</div>
                    {["Aashirvaad Atta 2x10kg", "Khanum Butter Ghee", "MDH Kasori Methi"].map((p, i) => (
                      <div key={p} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderTop: i > 0 ? "1px solid " + BORDER : "none" }}>
                        <span style={{ fontSize: 9, color: MUTED }}>{p}</span>
                        <span style={{ fontSize: 9, fontWeight: 700, color: ORANGE }}>€{[13853, 1043, 930][i]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            {/* Floating badges */}
            <div style={{ position: "absolute", top: 20, right: isMobile ? -10 : -20, background: CARD_BG, borderRadius: 12, padding: "10px 14px", boxShadow: "0 8px 24px rgba(0,0,0,0.1)", border: "1px solid " + BORDER }}>
              <div style={{ fontSize: 10, color: MUTED }}>Invoice scanned</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: BLACK }}>95 products</div>
              <div style={{ fontSize: 10, color: ORANGE, fontWeight: 600 }}>in 3 seconds ✓</div>
            </div>
            <div style={{ position: "absolute", bottom: 40, left: isMobile ? -10 : -20, background: CARD_BG, borderRadius: 12, padding: "10px 14px", boxShadow: "0 8px 24px rgba(0,0,0,0.1)", border: "1px solid " + BORDER }}>
              <div style={{ fontSize: 10, color: MUTED }}>Price calculated</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: BLACK }}>€43.61</div>
              <div style={{ fontSize: 10, color: "#16a34a", fontWeight: 600 }}>C/IVACP ✓</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{ background: BLACK, padding: isMobile ? "48px 20px" : "60px 60px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: isMobile ? 24 : 40 }}>
          {stats.map((s, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontSize: isMobile ? 32 : 44, fontWeight: 900, color: ORANGE, marginBottom: 8 }}>{s.value}{s.suffix}</div>
              <div style={{ fontSize: 13, color: "#888", lineHeight: 1.4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── WHAT WE BUILD ── */}
      <section id="services" style={{ padding: isMobile ? "60px 20px" : "100px 60px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: isMobile ? 40 : 60 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: ORANGE, textTransform: "uppercase" as const, letterSpacing: 2, marginBottom: 12 }}>What We Build</div>
          <h2 style={{ fontSize: isMobile ? 28 : 40, fontWeight: 900, color: BLACK, margin: "0 0 16px", letterSpacing: -1 }}>
            Everything your store needs.<br />Nothing you don't.
          </h2>
          <p style={{ fontSize: 16, color: MUTED, maxWidth: 500, margin: "0 auto" }}>
            One app. Your brand. All the tools to run a modern retail business.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 20 }}>
          {services.map((s, i) => (
            <div key={i} style={{
              background: CARD_BG, borderRadius: 20, padding: "32px",
              border: "1px solid " + BORDER,
              transition: "transform 0.2s, box-shadow 0.2s",
            }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>{s.icon}</div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: BLACK, margin: "0 0 10px" }}>{s.title}</h3>
              <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, margin: "0 0 20px" }}>{s.desc}</p>
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                {s.features.map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: ORANGE, fontWeight: 700, fontSize: 14 }}>✓</span>
                    <span style={{ fontSize: 13, color: BLACK, fontWeight: 500 }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" style={{ background: BLACK, padding: isMobile ? "60px 20px" : "100px 60px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: isMobile ? 40 : 60 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: ORANGE, textTransform: "uppercase" as const, letterSpacing: 2, marginBottom: 12 }}>How It Works</div>
            <h2 style={{ fontSize: isMobile ? 28 : 40, fontWeight: 900, color: "#fff", margin: "0 0 16px", letterSpacing: -1 }}>
              From call to live app<br />in days, not months.
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(4,1fr)", gap: 24 }}>
            {process.map((p, i) => (
              <div key={i} style={{ position: "relative" }}>
                {!isMobile && i < process.length - 1 && (
                  <div style={{ position: "absolute", top: 24, right: -12, width: 24, height: 1, background: "#333" }} />
                )}
                <div style={{ background: "#1a1a1a", borderRadius: 16, padding: "28px", border: "1px solid #2a2a2a" }}>
                  <div style={{ fontSize: 32, fontWeight: 900, color: ORANGE, marginBottom: 12, opacity: 0.6 }}>{p.step}</div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: "0 0 10px" }}>{p.title}</h3>
                  <p style={{ fontSize: 13, color: "#888", lineHeight: 1.6, margin: 0 }}>{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CLIENTS ── */}
      <section id="clients" style={{ padding: isMobile ? "60px 20px" : "100px 60px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: isMobile ? 40 : 60 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: ORANGE, textTransform: "uppercase" as const, letterSpacing: 2, marginBottom: 12 }}>Our Clients</div>
          <h2 style={{ fontSize: isMobile ? 28 : 40, fontWeight: 900, color: BLACK, margin: "0 0 16px", letterSpacing: -1 }}>
            Real businesses.<br />Real results.
          </h2>
        </div>
        {clients.map((c, i) => (
          <div key={i} style={{
            background: CARD_BG, borderRadius: 24, padding: isMobile ? "28px" : "40px",
            border: "1px solid " + BORDER, display: "flex",
            flexDirection: isMobile ? "column" : "row" as const,
            gap: 32, alignItems: isMobile ? "flex-start" : "center",
          }}>
            <div style={{ width: 80, height: 80, borderRadius: 20, background: WARM_BG, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, flexShrink: 0 }}>{c.logo}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: BLACK, marginBottom: 4 }}>{c.name}</div>
              <div style={{ fontSize: 13, color: MUTED, marginBottom: 12 }}>{c.type} · {c.location}</div>
              <div style={{ background: "#f0fdf4", borderRadius: 10, padding: "12px 16px", display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "#16a34a", fontSize: 14 }}>✓</span>
                <span style={{ fontSize: 14, color: "#16a34a", fontWeight: 600 }}>{c.result}</span>
              </div>
            </div>
            <div style={{ background: WARM_BG, borderRadius: 16, padding: "20px 24px", textAlign: "center", flexShrink: 0 }}>
              <div style={{ fontSize: 32, fontWeight: 900, color: ORANGE }}>€49K</div>
              <div style={{ fontSize: 12, color: MUTED }}>invoice processed</div>
              <div style={{ fontSize: 12, color: MUTED }}>in one scan</div>
            </div>
          </div>
        ))}

      </section>

      {/* ── CUSTOM PRICING ── */}
      <section style={{ background: WARM_BG, padding: isMobile ? "60px 20px" : "100px 60px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row" as const, gap: 48, alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: ORANGE, textTransform: "uppercase" as const, letterSpacing: 2, marginBottom: 12 }}>Pricing</div>
              <h2 style={{ fontSize: isMobile ? 28 : 40, fontWeight: 900, color: BLACK, margin: "0 0 16px", letterSpacing: -1 }}>
                Priced around<br />your business.
              </h2>
              <p style={{ fontSize: 16, color: MUTED, lineHeight: 1.7, marginBottom: 28 }}>
                Every business is different. We first understand your problems, then we build the right solution. Pricing is based on what we build for you — nothing more, nothing less.
              </p>
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 16 }}>
                {[
                  { icon: "🤝", title: "Discovery First", desc: "We have a call to understand your business, your problems, and your goals." },
                  { icon: "🔨", title: "We Build the Solution", desc: "We build only what you need — no bloated features you'll never use." },
                  { icon: "💬", title: "Transparent Pricing", desc: "You get a clear price before we start. No surprises, no hidden fees." },
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: "#fff8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{item.icon}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: BLACK, marginBottom: 2 }}>{item.title}</div>
                      <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.5 }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ background: BLACK, borderRadius: 24, padding: "36px" }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 8 }}>Ready to get started?</div>
                <div style={{ fontSize: 14, color: "#888", marginBottom: 28 }}>Tell us about your business. We'll come back to you within 24 hours.</div>
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 12 }}>
                  <a href="mailto:samzyaioperator@gmail.com" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: ORANGE, color: "#fff", padding: "15px", borderRadius: 12, textDecoration: "none", fontSize: 15, fontWeight: 700 }}>
                    📧 Send us an Email
                  </a>
                  <a href="https://wa.me/351000000000" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: "#25D366", color: "#fff", padding: "15px", borderRadius: 12, textDecoration: "none", fontSize: 15, fontWeight: 700 }}>
                    💬 WhatsApp Us
                  </a>
                </div>
                <div style={{ marginTop: 24, padding: "16px", background: "#1a1a1a", borderRadius: 12 }}>
                  <div style={{ fontSize: 12, color: "#555", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: 1 }}>What happens next</div>
                  {["30-min discovery call", "We analyse your needs", "You get a custom proposal", "We start building"].map((step, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderTop: i > 0 ? "1px solid #2a2a2a" : "none" }}>
                      <span style={{ color: ORANGE, fontWeight: 700, fontSize: 12 }}>{i + 1}.</span>
                      <span style={{ fontSize: 13, color: "#888" }}>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section id="contact" style={{ background: BLACK, padding: isMobile ? "60px 20px" : "100px 60px" }}>
        <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: ORANGE, textTransform: "uppercase" as const, letterSpacing: 2, marginBottom: 12 }}>Get In Touch</div>
          <h2 style={{ fontSize: isMobile ? 28 : 44, fontWeight: 900, color: "#fff", margin: "0 0 16px", letterSpacing: -1 }}>
            Ready to transform<br />your business?
          </h2>
          <p style={{ fontSize: 16, color: "#888", marginBottom: 48 }}>
            We'll have a 30-minute call to understand your business. No commitment required.
          </p>
          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row" as const, gap: 12, justifyContent: "center" }}>
            <a href="mailto:samzyaioperator@gmail.com" style={{
              background: ORANGE, color: "#fff", padding: "16px 32px", borderRadius: 12,
              textDecoration: "none", fontSize: 16, fontWeight: 700,
            }}>
              📧 Email Us
            </a>
            <a href="https://wa.me/351000000000" style={{
              background: "#25D366", color: "#fff", padding: "16px 32px", borderRadius: 12,
              textDecoration: "none", fontSize: 16, fontWeight: 700,
            }}>
              💬 WhatsApp
            </a>
          </div>
          <div style={{ marginTop: 48, display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: 20 }}>
            {[
              { icon: "📍", label: "Based in", value: "Lisbon, Portugal" },
              { icon: "🌍", label: "Serving", value: "Portugal & Europe" },
              { icon: "⚡", label: "Setup time", value: "Ready in days" },
            ].map(item => (
              <div key={item.label} style={{ background: "#1a1a1a", borderRadius: 14, padding: "20px", border: "1px solid #2a2a2a" }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{item.icon}</div>
                <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: "#080808", padding: isMobile ? "32px 20px" : "40px 60px", borderTop: "1px solid #1a1a1a" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexDirection: isMobile ? "column" : "row" as const, justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Image src="/logo.png" alt="Samzy" width={24} height={24} />
            <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>Samzy</span>
            <span style={{ fontSize: 12, color: "#555" }}>— Custom Business Software</span>
          </div>
          <div style={{ display: "flex", gap: 24 }}>
            {["Privacy Policy", "Terms of Service", "Client Login"].map(link => (
              <a key={link} href="#" style={{ fontSize: 12, color: "#555", textDecoration: "none" }}>{link}</a>
            ))}
          </div>
          <div style={{ fontSize: 12, color: "#555" }}>© 2026 Samzy. All rights reserved.</div>
        </div>
      </footer>

    </div>
  );
}