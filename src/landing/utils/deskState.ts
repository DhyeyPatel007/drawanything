export type DrumPadId = 'kick' | 'snare' | 'hat' | 'tom';

export interface DeskAudioState {
  volume: number; // 0..100
  muted: boolean;
  groovePlaying: boolean;
  hitCounts: Record<DrumPadId, number>;
  lastHit: DrumPadId | null;
}

export const INITIAL_DESK_STATE: DeskAudioState = {
  volume: 82,
  muted: false,
  groovePlaying: false,
  hitCounts: {
    kick: 0,
    snare: 0,
    hat: 0,
    tom: 0,
  },
  lastHit: null,
};

export function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * Converts a 0..100 slider value and mute flag into linear Web Audio gain.
 * Uses a gentle perceptual power curve so mid-slider positions feel natural.
 */
export function volumeToGain(volume: number, muted: boolean): number {
  if (muted) return 0;
  const normalized = clampVolume(volume) / 100;
  return Number(Math.pow(normalized, 1.5).toFixed(4));
}

export function toggleMuteState(state: DeskAudioState): DeskAudioState {
  const nextMuted = !state.muted;
  return {
    ...state,
    muted: nextMuted,
    groovePlaying: nextMuted ? false : state.groovePlaying,
  };
}

export function setVolumeState(state: DeskAudioState, nextVolume: number): DeskAudioState {
  const clamped = clampVolume(nextVolume);
  return {
    ...state,
    volume: clamped,
    muted: clamped === 0 ? true : state.muted && clamped > 0 ? false : state.muted,
  };
}

export function recordPadHit(state: DeskAudioState, pad: DrumPadId): DeskAudioState {
  return {
    ...state,
    lastHit: pad,
    hitCounts: {
      ...state.hitCounts,
      [pad]: state.hitCounts[pad] + 1,
    },
  };
}

/**
 * Maps a bottle-cap dial angle (-135deg to +135deg) logarithmically
 * to a resonant synth low-pass filter cutoff frequency (180Hz to 4200Hz).
 */
export function bottleCapAngleToCutoffHz(angleDeg: number): number {
  const clamped = Math.max(-135, Math.min(135, angleDeg));
  const t = (clamped + 135) / 270; // 0..1
  const minHz = 180;
  const maxHz = 4200;
  return Math.round(minHz * Math.pow(maxHz / minHz, t));
}

export function applyInkKeystroke(current: string, key: string, maxLength = 28): string {
  if (key === 'BACKSPACE') {
    return current.slice(0, -1);
  }
  if (key === 'CLEAR') {
    return '';
  }
  const addition = key === 'SPACE' ? ' ' : key;
  if (current.length + addition.length > maxLength) {
    return (current + addition).slice(-maxLength);
  }
  return current + addition;
}

export type Direction = 'W' | 'A' | 'S' | 'D';

export interface GridPos {
  x: number;
  y: number;
}

export function moveGameRover(pos: GridPos, dir: Direction, gridSize = 5): GridPos {
  const max = Math.max(0, gridSize - 1);
  switch (dir) {
    case 'W':
      return { x: pos.x, y: Math.max(0, pos.y - 1) };
    case 'S':
      return { x: pos.x, y: Math.min(max, pos.y + 1) };
    case 'A':
      return { x: Math.max(0, pos.x - 1), y: pos.y };
    case 'D':
      return { x: Math.min(max, pos.x + 1), y: pos.y };
  }
}

export interface FingerSample {
  /** Normalized approach speed in pixels/frame (0 = dead stop, >= 14 = fast approach) */
  speed: number;
  /** Fraction of target ink region occluded/darkened by fingertip (0..1) */
  occlusion: number;
}

export type GestureDecision = 'tap' | 'hover' | 'idle';

/**
 * Pure model of DrawAnything's touch-vs-hover detector:
 * A real tap requires a fast approach followed by a dead stop while the fingertip
 * darkens/occludes the ink spot. Drifting steadily over the spot is a hover and never fires.
 */
export function classifyFingerGesture(samples: FingerSample[]): GestureDecision {
  if (samples.length < 3) return 'idle';

  let sawFastApproach = false;
  let sawDeadStopWithOcclusion = false;
  let sawDriftOverInk = false;

  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    if (s.speed >= 14) {
      sawFastApproach = true;
    }
    if (sawFastApproach && s.speed <= 1.5 && s.occlusion >= 0.55) {
      sawDeadStopWithOcclusion = true;
    }
    if (s.speed > 2 && s.speed < 14 && s.occlusion >= 0.25) {
      sawDriftOverInk = true;
    }
  }

  if (sawFastApproach && sawDeadStopWithOcclusion) {
    return 'tap';
  }
  if (sawDriftOverInk || samples.some((s) => s.occlusion > 0.15)) {
    return 'hover';
  }
  return 'idle';
}

export type CornerId = 'tl' | 'tr' | 'br' | 'bl';

export const CALIBRATION_CORNERS: readonly CornerId[] = ['tl', 'tr', 'br', 'bl'] as const;

export function toggleCalibrationCorner(active: CornerId[], corner: CornerId): CornerId[] {
  if (active.includes(corner)) {
    return active.filter((c) => c !== corner);
  }
  return [...active, corner];
}

export function isSheetCalibrated(active: CornerId[]): boolean {
  return CALIBRATION_CORNERS.every((c) => active.includes(c));
}

export const DEMO_GROOVE_STEPS: ReadonlyArray<ReadonlyArray<DrumPadId>> = [
  ['kick', 'hat'],
  ['hat'],
  ['snare', 'hat'],
  ['hat'],
  ['kick', 'hat'],
  ['kick'],
  ['snare', 'hat'],
  ['tom', 'hat'],
];
