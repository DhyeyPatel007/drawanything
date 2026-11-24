import { useState } from 'react';
import { motion } from 'motion/react';
import { Play, RotateCcw, VolumeX } from 'lucide-react';
import {
  CALIBRATION_CORNERS,
  isSheetCalibrated,
  toggleCalibrationCorner,
} from '../utils/deskState';
import type { CornerId } from '../utils/deskState';
import { DrawnBoxFrame, MarginArrowDown } from './HandDrawnMarks';

interface TryAndMomentProps {
  muted: boolean;
  groovePlaying: boolean;
  onToggleMute: () => void;
  onStartGroove: () => void;
  onScrollToDesk: () => void;
}

const MARQUEE_PHRASES = [
  'NO APP TO INSTALL',
  'NO SPECIAL PAPER',
  'JUST A PEN',
  'DRAW IT. IT WORKS.',
];

const CORNER_COORDS: Record<CornerId, { label: string; x: string; y: string }> = {
  tl: { label: 'Mark top-left corner', x: '16%', y: '18%' },
  tr: { label: 'Mark top-right corner', x: '84%', y: '14%' },
  br: { label: 'Mark bottom-right corner', x: '88%', y: '82%' },
  bl: { label: 'Mark bottom-left corner', x: '12%', y: '86%' },
};

export function MarqueeTicker() {
  const repeated = [...MARQUEE_PHRASES, ...MARQUEE_PHRASES, ...MARQUEE_PHRASES];

  return (
    <div
      aria-label="Key product highlights"
      className="marquee-container overflow-hidden border-y border-[#FAF6EC]/12 bg-[#141210] py-4 select-none"
    >
      <div className="marquee-track">
        {[0, 1].map((dup) => (
          <div key={dup} aria-hidden={dup === 1} className="flex shrink-0 items-center">
            {repeated.map((phrase, idx) => (
              <span
                key={`${dup}-${idx}`}
                className="inline-flex items-center font-display text-sm sm:text-base font-semibold tracking-[0.08em] text-[#FAF6EC]"
              >
                <span className="px-5">{phrase}</span>
                <span className="text-[#FF4B2E]" aria-hidden="true">
                  ✳
                </span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function TryItSection({ onScrollToDesk }: { onScrollToDesk: () => void }) {
  const [corners, setCorners] = useState<CornerId[]>(['tl', 'tr']);
  const calibrated = isSheetCalibrated(corners);

  const handleCornerClick = (id: CornerId) => {
    setCorners((prev) => toggleCalibrationCorner(prev, id));
  };

  return (
    <section
      id="try-it"
      className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28 border-b border-[#FAF6EC]/10"
    >
      <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
        <div>
          <p className="font-mono text-xs text-[#B6AFA0]">
            Judge path · 2 minutes · Zero hardware
          </p>
          <h2 className="mt-3 font-display text-[clamp(2.25rem,4.5vw,3.75rem)] font-bold leading-[1.02] tracking-[-0.03em] text-[#FAF6EC] text-balance">
            No drawing? No problem.
          </h2>
          <p className="mt-4 max-w-xl text-base sm:text-lg leading-relaxed text-[#B6AFA0]">
            No install, no account, no marker on the table. Anyone can test DrawAnything in two
            minutes with a blank sheet of printer paper.
          </p>
        </div>

        <div className="flex lg:justify-end">
          <button
            type="button"
            onClick={onScrollToDesk}
            className="inline-flex items-center gap-2 rounded-md border border-[#FAF6EC]/25 px-5 py-3 text-sm font-medium text-[#FAF6EC] hover:border-[#D7F04A] hover:text-[#D7F04A] transition-colors whitespace-nowrap cursor-pointer"
          >
            Jump back to the live mini desk ↑
          </button>
        </div>
      </div>

      {/* 3 Editorial Steps + Interactive 4-Corner Calibration Toy */}
      <div className="mt-14 grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14 items-start">
        <ol className="divide-y divide-[#FAF6EC]/10 border-y border-[#FAF6EC]/10">
          <li className="grid grid-cols-[56px_1fr] gap-4 py-7">
            <span className="font-mono text-sm font-semibold text-[#FF4B2E] tabular-nums">01</span>
            <div>
              <h3 className="font-display text-xl sm:text-2xl font-semibold text-[#FAF6EC]">
                Open the demo desk on this laptop.
              </h3>
              <p className="mt-2 text-sm sm:text-base leading-relaxed text-[#B6AFA0]">
                The browser loads a built-in drum and slider layout immediately — no phone scan
                needed to start testing.
              </p>
            </div>
          </li>

          <li className="grid grid-cols-[56px_1fr] gap-4 py-7">
            <span className="font-mono text-sm font-semibold text-[#FF4B2E] tabular-nums">02</span>
            <div>
              <h3 className="font-display text-xl sm:text-2xl font-semibold text-[#FAF6EC]">
                Click the 4 corners of any sheet of paper in the camera view.
              </h3>
              <p className="mt-2 text-sm sm:text-base leading-relaxed text-[#B6AFA0]">
                Prop any sheet facing the webcam and click its four corners once. Homography warps
                the tilted paper flat in real time.
              </p>
            </div>
          </li>

          <li className="grid grid-cols-[56px_1fr] gap-4 py-7">
            <span className="font-mono text-sm font-semibold text-[#FF4B2E] tabular-nums">03</span>
            <div>
              <h3 className="font-display text-xl sm:text-2xl font-semibold text-[#FAF6EC]">
                Tap the matching spots on the paper — it plays.
              </h3>
              <p className="mt-2 text-sm sm:text-base leading-relaxed text-[#B6AFA0]">
                Hit the paper where the pad sits on screen. The drums thump live with real recorded
                samples.
              </p>
              <p className="mt-2 font-hand text-xl text-[#D7F04A]">
                plain printer paper works. even a blank receipt.
              </p>
            </div>
          </li>
        </ol>

        {/* Interactive Step 2 Miniature Homography Preview */}
        <div
          className="relative rounded-xl border border-[#FAF6EC]/15 bg-[#151310] p-5 sm:p-6"
          data-testid="corner-calibration-demo"
          data-calibrated={String(calibrated)}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono text-xs text-[#B6AFA0]">
              Interactive step 2 · Click all 4 corners
            </p>
            <span
              className={`font-mono text-xs tabular-nums ${
                calibrated ? 'text-[#D7F04A]' : 'text-[#7C7568]'
              }`}
            >
              {corners.length}/4 locked
            </span>
          </div>

          <div className="relative mt-4 aspect-[4/3] w-full overflow-hidden rounded-lg border border-[#FAF6EC]/12 bg-[#0E0D0B] desk-dot-grid">
            {/* Tilted paper polygon inside webcam view */}
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 h-full w-full"
            >
              <polygon
                points="16,18 84,14 88,82 12,86"
                fill={calibrated ? 'rgba(215, 240, 74, 0.08)' : 'rgba(250, 246, 236, 0.03)'}
                stroke={calibrated ? '#D7F04A' : 'rgba(250, 246, 236, 0.35)'}
                strokeWidth="0.8"
                strokeDasharray={calibrated ? 'none' : '2 2'}
              />
              {calibrated && (
                <>
                  <line x1="50" y1="16" x2="50" y2="84" stroke="rgba(215,240,74,0.35)" strokeWidth="0.5" />
                  <line x1="14" y1="52" x2="86" y2="48" stroke="rgba(215,240,74,0.35)" strokeWidth="0.5" />
                </>
              )}
            </svg>

            {/* Center label inside the paper sheet */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
              <span
                className={`font-display text-sm sm:text-base font-semibold ${
                  calibrated ? 'text-[#D7F04A]' : 'text-[#7C7568]'
                }`}
              >
                {calibrated ? 'Paper plane locked — ready to tap' : 'Click the remaining corners'}
              </span>
            </div>

            {/* 4 Interactive Corner Targets */}
            {CALIBRATION_CORNERS.map((id) => {
              const isMarked = corners.includes(id);
              const coord = CORNER_COORDS[id];
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleCornerClick(id)}
                  aria-pressed={isMarked}
                  aria-label={coord.label}
                  style={{ left: coord.x, top: coord.y }}
                  className={`absolute flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 transition-transform cursor-pointer hover:scale-110 ${
                    isMarked
                      ? 'border-[#D7F04A] bg-[#D7F04A] text-[#0E0D0B]'
                      : 'border-[#FF4B2E] bg-[#0E0D0B] text-[#FAF6EC]'
                  }`}
                >
                  <span className="font-mono text-[10px] font-bold uppercase">{id}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <p className="font-hand text-xl text-[#B6AFA0]">
              {calibrated ? 'homography locked. tap anywhere on the sheet.' : 'tap the red corner rings'}
            </p>
            <button
              type="button"
              onClick={() => setCorners([])}
              className="inline-flex items-center gap-1.5 font-mono text-xs text-[#7C7568] hover:text-[#FAF6EC] cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function TheMomentSection({
  muted,
  groovePlaying,
  onToggleMute,
  onStartGroove,
}: Omit<TryAndMomentProps, 'onScrollToDesk'>) {
  return (
    <section
      id="the-moment"
      className="mx-auto max-w-[1280px] px-5 py-24 sm:px-8 sm:py-32 border-b border-[#FAF6EC]/10"
    >
      <div className="grid gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        {/* Left: Big Caveat Headline + 4-Beat Sequence */}
        <div>
          <p className="font-mono text-xs text-[#FF4B2E]">The killer moment · Mid-session ink</p>

          <h2 className="mt-3 font-hand text-[clamp(3.1rem,6.5vw,5.25rem)] font-bold leading-[0.94] text-[#FAF6EC] text-balance">
            draw a box. silence the room.
          </h2>

          <p className="mt-5 max-w-xl text-base sm:text-lg leading-relaxed text-[#B6AFA0]">
            Halfway through a live track, grab your pen and sketch a brand-new{' '}
            <span className="font-mono text-sm text-[#FAF6EC]">MUTE</span> rectangle onto empty
            paper. No rescanning. No touching your phone.
          </p>

          <ol className="mt-10 space-y-6 border-t border-[#FAF6EC]/10 pt-8">
            {[
              {
                step: '01',
                title: 'You draw MUTE mid-song',
                detail: 'Sketch one new box directly onto the propped-up sheet while the drums keep playing.',
              },
              {
                step: '02',
                title: 'The camera sees new ink',
                detail: 'The webcam spots the fresh pen strokes on the warped sheet and reads the new label.',
              },
              {
                step: '03',
                title: 'It comes alive in seconds',
                detail: 'The control binds to master gain automatically — highlighted live on your desk.',
              },
              {
                step: '04',
                title: 'Tap it, everything stops',
                detail: 'One fast tap kills the audio dead. 20/20 taps, zero phantom triggers from hovering hands.',
              },
            ].map((item) => (
              <li key={item.step} className="grid grid-cols-[40px_1fr] gap-4">
                <span className="font-mono text-xs font-semibold text-[#D7F04A] pt-1 tabular-nums">
                  {item.step}
                </span>
                <div>
                  <h3 className="font-display text-lg font-semibold text-[#FAF6EC]">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-[#B6AFA0]">{item.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Right: Interactive Drawn MUTE Box synced to Hero Desk Audio */}
        <div className="relative flex flex-col items-center">
          <div className="mb-3 flex items-center gap-2 text-[#D7F04A]">
            <span className="font-hand text-2xl -rotate-2">
              {muted ? 'room silenced. tap again to unmute.' : 'click this box to kill the hero desk audio'}
            </span>
            <MarginArrowDown className="h-11 w-8 text-[#D7F04A]" />
          </div>

          <div className="relative w-full max-w-md rounded-xl border border-[#FAF6EC]/15 bg-[#151310] p-7 sm:p-10 desk-dot-grid">
            <div className="flex items-center justify-between font-mono text-xs text-[#7C7568] mb-6">
              <span>Live link to Hero Desk</span>
              <span className={muted ? 'text-[#FF4B2E]' : groovePlaying ? 'text-[#D7F04A]' : 'text-[#B6AFA0]'}>
                {muted ? 'MUTED' : groovePlaying ? 'BEAT PLAYING' : 'AUDIO ARMED'}
              </span>
            </div>

            <motion.button
              type="button"
              onClick={onToggleMute}
              whileTap={{ scale: 0.95 }}
              aria-pressed={muted}
              data-testid="moment-mute-box"
              className={`relative flex h-52 w-full flex-col items-center justify-center transition-colors cursor-pointer select-none ${
                muted
                  ? 'bg-[#FF4B2E]/12 text-[#FF4B2E]'
                  : 'bg-[#0E0D0B] text-[#FAF6EC] hover:bg-[#D7F04A]/[0.07]'
              }`}
            >
              <DrawnBoxFrame
                stroke={muted ? '#FF4B2E' : '#D7F04A'}
                strokeWidth={muted ? 3 : 2.5}
                variant={0}
              />

              <span
                className={`font-hand text-5xl sm:text-6xl font-bold tracking-wide transition-opacity ${
                  muted ? 'opacity-35' : 'opacity-100'
                }`}
              >
                MUTE
              </span>
              <span
                className={`font-mono text-xs text-[#B6AFA0] ${
                  muted ? 'absolute bottom-3.5' : 'mt-2'
                }`}
              >
                {muted ? 'Click to restore sound' : 'Tap to silence hero desk'}
              </span>

              {/* Bold diagonal MUTED stamp */}
              {muted && (
                <motion.div
                  initial={{ scale: 1.45, opacity: 0, rotate: -14 }}
                  animate={{ scale: 1, opacity: 1, rotate: -9 }}
                  transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  className="pointer-events-none absolute inset-0 flex items-center justify-center pb-4"
                >
                  <div className="border-[3px] border-[#FF4B2E] bg-[#0E0D0B]/95 px-6 py-2 font-display text-3xl font-bold tracking-[0.18em] text-[#FF4B2E]">
                    MUTED
                  </div>
                </motion.div>
              )}
            </motion.button>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#FAF6EC]/10 pt-4">
              {!groovePlaying ? (
                <button
                  type="button"
                  onClick={onStartGroove}
                  className="inline-flex items-center gap-2 rounded-md border border-[#FAF6EC]/20 px-3.5 py-2 text-xs font-medium text-[#FAF6EC] hover:border-[#D7F04A] hover:text-[#D7F04A] transition-colors cursor-pointer"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  Start hero drums to test kill
                </button>
              ) : (
                <span className="inline-flex items-center gap-2 font-mono text-xs text-[#D7F04A]">
                  <VolumeX className="h-3.5 w-3.5" />
                  Drums live — hit MUTE above
                </span>
              )}

              <span className="font-mono text-xs text-[#7C7568] tabular-nums">
                20/20 taps · 0 phantoms
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
