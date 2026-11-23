// MediaPipe HandLandmarker loading + per-frame fingertip extraction.
// Everything runs locally in the browser (panel D1). The model + WASM are
// fetched once from Google's CDN; frames never leave the laptop.

import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

let landmarker: HandLandmarker | null = null;
let loading: Promise<HandLandmarker> | null = null;

export async function getLandmarker(): Promise<HandLandmarker> {
  if (landmarker) return landmarker;
  if (!loading) {
    loading = (async () => {
      const fileset = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm"
      );
      const opts = {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "GPU" as const,
        },
        runningMode: "VIDEO" as const,
        numHands: 2,
        minHandDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      };
      try {
        landmarker = await HandLandmarker.createFromOptions(fileset, opts);
      } catch {
        landmarker = await HandLandmarker.createFromOptions(fileset, {
          ...opts,
          baseOptions: { ...opts.baseOptions, delegate: "CPU" as const },
        });
      }
      return landmarker;
    })();
  }
  return loading;
}

export interface HandTips {
  /** index fingertip in normalized image coords */
  index: { x: number; y: number } | null;
  /** middle fingertip in normalized image coords */
  middle: { x: number; y: number } | null;
  hands: number;
}

export function detectTips(lm: HandLandmarker, video: HTMLVideoElement, tsMs: number): HandTips {
  try {
    const res = lm.detectForVideo(video, tsMs);
    const hands = res.landmarks?.length ?? 0;
    if (!hands) return { index: null, middle: null, hands: 0 };
    const hand = res.landmarks[0];
    const idx = hand[8];
    const mid = hand[12];
    return {
      index: idx ? { x: idx.x, y: idx.y } : null,
      middle: mid ? { x: mid.x, y: mid.y } : null,
      hands,
    };
  } catch {
    return { index: null, middle: null, hands: 0 };
  }
}
