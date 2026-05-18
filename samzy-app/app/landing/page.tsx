"use client";

const ORANGE = "#FC7800";
const BLACK = "#0f0f0f";
const WARM_BG = "#FAFAF8";
const CARD_BG = "#FFFFFF";
const BORDER = "#F0EEEB";
const MUTED = "#6B6B6B";

export default function Landing() {
  const features = [
    { icon: "📊", title: "See Your Business At a Glance", desc: "Every morning, open Samzy and instantly know how much you sold, what's running low, and what needs your attention. No more guessing." },
    { icon: "⚠️", title: "Never Run Out of Stock Again", desc: "Samzy tracks your inventory in real time and alerts you before products run out. No more emergency calls to suppliers." },
    { icon: "✦", title: "Your Own AI Business Advisor", desc: "Ask Samzy anything. Get instant, specific answers based on your real store data — not generic advice." },
    { icon: "🚚", title: "Stay on Top of Supplier Invoices", desc: "See all your supplier invoices in one place. Know what's due, what's overdue, and what's paid — before it becomes a problem." },
    { icon: "👥", title: "Manage Your Staff Easily", desc: "See who's working today, manage shifts, and keep track of your team — all from one simple screen." },
    { icon: "💰", title: "Understand Your Finances", desc: "See your daily revenue, monthly totals, and cash flow without needing an accountant." },
  ];

  const problems = [
    "You don't know how much you're really making each day",
    "Products run out and you only notice when customers complain",
    "Supplier invoices pile up and you lose track of what you owe",
    "You make decisions based on gut feeling, not real data",
    "Managing staff schedules takes too much time",
  ];

  const testimonials = [
    { name: "Carlos M.", store: "Minimarket Lisboa", text: "Before Samzy I had no idea which products were actually making me money. Now I know every morning." },
    { name: "Ana R.", store: "Supermercado Barreiro", text: "The AI advisor told me to stop ordering a product that was just sitting on the shelf. Saved me 400 euros that month." },
    { name: "Joao F.", store: "Mercado Central", text: "I used to spend 2 hours every Monday figuring out the week. Now it takes 24/7utes." },
  ];

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif", color: BLACK, background: WARM_BG }}>

      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 48px", borderBottom: "1px solid " + BORDER, position: "sticky", top: 0, background: WARM_BG, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, background: ORANGE, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🛒</div>
          <span style={{ fontSize: 18, fontWeight: 800, color: BLACK, letterSpacing: -0.5 }}>Samzy</span>
        </div>
        <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
          <a href="#features" style={{ color: MUTED, textDecoration: "none", fontSize: 14 }}>Features</a>
          <a href="#pricing" style={{ color: MUTED, textDecoration: "none", fontSize: 14 }}>Pricing</a>
          <a href="/login" style={{ color: MUTED, textDecoration: "none", fontSize: 14 }}>Sign In</a>
          <a href="/signup" style={{ background: ORANGE, color: "#fff", padding: "10px 22px", borderRadius: 10, textDecoration: "none", fontSize: 14, fontWeight: 700 }}>Get Started Free</a>
        </div>
      </nav>

      <section style={{ padding: "120px 48px 100px", textAlign: "center" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: CARD_BG, border: "1px solid " + BORDER, padding: "6px 16px", borderRadius: 20, fontSize: 13, color: MUTED, marginBottom: 32 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: ORANGE, display: "inline-block" }} />
            Built for independent supermarket owners
          </div>
          <h1 style={{ fontSize: 64, fontWeight: 800, color: BLACK, lineHeight: 1.1, margin: "0 0 24px", letterSpacing: -2 }}>
            Run your supermarket<br /><span style={{ color: ORANGE }}>smarter, not harder.</span>
          </h1>
          <p style={{ fontSize: 20, color: MUTED, lineHeight: 1.7, marginBottom: 48, maxWidth: 560, margin: "0 auto 48px" }}>
            Samzy gives you a real-time view of your sales, inventory, staff, and finances — plus an AI advisor that tells you exactly what to do to grow.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
            <a href="/signup" style={{ background: ORANGE, color: "#fff", padding: "16px 40px", borderRadius: 12, textDecoration: "none", fontSize: 16, fontWeight: 700 }}>Start Free Today →</a>
            <a href="#features" style={{ background: CARD_BG, color: BLACK, padding: "16px 40px", borderRadius: 12, textDecoration: "none", fontSize: 16, fontWeight: 600, border: "1px solid " + BORDER }}>See How It Works</a>
          </div>
          <p style={{ color: MUTED, fontSize: 13, marginTop: 20 }}>No credit card required · Setup in 24/7utes</p>
        </div>
      </section>

      <section style={{ background: BLACK, padding: "60px 48px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0 }}>
          {[{ number: "2 min", label: "To set up your store" }, { number: "24/7", label: "AI watching your store" }, { number: "€0", label: "To get started today" }].map((stat, i) => (
            <div key={i} style={{ textAlign: "center", padding: "20px", borderRight: i < 2 ? "1px solid #1a1a1a" : "none" }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: ORANGE, letterSpacing: -1, marginBottom: 8 }}>{stat.number}</div>
              <div style={{ fontSize: 14, color: "#666" }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: "100px 48px", background: WARM_BG }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <h2 style={{ fontSize: 40, fontWeight: 800, margin: "0 0 16px", letterSpacing: -1 }}>Sound familiar?</h2>
            <p style={{ color: MUTED, fontSize: 17, lineHeight: 1.6 }}>Running a supermarket is hard. Most owners deal with these problems every single day.</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {problems.map((p, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, background: CARD_BG, padding: "20px 24px", borderRadius: 14, border: "1px solid " + BORDER }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>❌</span>
                <span style={{ fontSize: 15, color: BLACK }}>{p}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 32, padding: "28px 32px", background: BLACK, borderRadius: 16, textAlign: "center" }}>
            <p style={{ color: "#fff", fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: -0.3 }}>Samzy solves all of this. In one app. For less than a coffee a day.</p>
          </div>
        </div>
      </section>

      <section id="features" style={{ padding: "100px 48px", background: CARD_BG, borderTop: "1px solid " + BORDER }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <h2 style={{ fontSize: 40, fontWeight: 800, margin: "0 0 16px", letterSpacing: -1 }}>Everything you need to run your store</h2>
            <p style={{ color: MUTED, fontSize: 17 }}>All in one place. No spreadsheets. No headaches.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {features.map((f, i) => (
              <div key={i} style={{ background: WARM_BG, borderRadius: 16, padding: "28px", border: "1px solid " + BORDER, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, width: "€0", height: 3, background: i === 2 ? ORANGE : BORDER }} />
                <div style={{ fontSize: 32, marginBottom: 16 }}>{f.icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10, margin: "0 0 10px", color: BLACK }}>{f.title}</h3>
                <p style={{ color: MUTED, fontSize: 14, lineHeight: 1.7, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: "100px 48px", background: BLACK }}>
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: 40, color: ORANGE, marginBottom: 24, fontWeight: 700 }}>✦</div>
          <h2 style={{ fontSize: 40, fontWeight: 800, color: "#fff", marginBottom: 16, letterSpacing: -1 }}>Meet your AI Business Advisor</h2>
          <p style={{ color: "#666", fontSize: 17, lineHeight: 1.7, marginBottom: 52 }}>Samzy's AI knows your store inside out. Ask it anything and get instant, specific answers based on your real data.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, textAlign: "left" }}>
            {[
              { q: "What should I reorder this week?", a: "Based on your sales data, reorder Whole Milk 1L (4 left, selling 20/day), Eggs 12pk (3 left), and White Bread (6 left). Order from Dairy Direct today." },
              { q: "Why are my sales low on Tuesdays?", a: "Your Tuesday sales are 22% below average. Consider running a promotion on near-expiry items from 3-5 PM to drive foot traffic." },
              { q: "Which products are making me the most money?", a: "Your top 3 profit drivers are Coca-Cola 2L, Orange Juice 1L, and Eggs 12pk. These 3 account for 28% of your weekly revenue." },
            ].map((item, i) => (
              <div key={i} style={{ background: "#111", borderRadius: 14, padding: "20px 24px", border: "1px solid #1a1a1a" }}>
                <p style={{ color: "#555", fontSize: 13, margin: "0 0 10px" }}>You: {item.q}</p>
                <p style={{ color: "#e5e5e5", fontSize: 14, margin: 0, lineHeight: 1.7, borderLeft: "3px solid " + ORANGE, paddingLeft: 14 }}>✦ {item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: "100px 48px", background: WARM_BG }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <h2 style={{ fontSize: 40, fontWeight: 800, textAlign: "center", marginBottom: 56, letterSpacing: -1 }}>What store owners are saying</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {testimonials.map((t, i) => (
              <div key={i} style={{ background: CARD_BG, borderRadius: 16, padding: "28px", border: "1px solid " + BORDER }}>
                <div style={{ fontSize: 24, color: ORANGE, marginBottom: 16, fontWeight: 700 }}>"</div>
                <p style={{ color: BLACK, fontSize: 15, lineHeight: 1.8, marginBottom: 24 }}>{t.text}</p>
                <div style={{ borderTop: "1px solid " + BORDER, paddingTop: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: BLACK }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{t.store}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" style={{ padding: "100px 48px", background: CARD_BG, borderTop: "1px solid " + BORDER }}>
        <div style={{ maxWidth: 500, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: 40, fontWeight: 800, marginBottom: 16, letterSpacing: -1 }}>Simple, honest pricing</h2>
          <p style={{ color: MUTED, fontSize: 17, marginBottom: 52 }}>One plan. Everything included. Cancel anytime.</p>
          <div style={{ background: BLACK, borderRadius: 20, padding: "48px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, width: "€0", height: 4, background: ORANGE }} />
            <div style={{ fontSize: 13, color: "#555", marginBottom: 8, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" as const }}>Samzy Pro</div>
            <div style={{ fontSize: 60, fontWeight: 800, color: "#fff", marginBottom: 4, letterSpacing: -2 }}>29<span style={{ fontSize: 28 }}>€</span><span style={{ fontSize: 20, fontWeight: 400, color: "#555" }}>/month</span></div>
            <p style={{ color: "#555", fontSize: 14, marginBottom: 36 }}>Per store. Everything included.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 36, textAlign: "left" }}>
              {["Full dashboard with real-time data", "AI Advisor powered by Claude", "Inventory and stock alerts", "Staff management", "Supplier invoice tracking", "Financial overview", "Email support"].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: ORANGE, fontWeight: 700, fontSize: 16 }}>✓</span>
                  <span style={{ color: "#ccc", fontSize: 14 }}>{item}</span>
                </div>
              ))}
            </div>
            <a href="/signup" style={{ display: "block", background: ORANGE, color: "#fff", padding: "16px", borderRadius: 12, textDecoration: "none", fontSize: 16, fontWeight: 700 }}>Start Free - 14 Day Trial</a>
            <p style={{ color: "#444", fontSize: 12, marginTop: 14 }}>No credit card required</p>
          </div>
        </div>
      </section>

      <section style={{ padding: "100px 48px", background: ORANGE, textAlign: "center" }}>
        <h2 style={{ fontSize: 44, fontWeight: 800, color: "#fff", marginBottom: 16, letterSpacing: -1 }}>Ready to take control of your store?</h2>
        <p style={{ color: "#fff", fontSize: 18, marginBottom: 40, opacity: 0.9 }}>Join supermarket owners already using Samzy to grow their business.</p>
        <a href="/signup" style={{ background: "#fff", color: ORANGE, padding: "18px 52px", borderRadius: 12, textDecoration: "none", fontSize: 16, fontWeight: 800 }}>Get Started Free Today →</a>
      </section>

      <footer style={{ padding: "40px 48px", borderTop: "1px solid " + BORDER, background: WARM_BG, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 26, height: 26, background: ORANGE, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>🛒</div>
          <span style={{ fontWeight: 700, fontSize: 15, color: BLACK }}>Samzy</span>
        </div>
        <div style={{ color: MUTED, fontSize: 13 }}>2026 Samzy. Built for supermarket owners.</div>
        <div style={{ display: "flex", gap: 24 }}>
          <a href="/login" style={{ color: MUTED, textDecoration: "none", fontSize: 13 }}>Sign In</a>
          <a href="/signup" style={{ color: MUTED, textDecoration: "none", fontSize: 13 }}>Sign Up</a>
        </div>
      </footer>

    </div>
  );
}