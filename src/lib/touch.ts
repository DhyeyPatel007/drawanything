// Touch-vs-hover state machine — panel Round 3 winning method (VISUAL-ONLY).
// Per Luna's final spec: IDLE -> APPROACH -> CONTACT -> RELEASE, short state
// threshold + hysteresis, no fixed multi-frame dwell, no acoustic trigger.
// Visual cues (Gemini's, kept): fingertip position in paper coordinates,
// in-plane speed (a real tap decelerates to a stop), and the contact
// occlusion value O in [0..1] — how much the small patch under the fingertip
// darkens vs the clean reference (finger physically covering/touching ink
// and paper reads high; a hovering finger reads low).

import type { Control } from "./types";

export interface TipSample {
  /** ms timestamp */
  t: number;
  /** fingertip in normalized paper coords, or null when no hand is visible */
  tip: { u: number; v: number } | null;
  /** occlusion cue at the fingertip, 0..1 */
  occ: number;
  /** in-plane speed, paper-units per second */
  speed: number;
}

export type TouchEvent =
  | { type: "down"; control: Control; velocity: number; t: number }
  | { type: "up"; control: Control; t: number }
  | { type: "move"; control: Control; value: number; angle?: number; t: number };

type CState = "idle" | "approach" | "contact";

interface CTrack {
  state: CState;
  approachSince: number;
  peakSpeed: number;
  peakOcc: number;
  lowFrames: number;
  lastFire: number;
}

const EXPAND = 0.02;

function inside(r: [number, number, number, number], u: number, v: number, pad: number) {
  return u >= r[0] - pad && u <= r[0] + r[2] + pad && v >= r[1] - pad && v <= r[1] + r[3] + pad;
}

export class TouchEngine {
  private tracks = new Map<string, CTrack>();
  private controls: Control[];
  onEvent: ((e: TouchEvent) => void) | null = null;

  constructor(controls: Control[]) {
    this.controls = controls;
  }

  setControls(controls: Control[]) {
    this.controls = controls;
    // keep tracks for surviving controls so a hot-swap doesn't drop a held key
    const ids = new Set(controls.map((c) => c.id));
    for (const id of [...this.tracks.keys()]) if (!ids.has(id)) this.tracks.delete(id);
  }

  reset() {
    this.tracks.clear();
  }

  private track(c: Control): CTrack {
    let tr = this.tracks.get(c.id);
    if (!tr) {
      tr = { state: "idle", approachSince: 0, peakSpeed: 0, peakOcc: 0, lowFrames: 0, lastFire: -Infinity };
      this.tracks.set(c.id, tr);
    }
    return tr;
  }

  /** Is any control currently in CONTACT? (used to gate new-ink detection) */
  anyContact(): boolean {
    for (const tr of this.tracks.values()) if (tr.state === "contact") return true;
    return false;
  }

  stateOf(id: string): CState {
    return this.tracks.get(id)?.state ?? "idle";
  }

  frame(s: TipSample) {
    for (const c of this.controls) {
      const tr = this.track(c);
      const tip = s.tip;
      const inExp = tip ? inside(c.r, tip.u, tip.v, EXPAND) : false;
      const inBox = tip ? inside(c.r, tip.u, tip.v, 0) : false;

      if (tr.state === "idle") {
        if (inExp && tip) {
          tr.state = "approach";
          tr.approachSince = s.t;
          tr.peakSpeed = s.speed;
          tr.peakOcc = s.occ;
          tr.lowFrames = 0;
        }
        continue;
      }

      if (tr.state === "approach") {
        if (!inExp) {
          tr.state = "idle";
          continue;
        }
        tr.peakSpeed = Math.max(tr.peakSpeed, s.speed);
        tr.peakOcc = Math.max(tr.peakOcc, s.occ);
        // CONTACT when the finger stops on the paper (tap signature:
        // fast approach, abrupt stop, strong occlusion) OR presses firmly
        // (very strong occlusion even at low speed).
        const stopped = tr.peakSpeed > 1.1 && s.speed < 0.55;
        const firmPress = s.occ > 0.8 && s.speed < 0.8;
        if (inBox && s.occ >= 0.55 && (stopped || firmPress)) {
          tr.state = "contact";
          tr.lowFrames = 0;
          const velocity = Math.min(1, Math.max(0.35, tr.peakOcc * 0.7 + Math.min(0.5, tr.peakSpeed / 6)));
          if (s.t - tr.lastFire > 90) {
            tr.lastFire = s.t;
            this.onEvent?.({ type: "down", control: c, velocity, t: s.t });
          }
          this.emitMove(c, s);
        }
        continue;
      }

      // contact
      if (!tip || !inExp || s.occ < 0.3) {
        tr.lowFrames++;
        if (tr.lowFrames >= 2) {
          tr.state = "idle";
          this.onEvent?.({ type: "up", control: c, t: s.t });
        }
        continue;
      }
      tr.lowFrames = 0;
      this.emitMove(c, s);
    }
  }

  private emitMove(c: Control, s: TipSample) {
    if (!s.tip) return;
    if (c.k === "sld") {
      const [x, y, w, h] = c.r;
      const value = c.o === "h"
        ? Math.min(1, Math.max(0, (s.tip.u - x) / w))
        : Math.min(1, Math.max(0, 1 - (s.tip.v - y) / h));
      this.onEvent?.({ type: "move", control: c, value, t: s.t });
    } else if (c.k === "dial") {
      const cx = c.r[0] + c.r[2] / 2;
      const cy = c.r[1] + c.r[3] / 2;
      const angle = Math.atan2(s.tip.v - cy, s.tip.u - cx);
      this.onEvent?.({ type: "move", control: c, value: 0, angle, t: s.t });
    }
  }
}
