"use client";
import { useState } from "react";

export default function Landing() {
  const [email, setEmail] = useState("");

  const features = [
    {
      icon: "📊",
      title: "See Your Business At a Glance",
      desc: "Every morning, open Samzy and instantly know how much you sold yesterday, what's running low, and what needs your attention today. No more guessing.",
    },
    {
      icon: "⚠️",
      title: "Never Run Out of Stock Again",
      desc: "Samzy tracks your inventory in real time and alerts you before products run out. No more emergency calls to suppliers or empty shelves.",
    },
    {
      icon: "✦",
      title: "Your Own AI Business Advisor",
      desc: "Ask Samzy anything. 'What should I reorder this week?' 'Why are my sales down on Tuesdays?' Get instant, specific answers based on your real store data.",
    },
    {
      icon: "🚚",
      title: "Stay on Top of Supplier Invoices",
      desc: "See all your supplier invoices in one place. Know exactly what's due, what's overdue, and what's paid — before it becomes a problem.",
    },
    {
      icon: "👥",
      title: "Manage Your Staff Easily",
      desc: "See who's working today, manage shifts, and keep track of your team — all from one simple screen.",
    },
    {
      icon: "💰",
      title: "Understand Your Finances",
      desc: "See your daily revenue, monthly totals, and cash flow without needing an accountant. Know exactly where your money is going.",
    },
  ];

  const problems = [
    "You don't know how much you're really making each day",
    "Products run out and you only notice when customers complain",
    "Supplier invoices pile up and you lose track of what you owe",
    "You make decisions based on gut feeling, not real data",
    "Managing staff schedules is a mess",
  ];

  const testimonials = [
    {
      name: "Carlos M.",
      store: "Minimarket Lisboa",
      text: "Before Samzy I had no idea which products were actually making me money. Now I know every morning.",
    },
    {
      name: "Ana R.",
      store: "Supermercado Barreiro",
      text: "The AI advisor told me to stop ordering a product that was just sitting on the shelf. Saved me €400 that month.",
    },
    {
      name: "João F.",
      store: "Mercado Central",
      text: "I used to spend 2 hours every Monday morning trying to figure out the week. Now it takes 5 minutes.",
    },
  ];

  return (
    <div style={{ fontFamily: "Georgia, serif", color: "#0f172a", background: "#fff" }}>

      {/* Nav */}
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 48px", borderBottom: "1px solid #f1f5f9", position: "sticky", top: 0, background: "#fff", zIndex: 100 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a" }}>🛒 Samzy</div>
        <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
          <a href="#features" style={{ color: "#64748b", textDecoration: "none", fontSize: 14 }}>Features</a>
          <a href="#pricing" style={{ color: "#64748b", textDecoration: "none", fontSize: 14 }}>Pricing</a>
          <a href="/login" style={{ color: "#64748b", textDecoration: "none", fontSize: 14 }}>Sign In</a>
          <a href="/signup" style={{ background: "#0f172a", color: "#fff", padding: "10px 20px", borderRadius: 8, textDecoration: "none", fontSize: 14, fontWeight: 700 }}>Get Started Free</a>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)", padding: "100px 48px", textAlign: "center" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div style={{ background: "#22c55e22", color: "#22c55e", padding: "6px 16px", borderRadius: 20, fontSize: 13, fontWeight: 700, display: "inline-block", marginBottom: 24 }}>
            Built for independent supermarket owners
          </div>
          <h1 style={{ fontSize: 52, fontWeight: 800, color: "#fff", lineHeight: 1.15, margin: "0 0 24px", letterSpacing: -1 }}>
            Run your supermarket<br />
            <span style={{ color: "#22c55e" }}>smarter, not harder.</span>
          </h1>
          <p style={{ fontSize: 20, color: "#94a3b8", lineHeight: 1.6, marginBottom: 40, maxWidth: 560, margin: "0 auto 40px" }}>
            Samzy gives you a real-time view of your sales, inventory, staff, and finances — plus an AI advisor that tells you exactly what to do to grow.
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="/signup" style={{ background: "#22c55e", color: "#fff", padding: "16px 36px", borderRadius: 10, textDecoration: "none", fontSize: 16, fontWeight: 700 }}>
              Start Free Today →
            </a>
            <a href="#features" style={{ background: "#ffffff22", color: "#fff", padding: "16px 36px", borderRadius: 10, textDecoration: "none", fontSize: 16, fontWeight: 600, border: "1px solid #ffffff33" }}>
              See How It Works
            </a>
          </div>
          <p style={{ color: "#475569", fontSize: 13, marginTop: 20 }}>No credit card required · Setup in 5 minutes</p>
        </div>
      </section>

      {/* Problem Section */}
      <section style={{ padding: "80px 48px", background: "#fafafa" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: 34, fontWeight: 800, marginBottom: 12 }}>Sound familiar?</h2>
          <p style={{ color: "#64748b", fontSize: 17, marginBottom: 48 }}>Running a supermarket is hard. Most owners deal with these problems every single day.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, textAlign: "left" }}>
            {problems.map((p, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, background: "#fff", padding: "18px 24px", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>❌</span>
                <span style={{ fontSize: 16, color: "#374151" }}>{p}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 40, padding: "24px", background: "#0f172a", borderRadius: 14 }}>
            <p style={{ color: "#fff", fontSize: 18, fontWeight: 700, margin: 0 }}>Samzy solves all of this. In one app. For less than a coffee a day.</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ padding: "80px 48px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <h2 style={{ fontSize: 34, fontWeight: 800, marginBottom: 12 }}>Everything you need to run your store</h2>
            <p style={{ color: "#64748b", fontSize: 17 }}>All in one place. No spreadsheets. No headaches.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 28 }}>
            {features.map((f, i) => (
              <div key={i} style={{ background: "#f8fafc", borderRadius: 16, padding: 28 }}>
                <div style={{ fontSize: 32, marginBottom: 16 }}>{f.icon}</div>
                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10, margin: "0 0 10px" }}>{f.title}</h3>
                <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.7, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Section */}
      <section style={{ padding: "80px 48px", background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>✦</div>
          <h2 style={{ fontSize: 36, fontWeight: 800, color: "#fff", marginBottom: 16 }}>Meet your AI Business Advisor</h2>
          <p style={{ color: "#94a3b8", fontSize: 18, lineHeight: 1.6, marginBottom: 48 }}>
            Samzy's AI knows your store inside out. Ask it anything and get instant, specific answers based on your real data.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, textAlign: "left" }}>
            {[
              { q: "What should I reorder this week?", a: "Based on your sales data, you need to reorder Whole Milk 1L (4 left, selling 20/day), Eggs 12pk (3 left), and White Bread (6 left). Order from Dairy Direct today." },
              { q: "Why are my sales low on Tuesdays?", a: "Your Tuesday sales are 22% below your weekly average. Consider running a promotion on near-expiry items from 3–5 PM to drive foot traffic." },
              { q: "Which products are making me the most money?", a: "Your top 3 profit drivers are Coca-Cola 2L ($284 revenue), Orange Juice 1L ($228), and Eggs 12pk ($325). These 3 products account for 28% of your weekly revenue." },
            ].map((item, i) => (
              <div key={i} style={{ background: "#1e293b", borderRadius: 12, padding: 20 }}>
                <p style={{ color: "#94a3b8", fontSize: 13, margin: "0 0 8px" }}>🧑 {item.q}</p>
                <p style={{ color: "#e2e8f0", fontSize: 14, margin: 0, lineHeight: 1.6 }}>✦ {item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section style={{ padding: "80px 48px", background: "#f8fafc" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <h2 style={{ fontSize: 34, fontWeight: 800, textAlign: "center", marginBottom: 48 }}>What store owners are saying</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {testimonials.map((t, i) => (
              <div key={i} style={{ background: "#fff", borderRadius: 16, padding: 28, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <p style={{ color: "#374151", fontSize: 15, lineHeight: 1.7, marginBottom: 20 }}>"{t.text}"</p>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{t.store}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ padding: "80px 48px" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: 34, fontWeight: 800, marginBottom: 12 }}>Simple, honest pricing</h2>
          <p style={{ color: "#64748b", fontSize: 17, marginBottom: 48 }}>One plan. Everything included. Cancel anytime.</p>
          <div style={{ background: "#0f172a", borderRadius: 20, padding: 48, color: "#fff" }}>
            <div style={{ fontSize: 14, color: "#94a3b8", marginBottom: 8 }}>SAMZY PRO</div>
            <div style={{ fontSize: 56, fontWeight: 800, marginBottom: 4 }}>€29<span style={{ fontSize: 20, fontWeight: 400, color: "#64748b" }}>/month</span></div>
            <p style={{ color: "#64748b", fontSize: 14, marginBottom: 32 }}>Per store. Everything included.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 36, textAlign: "left" }}>
              {["Full dashboard with real-time data", "AI Advisor powered by Claude", "Inventory & stock alerts", "Staff management", "Supplier invoice tracking", "Financial overview", "Email support"].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: "#22c55e", fontWeight: 700 }}>✓</span>
                  <span style={{ color: "#e2e8f0", fontSize: 14 }}>{item}</span>
                </div>
              ))}
            </div>
            <a href="/signup" style={{ display: "block", background: "#22c55e", color: "#fff", padding: "16px", borderRadius: 10, textDecoration: "none", fontSize: 16, fontWeight: 700 }}>
              Start Free — 14 Day Trial
            </a>
            <p style={{ color: "#475569", fontSize: 12, marginTop: 12 }}>No credit card required</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "80px 48px", background: "#22c55e", textAlign: "center" }}>
        <h2 style={{ fontSize: 36, fontWeight: 800, color: "#fff", marginBottom: 16 }}>Ready to take control of your store?</h2>
        <p style={{ color: "#fff", fontSize: 18, marginBottom: 36, opacity: 0.9 }}>Join hundreds of supermarket owners already using Samzy.</p>
        <a href="/signup" style={{ background: "#fff", color: "#0f172a", padding: "16px 48px", borderRadius: 10, textDecoration: "none", fontSize: 16, fontWeight: 800 }}>
          Get Started Free Today →
        </a>
      </section>

      {/* Footer */}
      <footer style={{ padding: "40px 48px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>🛒 Samzy</div>
        <div style={{ color: "#94a3b8", fontSize: 13 }}>© 2026 Samzy. Built for supermarket owners.</div>
        <div style={{ display: "flex", gap: 24 }}>
          <a href="/login" style={{ color: "#64748b", textDecoration: "none", fontSize: 13 }}>Sign In</a>
          <a href="/signup" style={{ color: "#64748b", textDecoration: "none", fontSize: 13 }}>Sign Up</a>
        </div>
      </footer>

    </div>
  );
}