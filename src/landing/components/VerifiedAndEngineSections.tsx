import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Code2, ExternalLink, RotateCcw } from 'lucide-react';
import { classifyFingerGesture } from '../utils/deskState';

const VERIFIED_ROWS = [
  {
    claim: 'Fresh MUTE box, unseen, drawn mid-session',
    result: '20/20 taps silenced the audio, 0 phantom triggers from hovering hands',
  },
  {
    claim: 'Tap-to-sound',
    result: 'tens of milliseconds, measured end to end',
  },
  {
    claim: 'Setup parse',
    result: '6/6 drawn regions found and labelled on a photographed desk',
  },
  {
    claim: 'Drum samples',
    result: 'real recorded acoustic kit, two velocity layers',
  },
] as const;

export function VerifiedSection() {
  return (
    <section
      id="verified"
      className="mx-auto max-w-[1280px] px-5 py-24 sm:px-8 sm:py-32 border-b border-[#FAF6EC]/10"
    >
      <div className="max-w-2xl">
        <p className="font-mono text-xs text-[#B6AFA0]">
          Proof over claims · Measured on real paper
        </p>
        <h2 className="mt-3 font-display text-[clamp(2.25rem,4.5vw,3.75rem)] font-bold leading-[1.02] tracking-[-0.03em] text-[#FAF6EC] text-balance">
          Verified.
        </h2>
        <p className="mt-4 text-base sm:text-lg leading-relaxed text-[#B6AFA0]">
          Every claim on this page is tied to a real test we ran on plain paper under a laptop
          webcam.
        </p>
      </div>

      <div className="mt-12 overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-y border-[#FAF6EC]/18 font-mono text-xs text-[#7C7568]">
              <th scope="col" className="py-4 pr-6 font-medium">
                Test
              </th>
              <th scope="col" className="py-4 font-medium">
                Measured result
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#FAF6EC]/10">
            {VERIFIED_ROWS.map((row) => (
              <tr key={row.claim} className="group hover:bg-[#FAF6EC]/[0.02] transition-colors">
                <td className="py-6 pr-6 align-top font-display text-lg sm:text-xl font-semibold text-[#FAF6EC] sm:w-[44%]">
                  {row.claim}
                </td>
                <td className="py-6 align-top font-mono text-sm sm:text-base leading-relaxed text-[#D7F04A] tabular-nums">
                  {row.result}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

interface TheEngineSectionProps {
  onTapSound: () => void;
}

export function TheEngineSection({ onTapSound }: TheEngineSectionProps) {
  const [tapCycle, setTapCycle] = useState(0);
  const [hoverCycle, setHoverCycle] = useState(0);
  const [tapLit, setTapLit] = useState(true);

  // Pure gesture physics verification readouts
  const tapDecision = classifyFingerGesture([
    { speed: 19, occlusion: 0.08 },
    { speed: 23, occlusion: 0.35 },
    { speed: 0.3, occlusion: 0.88 },
  ]);
  const hoverDecision = classifyFingerGesture([
    { speed: 6.5, occlusion: 0.15 },
    { speed: 7.2, occlusion: 0.52 },
    { speed: 6.1, occlusion: 0.25 },
  ]);

  useEffect(() => {
    setTapLit(false);
    const hitTimer = window.setTimeout(() => {
      setTapLit(true);
    }, 680);
    const resetTimer = window.setTimeout(() => {
      setTapLit(false);
    }, 1600);
    return () => {
      window.clearTimeout(hitTimer);
      window.clearTimeout(resetTimer);
    };
  }, [tapCycle]);

  const replayTap = () => {
    setTapCycle((c) => c + 1);
    window.setTimeout(() => {
      onTapSound();
    }, 680);
  };

  const replayHover = () => {
    setHoverCycle((c) => c + 1);
  };

  return (
    <section
      id="the-engine"
      className="mx-auto max-w-[1280px] px-5 py-24 sm:px-8 sm:py-32 border-b border-[#FAF6EC]/10"
    >
      <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
        <div>
          <p className="font-mono text-xs text-[#FF4B2E]">The engine · Touch detection core</p>
          <h2 className="mt-3 font-display text-[clamp(2.25rem,4.5vw,3.75rem)] font-bold leading-[1.02] tracking-[-0.03em] text-[#FAF6EC] text-balance">
            Hovering never fires.
          </h2>
        </div>

        <p className="text-base sm:text-lg leading-relaxed text-[#B6AFA0]">
          A webcam only sees 2D frames — there is no depth sensor. So a real tap is recognized by
          motion and shadow together: a fast approach that{' '}
          <span className="text-[#FAF6EC] font-medium">stops dead on the ink</span> while your
          fingertip darkens the target spot. Drifting past never triggers a sound.
        </p>
      </div>

      {/* Animated Side-by-Side Physics Comparison */}
      <div className="mt-14 grid gap-8 md:grid-cols-2">
        {/* LEFT: REAL TAP */}
        <div
          data-testid="engine-tap-card"
          data-decision={tapDecision}
          className="rounded-xl border border-[#FAF6EC]/15 bg-[#151310] p-6 sm:p-8"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="font-mono text-xs text-[#D7F04A]">
                REAL TAP · DECISION: {tapDecision.toUpperCase()}
              </span>
              <h3 className="mt-1 font-display text-2xl font-bold text-[#FAF6EC]">
                Fast approach → dead stop → dark spot
              </h3>
            </div>
            <button
              type="button"
              onClick={replayTap}
              aria-label="Replay real tap physics animation"
              className="inline-flex h-10 items-center gap-1.5 rounded-md border border-[#FAF6EC]/20 px-3 text-xs font-medium text-[#FAF6EC] hover:border-[#D7F04A] hover:text-[#D7F04A] whitespace-nowrap cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Replay tap
            </button>
          </div>

          <div className="mt-6 rounded-lg border border-[#FAF6EC]/10 bg-[#0E0D0B] p-5 desk-dot-grid">
            <svg viewBox="0 0 360 175" className="h-auto w-full" aria-hidden="true">
              {/* Paper horizon line */}
              <line x1="20" y1="136" x2="340" y2="136" stroke="#FAF6EC" strokeOpacity="0.25" strokeWidth="1.5" />

              {/* Target ink pad on paper */}
              <rect
                x="140"
                y="124"
                width="80"
                height="24"
                rx="2"
                fill={tapLit ? 'rgba(215, 240, 74, 0.25)' : 'rgba(250, 246, 236, 0.06)'}
                stroke={tapLit ? '#D7F04A' : '#FAF6EC'}
                strokeWidth={tapLit ? '2.5' : '1.5'}
              />
              <text
                x="166"
                y="140"
                fill={tapLit ? '#D7F04A' : '#B6AFA0'}
                fontSize="10"
                fontFamily="JetBrains Mono, monospace"
                fontWeight="600"
              >
                KICK
              </text>

              {/* Dashed downward plunge path */}
              <path
                d="M72 34 Q146 38 180 124"
                fill="none"
                stroke="#D7F04A"
                strokeOpacity="0.45"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />

              {/* Animated fingertip plunging fast and stopping dead */}
              <motion.g
                key={tapCycle}
                initial={{ x: 72, y: 34 }}
                animate={{
                  x: [72, 178, 180, 180],
                  y: [34, 118, 126, 126],
                }}
                transition={{
                  duration: 1.5,
                  times: [0, 0.42, 0.48, 1],
                  ease: ['easeIn', 'easeOut', 'linear'],
                  repeat: Infinity,
                  repeatDelay: 1.1,
                }}
              >
                <circle r="11" fill="#FAF6EC" />
                <circle r="5" fill="#0E0D0B" />
              </motion.g>

              {/* Labels */}
              <text x="26" y="24" fill="#B6AFA0" fontSize="10" fontFamily="JetBrains Mono, monospace">
                v = fast approach
              </text>
              <text x="232" y="106" fill="#D7F04A" fontSize="10" fontFamily="JetBrains Mono, monospace">
                v = 0 (DEAD STOP)
              </text>
              <text x="232" y="120" fill="#D7F04A" fontSize="10" fontFamily="JetBrains Mono, monospace">
                spot darkened → FIRES
              </text>
            </svg>
          </div>

          <p className="mt-4 font-hand text-2xl text-[#D7F04A]">
            stops dead + covers the ink = sound fires in tens of ms.
          </p>
        </div>

        {/* RIGHT: DRIFTING HOVER */}
        <div
          data-testid="engine-hover-card"
          data-decision={hoverDecision}
          className="rounded-xl border border-[#FAF6EC]/15 bg-[#151310] p-6 sm:p-8"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="font-mono text-xs text-[#7C7568]">
                DRIFTING HOVER · DECISION: {hoverDecision.toUpperCase()} (SILENT)
              </span>
              <h3 className="mt-1 font-display text-2xl font-bold text-[#FAF6EC]">
                Steady pass over ink → nothing fires
              </h3>
            </div>
            <button
              type="button"
              onClick={replayHover}
              aria-label="Replay hover physics animation"
              className="inline-flex h-10 items-center gap-1.5 rounded-md border border-[#FAF6EC]/20 px-3 text-xs font-medium text-[#FAF6EC] hover:border-[#FAF6EC]/50 whitespace-nowrap cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Replay hover
            </button>
          </div>

          <div className="mt-6 rounded-lg border border-[#FAF6EC]/10 bg-[#0E0D0B] p-5 desk-dot-grid">
            <svg viewBox="0 0 360 175" className="h-auto w-full" aria-hidden="true">
              {/* Paper horizon line */}
              <line x1="20" y1="136" x2="340" y2="136" stroke="#FAF6EC" strokeOpacity="0.25" strokeWidth="1.5" />

              {/* Target ink pad stays quiet */}
              <rect
                x="140"
                y="124"
                width="80"
                height="24"
                rx="2"
                fill="rgba(250, 246, 236, 0.04)"
                stroke="rgba(250, 246, 236, 0.45)"
                strokeWidth="1.5"
              />
              <text
                x="166"
                y="140"
                fill="#7C7568"
                fontSize="10"
                fontFamily="JetBrains Mono, monospace"
                fontWeight="600"
              >
                MUTE
              </text>

              {/* Smooth drifting hover curve above the paper */}
              <path
                d="M44 68 C126 52, 234 52, 316 68"
                fill="none"
                stroke="#FAF6EC"
                strokeOpacity="0.3"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />

              {/* Animated fingertip drifting smoothly past without stopping */}
              <motion.g
                key={hoverCycle}
                initial={{ x: 44, y: 68 }}
                animate={{
                  x: [44, 180, 316],
                  y: [68, 56, 68],
                }}
                transition={{
                  duration: 2.2,
                  ease: 'easeInOut',
                  repeat: Infinity,
                  repeatDelay: 0.5,
                }}
              >
                <circle r="11" fill="#7C7568" />
                <circle r="5" fill="#0E0D0B" />
              </motion.g>

              <text x="26" y="24" fill="#B6AFA0" fontSize="10" fontFamily="JetBrains Mono, monospace">
                v = steady drift (no stop)
              </text>
              <text x="196" y="108" fill="#7C7568" fontSize="10" fontFamily="JetBrains Mono, monospace">
                0 phantom triggers
              </text>
            </svg>
          </div>

          <p className="mt-4 font-hand text-2xl text-[#B6AFA0]">
            wave your whole hand over MUTE — the track never flinches.
          </p>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="mx-auto max-w-[1280px] px-5 py-16 sm:px-8 sm:py-20">
      <div className="flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-hand text-[clamp(2rem,4vw,3.1rem)] font-bold leading-none text-[#FAF6EC]">
            Draw something. Make it work. Show us.
          </p>
          <p className="mt-4 font-mono text-xs text-[#B6AFA0]">
            DrawAnything · Open source (MIT) · Built for GenHacks 2026
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <a
            href="https://github.com/DhyeyPatel007/drawanything"
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[#FAF6EC]/20 px-4 py-2.5 text-sm font-medium text-[#FAF6EC] hover:border-[#FAF6EC]/60 transition-colors whitespace-nowrap"
          >
            <Code2 className="h-4 w-4 text-[#B6AFA0]" />
            GitHub
          </a>

          <a
            href="https://drawanything-xi.vercel.app"
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[#FF4B2E] px-4 py-2.5 text-sm font-semibold text-[#0E0D0B] hover:bg-[#ff6248] transition-colors whitespace-nowrap"
          >
            Live App
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </footer>
  );
}
