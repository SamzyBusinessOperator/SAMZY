"use client";
import { useEffect, useState } from "react";

const ORANGE = "#FC7800";
const BLACK = "#0f0f0f";
const WARM_BG = "#FAFAF8";
const CARD_BG = "#FFFFFF";
const BORDER = "#F0EEEB";
const MUTED = "#6B6B6B";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

export default function Landing() {
  const isMobile = useIsMobile();

  const features = [
    { icon: "📊", title: "See Your Business At a Glance", desc: "Every morning, know how much you sold, what's running low, and what needs attention." },
    { icon: "⚠️", title: "Never Run Out of Stock Again", desc: "Real-time inventory alerts before products run out. No more emergency supplier calls." },
    { icon: "✦", title: "Your Own AI Business Advisor", desc: "Ask anything. Get instant answers based on your real store data." },
    { icon: "🚚", title: "Stay on Top of Invoices", desc: "See all supplier invoices in one place. Know what's due before it becomes a problem." },
    { icon: "👥", title: "Manage Your Staff Easily", desc: "See who's working today, manage shifts — all from one simple screen." },
    { icon: "💰", title: "Understand Your Finances", desc: "Daily revenue, monthly totals, and cash flow at a glance." },
  ];

  const problems = [
    "You don't know how much you're really making each day",
    "Products run out and you only notice when customers complain",
    "Supplier invoices pile up and you lose track of what you owe",
    "You make decisions based on gut feeling, not real data",
    "Managing staff schedules takes too much time",
  ];

  const testimonials = [
    { name: "Carlos M.", store: "Minimarket Lisboa", text: "Before Samzy I had no idea which products were making me money. Now I know every morning." },
    { name: "Ana R.", store: "Supermercado Barreiro", text: "The AI advisor told me to stop ordering a product just sitting on the shelf. Saved me 400 euros." },
    { name: "Joao F.", store: "Mercado Central", text: "I used to spend 2 hours every Monday figuring out the week. Now it takes 5 minutes." },
  ];

  const p = isMobile ? "0 20px" : "0 48px";

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif", color: BLACK, background: WARM_BG }}>

      {/* Nav */}
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: isMobile ? "16px 20px" : "20px 48px", borderBottom: "1px solid " + BORDER, position: "sticky", top: 0, background: WARM_BG, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, background: ORANGE, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>🛒</div>
          <span style={{ fontSize: 16, fontWeight: 800, color: BLACK }}>Samzy</span>
        </div>
        <div style={{ display: "flex", gap: isMobile ? 8 : 24, alignItems: "center" }}>
          {!isMobile && (
            <>
              <a href="#features" style={{ color: MUTED, textDecoration: "none", fontSize: 14 }}>Features</a>
              <a href="#pricing" style={{ color: MUTED, textDecoration: "none", fontSize: 14 }}>Pricing</a>
              <a href="/login" style={{ color: MUTED, textDecoration: "none", fontSize: 14 }}>Sign In</a>
            </>
          )}
          {isMobile && <a href="/login" style={{ color: MUTED, textDecoration: "none", fontSize: 13 }}>Sign In</a>}
          <a href="/signup" style={{ background: ORANGE, color: "#fff", padding: isMobile ? "9px 16px" : "10px 22px", borderRadius: 10, textDecoration: "none", fontSize: isMobile ? 13 : 14, fontWeight: 700 }}>Get Started</a>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: isMobile ? "60px 20px 50px" : "120px 48px 100px", textAlign: "center" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: CARD_BG, border: "1px solid " + BORDER, padding: "6px 14px", borderRadius: 20, fontSize: 12, color: MUTED, marginBottom: 24 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: ORANGE, display: "inline-block" }} />
            Built for independent supermarket owners
          </div>
          <h1 style={{ fontSize: isMobile ? 38 : 64, fontWeight: 800, color: BLACK, lineHeight: 1.1, margin: "0 0 20px", letterSpacing: isMobile ? -1 : -2 }}>
            Run your supermarket<br />
            <span style={{ color: ORANGE }}>smarter, not harder.</span>
          </h1>
          <p style={{ fontSize: isMobile ? 16 : 20, color: MUTED, lineHeight: 1.7, marginBottom: 36, maxWidth: 520, margin: "0 auto 36px" }}>
            Real-time sales, inventory, staff, and finances — plus an AI advisor that tells you exactly what to do to grow.
          </p>
          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 12, justifyContent: "center", alignItems: "center" }}>
            <a href="/signup" style={{ background: ORANGE, color: "#fff", padding: "15px 36px", borderRadius: 12, textDecoration: "none", fontSize: 16, fontWeight: 700, display: "block", width: isMobile ? "100%" : "auto", textAlign: "center", boxSizing: "border-box" as const }}>
              Start Free Today →
            </a>
            <a href="#features" style={{ background: CARD_BG, color: BLACK, padding: "15px 36px", borderRadius: 12, textDecoration: "none", fontSize: 16, fontWeight: 600, border: "1px solid " + BORDER, display: "block", width: isMobile ? "100%" : "auto", textAlign: "center", boxSizing: "border-box" as const }}>
              See How It Works
            </a>
          </div>
          <p style={{ color: MUTED, fontSize: 12, marginTop: 16 }}>No credit card required · Setup in 5 minutes</p>
        </div>
      </section>

      {/* Stats */}
      <section style={{ background: ORANGE, padding: isMobile ? "40px 20px" : "60px 48px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0 }}>
          {[{ number: "2 min", label: "To set up your store" }, { number: "24/7", label: "AI watching your store" }, { number: "€0", label: "To get started today" }].map((stat, i) => (
            <div key={i} style={{ textAlign: "center", padding: isMobile ? "16px 8px" : "20px", borderRight: i < 2 ? "1px solid rgba(255,255,255,0.2)" : "none" }}>
              <div style={{ fontSize: isMobile ? 28 : 36, fontWeight: 800, color: "#fff", letterSpacing: -1, marginBottom: 6 }}>{stat.number}</div>
              <div style={{ fontSize: isMobile ? 11 : 14, color: "#fff" }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Problems */}
      <section style={{ padding: isMobile ? "60px 20px" : "100px 48px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <h2 style={{ fontSize: isMobile ? 28 : 40, fontWeight: 800, margin: "0 0 12px", letterSpacing: -1 }}>Sound familiar?</h2>
            <p style={{ color: MUTED, fontSize: isMobile ? 15 : 17, lineHeight: 1.6 }}>Most supermarket owners deal with these problems every day.</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {problems.map((p, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, background: CARD_BG, padding: "16px 20px", borderRadius: 12, border: "1px solid " + BORDER }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>❌</span>
                <span style={{ fontSize: isMobile ? 13 : 15, color: BLACK }}>{p}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 24, padding: "24px", background: ORANGE, borderRadius: 14, textAlign: "center" }}>
            <p style={{ color: "#fff", fontSize: isMobile ? 15 : 18, fontWeight: 700, margin: 0 }}>Samzy solves all of this. In one app.</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ padding: isMobile ? "60px 20px" : "100px 48px", background: CARD_BG, borderTop: "1px solid " + BORDER }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: isMobile ? 36 : 56 }}>
            <h2 style={{ fontSize: isMobile ? 28 : 40, fontWeight: 800, margin: "0 0 12px", letterSpacing: -1 }}>Everything you need</h2>
            <p style={{ color: MUTED, fontSize: isMobile ? 15 : 17 }}>All in one place. No spreadsheets. No headaches.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)", gap: isMobile ? 12 : 24 }}>
            {features.map((f, i) => (
              <div key={i} style={{ background: WARM_BG, borderRadius: 14, padding: isMobile ? "18px" : "28px", border: "1px solid " + BORDER, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: 3, background: i === 2 ? ORANGE : BORDER }} />
                <div style={{ fontSize: isMobile ? 24 : 32, marginBottom: 10 }}>{f.icon}</div>
                <h3 style={{ fontSize: isMobile ? 13 : 16, fontWeight: 700, marginBottom: 8, margin: "0 0 8px", color: BLACK }}>{f.title}</h3>
                {!isMobile && <p style={{ color: MUTED, fontSize: 14, lineHeight: 1.7, margin: 0 }}>{f.desc}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Section */}
      <section style={{ padding: isMobile ? "60px 20px" : "100px 48px", background: ORANGE }}>
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: 32, color: ORANGE, marginBottom: 16, fontWeight: 700 }}>✦</div>
          <h2 style={{ fontSize: isMobile ? 28 : 40, fontWeight: 800, color: BLACK, marginBottom: 14, letterSpacing: -1 }}>Meet your AI Business Advisor</h2>
          <p style={{ color: BLACK, fontSize: isMobile ? 15 : 17, lineHeight: 1.7, marginBottom: 36 }}>Ask anything and get instant answers based on your real store data.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, textAlign: "left" }}>
            {[
              { q: "What should I reorder this week?", a: "Reorder Whole Milk 1L (4 left), Eggs 12pk (3 left), and White Bread (6 left). Order from Dairy Direct today." },
              { q: "Why are my sales low on Tuesdays?", a: "Tuesday sales are 22% below average. Try a promotion on near-expiry items from 3-5 PM." },
            ].map((item, i) => (
              <div key={i} style={{ background: "rgba(0,0,0,0.2)", borderRadius: 12, padding: "16px 20px", border: "1px solid #1a1a1a" }}>
                <p style={{ color: BLACK, fontSize: 12, margin: "0 0 8px" }}>You: {item.q}</p>
                <p style={{ color: "#fff", fontSize: 13, margin: 0, lineHeight: 1.6, borderLeft: "3px solid " + ORANGE, paddingLeft: 12 }}>✦ {item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section style={{ padding: isMobile ? "60px 20px" : "100px 48px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <h2 style={{ fontSize: isMobile ? 28 : 40, fontWeight: 800, textAlign: "center", marginBottom: isMobile ? 32 : 52, letterSpacing: -1 }}>What owners are saying</h2>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: isMobile ? 14 : 24 }}>
            {testimonials.map((t, i) => (
              <div key={i} style={{ background: CARD_BG, borderRadius: 14, padding: "24px", border: "1px solid " + BORDER }}>
                <div style={{ fontSize: 20, color: ORANGE, marginBottom: 12, fontWeight: 700 }}>"</div>
                <p style={{ color: BLACK, fontSize: 14, lineHeight: 1.7, marginBottom: 18 }}>{t.text}</p>
                <div style={{ borderTop: "1px solid " + BORDER, paddingTop: 14 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: BLACK }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{t.store}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ padding: isMobile ? "60px 20px" : "100px 48px", background: CARD_BG, borderTop: "1px solid " + BORDER }}>
        <div style={{ maxWidth: 460, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: isMobile ? 28 : 40, fontWeight: 800, marginBottom: 12, letterSpacing: -1 }}>Simple pricing</h2>
          <p style={{ color: MUTED, fontSize: isMobile ? 15 : 17, marginBottom: 40 }}>One plan. Everything included.</p>
          <div style={{ background: BLACK, borderRadius: 18, padding: isMobile ? "32px 24px" : "48px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: 4, background: ORANGE }} />
            <div style={{ fontSize: 12, color: "#555", marginBottom: 8, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" as const }}>Samzy Pro</div>
            <div style={{ fontSize: isMobile ? 48 : 60, fontWeight: 800, color: "#fff", marginBottom: 4, letterSpacing: -2 }}>29<span style={{ fontSize: 24 }}>€</span><span style={{ fontSize: 18, fontWeight: 400, color: "#555" }}>/mo</span></div>
            <p style={{ color: "#555", fontSize: 13, marginBottom: 28 }}>Per store. Everything included.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28, textAlign: "left" }}>
              {["Full dashboard", "AI Advisor powered by Claude", "Inventory alerts", "Staff management", "Supplier tracking", "Financial overview"].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: ORANGE, fontWeight: 700 }}>✓</span>
                  <span style={{ color: "#ccc", fontSize: 14 }}>{item}</span>
                </div>
              ))}
            </div>
            <a href="/signup" style={{ display: "block", background: ORANGE, color: "#fff", padding: "15px", borderRadius: 10, textDecoration: "none", fontSize: 15, fontWeight: 700 }}>Start Free - 14 Day Trial</a>
            <p style={{ color: "#444", fontSize: 12, marginTop: 12 }}>No credit card required</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: isMobile ? "60px 20px" : "100px 48px", background: ORANGE, textAlign: "center" }}>
        <h2 style={{ fontSize: isMobile ? 28 : 44, fontWeight: 800, color: BLACK, marginBottom: 14, letterSpacing: -1 }}>Ready to take control?</h2>
        <p style={{ color: "#fff", fontSize: isMobile ? 15 : 18, marginBottom: 32, opacity: 0.9 }}>Join supermarket owners already using Samzy.</p>
        <a href="/signup" style={{ background: "#fff", color: ORANGE, padding: isMobile ? "15px 32px" : "18px 52px", borderRadius: 12, textDecoration: "none", fontSize: isMobile ? 15 : 16, fontWeight: 800 }}>Get Started Free →</a>
      </section>

      {/* Footer */}
      <footer style={{ padding: isMobile ? "24px 20px" : "40px 48px", borderTop: "1px solid " + BORDER, background: WARM_BG, display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: "center", gap: isMobile ? 12 : 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 24, height: 24, background: ORANGE, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>🛒</div>
          <span style={{ fontWeight: 700, fontSize: 14, color: BLACK }}>Samzy</span>
        </div>
        <div style={{ color: MUTED, fontSize: 12 }}>2026 Samzy. Built for supermarket owners.</div>
        <div style={{ display: "flex", gap: 20 }}>
          <a href="/login" style={{ color: MUTED, textDecoration: "none", fontSize: 13 }}>Sign In</a>
          <a href="/signup" style={{ color: MUTED, textDecoration: "none", fontSize: 13 }}>Sign Up</a>
        </div>
      </footer>

    </div>
  );
}