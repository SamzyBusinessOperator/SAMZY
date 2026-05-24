"use client";
import { useIsMobile } from "@/lib/useIsMobile";
import Image from "next/image";
import { useState, useEffect } from "react";
const ORANGE = "#FC7800";
const BLACK = "#0f0f0f";
const WARM_BG = "#FAFAF8";
const CARD_BG = "#FFFFFF";
const BORDER = "#F0EEEB";
const MUTED = "#6B6B6B";
export default function Privacy() {
  const isMobile = useIsMobile();
  const sections = [
    { title: "1. Who We Are", content: "Samzy is a supermarket management SaaS platform. We are committed to protecting your personal data and being transparent about how we use it." },
    { title: "2. What Data We Collect", content: "We collect your name and email address when you sign up, store information you enter such as inventory, staff, suppliers and finances, usage data to improve the platform, and payment information processed securely by Stripe. We never store card details." },
    { title: "3. How We Use Your Data", content: "Your data is used to provide and improve the Samzy service, power the AI Advisor with your store context, send important account and billing notifications, and comply with legal obligations." },
    { title: "4. AI Advisor & Data", content: "The AI Advisor uses your store data to generate insights. Queries are processed via Anthropic Claude API. We do not use your store data to train AI models." },
    { title: "5. Data Sharing", content: "We do not sell your data. We share data only with trusted service providers including Supabase for database, Stripe for payments, and Anthropic for AI, strictly to operate the service." },
    { title: "6. Data Retention", content: "We retain your data for as long as your account is active. If you delete your account, your data is permanently removed within 30 days." },
    { title: "7. Your GDPR Rights", content: "If you are in the EU, you have the right to access, correct, or delete your personal data, the right to data portability, the right to object to processing, and the right to lodge a complaint with a supervisory authority." },
    { title: "8. Cookies", content: "Samzy uses essential cookies for authentication and session management. We do not use tracking or advertising cookies." },
    { title: "9. Security", content: "We use industry-standard security measures including encrypted connections via HTTPS, secure authentication via Supabase, and regular security reviews." },
    { title: "10. Changes to This Policy", content: "We may update this policy from time to time. We will notify you of significant changes via email." },
    { title: "11. Contact Us", content: "For privacy-related requests or questions, contact us at privacy@samzyai.com. For GDPR requests, we will respond within 30 days." },
  ];
  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif", color: BLACK, background: WARM_BG, minHeight: "100vh" }}>
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: isMobile ? "16px 20px" : "20px 48px", borderBottom: "1px solid " + BORDER, background: WARM_BG }}>
        <a href="/landing" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <Image src="/logo.png" alt="Samzy" width={32} height={32} />
          <span style={{ fontSize: 16, fontWeight: 800, color: BLACK }}>Samzy</span>
        </a>
        <a href="/signup" style={{ background: ORANGE, color: "#fff", padding: "10px 22px", borderRadius: 10, textDecoration: "none", fontSize: 14, fontWeight: 700 }}>Get Started</a>
      </nav>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: isMobile ? "40px 20px" : "80px 48px" }}>
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: CARD_BG, border: "1px solid " + BORDER, padding: "6px 14px", borderRadius: 20, fontSize: 12, color: MUTED, marginBottom: 20 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: ORANGE, display: "inline-block" }} />
            Last updated: January 2026
          </div>
          <h1 style={{ fontSize: isMobile ? 32 : 48, fontWeight: 800, color: BLACK, margin: "0 0 16px", letterSpacing: -1 }}>Privacy Policy</h1>
          <p style={{ color: MUTED, fontSize: isMobile ? 15 : 17, lineHeight: 1.7, margin: 0 }}>We take your privacy seriously. Here is exactly what we collect and why.</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {sections.map((s, i) => (
            <div key={i} style={{ background: CARD_BG, borderRadius: 14, padding: isMobile ? "20px" : "28px", border: "1px solid " + BORDER }}>
              <h2 style={{ fontSize: isMobile ? 15 : 17, fontWeight: 700, color: BLACK, margin: "0 0 10px" }}>{s.title}</h2>
              <p style={{ color: MUTED, fontSize: isMobile ? 14 : 15, lineHeight: 1.8, margin: 0 }}>{s.content}</p>
            </div>
          ))}
        </div>
      </div>
      <footer style={{ padding: isMobile ? "24px 20px" : "40px 48px", borderTop: "1px solid " + BORDER, background: WARM_BG, display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: "center", gap: isMobile ? 12 : 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Image src="/logo.png" alt="Samzy" width={24} height={24} />
          <span style={{ fontWeight: 700, fontSize: 14, color: BLACK }}>Samzy</span>
        </div>
        <div style={{ color: MUTED, fontSize: 12 }}>2026 Samzy. Built for supermarket owners.</div>
        <div style={{ display: "flex", gap: 20 }}>
          <a href="/terms" style={{ color: MUTED, textDecoration: "none", fontSize: 13 }}>Terms</a>
          <a href="/privacy" style={{ color: ORANGE, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>Privacy</a>
        </div>
      </footer>
    </div>
  );
}
