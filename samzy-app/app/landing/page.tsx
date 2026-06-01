"use client";
import { useIsMobile } from "@/lib/useIsMobile";
import Image from "next/image";
import { useState, useEffect } from "react";

const ORANGE = "#FC7800";
const BLACK = "#1d1d1f";
const WHITE = "#ffffff";
const LIGHT_GRAY = "#f5f5f7";
const MID_GRAY = "#6e6e73";
const BORDER = "#d2d2d7";

export default function Landing() {
  const isMobile = useIsMobile();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (isMobile === undefined) return null;

  const navBlurred = scrollY > 40;

  return (
    <div style={{
      fontFamily: "-apple-system, 'SF Pro Display', 'SF Pro Text', BlinkMacSystemFont, sans-serif",
      color: BLACK, background: WHITE, overflowX: "hidden",
    }}>

      {/* NAV */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 200, height: 52,
        background: navBlurred ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.72)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        borderBottom: navBlurred ? "1px solid rgba(0,0,0,0.08)" : "none",
        display: "flex", alignItems: "center", justifyContent: isMobile ? "center" : "space-between",
        padding: "0 22px", transition: "all 0.3s",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Image src="/logo.png" alt="Samzy" width={22} height={22} />
          <span style={{ fontSize: 17, fontWeight: 700, color: BLACK, letterSpacing: -0.3 }}>Samzy</span>
        </div>
        {!isMobile && (
          <div style={{ display: "flex", gap: 28 }}>
            {["Services", "How It Works", "Clients", "Contact"].map(item => (
              <a key={item} href={`#${item.toLowerCase().replace(/ /g, "-")}`}
                style={{ fontSize: 13, color: MID_GRAY, textDecoration: "none", fontWeight: 400 }}>
                {item}
              </a>
            ))}
          </div>
        )}
      </nav>

      {/* HERO */}
      <section style={{
        padding: isMobile ? "120px 24px 80px" : "160px 40px 120px",
        textAlign: "center",
        background: `linear-gradient(180deg, ${WHITE} 60%, ${LIGHT_GRAY} 100%)`,
      }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: ORANGE, letterSpacing: 1, textTransform: "uppercase" as const, marginBottom: 20 }}>
            Custom Business Software Agency
          </p>
          <h1 style={{
            fontSize: isMobile ? 48 : 88, fontWeight: 900, color: BLACK,
            letterSpacing: isMobile ? -2.5 : -5, lineHeight: 0.95, margin: "0 0 28px",
          }}>
            Your business.<br />
            <span style={{ color: ORANGE }}>Your app.</span><br />
            Your rules.
          </h1>
          <p style={{
            fontSize: isMobile ? 17 : 22, color: MID_GRAY, lineHeight: 1.55,
            fontWeight: 400, letterSpacing: -0.3, maxWidth: 580, margin: "0 auto 44px",
          }}>
            We build private, branded software for supermarkets and retail stores. Built around your exact business — your suppliers, your pricing, your data. Nobody else's.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" as const }}>
            <a href="#contact" style={{
              background: BLACK, color: WHITE, padding: isMobile ? "14px 28px" : "17px 34px",
              borderRadius: 30, fontSize: 16, fontWeight: 600, textDecoration: "none", letterSpacing: -0.3,
            }}>
              Start a Project →
            </a>
            <a href="#services" style={{
              background: WHITE, color: BLACK, padding: isMobile ? "14px 28px" : "17px 34px",
              borderRadius: 30, fontSize: 16, fontWeight: 600, textDecoration: "none",
              border: "1px solid " + BORDER, letterSpacing: -0.3,
            }}>
              See What We Build
            </a>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section style={{ background: BLACK, padding: isMobile ? "44px 24px" : "52px 80px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: isMobile ? 28 : 0 }}>
          {[
            { value: "95", label: "products per invoice scan" },
            { value: "€49K", label: "invoice in one upload" },
            { value: "< 3s", label: "to calculate all prices" },
            { value: "100%", label: "private — your data only" },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: "center", padding: !isMobile ? "0 40px" : "0", borderRight: !isMobile && i < 3 ? "1px solid #2a2a2a" : "none" }}>
              <div style={{ fontSize: isMobile ? 32 : 42, fontWeight: 900, color: WHITE, letterSpacing: -2, marginBottom: 6 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "#666" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" style={{ background: LIGHT_GRAY, padding: isMobile ? "80px 24px" : "120px 80px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ marginBottom: isMobile ? 48 : 80 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: ORANGE, letterSpacing: 1, textTransform: "uppercase" as const, marginBottom: 14 }}>Services</p>
            <h2 style={{ fontSize: isMobile ? 34 : 56, fontWeight: 800, color: BLACK, letterSpacing: isMobile ? -1.5 : -3, lineHeight: 1.05, margin: 0, maxWidth: 600 }}>
              Everything your store needs. Nothing it doesn't.
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 2 }}>
            {[
              { icon: "📱", tag: "Private & Branded", title: "Your Own App", desc: "Your logo, your colors, your business name. Fully private — installed on your phone, built exclusively for your business. Your staff, your data, your rules." },
              { icon: "🧠", tag: "AI-Powered", title: "AI That Knows Your Store", desc: "Every morning your AI advisor summarizes sales, stock, and cash flow. Ask it anything — it knows your suppliers, your products, your numbers." },
              { icon: "📄", tag: "Smart Pricing", title: "Invoice to Prices in Seconds", desc: "Upload a supplier invoice. AI extracts every product and calculates your selling prices using your exact formulas. Hours of work done in seconds." },
              { icon: "📊", tag: "Buy Smarter", title: "Supplier Intelligence", desc: "See which supplier offers the best price for every product. Track price changes over time. Make purchasing decisions with real data, not guesswork." },
            ].map((s, i) => (
              <div key={i} style={{
                background: WHITE, padding: isMobile ? "36px 32px" : "52px 48px",
                borderRadius: isMobile ? 20 : (
                  i === 0 ? "20px 0 0 0" :
                  i === 1 ? "0 20px 0 0" :
                  i === 2 ? "0 0 0 20px" :
                           "0 0 20px 0"
                ),
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: ORANGE, letterSpacing: 1.5, textTransform: "uppercase" as const, marginBottom: 20 }}>{s.tag}</div>
                <div style={{ fontSize: 44, marginBottom: 20 }}>{s.icon}</div>
                <h3 style={{ fontSize: isMobile ? 22 : 26, fontWeight: 700, color: BLACK, letterSpacing: -0.8, margin: "0 0 14px", lineHeight: 1.15 }}>{s.title}</h3>
                <p style={{ fontSize: 15, color: MID_GRAY, lineHeight: 1.65, margin: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" style={{ background: WHITE, padding: isMobile ? "80px 24px" : "120px 80px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ marginBottom: isMobile ? 48 : 80, maxWidth: 560 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: ORANGE, letterSpacing: 1, textTransform: "uppercase" as const, marginBottom: 14 }}>Process</p>
            <h2 style={{ fontSize: isMobile ? 34 : 56, fontWeight: 800, color: BLACK, letterSpacing: isMobile ? -1.5 : -3, lineHeight: 1.05, margin: 0 }}>
              Conversation to live app.
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(4,1fr)", gap: isMobile ? 36 : 0 }}>
            {[
              { num: "01", title: "We Listen", desc: "We understand your business — your problems, your suppliers, how you manage pricing today." },
              { num: "02", title: "We Design", desc: "We design a solution around your exact needs. No generic features, no unnecessary complexity." },
              { num: "03", title: "We Build", desc: "Your branded app goes live. We train you in 30 minutes. Simple enough for any staff member." },
              { num: "04", title: "We Support", desc: "Ongoing support, improvements, new features. We grow alongside your business." },
            ].map((step, i) => (
              <div key={i} style={{ padding: !isMobile ? "0 44px 0 0" : "0", borderRight: !isMobile && i < 3 ? "1px solid " + BORDER : "none" }}>
                <div style={{ fontSize: 52, fontWeight: 900, color: LIGHT_GRAY, letterSpacing: -3, marginBottom: 20, lineHeight: 1 }}>{step.num}</div>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: BLACK, letterSpacing: -0.5, margin: "0 0 10px" }}>{step.title}</h3>
                <p style={{ fontSize: 14, color: MID_GRAY, lineHeight: 1.6, margin: 0 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CLIENT */}
      <section id="clients" style={{ background: LIGHT_GRAY, padding: isMobile ? "80px 24px" : "120px 80px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ marginBottom: isMobile ? 48 : 80 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: ORANGE, letterSpacing: 1, textTransform: "uppercase" as const, marginBottom: 14 }}>Clients</p>
            <h2 style={{ fontSize: isMobile ? 34 : 56, fontWeight: 800, color: BLACK, letterSpacing: isMobile ? -1.5 : -3, lineHeight: 1.05, margin: 0 }}>
              Real businesses.<br />Real results.
            </h2>
          </div>
          <div style={{ background: WHITE, borderRadius: 28, padding: isMobile ? "36px 28px" : "56px 64px" }}>
            <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row" as const, gap: 56, alignItems: isMobile ? "flex-start" : "center" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: MID_GRAY, fontWeight: 500, marginBottom: 6 }}>Asian Supermarket · Lisbon, Portugal</div>
                <h3 style={{ fontSize: isMobile ? 26 : 36, fontWeight: 800, color: BLACK, letterSpacing: -1.2, margin: "0 0 20px" }}>Sher-E-Punjab</h3>
                <p style={{ fontSize: 16, color: MID_GRAY, lineHeight: 1.65, margin: "0 0 32px" }}>
                  Processing supplier invoices from KRG Asian Food (Rotterdam, Netherlands) used to take hours of manual Excel work. Now it takes seconds — AI extracts every product, calculates all selling prices, and updates inventory automatically.
                </p>
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 14 }}>
                  {[
                    "95 products extracted from a single invoice automatically",
                    "€49,168 invoice processed in one scan",
                    "All selling prices calculated using their exact Excel formulas",
                    "Full price history and supplier comparison built in",
                  ].map((r, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <span style={{ color: ORANGE, fontWeight: 700, flexShrink: 0, marginTop: 2 }}>✓</span>
                      <span style={{ fontSize: 15, color: BLACK, lineHeight: 1.4 }}>{r}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ flexShrink: 0 }}>
                <div style={{ background: LIGHT_GRAY, borderRadius: 20, padding: "40px 52px", textAlign: "center" }}>
                  <div style={{ fontSize: isMobile ? 52 : 72, fontWeight: 900, color: BLACK, letterSpacing: -4, lineHeight: 1 }}>€49K</div>
                  <div style={{ fontSize: 14, color: MID_GRAY, marginTop: 8 }}>invoice per scan</div>
                  <div style={{ width: 40, height: 3, background: ORANGE, borderRadius: 2, margin: "20px auto 0" }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section style={{ background: WHITE, padding: isMobile ? "80px 24px" : "120px 80px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row" as const, gap: 80, alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: ORANGE, letterSpacing: 1, textTransform: "uppercase" as const, marginBottom: 14 }}>Pricing</p>
              <h2 style={{ fontSize: isMobile ? 34 : 52, fontWeight: 800, color: BLACK, letterSpacing: isMobile ? -1.5 : -2.5, lineHeight: 1.1, margin: "0 0 24px" }}>
                Priced around<br />your business.
              </h2>
              <p style={{ fontSize: 17, color: MID_GRAY, lineHeight: 1.65, margin: "0 0 44px" }}>
                Every business has different problems. We first understand what you need, then we build the right solution. Pricing is based on what we build for you — nothing more, nothing less.
              </p>
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 28 }}>
                {[
                  { icon: "🤝", title: "Discovery First", desc: "We have a conversation to understand your business, your problems, and what would make your life easier." },
                  { icon: "🔨", title: "Build What You Need", desc: "We build only the features that solve your actual problems. No bloat." },
                  { icon: "💬", title: "Transparent Pricing", desc: "You get a clear price before we start. No surprises. No hidden fees." },
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
                    <div style={{ width: 46, height: 46, borderRadius: 12, background: LIGHT_GRAY, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{item.icon}</div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: BLACK, letterSpacing: -0.3, marginBottom: 5 }}>{item.title}</div>
                      <div style={{ fontSize: 14, color: MID_GRAY, lineHeight: 1.55 }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ background: LIGHT_GRAY, borderRadius: 24, padding: isMobile ? "36px 28px" : "48px 44px" }}>
                <h3 style={{ fontSize: 22, fontWeight: 800, color: BLACK, letterSpacing: -0.8, margin: "0 0 10px" }}>Let's talk about your business.</h3>
                <p style={{ fontSize: 14, color: MID_GRAY, margin: "0 0 32px", lineHeight: 1.55 }}>Tell us what you're dealing with. We'll respond within 24 hours.</p>
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 10, marginBottom: 32 }}>
                  <a href="mailto:samzyaioperator@gmail.com" style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                    background: BLACK, color: WHITE, padding: "16px", borderRadius: 14,
                    textDecoration: "none", fontSize: 15, fontWeight: 600, letterSpacing: -0.3,
                  }}>📧 Send an Email</a>
                  <a href="https://wa.me/351920605697" style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                    background: "#25D366", color: WHITE, padding: "16px", borderRadius: 14,
                    textDecoration: "none", fontSize: 15, fontWeight: 600, letterSpacing: -0.3,
                  }}>💬 WhatsApp</a>
                </div>
                <div style={{ borderTop: "1px solid " + BORDER, paddingTop: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: MID_GRAY, textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 16 }}>What happens next</div>
                  {["30-min discovery call", "We analyse your needs", "Custom proposal", "We start building"].map((step, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0", borderBottom: i < 3 ? "1px solid " + BORDER : "none" }}>
                      <div style={{ width: 24, height: 24, borderRadius: "50%", background: ORANGE, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: WHITE, flexShrink: 0 }}>{i + 1}</div>
                      <span style={{ fontSize: 14, color: BLACK }}>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="contact" style={{ background: BLACK, padding: isMobile ? "80px 24px" : "140px 80px", textAlign: "center" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <h2 style={{ fontSize: isMobile ? 40 : 72, fontWeight: 900, color: WHITE, letterSpacing: isMobile ? -2 : -4, lineHeight: 0.95, margin: "0 0 28px" }}>
            Ready to build<br />your own app?
          </h2>
          <p style={{ fontSize: 18, color: "#888", margin: "0 0 48px", lineHeight: 1.6, letterSpacing: -0.3 }}>
            No commitment. No contracts. Just a conversation.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" as const }}>
            <a href="mailto:samzyaioperator@gmail.com" style={{
              background: ORANGE, color: WHITE, padding: "18px 40px", borderRadius: 30,
              fontSize: 17, fontWeight: 700, textDecoration: "none", letterSpacing: -0.3,
            }}>Get in Touch</a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: WHITE, borderTop: "1px solid " + BORDER, padding: isMobile ? "28px 24px" : "36px 80px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: isMobile ? "column" : "row" as const, justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Image src="/logo.png" alt="Samzy" width={20} height={20} />
            <span style={{ fontSize: 14, fontWeight: 700, color: BLACK }}>Samzy</span>
            <span style={{ fontSize: 13, color: MID_GRAY }}>— Custom Business Software</span>
          </div>
          <div style={{ display: "flex", gap: 24 }}>
            {[["Privacy Policy", "/privacy"], ["Terms", "/terms"]].map(([link, href]) => (
              <a key={link} href={href} style={{ fontSize: 12, color: MID_GRAY, textDecoration: "none" }}>{link}</a>
            ))}
          </div>
          <div style={{ fontSize: 12, color: MID_GRAY }}>© 2026 Samzy. Lisbon, Portugal.</div>
        </div>
      </footer>

    </div>
  );
}
