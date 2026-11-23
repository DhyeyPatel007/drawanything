import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { DEMO_LAYOUT, validateLayout, type Control, type DeskLayout, type DrumPiece } from "../lib/types";
import { homographyFrom4, applyH, type H3, type Pt } from "../lib/homography";
import { getLandmarker, detectTips } from "../lib/vision";
import { TouchEngine, type TouchEvent } from "../lib/touch";
import { warpQuad, sampleOcclusion, inkCutout, findNewInk, cropDataURL, RECT_W, RECT_H } from "../lib/ink";
import { audio } from "../lib/audio";
import { bridge } from "../lib/bridge";
import { actionForLabel } from "../lib/binding";
import { CapTracker } from "../lib/capTracker";
import { DriftMonitor } from "../lib/drift";

type Phase = "choose" | "lock" | "live";
interface LogRow { id: number; text: string; t: string }

const CORNER_NAMES = ["top-left", "top-right", "bottom-right", "bottom-left"];

export default function Play() {
  const [phase, setPhase] = useState<Phase>("choose");
  const [layout, setLayout] = useState<DeskLayout | null>(null);
  const [camOn, setCamOn] = useState(false);
  const [camErr, setCamErr] = useState("");
  const [qrMode, setQrMode] = useState(false);
  const [corners, setCorners] = useState<Pt[]>([]);
  const [cutouts, setCutouts] = useState<Record<string, string>>({});
  const [freshId, setFreshId] = useState<string>("");
  const [log, setLog] = useState<LogRow[]>([]);
  const [typed, setTyped] = useState("");
  const [vol, setVol] = useState(0.7);
  const [dialDeg, setDialDeg] = useState(0);
  const [synthOn, setSynthOn] = useState(false);
  const [mutedUI, setMutedUI] = useState(false);
  const [bridgeOn, setBridgeOn] = useState(false);
  const [latency, setLatency] = useState<{ p50: number; p95: number } | null>(null);
  const [audioLat, setAudioLat] = useState(0);
  const [pasteText, setPasteText] = useState("");
  const [modelState, setModelState] = useState("loading hand tracker…");
  const [driftWarn, setDriftWarn] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<HTMLCanvasElement>(null);
  const twinDotRef = useRef<HTMLDivElement>(null);
  const ctlRefs = useRef(new Map<string, HTMLDivElement>());
  const ctlClassCache = useRef(new Map<string, string>());

  const layoutRef = useRef<DeskLayout | null>(null);
  const phaseRef = useRef<Phase>("choose");
  const cornersRef = useRef<Pt[]>([]);
  const href = useRef<H3 | null>(null);
  const engineRef = useRef<TouchEngine | null>(null);
  const rectRef = useRef<HTMLCanvasElement | null>(null);
  const refCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastTip = useRef<{ u: number; v: number; t: number } | null>(null);
  const lastHandSeen = useRef(0);
  const lastInkCheck = useRef(0);
  const pendingInk = useRef<{ r: [number, number, number, number]; t: number } | null>(null);
  const inkBusy = useRef(false);
  const heldKeys = useRef(new Set<string>());
  const gamePos = useRef({ x: 0.5, y: 0.5 });
  const latSamples = useRef<number[]>([]);
  const logId = useRef(0);
  const lastVolSend = useRef(0);
  const capTrackers = useRef(new Map<string, CapTracker>());
  const driftMon = useRef(new DriftMonitor());
  const frameCanvas = useRef<HTMLCanvasElement | null>(null);
  const lastDriftCheck = useRef(0);
  const driftBreaches = useRef(0);
  const lastDialUi = useRef(0);

  phaseRef.current = phase;
  layoutRef.current = layout;

  function addLog(text: string) {
    const row = { id: ++logId.current, text, t: new Date().toLocaleTimeString() };
    setLog((rows) => [row, ...rows].slice(0, 30));
  }

  // ------------------------------------------------------------ camera boot
  useEffect(() => {
    let stream: MediaStream | null = null;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 60, min: 24 } },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCamOn(true);
        }
      } catch (e) {
        setCamErr("Camera blocked or missing. Allow camera access for this site, then reload.");
        void e;
      }
      try {
        await getLandmarker();
        setModelState("hand tracker ready");
      } catch {
        setModelState("hand tracker failed to load (needs internet once)");
      }
      bridge.onStatus = (ok) => setBridgeOn(ok);
      bridge.start();
    })();
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // ------------------------------------------------------------ event dispatch
  function dispatch(e: TouchEvent) {
    const c = e.control;
    const now = performance.now();
    if (e.type === "down") {
      latSamples.current.push(now - e.t);
      if (latSamples.current.length > 60) latSamples.current.shift();
    }
    if (c.a.startsWith("aud.") && c.a !== "aud.filter") {
      if (e.type === "down") {
        audio.triggerDrum(c.a.slice(4) as DrumPiece, e.velocity);
        addLog(`🥁 ${c.l}`);
      }
      return;
    }
    if (c.a === "os.mute") {
      if (e.type === "down") {
        const next = !audio.muted;
        audio.setMuted(next);
        setMutedUI(next);
        bridge.send({ t: "mute" });
        addLog(next ? "🔇 muted" : "🔊 unmuted");
      }
      return;
    }
    if (c.a.startsWith("os.key.")) {
      if (e.type !== "down") return;
      const key = c.a.slice(7);
      bridge.send({ t: "key", key });
      setTyped((prev) => {
        if (key === "BACK") return prev.slice(0, -1);
        if (key === "SPACE") return prev + " ";
        if (key === "ENTER") return prev + "\n";
        return prev + key;
      });
      addLog(`⌨ typed ${key}`);
      return;
    }
    if (c.a.startsWith("os.hold.")) {
      const key = c.a.slice(8);
      if (e.type === "down") {
        heldKeys.current.add(key);
        bridge.send({ t: "keydown", key });
        addLog(`🎮 ${key} down`);
      } else if (e.type === "up") {
        heldKeys.current.delete(key);
        bridge.send({ t: "keyup", key });
      }
      return;
    }
    if (c.a === "os.vol" && e.type === "move") {
      setVol(e.value);
      audio.setLocalVolume(e.value);
      if (now - lastVolSend.current > 50) {
        lastVolSend.current = now;
        bridge.send({ t: "vol", v: e.value });
      }
      return;
    }
    // aud.filter: the dial is owned by the real bottle-cap tracker
    // (polish panel P1) — fingertip angle is never used for it.
  }

  // ------------------------------------------------------------ main loop
  useEffect(() => {
    let raf = 0;
    let lastVideoTime = -1;
    let lastTs = 0;
    const rect = document.createElement("canvas");
    rect.width = RECT_W; rect.height = RECT_H;
    rectRef.current = rect;
    const refC = document.createElement("canvas");
    refC.width = RECT_W; refC.height = RECT_H;
    refCanvasRef.current = refC;

    const loop = async () => {
      raf = requestAnimationFrame(loop);
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;
      const now = performance.now();

      // QR scanning while in choose-phase with qrMode on
      if (phaseRef.current === "choose" && qrModeRef.current) {
        if (now - lastQrScan.current > 180) {
          lastQrScan.current = now;
          scanQRFrame(video);
        }
        return;
      }
      if (phaseRef.current !== "live" || !href.current || !layoutRef.current) return;

      const cornersPx = cornersRef.current;
      const rctx = rect.getContext("2d", { willReadFrequently: true })!;
      warpQuad(rctx, video, video.videoWidth, video.videoHeight, cornersPx, RECT_W, RECT_H, 7);

      // hand tracking (skip duplicate frames)
      let tips: { index: { x: number; y: number } | null } = { index: null };
      if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        const lm = await getLandmarker().catch(() => null);
        if (lm) tips = detectTips(lm, video, now);
      }
      const H = href.current;
      let tipPaper: { u: number; v: number } | null = null;
      let speed = 0;
      if (tips.index) {
        lastHandSeen.current = now;
        const [u, v] = applyH(H, tips.index.x * video.videoWidth, tips.index.y * video.videoHeight);
        tipPaper = { u, v };
        if (lastTip.current) {
          const dt = Math.max(1, now - lastTip.current.t) / 1000;
          const du = u - lastTip.current.u;
          const dv = v - lastTip.current.v;
          speed = Math.min(6, Math.hypot(du, dv) / dt);
        }
        lastTip.current = { u, v, t: now };
      } else {
        lastTip.current = null;
      }

      const refCtx = refC.getContext("2d", { willReadFrequently: true })!;
      const occ = tipPaper ? sampleOcclusion(rctx, refCtx, tipPaper.u, tipPaper.v) : 0;

      if (!engineRef.current) {
        engineRef.current = new TouchEngine(layoutRef.current.c);
        engineRef.current.onEvent = dispatch;
      }
      const frameT = now;
      engineRef.current.frame({ t: frameT, tip: tipPaper, occ, speed });

      // bottle-cap tracker (polish P1): read-only, runs on the rectified view
      const layNow = layoutRef.current;
      if (layNow) {
        for (const c of layNow.c) {
          if (c.k !== "dial") continue;
          const tracker = capTrackers.current.get(c.id);
          if (!tracker) continue;
          let fingerNear = false;
          if (tipPaper) {
            const cx = c.r[0] + c.r[2] / 2;
            const cy = c.r[1] + c.r[3] / 2;
            const R = Math.min(c.r[2], c.r[3]) / 2;
            fingerNear = Math.hypot(tipPaper.u - cx, tipPaper.v - cy) < R * 0.75;
          }
          const reading = tracker.update(rect, c, fingerNear, now);
          if (reading) {
            audio.setFilterNorm(reading.norm);
            if (now - lastDialUi.current > 90) {
              lastDialUi.current = now;
              setDialDeg(Math.round(reading.totalDeg % 360));
            }
          }
        }
      }

      // sheet-drift monitor (polish P3): hand-free, every 2 s, read-only
      if (now - lastDriftCheck.current > 2000 && now - lastHandSeen.current > 300) {
        lastDriftCheck.current = now;
        if (!frameCanvas.current) {
          frameCanvas.current = document.createElement("canvas");
        }
        const fc = frameCanvas.current;
        fc.width = video.videoWidth;
        fc.height = video.videoHeight;
        const fctx = fc.getContext("2d", { willReadFrequently: true })!;
        fctx.drawImage(video, 0, 0);
        const fimg = fctx.getImageData(0, 0, fc.width, fc.height);
        if (driftMon.current.check(fimg, cornersPx)) {
          driftBreaches.current++;
          if (driftBreaches.current >= 3) setDriftWarn(true);
        } else {
          driftBreaches.current = 0;
        }
      }

      // twin fingertip dot + control state classes (direct DOM, no re-render)
      const dot = twinDotRef.current;
      if (dot) {
        if (tipPaper) {
          dot.style.display = "block";
          dot.style.left = `${tipPaper.u * 100}%`;
          dot.style.top = `${tipPaper.v * 100}%`;
          dot.className = `tip-dot${engineRef.current.anyContact() ? " hot" : ""}`;
        } else {
          dot.style.display = "none";
        }
      }
      const lay = layoutRef.current;
      if (lay) {
        for (const c of lay.c) {
          const el = ctlRefs.current.get(c.id);
          if (!el) continue;
          const st = engineRef.current.stateOf(c.id);
          const cls = `ctl ${st}${freshIdRef.current === c.id ? " fresh" : ""}`;
          if (ctlClassCache.current.get(c.id) !== cls) {
            ctlClassCache.current.set(c.id, cls);
            el.className = cls;
          }
        }
      }

      // latency pill at ~1 Hz
      if (now - lastTs > 1000) {
        lastTs = now;
        const s = [...latSamples.current].sort((a, b) => a - b);
        if (s.length >= 5) {
          setLatency({
            p50: Math.round(s[Math.floor(s.length * 0.5)]),
            p95: Math.round(s[Math.floor(s.length * 0.95)]),
          });
        }
      }

      maybeDetectNewInk(now);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const qrModeRef = useRef(false);
  qrModeRef.current = qrMode;
  const lastQrScan = useRef(0);
  const freshIdRef = useRef("");
  freshIdRef.current = freshId;

  function scanQRFrame(video: HTMLVideoElement) {
    const c = document.createElement("canvas");
    const scale = Math.min(1, 640 / video.videoWidth);
    c.width = Math.round(video.videoWidth * scale);
    c.height = Math.round(video.videoHeight * scale);
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(video, 0, 0, c.width, c.height);
    const img = ctx.getImageData(0, 0, c.width, c.height);
    const code = jsQR(img.data, img.width, img.height);
    if (code) {
      try {
        const parsed = validateLayout(JSON.parse(code.data));
        if (parsed) {
          setQrMode(false);
          chooseLayout(parsed, "QR scanned — your desk is loaded.");
        }
      } catch { /* not our QR yet */ }
    }
  }

  // ------------------------------------------------------------ new ink (MUTE moment)
  async function maybeDetectNewInk(now: number) {
    if (inkBusy.current) return;
    if (now - lastHandSeen.current < 800) return; // hand must be away
    if (now - lastInkCheck.current < 700) return;
    lastInkCheck.current = now;
    const rect = rectRef.current!;
    const refC = refCanvasRef.current!;
    const lay = layoutRef.current;
    if (!lay) return;
    const cand = findNewInk(rect, refC, lay.c);
    if (!cand) {
      pendingInk.current = null;
      return;
    }
    const prev = pendingInk.current;
    if (!prev || Math.abs(prev.r[0] - cand.r[0]) > 0.05 || Math.abs(prev.r[1] - cand.r[1]) > 0.05) {
      pendingInk.current = { r: cand.r, t: now };
      return;
    }
    if (now - prev.t < 600) return; // needs two stable sightings
    inkBusy.current = true;
    pendingInk.current = null;
    try {
      const crop = cropDataURL(rect, cand.r);
      let label = "";
      let kind = "button";
      try {
        const res = await fetch("/api/parse-patch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: crop }),
        });
        const data = await res.json();
        if (data && !data.fallback) {
          label = String(data.label || "");
          kind = String(data.kind || "button");
        }
      } catch { /* offline fallback below */ }
      const { k, a } = actionForLabel(label || "NEW", kind);
      const id = `c${Date.now().toString(36)}`;
      const control: Control = {
        id,
        k,
        l: (label || "NEW").slice(0, 10),
        a,
        r: cand.r,
        o: k === "sld" ? (cand.r[3] > cand.r[2] ? "v" : "h") : undefined,
      };
      const next: DeskLayout = { v: 1, ar: lay.ar, c: [...lay.c, control] };
      setLayout(next);
      layoutRef.current = next;
      engineRef.current?.setControls(next.c);
      // commit current frame as the new reference so the ink is "known" now
      refC.getContext("2d")!.drawImage(rect, 0, 0);
      setCutouts((prev2) => ({ ...prev2, [id]: inkCutout(rect, control) }));
      setFreshId(id);
      window.setTimeout(() => setFreshId(""), 4000);
      addLog(`✨ new control came alive: ${control.l} (${control.a})`);
    } finally {
      inkBusy.current = false;
    }
  }

  // ------------------------------------------------------------ flow control
  async function chooseLayout(l: DeskLayout, msg: string) {
    await audio.init().catch(() => undefined);
    setAudioLat(audio.latencyMs());
    setLayout(l);
    layoutRef.current = l;
    engineRef.current = new TouchEngine(l.c);
    engineRef.current.onEvent = dispatch;
    setCorners([]);
    cornersRef.current = [];
    setPhase("lock");
    addLog(msg);
  }

  function onStageClick(e: React.MouseEvent) {
    if (phase !== "lock") return;
    const stage = stageRef.current;
    const video = videoRef.current;
    if (!stage || !video || !video.videoWidth) return;
    const rectB = stage.getBoundingClientRect();
    const vw = video.videoWidth, vh = video.videoHeight;
    const scale = Math.min(rectB.width / vw, rectB.height / vh);
    const dw = vw * scale, dh = vh * scale;
    const ox = (rectB.width - dw) / 2, oy = (rectB.height - dh) / 2;
    const x = (e.clientX - rectB.left - ox) / scale;
    const y = (e.clientY - rectB.top - oy) / scale;
    if (x < 0 || y < 0 || x > vw || y > vh) return;
    const next: Pt[] = [...cornersRef.current, [x, y]];
    cornersRef.current = next;
    setCorners(next);
    if (next.length === 4) finishLock(next);
  }

  function finishLock(cs: Pt[]) {
    const H = homographyFrom4(cs, [[0, 0], [1, 0], [1, 1], [0, 1]]);
    if (!H) {
      addLog("Corner lock failed — try again, spread the corners wide.");
      setCorners([]);
      cornersRef.current = [];
      return;
    }
    href.current = H;
    const video = videoRef.current!;
    const rect = rectRef.current!;
    const rctx = rect.getContext("2d")!;
    warpQuad(rctx, video, video.videoWidth, video.videoHeight, cs, RECT_W, RECT_H, 10);
    const refC = refCanvasRef.current!;
    refC.getContext("2d")!.drawImage(rect, 0, 0);
    const lay = layoutRef.current!;
    const cuts: Record<string, string> = {};
    for (const c of lay.c) cuts[c.id] = inkCutout(rect, c);
    setCutouts(cuts);
    // polish P1: arm a cap tracker per dial, reference ring from this frame
    capTrackers.current.clear();
    for (const c of lay.c) {
      if (c.k === "dial") {
        const tr = new CapTracker();
        tr.captureReference(rect, c);
        capTrackers.current.set(c.id, tr);
      }
    }
    // polish P3: drift reference from the raw frame
    if (!frameCanvas.current) frameCanvas.current = document.createElement("canvas");
    const fc = frameCanvas.current;
    fc.width = video.videoWidth;
    fc.height = video.videoHeight;
    const fctx = fc.getContext("2d", { willReadFrequently: true })!;
    fctx.drawImage(video, 0, 0);
    driftMon.current.setReference(fctx.getImageData(0, 0, fc.width, fc.height), cs);
    driftBreaches.current = 0;
    setDriftWarn(false);
    engineRef.current?.reset();
    setPhase("live");
    addLog("Sheet locked. Play the ink! 🎉");
    if (lay.c.some((c) => c.k === "dial")) {
      addLog("🎛 Cap tracker armed — draw ONE bold line on the bottle cap, centre to rim, then twist it.");
    }
  }

  // WASD mini-game render loop
  useEffect(() => {
    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const cv = gameRef.current;
      if (!cv) return;
      const ctx = cv.getContext("2d")!;
      const held = heldKeys.current;
      const p = gamePos.current;
      const sp = 0.006;
      if (held.has("W")) p.y = Math.max(0.04, p.y - sp);
      if (held.has("S")) p.y = Math.min(0.96, p.y + sp);
      if (held.has("A")) p.x = Math.max(0.04, p.x - sp);
      if (held.has("D")) p.x = Math.min(0.96, p.x + sp);
      ctx.fillStyle = "#101418";
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.strokeStyle = "rgba(215,240,74,0.25)";
      for (let i = 1; i < 6; i++) {
        ctx.beginPath(); ctx.moveTo((cv.width / 6) * i, 0); ctx.lineTo((cv.width / 6) * i, cv.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, (cv.height / 6) * i); ctx.lineTo(cv.width, (cv.height / 6) * i); ctx.stroke();
      }
      ctx.fillStyle = "#d7f04a";
      ctx.beginPath();
      ctx.arc(p.x * cv.width, p.y * cv.height, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1b1b1b";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("✦", p.x * cv.width, p.y * cv.height + 4);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  const cornerHint = phase === "lock"
    ? corners.length < 4
      ? `Click the ${CORNER_NAMES[corners.length]} corner of your sheet (${corners.length}/4)`
      : "Locking…"
    : "";

  return (
    <div className="play">
      <div className="play-top">
        <span className="logo">Draw<span style={{ color: "var(--tomato)" }}>Anything</span></span>
        <span className={`pill ${camOn ? "on" : "bad"}`}><span className="dot" /> camera {camOn ? "on" : "off"}</span>
        <span className={`pill ${modelState.includes("ready") ? "on" : "warn"}`}><span className="dot" /> {modelState}</span>
        <span className={`pill ${bridgeOn ? "on" : ""}`}><span className="dot" /> OS bridge {bridgeOn ? "connected" : "not running (in-browser mode)"}</span>
        {latency && <span className="pill on"><span className="dot" /> touch→action p50 {latency.p50} ms · p95 {latency.p95} ms</span>}
        {audioLat > 0 && <span className={`pill ${audioLat > 60 ? "warn" : "on"}`}><span className="dot" /> audio out {audioLat} ms{audioLat > 60 ? " — use built-in/wired, not Bluetooth" : ""}</span>}
        <span style={{ flex: 1 }} />
        <button
          className={`btn ${synthOn ? "go" : ""}`}
          style={{ padding: "0.35rem 0.8rem", fontSize: "0.85rem" }}
          onClick={() => {
            const next = !synthOn;
            setSynthOn(next);
            audio.setSynthOn(next);
          }}
        >
          🎹 synth voice {synthOn ? "on" : "off"}
        </button>
        {phase === "live" && (
          <button className="btn" style={{ padding: "0.35rem 0.8rem", fontSize: "0.85rem" }} onClick={() => { setPhase("lock"); setCorners([]); cornersRef.current = []; }}>
            ⌖ re-lock corners
          </button>
        )}
        <a className="btn" style={{ padding: "0.35rem 0.8rem", fontSize: "0.85rem" }} href="#/">← home</a>
      </div>

      <div className="play-main">
        <div className="stage" ref={stageRef} onClick={onStageClick}>
          <video ref={videoRef} playsInline muted />
          {camErr && <div className="overlay-msg">{camErr}</div>}
          {phase === "choose" && !camErr && (
            <div className="overlay-msg" style={{ maxWidth: 520 }}>
              <div className="hand" style={{ fontSize: "1.5rem" }}>How is your desk getting in?</div>
              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", flexWrap: "wrap", marginTop: "0.5rem" }}>
                <button className={`btn ${qrMode ? "go" : "primary"}`} onClick={() => setQrMode(!qrMode)}>
                  {qrMode ? "Point the webcam at your phone's QR…" : "📷 Scan the phone QR"}
                </button>
                <button className="btn go" onClick={() => chooseLayout(DEMO_LAYOUT, "Demo desk loaded (drawn for you).")}>
                  ✏️ Use the demo desk
                </button>
              </div>
              <details style={{ marginTop: "0.6rem", textAlign: "left" }}>
                <summary style={{ cursor: "pointer", fontWeight: 600 }}>…or paste a layout JSON</summary>
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  rows={4}
                  style={{ width: "100%", marginTop: "0.4rem" }}
                  placeholder='{"v":1,"ar":1.414,"c":[...]}'
                />
                <button
                  className="btn"
                  onClick={() => {
                    try {
                      const parsed = validateLayout(JSON.parse(pasteText));
                      if (parsed) chooseLayout(parsed, "Pasted desk loaded.");
                      else addLog("That JSON didn't validate as a desk layout.");
                    } catch {
                      addLog("That wasn't valid JSON.");
                    }
                  }}
                >
                  Load it
                </button>
              </details>
            </div>
          )}
          {phase === "lock" && <div className="overlay-msg">{cornerHint}</div>}
          {driftWarn && phase === "live" && (
            <div className="overlay-msg" style={{ top: "auto", bottom: 14, background: "var(--sun)" }}>
              📐 The sheet seems to have shifted.{" "}
              <button
                className="btn"
                style={{ padding: "0.25rem 0.7rem", fontSize: "0.85rem" }}
                onClick={() => {
                  setDriftWarn(false);
                  driftBreaches.current = 0;
                  setPhase("lock");
                  setCorners([]);
                  cornersRef.current = [];
                }}
              >
                Re-lock corners
              </button>
            </div>
          )}
          {corners.map((c, i) => {
            const video = videoRef.current;
            const stage = stageRef.current;
            if (!video || !stage || !video.videoWidth) return null;
            const rectB = stage.getBoundingClientRect();
            const scale = Math.min(rectB.width / video.videoWidth, rectB.height / video.videoHeight);
            const ox = (rectB.width - video.videoWidth * scale) / 2;
            const oy = (rectB.height - video.videoHeight * scale) / 2;
            return (
              <div key={i} className="corner-dot" style={{ left: ox + c[0] * scale, top: oy + c[1] * scale }}>
                {i + 1}
              </div>
            );
          })}
        </div>

        <div className="side">
          <div className="twin-wrap">
            <div className="hand" style={{ fontSize: "1.3rem" }}>your living desk ↓</div>
            <div className="twin">
              {layout?.c.map((c) => (
                <div
                  key={c.id}
                  ref={(el) => {
                    if (el) ctlRefs.current.set(c.id, el);
                    else ctlRefs.current.delete(c.id);
                  }}
                  className="ctl idle"
                  style={{
                    left: `${c.r[0] * 100}%`,
                    top: `${c.r[1] * 100}%`,
                    width: `${c.r[2] * 100}%`,
                    height: `${c.r[3] * 100}%`,
                  }}
                >
                  <div className="squash">
                    <div className="ring" />
                    {cutouts[c.id] ? (
                      <img src={cutouts[c.id]} alt="" />
                    ) : (
                      <div style={{ width: "100%", height: "100%", border: "2px solid var(--ink-soft)", borderRadius: 8, opacity: 0.4 }} />
                    )}
                    <span className="tag">{c.l}</span>
                    {c.k === "dial" && (
                      <span
                        className="tag"
                        style={{ bottom: "auto", top: -6, background: "var(--sun)" }}
                      >
                        {dialDeg}°
                      </span>
                    )}
                  </div>
                </div>
              ))}
              <div ref={twinDotRef} className="tip-dot" style={{ display: "none" }} />
              {!layout && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-soft)", padding: "1rem", textAlign: "center" }}>
                  No desk yet — scan a QR or load the demo desk.
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
              <span className="pill">🎚 volume {Math.round(vol * 100)}%</span>
              <span className={`pill ${mutedUI ? "bad" : "on"}`}><span className="dot" /> {mutedUI ? "muted" : "sound on"}</span>
              <span className="pill">🎛 filter sweep via the dial</span>
            </div>
          </div>

          <div className="typewriter">
            {typed ? (
              <span style={{ whiteSpace: "pre-wrap" }}>{typed}</span>
            ) : (
              <span style={{ color: "var(--ink-soft)" }}>Tap letter keys on the paper — they type here (and in Windows, with the bridge running).</span>
            )}
            <span className="caret" />
          </div>

          <div className="gamepad-view">
            <canvas ref={gameRef} width={316} height={110} />
            <div className="hand" style={{ fontSize: "1.05rem" }}>hold the paper WASD keys — the star obeys ✦</div>
          </div>

          <div className="log">
            {log.map((row) => (
              <div className="row" key={row.id}>
                <span>{row.text}</span>
                <span className="mono" style={{ color: "var(--ink-soft)" }}>{row.t}</span>
              </div>
            ))}
            {log.length === 0 && <div className="row"><span>Nothing yet. The ink is waiting.</span></div>}
          </div>
        </div>
      </div>
    </div>
  );
}
