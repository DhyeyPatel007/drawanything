// Live tests for the polish-panel additions:
// - CapTracker (P1) on synthetic rectified frames drawn with @napi-rs/canvas
// - DriftMonitor helpers (P3): zncc1d sanity + a shifted-edge profile check
// Run: npx tsx tests/cap-drift-live.ts

import { createCanvas } from "@napi-rs/canvas";
import { CapTracker } from "../src/lib/capTracker";
import { DriftMonitor, zncc1d } from "../src/lib/drift";
import type { Control } from "../src/lib/types";

let fail = 0;
function check(name: string, cond: boolean, extra = "") {
  console.log(`${cond ? "  ok " : "FAIL "} ${name} ${extra}`);
  if (!cond) fail++;
}

const dial: Control = { id: "d1", k: "dial", l: "FILTER", a: "aud.filter", r: [0.58, 0.1, 0.17, 0.34] };
const W = 800, H = 566;
const cx = (0.58 + 0.17 / 2) * W;
const cy = (0.1 + 0.34 / 2) * H;
const R = Math.min(0.17 * W, 0.34 * H) / 2;

function drawSheet(lineAngleDeg: number | null) {
  const cv = createCanvas(W, H);
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#faf7ee";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#191919";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();
  if (lineAngleDeg !== null) {
    const th = (lineAngleDeg * Math.PI) / 180;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(th) * R * 0.95, cy + Math.sin(th) * R * 0.95);
    ctx.stroke();
  }
  return cv as unknown as HTMLCanvasElement;
}

// --- cap tracker: reference at 0°, then rotate +40°, then to +80° total
{
  const tr = new CapTracker();
  tr.captureReference(drawSheet(0), dial);
  const r1 = tr.update(drawSheet(40), dial, false, 1000);
  check("cap tracker accepts a clean 40° turn", r1 !== null, JSON.stringify(r1));
  check(
    "cap tracker reads ~40°",
    r1 !== null && Math.abs(Math.abs(r1.totalDeg) - 40) < 9,
    `total=${r1?.totalDeg.toFixed(1)}`
  );
  const r2 = tr.update(drawSheet(80), dial, false, 1100);
  check(
    "cap tracker accumulates to ~80°",
    r2 !== null && Math.abs(Math.abs(r2.totalDeg) - 80) < 12,
    `total=${r2?.totalDeg.toFixed(1)}`
  );
  check(
    "norm moves away from centre as the cap turns",
    r2 !== null && Math.abs(r2.norm - 0.5) > 0.08,
    `norm=${r2?.norm.toFixed(2)}`
  );
  // unmarked cap (plain circle, rotationally symmetric) -> no confident reading
  const tr2 = new CapTracker();
  tr2.captureReference(drawSheet(null), dial);
  const r3 = tr2.update(drawSheet(null), dial, false, 1000);
  check("unmarked cap produces no reading (peak-margin gate)", r3 === null);
  // finger near -> held
  const r4 = tr.update(drawSheet(120), dial, true, 1200);
  check("finger inside 0.75R holds the angle", r4 === null);
}

// --- drift helpers
{
  const a = new Float32Array([0, 10, 40, 90, 200, 210, 205, 200]);
  check("zncc1d identical profiles = 1", Math.abs(zncc1d(a, a) - 1) < 1e-6);
  const shifted = new Float32Array([200, 210, 205, 200, 0, 10, 40, 90]);
  check("zncc1d shifted edge profile < 0.78", zncc1d(a, shifted) < 0.78, `got ${zncc1d(a, shifted).toFixed(2)}`);

  // full monitor on a synthetic frame: sheet corners on a dark desk
  const fw = 640, fh = 480;
  const corners: [number, number][] = [[110, 80], [530, 70], [545, 405], [100, 415]];
  function frame(shiftX: number) {
    const cv = createCanvas(fw, fh);
    const ctx = cv.getContext("2d");
    ctx.fillStyle = "#6b5a48";
    ctx.fillRect(0, 0, fw, fh);
    ctx.fillStyle = "#faf7ee";
    ctx.beginPath();
    const cs = corners.map(([x, y]) => [x + shiftX, y] as const);
    ctx.moveTo(cs[0][0], cs[0][1]);
    for (let i = 1; i < 4; i++) ctx.lineTo(cs[i][0], cs[i][1]);
    ctx.closePath();
    ctx.fill();
    return ctx.getImageData(0, 0, fw, fh) as unknown as ImageData;
  }
  const mon = new DriftMonitor();
  mon.setReference(frame(0), corners);
  check("drift monitor has active edges", mon.activeEdges() >= 2, `active=${mon.activeEdges()}`);
  check("no drift on the identical frame", mon.check(frame(0), corners) === false);
  check("drift detected after a 14px sheet shift", mon.check(frame(14), corners) === true);
}

console.log(fail ? `\n${fail} FAILED` : "\ncap + drift checks passed");
process.exit(fail ? 1 : 0);
