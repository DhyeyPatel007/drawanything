import { useRef, useState } from "react";
import QRCode from "qrcode";
import { processPhoto, type Candidate } from "../lib/setupCV";
import { heuristicBind, bindingsToControls, type Binding } from "../lib/binding";
import { validateLayout, type ControlKind, type DeskLayout } from "../lib/types";

const KIND_OPTIONS: { v: ControlKind; label: string }[] = [
  { v: "drum", label: "🥁 drum pad" },
  { v: "sld", label: "🎚 slider" },
  { v: "dial", label: "🎛 dial" },
  { v: "key", label: "⌨ key" },
  { v: "btn", label: "🔘 button" },
];

const ACTION_OPTIONS: { v: string; label: string }[] = [
  { v: "aud.kick", label: "drum: kick" },
  { v: "aud.snare", label: "drum: snare" },
  { v: "aud.hatc", label: "drum: closed hat" },
  { v: "aud.hato", label: "drum: open hat" },
  { v: "aud.tomh", label: "drum: high tom" },
  { v: "aud.toml", label: "drum: floor tom" },
  { v: "aud.rim", label: "drum: rimshot" },
  { v: "aud.crash", label: "drum: crash" },
  { v: "aud.filter", label: "synth filter (dial)" },
  { v: "os.vol", label: "windows volume (slider)" },
  { v: "os.mute", label: "windows mute" },
  { v: "os.key.SPACE", label: "key: SPACE" },
  { v: "os.key.ENTER", label: "key: ENTER" },
  { v: "os.key.BACK", label: "key: BACKSPACE" },
  ...["W", "A", "S", "D"].map((k) => ({ v: `os.hold.${k}`, label: `game hold: ${k}` })),
  ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((k) => ({ v: `os.key.${k}`, label: `type letter: ${k}` })),
];

type Phase = "idle" | "working" | "confirm" | "qr" | "error";

export default function Scan() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [status, setStatus] = useState("");
  const [marked, setMarked] = useState<string>("");
  const [cands, setCands] = useState<Candidate[]>([]);
  const [binds, setBinds] = useState<Binding[]>([]);
  const [usedAI, setUsedAI] = useState(false);
  const [layoutJSON, setLayoutJSON] = useState("");
  const qrRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPhoto(file: File) {
    setPhase("working");
    setStatus("Reading your ink…");
    try {
      const url = URL.createObjectURL(file);
      const img = new Image();
      await new Promise<void>((ok, err) => {
        img.onload = () => ok();
        img.onerror = () => err(new Error("photo load failed"));
        img.src = url;
      });
      const parsed = await processPhoto(img);
      URL.revokeObjectURL(url);
      if (parsed.candidates.length === 0) {
        setPhase("error");
        setStatus("I couldn't find any drawn controls. Draw darker, closed boxes on a plain sheet and try again.");
        return;
      }
      setMarked(parsed.markedDataURL);
      setCands(parsed.candidates);
      setStatus("Asking the AI to label them…");
      let bindings: Binding[] | null = null;
      let extra: Candidate[] = [];
      try {
        const res = await fetch("/api/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ markedImage: parsed.markedDataURL, candidates: parsed.candidates }),
        });
        const data = await res.json();
        if (data && Array.isArray(data.bindings) && data.bindings.length) {
          bindings = data.bindings as Binding[];
          if (Array.isArray(data.unboxed)) {
            extra = (data.unboxed as { l: string; k: ControlKind; a: string; r: [number, number, number, number] }[]).map(
              (u, j) => ({ i: parsed.candidates.length + j + 1, r: u.r })
            );
            const extraBinds = (data.unboxed as { l: string; k: ControlKind; a: string }[]).map((u, j) => ({
              i: parsed.candidates.length + j + 1,
              k: u.k,
              l: u.l,
              a: u.a,
            }));
            if (extra.length) {
              setCands([...parsed.candidates, ...extra]);
              bindings = [...bindings, ...extraBinds];
            }
          }
        }
      } catch { /* fall through to heuristics */ }
      if (bindings) {
        // fill any candidate the VLM skipped with a heuristic guess
        const have = new Set(bindings.map((b) => b.i));
        const missing = parsed.candidates.filter((c) => !have.has(c.i));
        if (missing.length) bindings = [...bindings, ...heuristicBind(missing)];
        setUsedAI(true);
      } else {
        bindings = heuristicBind([...parsed.candidates, ...extra]);
        setUsedAI(false);
      }
      const order = new Map([...parsed.candidates, ...extra].map((c, idx) => [c.i, idx]));
      bindings.sort((a, b) => (order.get(a.i) ?? 0) - (order.get(b.i) ?? 0));
      setBinds(bindings);
      setPhase("confirm");
      setStatus("");
    } catch (e) {
      setPhase("error");
      setStatus(`Something went wrong reading that photo. ${(e as Error).message}`);
    }
  }

  function updateBind(i: number, patch: Partial<Binding>) {
    setBinds((bs) => bs.map((b) => (b.i === i ? { ...b, ...patch } : b)));
  }

  async function makeQR() {
    const controls = bindingsToControls(cands, binds);
    const layout: DeskLayout = { v: 1, ar: 1.414, c: controls };
    if (!validateLayout(layout)) {
      setStatus("That layout didn't validate — check the actions you picked.");
      return;
    }
    const json = JSON.stringify(layout);
    setLayoutJSON(json);
    setPhase("qr");
    requestAnimationFrame(() => {
      if (qrRef.current) {
        QRCode.toCanvas(qrRef.current, json, { width: 340, margin: 2, errorCorrectionLevel: "M" }).catch(() => undefined);
      }
    });
  }

  return (
    <div className="scan">
      <a href="#/" className="doodle">← DrawAnything</a>
      <h1>Scan your drawing 📷</h1>

      {phase === "idle" && (
        <>
          <p>
            Lay your drawn sheet flat, fill the frame with it, and take one
            photo. Bold, closed outlines read best.
          </p>
          <button className="btn primary" onClick={() => fileRef.current?.click()}>
            📸 Take / pick the photo
          </button>
        </>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPhoto(f);
          e.target.value = "";
        }}
      />

      {phase === "working" && <p className="hand" style={{ fontSize: "1.5rem" }}>{status}</p>}

      {phase === "error" && (
        <>
          <p>{status}</p>
          <button className="btn" onClick={() => setPhase("idle")}>Try another photo</button>
        </>
      )}

      {phase === "confirm" && (
        <>
          {marked && <img className="preview" src={marked} alt="Your drawing with numbered controls" />}
          <p style={{ marginTop: "0.8rem" }}>
            {usedAI
              ? "The AI labelled what it read. Fix anything that's wrong — one tap each — then make the QR."
              : "I labelled these by shape (the AI labelling step wasn't reachable). Fix anything that's wrong, then make the QR."}
          </p>
          {binds.map((b) => (
            <div className="ctrl-row" key={b.i}>
              <span className="badge">{b.i}</span>
              <input
                type="text"
                value={b.l}
                maxLength={10}
                style={{ width: 92 }}
                onChange={(e) => updateBind(b.i, { l: e.target.value.toUpperCase() })}
                aria-label={`label for control ${b.i}`}
              />
              <select
                value={b.k}
                onChange={(e) => updateBind(b.i, { k: e.target.value as ControlKind })}
                aria-label={`kind for control ${b.i}`}
              >
                {KIND_OPTIONS.map((o) => (
                  <option key={o.v} value={o.v}>{o.label}</option>
                ))}
              </select>
              <select
                value={b.a}
                onChange={(e) => updateBind(b.i, { a: e.target.value })}
                aria-label={`action for control ${b.i}`}
              >
                {ACTION_OPTIONS.map((o) => (
                  <option key={o.v} value={o.v}>{o.label}</option>
                ))}
              </select>
              {b.k === "sld" && (
                <select
                  value={b.o ?? "v"}
                  onChange={(e) => updateBind(b.i, { o: e.target.value as "v" | "h" })}
                  aria-label="slider direction"
                >
                  <option value="v">↕ vertical</option>
                  <option value="h">↔ horizontal</option>
                </select>
              )}
            </div>
          ))}
          {status && <p style={{ color: "var(--tomato)" }}>{status}</p>}
          <div style={{ marginTop: "1rem", display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            <button className="btn go" onClick={makeQR}>Make my QR →</button>
            <button className="btn" onClick={() => setPhase("idle")}>New photo</button>
          </div>
        </>
      )}

      {phase === "qr" && (
        <div className="frame qr-wrap">
          <p className="hand" style={{ fontSize: "1.6rem", margin: "0 0 0.4rem" }}>
            Point your laptop webcam at this!
          </p>
          <canvas ref={qrRef} />
          <p>
            On the laptop, open <b>Play</b> and choose “Scan QR”. This phone's
            job is done — put it away. 🎉
          </p>
          <button
            className="btn"
            onClick={() => navigator.clipboard?.writeText(layoutJSON).catch(() => undefined)}
          >
            Copy layout JSON instead
          </button>
          <div style={{ marginTop: "0.7rem" }}>
            <button className="btn" onClick={() => setPhase("confirm")}>← Fix labels</button>
          </div>
        </div>
      )}
    </div>
  );
}
