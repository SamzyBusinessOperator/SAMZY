"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
const ORANGE = "#FC7800";
const BLACK = "#0f0f0f";
const WARM_BG = "#FAFAF8";
const BORDER = "#F0EEEB";
const MUTED = "#6B6B6B";
export default function NotFound() {
  const [count, setCount] = useState(10);
  useEffect(() => {
    const timer = setInterval(() => {
      setCount(prev => {
        if (prev <= 1) { clearInterval(timer); window.location.href = "/"; return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div style={{ minHeight: "100vh", background: WARM_BG, fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif", display: "flex", flexDirection: "column" }}>
      <nav style={{ padding: "20px 40px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid " + BORDER, background: WARM_BG }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <Image src="/logo.png" alt="Samzy" width={32} height={32} />
          <span style={{ color: BLACK, fontWeight: 700, fontSize: 16 }}>Samzy</span>
        </a>
      </nav>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ textAlign: "center", maxWidth: 480 }}>
          <div style={{ fontSize: 80, fontWeight: 800, color: ORANGE, letterSpacing: -4, marginBottom: 8, lineHeight: 1 }}>404</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: BLACK, margin: "0 0 12px", letterSpacing: -0.5 }}>Page not found</h1>
          <p style={{ color: MUTED, fontSize: 16, lineHeight: 1.7, marginBottom: 36 }}>Looks like this shelf is empty. The page you are looking for does not exist or has been moved.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" as const }}>
            <a href="/" style={{ background: ORANGE, color: "#fff", padding: "13px 28px", borderRadius: 10, textDecoration: "none", fontSize: 15, fontWeight: 700 }}>Go to Dashboard</a>
            <a href="/landing" style={{ background: "#fff", color: BLACK, padding: "13px 28px", borderRadius: 10, textDecoration: "none", fontSize: 15, fontWeight: 600, border: "1px solid " + BORDER }}>Back to Home</a>
          </div>
          <p style={{ color: MUTED, fontSize: 13, marginTop: 28 }}>Redirecting to dashboard in <span style={{ color: ORANGE, fontWeight: 700 }}>{count}s</span></p>
        </div>
      </div>
    </div>
  );
}
