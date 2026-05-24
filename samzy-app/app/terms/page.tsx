import { useIsMobile } from "@/lib/useIsMobile";
"use client";
import Image from "next/image";
import { useState, useEffect } from "react";
const ORANGE = "#FC7800";
const BLACK = "#0f0f0f";
const WARM_BG = "#FAFAF8";
const CARD_BG = "#FFFFFF";
const BORDER = "#F0EEEB";
const MUTED = "#6B6B6B";
export default function Terms() {
  const isMobile = useIsMobile();
  const sections = [
    { title: "1. Acceptance of Terms", content: "By accessing or using Samzy, you agree to be bound by these Terms of Service. If you do not agree, please do not use the service." },
    { title: "2. Description of Service", content: "Samzy is a SaaS platform for supermarket and retail store management. It includes tools for inventory, staff, finances, supplier management, and an AI-powered business advisor." },
    { title: "3. Free Trial", content: "New users receive a 14-day free trial. No credit card is required to start. After the trial, a paid subscription is required to continue using Samzy." },
    { title: "4. Payments & Subscriptions", content: "Samzy charges 29 euros per month per store. Payments are processed securely via Stripe. You can cancel at any time from your billing settings. Cancellations take effect at the end of the current billing period." },
    { title: "5. User Responsibilities", content: "You are responsible for maintaining the confidentiality of your account credentials. You agree not to misuse the platform, attempt to reverse-engineer it, or use it for any unlawful purpose." },
    { title: "6. Data & Privacy", content: "We collect and process data as described in our Privacy Policy. Your store data is private and will never be sold to third parties." },
    { title: "7. AI Advisor", content: "The AI Advisor feature is powered by Claude (Anthropic). Responses are based on your store data and are for informational purposes only. Samzy is not liable for business decisions made based on AI recommendations." },
    { title: "8. Termination", content: "We reserve the right to suspend or terminate accounts that violate these terms. You may cancel your account at any time." },
    { title: "9. Limitation of Liability", content: "Samzy is provided as is. We are not liable for any indirect, incidental, or consequential damages arising from use of the platform." },
    { title: "10. Changes to Terms", content: "We may update these terms from time to time. Continued use of Samzy after changes constitutes acceptance of the new terms." },
    { title: "11. Contact", content: "For questions about these terms, contact us at legal@samzyai.com." },
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
          <h1 style={{ fontSize: isMobile ? 32 : 48, fontWeight: 800, color: BLACK, margin: "0 0 16px", letterSpacing: -1 }}>Terms of Service</h1>
          <p style={{ color: MUTED, fontSize: isMobile ? 15 : 17, lineHeight: 1.7, margin: 0 }}>Please read these terms carefully before using Samzy.</p>
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
          <a href="/terms" style={{ color: ORANGE, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>Terms</a>
          <a href="/privacy" style={{ color: MUTED, textDecoration: "none", fontSize: 13 }}>Privacy</a>
        </div>
      </footer>
    </div>
  );
}
