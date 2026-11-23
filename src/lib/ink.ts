// Rectified-sheet rendering + ink analysis.
// The sheet is warped from the webcam frame onto a canonical canvas by
// subdividing the quad into affine triangles (standard canvas trick).
// From the rectified view we derive: the occlusion cue for touch detection,
// the user's actual ink as alpha cutouts for the living twin (panel D8),
// and new-ink candidates for the MUTE moment (panel D5).

import type { Pt } from "./homography";
import type { Control } from "./types";

export const RECT_W = 800;
export const RECT_H = 566; // 800 / 1.414

/** Warp the quad `corners` (image px, TL TR BR BL) of `src` onto ctx. */
export function warpQuad(
  ctx: CanvasRenderingContext2D,
  src: HTMLVideoElement | HTMLCanvasElement,
  srcW: number,
  srcH: number,
  corners: Pt[],
  outW = RECT_W,
  outH = RECT_H,
  grid = 10
) {
  const [tl, tr, br, bl] = corners;
  const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const top = (t: number) => lerp(tl, tr, t);
  const bot = (t: number) => lerp(bl, br, t);
  const pt = (u: number, v: number) => lerp(top(u), bot(u), v);
  void srcW; void srcH;

  for (let i = 0; i < grid; i++) {
    for (let j = 0; j < grid; j++) {
      const u0 = i / grid, u1 = (i + 1) / grid;
      const v0 = j / grid, v1 = (j + 1) / grid;
      const x0 = u0 * outW, x1 = u1 * outW, y0 = v0 * outH, y1 = v1 * outH;
      drawTri(ctx, src, pt(u0, v0), pt(u1, v0), pt(u0, v1), [x0, y0], [x1, y0], [x0, y1]);
      drawTri(ctx, src, pt(u1, v0), pt(u1, v1), pt(u0, v1), [x1, y0], [x1, y1], [x0, y1]);
    }
  }
}

function drawTri(
  ctx: CanvasRenderingContext2D,
  src: HTMLVideoElement | HTMLCanvasElement,
  s0: Pt, s1: Pt, s2: Pt,
  d0: Pt, d1: Pt, d2: Pt
) {
  // affine map from destination triangle (d0,d1,d2) to source triangle (s0,s1,s2)
  const denom = (d1[0] - d0[0]) * (d2[1] - d0[1]) - (d2[0] - d0[0]) * (d1[1] - d0[1]);
  if (Math.abs(denom) < 1e-6) return;
  const a = ((s1[0] - s0[0]) * (d2[1] - d0[1]) - (s2[0] - s0[0]) * (d1[1] - d0[1])) / denom;
  const b = ((s2[0] - s0[0]) * (d1[0] - d0[0]) - (s1[0] - s0[0]) * (d2[0] - d0[0])) / denom;
  const c = ((s1[1] - s0[1]) * (d2[1] - d0[1]) - (s2[1] - s0[1]) * (d1[1] - d0[1])) / denom;
  const d = ((s2[1] - s0[1]) * (d1[0] - d0[0]) - (s1[1] - s0[1]) * (d2[0] - d0[0])) / denom;
  const e = s0[0] - a * d0[0] - b * d0[1];
  const f = s0[1] - c * d0[0] - d * d0[1];
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(d0[0], d0[1]);
  ctx.lineTo(d1[0], d1[1]);
  ctx.lineTo(d2[0], d2[1]);
  ctx.closePath();
  ctx.clip();
  ctx.transform(a, c, b, d, e, f);
  ctx.drawImage(src, 0, 0);
  ctx.restore();
}

/** Occlusion cue at paper coords (u,v): mean abs luminance difference
 *  between the live rectified view and the clean reference, in a small disc.
 *  High when a finger physically covers/touches the spot. */
export function sampleOcclusion(
  cur: CanvasRenderingContext2D,
  ref: CanvasRenderingContext2D,
  u: number,
  v: number
): number {
  const x = Math.round(u * RECT_W);
  const y = Math.round(v * RECT_H);
  const R = 13;
  try {
    const a = cur.getImageData(Math.max(0, x - R), Math.max(0, y - R), R * 2, R * 2).data;
    const b = ref.getImageData(Math.max(0, x - R), Math.max(0, y - R), R * 2, R * 2).data;
    let sum = 0;
    let n = 0;
    for (let i = 0; i < a.length; i += 16) {
      const la = a[i] * 0.3 + a[i + 1] * 0.55 + a[i + 2] * 0.15;
      const lb = b[i] * 0.3 + b[i + 1] * 0.55 + b[i + 2] * 0.15;
      sum += Math.abs(la - lb);
      n++;
    }
    if (!n) return 0;
    return Math.min(1, sum / n / 52);
  } catch {
    return 0;
  }
}

/** The user's actual ink inside a control's bbox, as an alpha-cutout data URL
 *  for the living twin (panel D8). Dark strokes become ink, paper vanishes. */
export function inkCutout(rect: HTMLCanvasElement, c: Control): string {
  const x = Math.round(c.r[0] * RECT_W);
  const y = Math.round(c.r[1] * RECT_H);
  const w = Math.max(4, Math.round(c.r[2] * RECT_W));
  const h = Math.max(4, Math.round(c.r[3] * RECT_H));
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const octx = out.getContext("2d")!;
  octx.drawImage(rect, x, y, w, h, 0, 0, w, h);
  const img = octx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = d[i] * 0.3 + d[i + 1] * 0.55 + d[i + 2] * 0.15;
    const alpha = Math.min(255, Math.max(0, (205 - lum) * 2.4));
    d[i] = 24; d[i + 1] = 22; d[i + 2] = 30;
    d[i + 3] = alpha;
  }
  octx.putImageData(img, 0, 0);
  return out.toDataURL();
}

export interface InkCandidate {
  r: [number, number, number, number];
}

/** Compare live vs reference rectified views at low res; return the bbox of
 *  new ink outside all known controls, or null. Grid-cell diff + clustering. */
export function findNewInk(
  cur: HTMLCanvasElement,
  ref: HTMLCanvasElement,
  controls: Control[]
): InkCandidate | null {
  const GW = 50, GH = 35;
  const tmp = document.createElement("canvas");
  tmp.width = GW; tmp.height = GH;
  const tctx = tmp.getContext("2d", { willReadFrequently: true })!;
  tctx.drawImage(cur, 0, 0, GW, GH);
  const a = tctx.getImageData(0, 0, GW, GH).data;
  tctx.drawImage(ref, 0, 0, GW, GH);
  const b = tctx.getImageData(0, 0, GW, GH).data;

  const changed: boolean[] = new Array(GW * GH).fill(false);
  for (let i = 0; i < GW * GH; i++) {
    const la = a[i * 4] * 0.3 + a[i * 4 + 1] * 0.55 + a[i * 4 + 2] * 0.15;
    const lb = b[i * 4] * 0.3 + b[i * 4 + 1] * 0.55 + b[i * 4 + 2] * 0.15;
    // new ink = notably DARKER than reference (shadows move both ways; ink only darkens)
    changed[i] = lb - la > 26;
  }
  // mask out known controls (with padding)
  for (const c of controls) {
    const x0 = Math.floor((c.r[0] - 0.02) * GW), x1 = Math.ceil((c.r[0] + c.r[2] + 0.02) * GW);
    const y0 = Math.floor((c.r[1] - 0.02) * GH), y1 = Math.ceil((c.r[1] + c.r[3] + 0.02) * GH);
    for (let y = Math.max(0, y0); y < Math.min(GH, y1); y++)
      for (let x = Math.max(0, x0); x < Math.min(GW, x1); x++) changed[y * GW + x] = false;
  }
  // largest connected cluster (4-neighbourhood BFS)
  const seen = new Array(GW * GH).fill(false);
  let best: number[] = [];
  for (let i = 0; i < GW * GH; i++) {
    if (!changed[i] || seen[i]) continue;
    const stack = [i];
    const cells: number[] = [];
    seen[i] = true;
    while (stack.length) {
      const cur2 = stack.pop()!;
      cells.push(cur2);
      const cx = cur2 % GW, cy = (cur2 / GW) | 0;
      const nb = [cx > 0 ? cur2 - 1 : -1, cx < GW - 1 ? cur2 + 1 : -1, cy > 0 ? cur2 - GW : -1, cy < GH - 1 ? cur2 + GW : -1];
      for (const n of nb) if (n >= 0 && changed[n] && !seen[n]) { seen[n] = true; stack.push(n); }
    }
    if (cells.length > best.length) best = cells;
  }
  if (best.length < 6) return null;
  let x0 = GW, x1 = 0, y0 = GH, y1 = 0;
  for (const i of best) {
    const cx = i % GW, cy = (i / GW) | 0;
    x0 = Math.min(x0, cx); x1 = Math.max(x1, cx);
    y0 = Math.min(y0, cy); y1 = Math.max(y1, cy);
  }
  const r: [number, number, number, number] = [
    x0 / GW,
    y0 / GH,
    (x1 - x0 + 1) / GW,
    (y1 - y0 + 1) / GH,
  ];
  // sanity: a control is between a sticky-note and half the page
  if (r[2] < 0.03 || r[3] < 0.04 || r[2] > 0.5 || r[3] > 0.55) return null;
  return { r };
}

/** Crop a region of the rectified canvas (with margin) as a JPEG data URL
 *  for the VLM micro-patch parse. */
export function cropDataURL(rect: HTMLCanvasElement, r: [number, number, number, number]): string {
  const mx = r[2] * 0.25, my = r[3] * 0.25;
  const x = Math.max(0, (r[0] - mx) * RECT_W);
  const y = Math.max(0, (r[1] - my) * RECT_H);
  const w = Math.min(RECT_W - x, (r[2] + mx * 2) * RECT_W);
  const h = Math.min(RECT_H - y, (r[3] + my * 2) * RECT_H);
  const out = document.createElement("canvas");
  out.width = Math.max(8, Math.round(w));
  out.height = Math.max(8, Math.round(h));
  out.getContext("2d")!.drawImage(rect, x, y, w, h, 0, 0, out.width, out.height);
  return out.toDataURL("image/jpeg", 0.85);
}
