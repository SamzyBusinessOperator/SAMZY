"use client";
import { useState, useEffect } from "react";

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    const byWidth = window.innerWidth < 900;
    const byTouch = navigator.maxTouchPoints > 0;
    const byUA = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    return byWidth || (byTouch && byUA);
  });

  useEffect(() => {
    const check = () => {
      const byWidth = window.innerWidth < 900;
      const byTouch = navigator.maxTouchPoints > 0;
      const byUA = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
      setIsMobile(byWidth || (byTouch && byUA));
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return isMobile;
}
