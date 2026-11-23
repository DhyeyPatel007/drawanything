// DrawAnything engine unit tests — run with: npm test
// Covers the pure logic that can be verified without a camera:
// homography math, the touch state machine (tap fires once, hover never
// fires, slider tracks, holds release), layout validation, label binding.

import { homographyFrom4, applyH, invertH } from "../src/lib/homography";
import { TouchEngine, type TouchEvent } from "../src/lib/touch";
import { DEMO_LAYOUT, validateLayout } from "../src/lib/types";
import { actionForLabel, heuristicBind } from "../src/lib/binding";
import type { Control } from "../src/lib/types";

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, extra = "") {
  if (cond) {
    pass++;
    console.log(`  ok  ${name}`);
  } else {
    fail++;
    console.log(`FAIL  ${name} ${extra}`);
  }
}

// ---------------------------------------------------------- homography
{
  const src: [number, number][] = [[120, 90], [560, 70], [590, 420], [95, 445]];
  const dst: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1]];
  const H = homographyFrom4(src, dst)!;
  let maxErr = 0;
  for (let i = 0; i < 4; i++) {
    const [u, v] = applyH(H, src[i][0], src[i][1]);
    maxErr = Math.max(maxErr, Math.abs(u - dst[i][0]), Math.abs(v - dst[i][1]));
  }
  check("homography maps corners exactly", maxErr < 1e-6, `err=${maxErr}`);
  const inv = invertH(H)!;
  const [x, y] = applyH(inv, 0.5, 0.5);
  const [u2, v2] = applyH(H, x, y);
  check("homography inverse round-trips", Math.abs(u2 - 0.5) < 1e-6 && Math.abs(v2 - 0.5) < 1e-6);
}

// ---------------------------------------------------------- touch engine
const pad: Control = { id: "p1", k: "drum", l: "KICK", a: "aud.kick", r: [0.4, 0.4, 0.2, 0.2] };
const slider: Control = { id: "s1", k: "sld", l: "VOL", a: "os.vol", r: [0.05, 0.1, 0.08, 0.8], o: "v" };
const wasd: Control = { id: "w1", k: "key", l: "W", a: "os.hold.W", r: [0.75, 0.1, 0.12, 0.2] };

function run(frames: { tip: { u: number; v: number } | null; occ: number; speed: number }[], controls: Control[]) {
  const eng = new TouchEngine(controls);
  const events: TouchEvent[] = [];
  eng.onEvent = (e) => events.push(e);
  let t = 0;
  for (const f of frames) {
    t += 33;
    eng.frame({ t, tip: f.tip, occ: f.occ, speed: f.speed });
  }
  return events;
}

{
  // a real tap: fast approach into the pad, abrupt stop, strong occlusion
  const frames = [
    { tip: { u: 0.5, v: 0.2 }, occ: 0.05, speed: 0.4 },
    { tip: { u: 0.5, v: 0.32 }, occ: 0.1, speed: 2.6 },
    { tip: { u: 0.5, v: 0.44 }, occ: 0.3, speed: 2.2 },
    { tip: { u: 0.5, v: 0.5 }, occ: 0.72, speed: 0.2 },
    { tip: { u: 0.5, v: 0.5 }, occ: 0.7, speed: 0.1 },
    { tip: { u: 0.5, v: 0.42 }, occ: 0.2, speed: 1.4 },
    { tip: { u: 0.5, v: 0.3 }, occ: 0.05, speed: 1.2 },
  ];
  const ev = run(frames, [pad]);
  const downs = ev.filter((e) => e.type === "down");
  check("tap fires exactly one down", downs.length === 1, `got ${downs.length}`);
  check("tap produces an up after release", ev.some((e) => e.type === "up"));
  check("tap velocity is in range", downs.length === 1 && downs[0].type === "down" && downs[0].velocity > 0.3 && downs[0].velocity <= 1);
}

{
  // a hover: finger floats over the pad, slow drift, weak occlusion — never fires
  const frames = Array.from({ length: 30 }, (_, i) => ({
    tip: { u: 0.5, v: 0.5 + Math.sin(i / 4) * 0.01 },
    occ: 0.22,
    speed: 0.15,
  }));
  const ev = run(frames, [pad]);
  check("hover never fires", ev.filter((e) => e.type === "down").length === 0);
}

{
  // a slow deliberate press: low speed but very strong occlusion — fires
  const frames = [
    { tip: { u: 0.5, v: 0.46 }, occ: 0.2, speed: 0.3 },
    { tip: { u: 0.5, v: 0.5 }, occ: 0.55, speed: 0.25 },
    { tip: { u: 0.5, v: 0.5 }, occ: 0.88, speed: 0.1 },
    { tip: null, occ: 0, speed: 0 },
    { tip: null, occ: 0, speed: 0 },
  ];
  const ev = run(frames, [pad]);
  check("firm press fires", ev.filter((e) => e.type === "down").length === 1);
  check("hand loss releases the control", ev.some((e) => e.type === "up"));
}

{
  // slider: contact then drag — move events track position, latest near bottom
  const frames = [
    { tip: { u: 0.09, v: 0.2 }, occ: 0.3, speed: 2.0 },
    { tip: { u: 0.09, v: 0.3 }, occ: 0.75, speed: 0.2 },
    { tip: { u: 0.09, v: 0.5 }, occ: 0.7, speed: 0.6 },
    { tip: { u: 0.09, v: 0.8 }, occ: 0.7, speed: 0.6 },
    { tip: null, occ: 0, speed: 0 },
    { tip: null, occ: 0, speed: 0 },
  ];
  const ev = run(frames, [slider]);
  const moves = ev.filter((e) => e.type === "move");
  check("slider emits moves while dragging", moves.length >= 2, `got ${moves.length}`);
  const last = moves[moves.length - 1];
  check(
    "slider value follows the finger (bottom = low)",
    last && last.type === "move" && last.value < 0.25,
    last && last.type === "move" ? `value=${last.value}` : "no move"
  );
}

{
  // WASD hold: one down, one up, no repeats while held
  const frames = [
    { tip: { u: 0.81, v: 0.2 }, occ: 0.3, speed: 2.4 },
    { tip: { u: 0.81, v: 0.2 }, occ: 0.8, speed: 0.1 },
    ...Array.from({ length: 12 }, () => ({ tip: { u: 0.81, v: 0.2 }, occ: 0.8, speed: 0.05 })),
    { tip: { u: 0.81, v: 0.05 }, occ: 0.1, speed: 1.8 },
    { tip: null, occ: 0, speed: 0 },
    { tip: null, occ: 0, speed: 0 },
  ];
  const ev = run(frames, [wasd]);
  check("hold fires one down", ev.filter((e) => e.type === "down").length === 1);
  check("hold fires one up", ev.filter((e) => e.type === "up").length === 1);
}

// ---------------------------------------------------------- validation + binding
{
  check("demo layout validates", validateLayout(DEMO_LAYOUT) !== null);
  check("layout with a rogue action is rejected", validateLayout({ v: 1, c: [{ id: "x", k: "btn", l: "X", a: "os.exec.rm", r: [0, 0, 0.1, 0.1] }] }) === null);
  check("MUTE label maps to os.mute", actionForLabel("MUTE", "button").a === "os.mute");
  check("W label maps to a hold", actionForLabel("W", "key").a === "os.hold.W");
  check("KICK label maps to the kick drum", actionForLabel("KICK", "pad").a === "aud.kick");
  const binds = heuristicBind([
    { i: 1, r: [0.05, 0.1, 0.06, 0.75] },
    { i: 2, r: [0.3, 0.3, 0.2, 0.25] },
    { i: 3, r: [0.6, 0.3, 0.18, 0.2] },
  ]);
  check("tall thin region binds as the volume slider", binds[0].k === "sld" && binds[0].a === "os.vol");
  check("first squarish region binds as the dial", binds[1].k === "dial" && binds[1].a === "aud.filter");
  check("next square region binds as a drum", binds[2].k === "drum");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
