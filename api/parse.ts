// POST /api/parse — Set-of-Mark semantic binding (panel D3).
// Input:  { markedImage: dataURL, candidates: [{ i, r: [x,y,w,h] }] }
// The image has numbered red badges drawn by the phone's CV. The VLM only
// labels the numbered regions — it never invents geometry.
// Output: { bindings: [{ i, k, l, a, o? }], unboxed: [{ l, k, a, r }] }
// On any failure (incl. no API key configured): { fallback: true } and the
// client binds heuristically instead. Setup never dead-ends.

import { readBody, vlmJSON, vlmKey } from "./_vlm";

const KINDS = new Set(["btn", "drum", "key", "sld", "dial"]);

function allowedAction(a: string): boolean {
  if (a === "os.vol" || a === "os.mute" || a === "aud.filter") return true;
  if (/^aud\.(kick|snare|rim|hatc|hato|tomh|toml|crash)$/.test(a)) return true;
  if (/^os\.key\.[A-Z0-9]$/.test(a)) return true;
  if (a === "os.key.SPACE" || a === "os.key.ENTER" || a === "os.key.BACK") return true;
  if (/^os\.hold\.[WASD]$/.test(a)) return true;
  return false;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return;
  }
  const body = readBody(req);
  const markedImage = body.markedImage;
  const candidates = body.candidates;
  if (typeof markedImage !== "string" || !Array.isArray(candidates)) {
    res.status(400).json({ error: "markedImage + candidates required" });
    return;
  }
  const key = vlmKey();
  if (!key) {
    res.status(200).json({ fallback: true, reason: "no-key" });
    return;
  }
  const candText = candidates
    .map((c: any) => `#${c.i}: bbox [${(c.r as number[]).map((n) => Number(n).toFixed(3)).join(", ")}]`)
    .join("\n");
  const prompt = `You are the labeling step for DrawAnything. The image shows a hand-drawn control desk on paper. Red numbered badges mark regions that a computer-vision step already located precisely. Your ONLY job: for each numbered region, read the handwritten label inside it and decide what the control is.

Regions:
${candText}

Control kinds: "sld" (a slider: a long line/track, usually labelled VOL), "dial" (a circle, usually labelled FILTER), "drum" (a pad hit for a drum sound: KICK, SNARE, HAT, TOM, CRASH, RIM, OPEN), "key" (a single letter key, or SPACE/ENTER), "btn" (any other button, e.g. MUTE).

Actions (use EXACTLY one of these per control):
- slider for volume -> "os.vol"
- MUTE button -> "os.mute"
- dial -> "aud.filter"
- drums -> "aud.kick" | "aud.snare" | "aud.hatc" | "aud.hato" | "aud.tomh" | "aud.toml" | "aud.rim" | "aud.crash"
- letter key X -> "os.key.X"; game keys W/A/S/D that are HELD down -> "os.hold.W" etc.
- SPACE -> "os.key.SPACE", ENTER -> "os.key.ENTER"

Read every label LITERALLY, character by character. Do NOT autocomplete or expand words: a box containing the single letter "H" is the key H — it is not "HAT". Only use a drum name (KICK, SNARE, HAT, TOM, CRASH, RIM) when those letters are actually written in the box. A box with exactly one letter in it is always kind "key".
For sliders also give "o": "v" for a vertical track, "h" for horizontal.
If you see an obvious drawn control that has NO red badge, add it to "unboxed" with your best normalized bbox [x,y,w,h] in 0..1 page coordinates.
Labels: return the label text you read, uppercase, max 10 chars. If a label is unreadable, guess from the shape and use your best short label.

Return ONLY this JSON:
{"bindings":[{"i":1,"k":"drum","l":"KICK","a":"aud.kick"}],"unboxed":[]}`;

  try {
    const out = await vlmJSON(key, markedImage, prompt);
    if (!out || !Array.isArray(out.bindings)) {
      res.status(200).json({ fallback: true, reason: "vlm" });
      return;
    }
    const bindings = (out.bindings as any[])
      .filter((b) => b && Number.isInteger(b.i) && KINDS.has(String(b.k)) && allowedAction(String(b.a)))
      .map((b) => ({
        i: b.i as number,
        k: String(b.k),
        l: String(b.l ?? "").toUpperCase().slice(0, 10) || "PAD",
        a: String(b.a),
        ...(b.o === "h" || b.o === "v" ? { o: b.o } : {}),
      }));
    const unboxed = Array.isArray(out.unboxed)
      ? (out.unboxed as any[])
          .filter((u) => u && KINDS.has(String(u.k)) && allowedAction(String(u.a)) && Array.isArray(u.r) && u.r.length === 4)
          .slice(0, 4)
          .map((u) => ({
            k: String(u.k),
            l: String(u.l ?? "NEW").toUpperCase().slice(0, 10),
            a: String(u.a),
            r: (u.r as number[]).map((n) => Math.min(1, Math.max(0, Number(n) || 0))),
          }))
      : [];
    res.status(200).json({ bindings, unboxed });
  } catch {
    res.status(200).json({ fallback: true, reason: "error" });
  }
}
