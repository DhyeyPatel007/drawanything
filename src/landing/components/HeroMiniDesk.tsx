import { motion } from 'motion/react';
import { Square, Volume2, VolumeX } from 'lucide-react';
import type { DeskAudioState, DrumPadId } from '../utils/deskState';
import { DrawnBoxFrame, HandUnderline, MarginArrowRight } from './HandDrawnMarks';

interface HeroMiniDeskProps {
  deskState: DeskAudioState;
  activePads: Record<DrumPadId, boolean>;
  sampleSource: 'idle' | 'acoustic' | 'synth';
  onTriggerPad: (pad: DrumPadId) => void;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  onToggleGroove: () => void;
  onOpenScan: () => void;
  deskRef: React.RefObject<HTMLDivElement | null>;
}

const DRUM_PADS: ReadonlyArray<{
  id: DrumPadId;
  label: string;
  keyHint: string;
  note: string;
  variant: 0 | 1 | 2 | 3;
}> = [
  { id: 'kick', label: 'KICK', keyHint: 'A', note: 'low thump', variant: 0 },
  { id: 'snare', label: 'SNARE', keyHint: 'S', note: 'crack', variant: 1 },
  { id: 'hat', label: 'HAT', keyHint: 'D', note: 'tight chick', variant: 2 },
  { id: 'tom', label: 'TOM', keyHint: 'F', note: 'high tom', variant: 3 },
];

export function HeroMiniDesk({
  deskState,
  activePads,
  sampleSource,
  onTriggerPad,
  onVolumeChange,
  onToggleMute,
  onToggleGroove,
  onOpenScan,
  deskRef,
}: HeroMiniDeskProps) {
  const totalHits =
    deskState.hitCounts.kick +
    deskState.hitCounts.snare +
    deskState.hitCounts.hat +
    deskState.hitCounts.tom;

  return (
    <section
      id="top"
      className="relative mx-auto max-w-[1280px] px-5 pt-10 pb-16 sm:px-8 sm:pt-14 lg:pt-16 lg:pb-24"
    >
      <div className="grid items-center gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14">
        {/* Left: Giant Display Headline + Subline + Two Action Buttons */}
        <div className="relative">
          <p className="font-mono text-xs text-[#B6AFA0]">
            GenHacks 2026 · Plain A4 paper · Laptop webcam
          </p>

          <h1 className="mt-4 font-display text-[clamp(3.25rem,7vw,5.75rem)] font-bold leading-[0.95] tracking-[-0.035em] text-[#FAF6EC] text-balance">
            Draw it.
            <br />
            <span className="relative inline-block text-[#FF4B2E]">
              It works.
              <HandUnderline className="pointer-events-none absolute -bottom-2.5 left-0 h-5 w-full sm:-bottom-3 sm:h-6" />
            </span>
          </h1>

          <p className="mt-8 max-w-lg text-lg leading-relaxed text-[#B6AFA0] sm:text-[1.15rem]">
            Draw a control desk on plain paper. Scan it once with your phone. The ink works — live,
            under your laptop webcam.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={onToggleGroove}
              aria-pressed={deskState.groovePlaying}
              className={`inline-flex min-h-12 items-center gap-2.5 rounded-md px-6 py-3 text-sm font-semibold whitespace-nowrap transition-all cursor-pointer active:scale-[0.98] ${
                deskState.groovePlaying
                  ? 'bg-[#D7F04A] text-[#0E0D0B] hover:bg-[#e1f56b]'
                  : 'bg-[#FF4B2E] text-[#0E0D0B] hover:bg-[#ff6248]'
              }`}
            >
              {deskState.groovePlaying ? (
                <>
                  <Square className="h-3.5 w-3.5 fill-current" />
                  Stop live beat
                </>
              ) : (
                '▶ Play on this laptop'
              )}
            </button>

            <button
              type="button"
              onClick={onOpenScan}
              className="inline-flex min-h-12 items-center gap-2 rounded-md border border-[#FAF6EC]/25 bg-transparent px-6 py-3 text-sm font-medium text-[#FAF6EC] whitespace-nowrap hover:border-[#FAF6EC]/60 hover:bg-[#FAF6EC]/5 transition-all cursor-pointer active:scale-[0.98]"
            >
              📷 Scan a drawing
            </button>
          </div>

          {/* Handwritten margin annotation pointing to the playable desk */}
          <div className="mt-9 hidden lg:flex items-center gap-3 text-[#D7F04A]">
            <span className="font-hand text-[1.65rem] leading-none -rotate-2">
              tap this. it thumps.
            </span>
            <MarginArrowRight className="h-9 w-24 text-[#D7F04A]/85" />
          </div>
        </div>

        {/* Right: THE PLAYABLE MINI DESK */}
        <div ref={deskRef} className="relative" data-testid="hero-mini-desk" data-last-hit={deskState.lastHit ?? 'none'} data-muted={String(deskState.muted)}>
          {/* Mobile margin note above desk */}
          <div className="mb-2 flex items-center justify-between lg:hidden">
            <span className="font-hand text-2xl text-[#D7F04A] -rotate-1">
              tap this. it thumps.
            </span>
            <span className="font-mono text-[11px] text-[#7C7568] tabular-nums">
              {totalHits} hits
            </span>
          </div>

          <div className="relative rounded-xl border border-[#FAF6EC]/15 bg-[#151310] p-5 sm:p-7 desk-dot-grid">
            {/* Corner registration marks (paper homography frame) */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-2.5 left-2.5 h-3.5 w-3.5 border-t-2 border-l-2 border-[#FAF6EC]/40"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-2.5 right-2.5 h-3.5 w-3.5 border-t-2 border-r-2 border-[#FAF6EC]/40"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-2.5 left-2.5 h-3.5 w-3.5 border-b-2 border-l-2 border-[#FAF6EC]/40"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-2.5 right-2.5 h-3.5 w-3.5 border-b-2 border-r-2 border-[#FAF6EC]/40"
            />

            {/* Top desk margin metadata (unboxed clean text) */}
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-[#B6AFA0]">
              <span>A4 Sheet · Live Mini Desk</span>
              <span className="tabular-nums text-[#7C7568]">
                {deskState.muted
                  ? 'Audio muted'
                  : sampleSource === 'acoustic'
                    ? 'Acoustic kit ready'
                    : 'Keys A S D F · M mute'}
              </span>
            </div>

            {/* Main drawn layout: 2x2 drum pads + right column volume slider & MUTE box */}
            <div className="grid gap-4 sm:grid-cols-[1fr_148px]">
              {/* 4 Hand-Drawn Drum Pads */}
              <div className="grid grid-cols-2 gap-3.5 sm:gap-4">
                {DRUM_PADS.map((pad) => {
                  const isLive = activePads[pad.id];
                  const hits = deskState.hitCounts[pad.id];

                  return (
                    <motion.button
                      key={pad.id}
                      type="button"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        onTriggerPad(pad.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onTriggerPad(pad.id);
                        }
                      }}
                      animate={
                        isLive
                          ? { scale: 0.94 }
                          : { scale: 1 }
                      }
                      transition={{ duration: 0.09, ease: [0.16, 1, 0.3, 1] }}
                      aria-label={`Play ${pad.label} drum pad`}
                      className={`group relative flex min-h-[118px] sm:min-h-[132px] flex-col justify-between p-4 text-left select-none cursor-pointer transition-colors ${
                        isLive && !deskState.muted
                          ? 'bg-[#D7F04A]/18 text-[#D7F04A]'
                          : 'bg-[#0E0D0B]/70 text-[#FAF6EC] hover:bg-[#FAF6EC]/[0.04]'
                      }`}
                    >
                      <DrawnBoxFrame
                        variant={pad.variant}
                        stroke={isLive && !deskState.muted ? '#D7F04A' : '#FAF6EC'}
                        strokeWidth={isLive && !deskState.muted ? 2.6 : 1.75}
                        className="opacity-85 transition-opacity group-hover:opacity-100"
                      />

                      <div className="relative z-10 flex items-center justify-between">
                        <span className="font-mono text-[11px] text-[#7C7568] group-hover:text-[#B6AFA0]">
                          [{pad.keyHint}]
                        </span>
                        <span
                          className={`font-mono text-[11px] tabular-nums ${
                            isLive && !deskState.muted ? 'text-[#D7F04A]' : 'text-[#7C7568]'
                          }`}
                        >
                          {hits > 0 ? `${hits}×` : pad.note}
                        </span>
                      </div>

                      <div className="relative z-10">
                        <span
                          className={`block font-display text-2xl sm:text-[1.65rem] font-bold tracking-tight ${
                            isLive && !deskState.muted ? 'text-[#D7F04A]' : 'text-[#FAF6EC]'
                          }`}
                        >
                          {pad.label}
                        </span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Right Column: Volume Slider + Drawn MUTE Box */}
              <div className="flex flex-row gap-3.5 sm:flex-col sm:justify-between">
                {/* Hand-drawn Volume Slider */}
                <div className="relative flex flex-1 flex-col justify-between bg-[#0E0D0B]/70 p-4">
                  <DrawnBoxFrame stroke="rgba(250,246,236,0.45)" strokeWidth={1.5} variant={2} />

                  <div className="relative z-10 flex items-center justify-between gap-2">
                    <label
                      htmlFor="hero-volume-slider"
                      className="flex items-center gap-1.5 font-mono text-[11px] text-[#B6AFA0]"
                    >
                      {deskState.muted ? (
                        <VolumeX className="h-3.5 w-3.5 text-[#FF4B2E]" />
                      ) : (
                        <Volume2 className="h-3.5 w-3.5 text-[#D7F04A]" />
                      )}
                      VOL
                    </label>
                    <span className="font-mono text-xs font-medium tabular-nums text-[#FAF6EC]">
                      {deskState.muted ? '0%' : `${deskState.volume}%`}
                    </span>
                  </div>

                  {/* Horizontal hand-inked slider track */}
                  <div className="relative z-10 my-4 flex items-center">
                    <div className="relative h-6 w-full flex items-center">
                      {/* Drawn track line */}
                      <div className="h-[2px] w-full bg-[#FAF6EC]/25" />
                      {/* Active fill */}
                      <div
                        className="absolute left-0 h-[3px] bg-[#D7F04A] transition-all duration-75"
                        style={{ width: `${deskState.muted ? 0 : deskState.volume}%` }}
                      />
                      {/* Hand-drawn fader block */}
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute top-1/2 h-5 w-3 -translate-x-1/2 -translate-y-1/2 border-2 border-[#FAF6EC] bg-[#0E0D0B]"
                        style={{ left: `${deskState.muted ? 0 : deskState.volume}%` }}
                      />
                      <input
                        id="hero-volume-slider"
                        type="range"
                        min={0}
                        max={100}
                        value={deskState.muted ? 0 : deskState.volume}
                        onChange={(e) => onVolumeChange(Number(e.target.value))}
                        aria-label="Master desk volume"
                        className="ink-slider absolute inset-0 h-full w-full"
                      />
                    </div>
                  </div>

                  <p className="relative z-10 font-hand text-lg leading-none text-[#B6AFA0]">
                    ride the fader
                  </p>
                </div>

                {/* Hand-drawn MUTE Box */}
                <button
                  type="button"
                  onClick={onToggleMute}
                  aria-pressed={deskState.muted}
                  aria-label={deskState.muted ? 'Unmute desk audio' : 'Mute desk audio'}
                  className={`relative flex min-h-[96px] flex-1 sm:flex-none flex-col items-center justify-center p-4 transition-colors cursor-pointer active:scale-[0.97] ${
                    deskState.muted
                      ? 'bg-[#FF4B2E]/15 text-[#FF4B2E]'
                      : 'bg-[#0E0D0B]/70 text-[#FAF6EC] hover:bg-[#FF4B2E]/10'
                  }`}
                >
                  <DrawnBoxFrame
                    stroke={deskState.muted ? '#FF4B2E' : '#FAF6EC'}
                    strokeWidth={deskState.muted ? 2.4 : 1.75}
                    variant={3}
                  />
                  <span className="relative z-10 font-display text-xl font-bold tracking-tight">
                    MUTE
                  </span>
                  <span className="relative z-10 mt-1 font-mono text-[11px] text-[#B6AFA0]">
                    {deskState.muted ? 'SILENCED' : '[M] kill sound'}
                  </span>
                  {deskState.muted && (
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <span className="-rotate-12 border-2 border-[#FF4B2E] bg-[#0E0D0B]/95 px-2.5 py-0.5 font-mono text-xs font-bold tracking-widest text-[#FF4B2E]">
                        MUTED
                      </span>
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Bottom handwritten margin note */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#FAF6EC]/10 pt-3.5">
              <p className="font-hand text-xl text-[#B6AFA0]">
                real recorded drum samples — try hitting KICK + SNARE fast
              </p>
              <span className="font-mono text-[11px] text-[#7C7568] tabular-nums">
                {totalHits} {totalHits === 1 ? 'tap' : 'taps'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
