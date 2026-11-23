import { useEffect, useState } from "react";
import Landing from "./pages/Landing";
import Scan from "./pages/Scan";
import Play from "./pages/Play";

function route(): string {
  const h = window.location.hash.replace(/^#/, "");
  if (h.startsWith("/scan")) return "scan";
  if (h.startsWith("/play")) return "play";
  return "home";
}

export default function App() {
  const [r, setR] = useState(route());
  useEffect(() => {
    const on = () => setR(route());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  if (r === "scan") return <Scan />;
  if (r === "play") return <Play />;
  return <Landing />;
}
