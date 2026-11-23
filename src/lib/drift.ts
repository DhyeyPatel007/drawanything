// Sheet-drift monitor — polish panel verdict P3 (BUILD), read-only.
// For each sheet edge, sample a short luminance profile PERPENDICULAR to the
// edge in the raw camera frame (half desk, half paper — the edge line lives
// inside the profile) and average along the edge. Compare with the lock-time
// reference by ZNCC: if the sheet shifts, the edge line moves inside the
// profile and correlation collapses. Edges whose reference profile has too
// little contrast (paper on a white desk) are excluded from voting.
// This never changes the homography — it only raises a warning.

import type { Pt } from "./homography";

const PROFILE_LEN = 17; // samples perpendicular to the edge
const IN_START = -7; // px outside the sheet
const POINTS = 24; // samples along each edge

export function zncc1d(a: Float32Array, b: Float32Array): number {
  const n = Math.min(a.length, b.length);
  let ma = 0, mb = 0;
  for (let i = 0; i < n; i++) {
    ma += a[i];
    mb += b[i];
  }
  ma /= n; mb /= n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    const xa = a[i] - ma;
    const xb = b[i] - mb;
    num += xa * xb;
    da += xa * xa;
    db += xb * xb;
  }
  const den = Math.sqrt(da * db);
  return den < 1e-6 ? 0 : num / den;
}

function edgeProfiles(img: ImageData, corners: Pt[]): Float32Array[] {
  const lum = (x: number, y: number): number => {
    const xi = Math.max(0, Math.min(img.width - 1, Math.round(x)));
    const yi = Math.max(0, Math.min(img.height - 1, Math.round(y)));
    const i = (yi * img.width + xi) * 4;
    return img.data[i] * 0.3 + img.data[i + 1] * 0.55 + img.data[i + 2] * 0.15;
  };
  const profiles: Float32Array[] = [];
  for (let e = 0; e < 4; e++) {
    const p0 = corners[e];
    const p1 = corners[(e + 1) % 4];
    // inward normal: rotate edge direction by +90°, orient toward centroid
    const dx = p1[0] - p0[0];
    const dy = p1[1] - p0[1];
    const len = Math.hypot(dx, dy) || 1;
    let nx = -dy / len;
    let ny = dx / len;
    const cx = (corners[0][0] + corners[2][0]) / 2;
    const cy = (corners[0][1] + corners[2][1]) / 2;
    const mx = (p0[0] + p1[0]) / 2;
    const my = (p0[1] + p1[1]) / 2;
    if ((cx - mx) * nx + (cy - my) * ny < 0) {
      nx = -nx;
      ny = -ny;
    }
    const prof = new Float32Array(PROFILE_LEN);
    for (let k = 0; k < POINTS; k++) {
      const t = (k + 0.5) / POINTS;
      const ex = p0[0] + dx * t;
      const ey = p0[1] + dy * t;
      for (let j = 0; j < PROFILE_LEN; j++) {
        const off = IN_START + j;
        prof[j] += lum(ex + nx * off, ey + ny * off);
      }
    }
    for (let j = 0; j < PROFILE_LEN; j++) prof[j] /= POINTS;
    profiles.push(prof);
  }
  return profiles;
}

function contrast(p: Float32Array): number {
  const sorted = [...p].sort((a, b) => a - b);
  const p10 = sorted[Math.floor(sorted.length * 0.1)];
  const p90 = sorted[Math.floor(sorted.length * 0.9)];
  return (p90 - p10) / 255;
}

export class DriftMonitor {
  private ref: Float32Array[] | null = null;
  private active: boolean[] = [false, false, false, false];

  setReference(img: ImageData, corners: Pt[]) {
    this.ref = edgeProfiles(img, corners);
    this.active = this.ref.map((p) => contrast(p) >= 0.15);
  }

  activeEdges(): number {
    return this.active.filter(Boolean).length;
  }

  /** true when the sheet appears to have moved. */
  check(img: ImageData, corners: Pt[]): boolean {
    if (!this.ref) return false;
    const cur = edgeProfiles(img, corners);
    const activeIdx = this.active.map((a, i) => (a ? i : -1)).filter((i) => i >= 0);
    if (activeIdx.length === 0) return false;
    let low = 0;
    for (const i of activeIdx) {
      if (zncc1d(this.ref[i], cur[i]) < 0.78) low++;
    }
    return activeIdx.length < 2 ? low >= 1 : low >= 2;
  }
}
