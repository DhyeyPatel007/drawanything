// Real bottle-cap tracker — polish panel verdict P1 (BUILD), method as
// converged in Round 2: sample a radial intensity ring from the rectified
// dial patch, circularly cross-correlate (ZNCC) against the FIXED reference
// ring captured at lock — never frame-to-frame (drifts), never fingertip
// angle (jumps). Gates: corr >= 0.72, winning peak must beat the strongest
// competing peak (outside ±20°) by >= 0.15, fingertip must not be inside
// 0.75R, and the jump from the last accepted absolute angle must be <= 40°
// (relaxed after >500 ms of occlusion). On any gate failure the last valid
// angle is held silently. Strictly additive: this never touches touch.

import { RECT_W, RECT_H } from "./ink";
import type { Control } from "./types";

const BINS = 180; // 2 degrees per bin

export function sampleRing(img: ImageData, cx: number, cy: number, R: number): Float32Array {
  const out = new Float32Array(BINS);
  const radii = [0.42, 0.5, 0.58, 0.66];
  for (let b = 0; b < BINS; b++) {
    const th = (b / BINS) * Math.PI * 2;
    let sum = 0;
    for (const rf of radii) {
      const x = Math.round(cx + Math.cos(th) * R * rf);
      const y = Math.round(cy + Math.sin(th) * R * rf);
      if (x < 0 || y < 0 || x >= img.width || y >= img.height) {
        sum += 235;
        continue;
      }
      const i = (y * img.width + x) * 4;
      sum += img.data[i] * 0.3 + img.data[i + 1] * 0.55 + img.data[i + 2] * 0.15;
    }
    out[b] = sum / radii.length;
  }
  return out;
}

function zncc(a: Float32Array, b: Float32Array, shift: number): number {
  let ma = 0, mb = 0;
  for (let i = 0; i < BINS; i++) {
    ma += a[i];
    mb += b[(i + shift) % BINS];
  }
  ma /= BINS; mb /= BINS;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < BINS; i++) {
    const xa = a[i] - ma;
    const xb = b[(i + shift) % BINS] - mb;
    num += xa * xb;
    da += xa * xa;
    db += xb * xb;
  }
  const den = Math.sqrt(da * db);
  return den < 1e-6 ? 0 : num / den;
}

export interface CapReading {
  /** accumulated rotation in degrees (unwrapped, can exceed ±360) */
  totalDeg: number;
  /** dial value 0..1 (centre = lock orientation) */
  norm: number;
  corr: number;
}

export class CapTracker {
  private ref: Float32Array | null = null;
  private cx = 0;
  private cy = 0;
  private R = 0;
  private lastAbsDeg: number | null = null;
  private totalDeg = 0;
  private norm = 0.5;
  private occludedSince: number | null = null;

  captureReference(canvas: HTMLCanvasElement, c: Control) {
    const x = Math.floor(c.r[0] * RECT_W);
    const y = Math.floor(c.r[1] * RECT_H);
    const w = Math.ceil(c.r[2] * RECT_W);
    const h = Math.ceil(c.r[3] * RECT_H);
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    const img = ctx.getImageData(x, y, w, h);
    this.cx = w / 2;
    this.cy = h / 2;
    this.R = Math.min(w, h) / 2;
    this.ref = sampleRing(img, this.cx, this.cy, this.R);
    this.lastAbsDeg = 0; // the reference orientation IS angle zero
    this.totalDeg = 0;
    this.norm = 0.5;
    this.occludedSince = null;
  }

  /** Returns a reading when a new absolute angle is accepted, else null
   *  (hold the last value). `fingerNear` = a fingertip is inside 0.75R. */
  update(canvas: HTMLCanvasElement, c: Control, fingerNear: boolean, now: number): CapReading | null {
    if (!this.ref) return null;
    if (fingerNear) {
      if (this.occludedSince === null) this.occludedSince = now;
      return null;
    }
    const x = Math.floor(c.r[0] * RECT_W);
    const y = Math.floor(c.r[1] * RECT_H);
    const w = Math.ceil(c.r[2] * RECT_W);
    const h = Math.ceil(c.r[3] * RECT_H);
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    let img: ImageData;
    try {
      img = ctx.getImageData(x, y, w, h);
    } catch {
      return null;
    }
    const live = sampleRing(img, this.cx, this.cy, this.R);

    // best + competing peaks over all circular shifts
    let bestShift = 0;
    let corr1 = -2;
    const corrs = new Float32Array(BINS);
    for (let s = 0; s < BINS; s++) {
      corrs[s] = zncc(this.ref, live, s);
      if (corrs[s] > corr1) {
        corr1 = corrs[s];
        bestShift = s;
      }
    }
    let corr2 = -2;
    for (let s = 0; s < BINS; s++) {
      const d = Math.min(Math.abs(s - bestShift), BINS - Math.abs(s - bestShift));
      if (d > 10 && corrs[s] > corr2) corr2 = corrs[s];
    }
    if (corr1 < 0.72 || corr1 - corr2 < 0.15) {
      if (this.occludedSince === null) this.occludedSince = now;
      return null;
    }
    // zncc(ref, live, shift) aligns live[(i+shift)] with ref[i]: if the cap's
    // mark moved from bin 0 to bin k, the peak sits at shift = k, i.e. the
    // cap rotated by +shift bins in image space (clockwise as seen on screen).
    let absDeg = bestShift * 2;
    if (absDeg > 180) absDeg -= 360;
    if (absDeg <= -180) absDeg += 360;

    if (this.lastAbsDeg !== null) {
      let delta = absDeg - this.lastAbsDeg;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      const occludedLong = this.occludedSince !== null && now - this.occludedSince > 500;
      if (Math.abs(delta) > 40 && !occludedLong) {
        return null;
      }
      this.totalDeg += delta;
    }
    this.lastAbsDeg = absDeg;
    this.occludedSince = null;
    const target = Math.min(1, Math.max(0, 0.5 + this.totalDeg / 540)); // ±270° sweep
    this.norm += (target - this.norm) * 0.55;
    return { totalDeg: this.totalDeg, norm: this.norm, corr: corr1 };
  }
}
