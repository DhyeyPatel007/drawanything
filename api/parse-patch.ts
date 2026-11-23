// POST /api/parse-patch — the MUTE moment (panel D5).
// Input:  { image: dataURL } — a small crop of newly drawn ink, cut from the
// rectified sheet by the laptop's background ink-diff worker.
// Output: { label, kind } — kind in button|slider|dial|pad|key.
// On failure: { fallback: true } and the client uses its default (a button
// whose label the user can rename; MUTE-shaped guesses happen client-side).

import { readBody, vlmJSON, vlmKey } from "./_vlm";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return;
  }
  const body = readBody(req);
  const image = body.image;
  if (typeof image !== "string") {
    res.status(400).json({ error: "image required" });
    return;
  }
  const key = vlmKey();
  if (!key) {
    res.status(200).json({ fallback: true, reason: "no-key" });
    return;
  }
  const prompt = `This is a small crop of a hand-drawn control that a user just drew on paper, mid-session, to add it to their paper control desk. Read the handwritten word inside the shape (if any) and classify the shape.

Return ONLY this JSON:
{"label":"MUTE","kind":"button"}
- label: the handwritten word, uppercase, max 10 chars. If there is no readable word, use "".
- kind: "button" for a plain box, "slider" for a long track/line, "dial" for a circle, "pad" for a drum pad, "key" for a single-letter key.`;
  try {
    const out = await vlmJSON(key, image, prompt);
    if (!out) {
      res.status(200).json({ fallback: true, reason: "vlm" });
      return;
    }
    const kinds = new Set(["button", "slider", "dial", "pad", "key"]);
    res.status(200).json({
      label: String(out.label ?? "").toUpperCase().slice(0, 10),
      kind: kinds.has(String(out.kind)) ? String(out.kind) : "button",
    });
  } catch {
    res.status(200).json({ fallback: true, reason: "error" });
  }
}
