"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
const ORANGE = "#FC7800";
const BLACK = "#0f0f0f";
const MUTED = "#6B6B6B";
export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const consent = localStorage.getItem("samzy_cookie_consent");
    if (!consent) setVisible(true);
  }, []);
  function accept() {
    localStorage.setItem("samzy_cookie_consent", "accepted");
    setVisible(false);
  }
  function decline() {
    localStorage.setItem("samzy_cookie_consent", "declined");
    setVisible(false);
  }
  if (!visible) return null;
  return (
    <div style={{
      position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
      width: "calc(100% - 48px)", maxWidth: 600, zIndex: 9999,
      background: "#111", borderRadius: 18, padding: "20px 28px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 20, flexWrap: "wrap" as const,
      boxShadow: "0 12px 48px rgba(0,0,0,0.22), 0 2px 8px rgba(0,0,0,0.12)",
      border: "1px solid rgba(255,255,255,0.07)",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flex: 1, minWidth: 200 }}>
        <Image src="/logo.png" alt="Samzy" width={36} height={36} style={{ flexShrink: 0 }} />
        <div>
          <p style={{ color: "#fff", fontSize: 14, margin: "0 0 4px", fontWeight: 700, fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif" }}>
            We use cookies
          </p>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, margin: 0, lineHeight: 1.6, fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif" }}>
            Essential cookies keep you signed in and improve your experience.{" "}
            <a href="/privacy" style={{ color: ORANGE, textDecoration: "none", fontWeight: 600 }}>Privacy Policy</a>
          </p>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
        <button onClick={decline} style={{
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.12)",
          color: "rgba(255,255,255,0.7)", padding: "9px 20px", borderRadius: 10,
          fontSize: 13, cursor: "pointer", fontWeight: 600,
          fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
          transition: "all 0.2s",
        }}>Decline</button>
        <button onClick={accept} style={{
          background: ORANGE, border: "none",
          color: "#fff", padding: "9px 20px", borderRadius: 10,
          fontSize: 13, cursor: "pointer", fontWeight: 700,
          fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
          boxShadow: "0 4px 12px rgba(252,120,0,0.35)",
        }}>Accept All</button>
      </div>
    </div>
  );
}
