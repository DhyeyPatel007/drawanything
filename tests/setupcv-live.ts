// Live test of the phone-side setup CV (src/lib/setupCV.ts) against a
// synthetic photo of a drawn desk, using @napi-rs/canvas as the DOM canvas.
// Run: npx tsx tests/setupcv-live.ts

import { createCanvas, Image } from "@napi-rs/canvas";
import { readFileSync } from "node:fs";

// minimal DOM shim for setupCV
(globalThis as Record<string, unknown>).document = {
  createElement: (tag: string) => {
    if (tag !== "canvas") throw new Error(`unexpected element ${tag}`);
    return createCanvas(300, 150);
  },
};

const { processPhoto } = await import("../src/lib/setupCV");

const img = new Image();
img.src = readFileSync("/tmp/desk_photo.jpg");
// napi-rs Image exposes naturalWidth/Height via width/height once loaded
Object.defineProperty(img, "naturalWidth", { get: () => img.width });
Object.defineProperty(img, "naturalHeight", { get: () => img.height });

const out = await processPhoto(img as unknown as HTMLImageElement);
console.log(`candidates found: ${out.candidates.length}`);
for (const c of out.candidates) {
  console.log(`  #${c.i} r=[${c.r.map((n) => n.toFixed(3)).join(", ")}]`);
}

const expected: [number, number, number, number][] = [
  [0.04, 0.12, 0.07, 0.72], // VOL
  [0.17, 0.55, 0.16, 0.32], // KICK
  [0.36, 0.55, 0.16, 0.32], // SNARE
  [0.58, 0.1, 0.17, 0.34], // FILTER
  [0.58, 0.58, 0.11, 0.2], // H
  [0.83, 0.12, 0.11, 0.2], // W
];
let fail = 0;
function iou(a: number[], b: [number, number, number, number]): number {
  const x0 = Math.max(a[0], b[0]), y0 = Math.max(a[1], b[1]);
  const x1 = Math.min(a[0] + a[2], b[0] + b[2]), y1 = Math.min(a[1] + a[3], b[1] + b[3]);
  const inter = Math.max(0, x1 - x0) * Math.max(0, y1 - y0);
  const union = a[2] * a[3] + b[2] * b[3] - inter;
  return inter / union;
}
if (out.candidates.length !== expected.length) {
  console.log(`FAIL expected ${expected.length} candidates, got ${out.candidates.length}`);
  fail++;
}
for (const exp of expected) {
  const best = Math.max(...out.candidates.map((c) => iou(c.r, exp)));
  const ok = best > 0.45;
  console.log(`${ok ? "  ok " : "FAIL "} region [${exp.join(", ")}] best IoU ${best.toFixed(2)}`);
  if (!ok) fail++;
}
console.log(fail ? `\n${fail} FAILED` : "\nsetup CV checks passed");
process.exit(fail ? 1 : 0);
