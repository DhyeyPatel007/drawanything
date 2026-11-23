// Heuristic binding — the deterministic fallback used when the VLM is
// unreachable (no API key yet, offline dev). Guesses kind + action from a
// candidate's shape and position. The phone confirmation screen lets the
// user fix every guess in one tap, so a wrong guess never dead-ends setup.

import type { Control, ControlKind } from "./types";
import type { Candidate } from "./setupCV";

export interface Binding {
  i: number;
  k: ControlKind;
  l: string;
  a: string;
  o?: "v" | "h";
}

const DRUM_CYCLE: { l: string; a: string }[] = [
  { l: "KICK", a: "aud.kick" },
  { l: "SNARE", a: "aud.snare" },
  { l: "HAT", a: "aud.hatc" },
  { l: "TOM", a: "aud.tomh" },
  { l: "OPEN", a: "aud.hato" },
  { l: "FLOOR", a: "aud.toml" },
  { l: "RIM", a: "aud.rim" },
  { l: "CRASH", a: "aud.crash" },
];

export function heuristicBind(cands: Candidate[]): Binding[] {
  let drums = 0;
  let dialUsed = false;
  let sliderUsed = false;
  return cands.map((c) => {
    const [, , w, h] = c.r;
    const aspect = w / Math.max(0.001, h);
    if (!sliderUsed && (aspect < 0.32 || aspect > 3.1)) {
      sliderUsed = true;
      return { i: c.i, k: "sld", l: "VOL", a: "os.vol", o: aspect < 0.32 ? "v" : "h" };
    }
    if (!dialUsed && aspect > 0.75 && aspect < 1.35 && w > 0.09 && w < 0.3) {
      dialUsed = true;
      return { i: c.i, k: "dial", l: "FILTER", a: "aud.filter" };
    }
    const d = DRUM_CYCLE[drums++ % DRUM_CYCLE.length];
    return { i: c.i, k: "drum", l: d.l, a: d.a };
  });
}

export function bindingsToControls(cands: Candidate[], bindings: Binding[]): Control[] {
  const byI = new Map(bindings.map((b) => [b.i, b]));
  return cands.map((c, idx) => {
    const b = byI.get(c.i) ?? heuristicBind([c])[0];
    return {
      id: `c${idx + 1}`,
      k: b.k,
      l: b.l,
      a: b.a,
      r: c.r,
      o: b.o,
    };
  });
}

/** Map a VLM-read label for a NEW control to a sensible default action. */
export function actionForLabel(label: string, kind: string): { k: ControlKind; a: string } {
  const L = label.toUpperCase().replace(/[^A-Z0-9 ]/g, "").trim();
  if (L.includes("MUTE")) return { k: "btn", a: "os.mute" };
  if (L.includes("VOL") || kind === "slider") return { k: "sld", a: "os.vol" };
  if (L.includes("FILTER") || L.includes("DIAL") || kind === "dial") return { k: "dial", a: "aud.filter" };
  if (L.includes("KICK")) return { k: "drum", a: "aud.kick" };
  if (L.includes("SNARE")) return { k: "drum", a: "aud.snare" };
  if (L.includes("HAT") && L.includes("OPEN")) return { k: "drum", a: "aud.hato" };
  if (L.includes("HAT")) return { k: "drum", a: "aud.hatc" };
  if (L.includes("TOM") && (L.includes("FLOOR") || L.includes("LOW"))) return { k: "drum", a: "aud.toml" };
  if (L.includes("TOM")) return { k: "drum", a: "aud.tomh" };
  if (L.includes("CRASH")) return { k: "drum", a: "aud.crash" };
  if (L.includes("RIM")) return { k: "drum", a: "aud.rim" };
  if (L.includes("PLAY") || L.includes("PAUSE") || L.includes("SPACE")) return { k: "key", a: "os.key.SPACE" };
  if (L.includes("ENTER")) return { k: "key", a: "os.key.ENTER" };
  if (/^[WASD]$/.test(L)) return { k: "key", a: `os.hold.${L}` };
  if (/^[A-Z]$/.test(L)) return { k: "key", a: `os.key.${L}` };
  return { k: "btn", a: "aud.snare" };
}
