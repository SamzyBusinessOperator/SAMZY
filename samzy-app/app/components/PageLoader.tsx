"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
const ORANGE = "#FC7800";
const WARM_BG = "#FAFAF8";
export default function PageLoader() {
  const [dots, setDots] = useState("");
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? "" : prev + ".");
    }, 400);
    return () => clearInterval(interval);
  }, []);
  return (
    <div style={{ minHeight: "100vh", background: WARM_BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" }}>
      <Image src="/logo.png" alt="Samzy" width={56} height={56} style={{ marginBottom: 24 }} />
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: ORANGE, animation: `bounce 0.8s ease-in-out ${i * 0.15}s infinite alternate` }} />
        ))}
      </div>
      <p style={{ color: "#6B6B6B", fontSize: 14, margin: 0 }}>Loading your store{dots}</p>
      <style>{`@keyframes bounce { from { transform: translateY(0); opacity: 0.4; } to { transform: translateY(-8px); opacity: 1; } }`}</style>
    </div>
  );
}
