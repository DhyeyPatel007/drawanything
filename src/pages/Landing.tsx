import { useEffect } from "react";
import LandingApp from "../landing/App";

// New landing: "Midnight Desk" (AI Studio build, 24 Nov 2026) — dark,
// playful, multi-section, demo-first. Play (#/play) and Scan (#/scan)
// keep the original Ink Arcade theme; only this route goes dark.
export default function Landing() {
  useEffect(() => {
    const root = document.documentElement;
    const prevBg = root.style.backgroundColor;
    const prevColor = root.style.color;
    root.style.backgroundColor = "#0E0D0B";
    root.style.color = "#FAF6EC";
    document.body.style.backgroundColor = "#0E0D0B";
    document.body.style.color = "#FAF6EC";
    return () => {
      root.style.backgroundColor = prevBg;
      root.style.color = prevColor;
      document.body.style.backgroundColor = "";
      document.body.style.color = "";
    };
  }, []);

  return <LandingApp />;
}
