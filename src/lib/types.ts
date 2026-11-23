// DrawAnything — DeskLayout schema (panel Round 3, Gemini's compact form, adopted).
// Coordinates are normalized [0..1] on a canonical A4 landscape sheet (ar = 1.414).

export type ControlKind = "btn" | "drum" | "key" | "sld" | "dial";

export interface Control {
  id: string;
  k: ControlKind;
  /** display label, e.g. "VOL", "KICK", "MUTE", "W" */
  l: string;
  /** allowlisted action id, e.g. "os.vol", "os.mute", "os.key.A", "os.hold.W", "aud.kick", "aud.filter" */
  a: string;
  /** [x, y, w, h] normalized bbox on the sheet */
  r: [number, number, number, number];
  /** slider axis */
  o?: "v" | "h";
}

export interface DeskLayout {
  v: 1;
  ar: number;
  c: Control[];
}

export const DRUM_PIECES = [
  "kick",
  "snare",
  "rim",
  "hatc",
  "hato",
  "tomh",
  "toml",
  "crash",
] as const;
export type DrumPiece = (typeof DRUM_PIECES)[number];

/** Actions the OS bridge is allowed to execute. Anything else is refused bridge-side too. */
export function isAllowedAction(a: string): boolean {
  if (a === "os.vol" || a === "os.mute" || a === "aud.filter") return true;
  if (/^aud\.(kick|snare|rim|hatc|hato|tomh|toml|crash)$/.test(a)) return true;
  if (/^os\.key\.[A-Z0-9]$/.test(a)) return true;
  if (a === "os.key.SPACE" || a === "os.key.ENTER" || a === "os.key.BACK") return true;
  if (/^os\.hold\.[WASD]$/.test(a)) return true;
  return false;
}

export function validateLayout(x: unknown): DeskLayout | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  if (o.v !== 1 || !Array.isArray(o.c)) return null;
  const controls: Control[] = [];
  for (const raw of o.c) {
    if (!raw || typeof raw !== "object") return null;
    const c = raw as Record<string, unknown>;
    if (typeof c.id !== "string" || typeof c.l !== "string" || typeof c.a !== "string")
      return null;
    if (!["btn", "drum", "key", "sld", "dial"].includes(String(c.k))) return null;
    if (!Array.isArray(c.r) || c.r.length !== 4) return null;
    const r = c.r.map(Number) as [number, number, number, number];
    if (r.some((n) => !isFinite(n) || n < -0.05 || n > 1.05)) return null;
    if (!isAllowedAction(c.a)) return null;
    controls.push({
      id: c.id,
      k: c.k as ControlKind,
      l: c.l.slice(0, 12),
      a: c.a,
      r,
      o: c.o === "h" ? "h" : c.o === "v" ? "v" : undefined,
    });
  }
  if (controls.length === 0 || controls.length > 24) return null;
  return { v: 1, ar: typeof o.ar === "number" && o.ar > 0.5 && o.ar < 3 ? o.ar : 1.414, c: controls };
}

/** The built-in demo desk: slider, 4 drum pads, dial, WASD + 2 letter keys. */
export const DEMO_LAYOUT: DeskLayout = {
  v: 1,
  ar: 1.414,
  c: [
    { id: "c1", k: "sld", l: "VOL", a: "os.vol", r: [0.04, 0.12, 0.07, 0.72], o: "v" },
    { id: "c2", k: "drum", l: "KICK", a: "aud.kick", r: [0.17, 0.55, 0.16, 0.32] },
    { id: "c3", k: "drum", l: "SNARE", a: "aud.snare", r: [0.36, 0.55, 0.16, 0.32] },
    { id: "c4", k: "drum", l: "HAT", a: "aud.hatc", r: [0.17, 0.14, 0.16, 0.32] },
    { id: "c5", k: "drum", l: "TOM", a: "aud.tomh", r: [0.36, 0.14, 0.16, 0.32] },
    { id: "c6", k: "dial", l: "FILTER", a: "aud.filter", r: [0.58, 0.1, 0.17, 0.34] },
    { id: "c7", k: "key", l: "W", a: "os.hold.W", r: [0.83, 0.12, 0.11, 0.2] },
    { id: "c8", k: "key", l: "A", a: "os.hold.A", r: [0.72, 0.36, 0.11, 0.2] },
    { id: "c9", k: "key", l: "S", a: "os.hold.S", r: [0.83, 0.36, 0.11, 0.2] },
    { id: "c10", k: "key", l: "D", a: "os.hold.D", r: [0.94 - 0.11, 0.6, 0.11, 0.2] },
    { id: "c11", k: "key", l: "H", a: "os.key.H", r: [0.58, 0.58, 0.11, 0.2] },
    { id: "c12", k: "key", l: "I", a: "os.key.I", r: [0.71, 0.58, 0.11, 0.2] },
  ],
};
