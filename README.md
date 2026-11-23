# DrawAnything

**Draw a control desk on plain paper. Scan it once with your phone. The ink works — live, under your laptop webcam.**

DrawAnything turns a hand-drawn sheet of paper into a working control surface: drum pads that thump, a volume slider that rides, letter keys that type, WASD keys that drive a game, a bottle-cap dial that sweeps a synth filter — and when you draw a brand-new **MUTE** box mid-session, it comes alive in seconds. No special paper, no electronics in the sheet. Just a pen, a phone (for one 30-second scan), and a laptop.

Built for **GenHacks 2026**. Open source (MIT).

## Live demo

- App: https://drawanything-eta.vercel.app *(check the Devpost page for the current deploy link)*
- Try it with zero drawing: open **Play → “Use the demo desk”**, click the 4 corners of any sheet of paper in the camera view, and tap the matching spots on the paper.

## How it works

### 1. Draw
Any pen, any A4 sheet. Boxes for pads and keys, a long track for a slider, a circle for the dial. Write the label inside each control — `KICK`, `VOL`, `MUTE`, `W`, `H`…

### 2. Scan once (phone)
Open the **Scan** page on your phone, take one photo of the sheet.

- On-device CV rectifies the sheet and finds the ink regions (**Set-of-Mark**: it draws numbered badges on the regions it found).
- A Vercel serverless function sends the *badged* image to **Gemma 3 27B** (Nebius Token Factory). The model only *labels* the numbered regions — geometry always comes from CV, never from the model.
- You confirm or fix every label on the phone (one tap each), then the layout becomes a **QR code** (~500 bytes).
- The laptop scans the QR with its webcam. **The phone is put away.** No server state, no accounts, no pairing.

### 3. Play (laptop)
Prop the sheet up like a music stand facing the webcam and click its 4 corners once to lock the homography. From then on, everything runs **locally in the browser**:

- **Hand tracking** — MediaPipe HandLandmarker (GPU) tracks your fingertip; a homography maps it onto the paper.
- **Touch vs hover** — a visual-only state machine (`IDLE → APPROACH → CONTACT → RELEASE`): a real tap is a fast approach that *stops dead* on the ink while the fingertip occludes the spot. Hovering never fires. This was the most argued-over decision in the design panel (see below).
- **Drums** — real recorded acoustic samples (Virtuosity Drums, CC0; two velocity layers, round-robin kick/hats, open-hat choke), preloaded as Web Audio buffers and fired with `source.start(0)`. No synth beeps, no Tone.js.
- **New controls mid-session** — a background ink-diff watches for new ink while your hand is away; a stable new region is cropped and sent to the VLM micro-patch endpoint, labelled, and hot-swapped into the live desk. Draw `MUTE` while music plays → it works.
- **OS actions** — a tiny optional Python bridge on `127.0.0.1` (WebSocket) executes *allowlisted* actions only: real keystrokes, WASD holds, Windows master volume and mute (SendInput + pycaw). Without it, everything still works in-browser.

Latency is engineered, not hoped for: latest-frame-wins loop, nothing network/VLM/OCR ever blocks the frame path, and the UI shows a live touch→action p50/p95 readout plus the audio output latency.

## Architecture

```
PHONE (once, ~30 s)                     LAPTOP (the whole session)
┌──────────────────────────┐            ┌───────────────────────────────────┐
│ photo → sheet rectify    │            │ webcam 640×480                    │
│ CV ink regions (badges)  │            │  → MediaPipe fingertip            │
│        │                 │   QR       │  → homography → paper coords      │
│        ▼                 │  ───────►  │  → touch state machine            │
│ Vercel /api/parse        │  (layout   │  → drums (Web Audio) / bridge     │
│ Gemma 3 27B labels only  │   JSON)    │  → ink-diff → /api/parse-patch    │
│        │                 │            │    (new controls, async)          │
│ confirm/fix → QR code    │            │  → living twin UI (your real ink) │
└──────────────────────────┘            └───────────────────────────────────┘
```

The architecture was decided by a **three-model design panel** (Gemini, ChatGPT, GPT-6 Luna) over three rounds of cross-examination — runtime location, setup transport, parse geometry, the touch method, the sample library, the design language and the twin rendering were each fought over and settled by majority vote with recorded dissents. The short version of the verdict: browser-local vision, QR handoff, Set-of-Mark parse, visual-only touch, real acoustic samples, “Ink Arcade” UI, and a twin that shows *your actual ink*, extracted live from the webcam view.

## Run it locally

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # engine unit tests (touch machine, homography, schema)
npm run build        # production build
```

For the AI labelling step, the Vercel functions need one env var (server-side only):

```
NEBIUS_API_KEY=<your Nebius Token Factory key>   # model: google/gemma-3-27b-it
```

Without it, setup still works — the app falls back to shape-based heuristic binding, and you fix labels on the confirmation screen.

### OS bridge (optional, Windows)

```bash
cd bridge
pip install -r requirements.txt
python drawanything_bridge.py   # ws://127.0.0.1:8765
```

Start it before a session if you want paper keys to type into real Windows apps and the paper slider to ride the real Windows volume. It binds to localhost only and refuses anything outside the action allowlist. On non-Windows machines it runs in dry-run mode for protocol testing.

## Project layout

```
src/lib/     homography, touch state machine, audio engine, ink analysis,
             setup CV, VLM binding heuristics, OS-bridge client
src/pages/   Landing, Scan (phone), Play (laptop runtime)
api/         Vercel functions: parse.ts (Set-of-Mark), parse-patch.ts (new ink)
bridge/      the Windows OS bridge (Python)
public/      drum samples (Virtuosity Drums, CC0 — see CREDITS.md)
tests/       unit tests + live VLM / setup-CV harnesses
```

## Credits

- Drum samples: **Virtuosity Drums** by Karoryfer Samples / sfzinstruments (CC0 1.0), overhead microphones, trimmed and loudness-normalised. Details in [CREDITS.md](CREDITS.md).
- Hand tracking: MediaPipe HandLandmarker (Google).
- Labelling model: Gemma 3 27B via Nebius Token Factory.

## License

MIT — see [LICENSE](LICENSE). Draw something, make it work, show us.
