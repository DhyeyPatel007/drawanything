import { useEffect, useState } from 'react';
import { Delete, RotateCw, Volume2, VolumeX } from 'lucide-react';
import {
  applyInkKeystroke,
  bottleCapAngleToCutoffHz,
  moveGameRover,
} from '../utils/deskState';
import type { Direction, DrumPadId, GridPos } from '../utils/deskState';
import { drumEngine } from '../audio/drumEngine';
import { DrawnBoxFrame } from './HandDrawnMarks';

interface TheDeskSectionProps {
  volume: number;
  muted: boolean;
  activePads: Record<DrumPadId, boolean>;
  onTriggerPad: (pad: DrumPadId, velocity?: number) => void;
  onVolumeChange: (volume: number) => void;
}

const INK_LETTERS = ['D', 'R', 'A', 'W', 'I', 'T', 'SPACE'] as const;

export function TheDeskSection({
  volume,
  muted,
  activePads,
  onTriggerPad,
  onVolumeChange,
}: TheDeskSectionProps) {
  // Bottle-cap dial state
  const [dialAngle, setDialAngle] = useState<number>(-20);
  const [synthOn, setSynthOn] = useState<boolean>(false);
  const cutoffHz = bottleCapAngleToCutoffHz(dialAngle);

  // Letter keys typing demo state
  const [typedText, setTypedText] = useState<string>('DRAW');

  // WASD game pad state (5x5 hand-drawn grid)
  const [roverPos, setRoverPos] = useState<GridPos>({ x: 2, y: 2 });
  const [lastDir, setLastDir] = useState<Direction | null>(null);

  useEffect(() => {
    if (muted && synthOn) {
      drumEngine.stopFilterSynth();
      setSynthOn(false);
    }
  }, [muted, synthOn]);

  useEffect(() => {
    return () => {
      drumEngine.stopFilterSynth();
    };
  }, []);

  const handleToggleSynth = () => {
    if (synthOn) {
      drumEngine.stopFilterSynth();
      setSynthOn(false);
    } else {
      if (muted) return;
      drumEngine.startFilterSynth(cutoffHz);
      setSynthOn(true);
    }
  };

  const handleDialChange = (nextAngle: number) => {
    const clamped = Math.max(-135, Math.min(135, nextAngle));
    setDialAngle(clamped);
    const nextHz = bottleCapAngleToCutoffHz(clamped);
    if (synthOn) {
      drumEngine.setFilterCutoff(nextHz);
    }
  };

  const handleTwistCapStep = () => {
    const next = dialAngle >= 120 ? -120 : dialAngle + 45;
    handleDialChange(next);
  };

  const handleKeyPress = (key: string) => {
    setTypedText((prev) => applyInkKeystroke(prev, key, 22));
  };

  const handleWasd = (dir: Direction) => {
    setLastDir(dir);
    setRoverPos((prev) => moveGameRover(prev, dir, 5));
  };

  return (
    <section
      id="the-desk"
      className="mx-auto max-w-[1280px] px-5 py-24 sm:px-8 sm:py-32 border-b border-[#FAF6EC]/10"
    >
      <div className="max-w-2xl">
        <p className="font-mono text-xs text-[#B6AFA0]">
          Five working paper controls · Every module below is live
        </p>
        <h2 className="mt-3 font-display text-[clamp(2.25rem,4.5vw,3.75rem)] font-bold leading-[1.02] tracking-[-0.03em] text-[#FAF6EC] text-balance">
          The Desk.
        </h2>
        <p className="mt-4 text-base sm:text-lg leading-relaxed text-[#B6AFA0]">
          Not just drum pads. Every gesture you can draw with a felt-tip pen maps to real sound,
          continuous modulation, keystrokes, or game input.
        </p>
      </div>

      {/* Asymmetric non-identical studio blocks */}
      <div className="mt-14 space-y-8">
        {/* ROW 1: Wide Acoustic Drum Pads Strip + Tall Synced Volume Slider */}
        <div className="grid gap-8 lg:grid-cols-[1.55fr_0.45fr]">
          {/* 1. DRUM PADS — Wide studio strip */}
          <div className="rounded-xl border border-[#FAF6EC]/14 bg-[#151310] p-6 sm:p-8">
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <div>
                <h3 className="font-display text-2xl font-bold text-[#FAF6EC]">
                  Drum pads — real acoustic kit
                </h3>
                <p className="mt-1.5 text-sm text-[#B6AFA0]">
                  Recorded studio drums with two velocity layers. Tap soft or hit hard.
                </p>
              </div>
              <span className="font-hand text-2xl text-[#D7F04A]">
                real shells, not toy beeps
              </span>
            </div>

            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              {(['kick', 'snare', 'hat', 'tom'] as DrumPadId[]).map((pad, index) => {
                const isLit = activePads[pad] && !muted;
                return (
                  <button
                    key={pad}
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      onTriggerPad(pad, 1);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onTriggerPad(pad, 1);
                      }
                    }}
                    className={`relative flex h-28 flex-col justify-between p-4 text-left cursor-pointer transition-all active:scale-95 ${
                      isLit
                        ? 'bg-[#D7F04A]/18 text-[#D7F04A]'
                        : 'bg-[#0E0D0B] text-[#FAF6EC] hover:bg-[#FAF6EC]/[0.04]'
                    }`}
                  >
                    <DrawnBoxFrame
                      variant={(index % 4) as 0 | 1 | 2 | 3}
                      stroke={isLit ? '#D7F04A' : 'rgba(250,246,236,0.55)'}
                      strokeWidth={isLit ? 2.4 : 1.6}
                    />
                    <span className="font-mono text-[10px] text-[#7C7568]">0{index + 1}</span>
                    <span className="font-display text-xl font-bold uppercase tracking-tight">
                      {pad}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. VOLUME SLIDER — Dedicated vertical fader channel */}
          <div className="flex flex-col justify-between rounded-xl border border-[#FAF6EC]/14 bg-[#151310] p-6 sm:p-7">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl font-bold text-[#FAF6EC]">Volume slider</h3>
                {muted ? (
                  <VolumeX className="h-4 w-4 text-[#FF4B2E]" />
                ) : (
                  <Volume2 className="h-4 w-4 text-[#D7F04A]" />
                )}
              </div>
              <p className="mt-1 text-sm text-[#B6AFA0]">
                Slide a finger along a drawn track to ride master output.
              </p>
            </div>

            <div className="my-6">
              <div className="flex items-baseline justify-between font-mono text-xs mb-3">
                <label htmlFor="desk-volume-fader" className="text-[#7C7568]">
                  MASTER GAIN
                </label>
                <span className="text-lg font-semibold tabular-nums text-[#FAF6EC]">
                  {muted ? '0%' : `${volume}%`}
                </span>
              </div>

              {/* Custom drawn horizontal fader with tick marks */}
              <div className="relative flex h-10 items-center">
                <div className="h-[2px] w-full bg-[#FAF6EC]/25" />
                <div
                  className="absolute left-0 h-[3px] bg-[#D7F04A]"
                  style={{ width: `${muted ? 0 : volume}%` }}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 h-6 w-3.5 -translate-x-1/2 -translate-y-1/2 border-2 border-[#FAF6EC] bg-[#0E0D0B]"
                  style={{ left: `${muted ? 0 : volume}%` }}
                />
                <input
                  id="desk-volume-fader"
                  type="range"
                  min={0}
                  max={100}
                  value={muted ? 0 : volume}
                  onChange={(e) => onVolumeChange(Number(e.target.value))}
                  aria-label="Desk section master volume slider"
                  className="ink-slider absolute inset-0 h-full w-full"
                />
              </div>

              <div className="mt-1 flex justify-between font-mono text-[10px] text-[#7C7568] tabular-nums">
                <span>0</span>
                <span>25</span>
                <span>50</span>
                <span>75</span>
                <span>100</span>
              </div>
            </div>

            <p className="font-hand text-xl text-[#B6AFA0]">synced live with the hero desk</p>
          </div>
        </div>

        {/* ROW 2: Bottle-Cap Dial + Letter Keys + WASD Game Pad (distinct proportions & layouts) */}
        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr_1fr]">
          {/* 3. BOTTLE-CAP DIAL */}
          <div className="flex flex-col justify-between rounded-xl border border-[#FAF6EC]/14 bg-[#151310] p-6 sm:p-7">
            <div>
              <h3 className="font-display text-2xl font-bold text-[#FAF6EC]">Bottle-cap dial</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[#B6AFA0]">
                Drop a real bottle cap inside a drawn circle and twist it to sweep a synth filter.
              </p>
            </div>

            <div className="my-6 flex flex-col items-center">
              <button
                type="button"
                onClick={handleTwistCapStep}
                aria-label="Twist bottle-cap dial to change filter cutoff"
                className="group relative flex h-36 w-36 items-center justify-center rounded-full cursor-pointer focus-visible:outline-2"
              >
                <svg viewBox="0 0 140 140" className="h-36 w-36" aria-hidden="true">
                  {/* Outer hand-drawn circle on paper */}
                  <circle
                    cx="70"
                    cy="70"
                    r="62"
                    fill="none"
                    stroke="rgba(250,246,236,0.3)"
                    strokeWidth="1.5"
                    strokeDasharray="6 4"
                  />
                  {/* Rotatable crimped bottle cap */}
                  <g transform={`rotate(${dialAngle} 70 70)`}>
                    <circle
                      cx="70"
                      cy="70"
                      r="44"
                      fill="#0E0D0B"
                      stroke={synthOn ? '#D7F04A' : '#FAF6EC'}
                      strokeWidth="2.5"
                      strokeDasharray="8 4"
                    />
                    <circle
                      cx="70"
                      cy="70"
                      r="34"
                      fill="none"
                      stroke={synthOn ? '#D7F04A' : 'rgba(250,246,236,0.4)'}
                      strokeWidth="1.5"
                    />
                    {/* Sharpie notch line on top of cap */}
                    <line
                      x1="70"
                      y1="70"
                      x2="70"
                      y2="30"
                      stroke="#FF4B2E"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                  </g>
                </svg>
              </button>

              <div className="mt-4 w-full">
                <div className="flex items-center justify-between font-mono text-xs mb-1.5">
                  <label htmlFor="bottle-cap-cutoff" className="text-[#7C7568]">
                    LPF CUTOFF
                  </label>
                  <span
                    data-testid="dial-cutoff-readout"
                    className={`tabular-nums font-semibold ${
                      synthOn ? 'text-[#D7F04A]' : 'text-[#FAF6EC]'
                    }`}
                  >
                    {cutoffHz} Hz
                  </span>
                </div>
                <input
                  id="bottle-cap-cutoff"
                  type="range"
                  min={-135}
                  max={135}
                  value={dialAngle}
                  onChange={(e) => handleDialChange(Number(e.target.value))}
                  aria-label="Bottle cap filter sweep angle"
                  className="w-full accent-[#D7F04A] cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleToggleSynth}
                disabled={muted}
                aria-pressed={synthOn}
                className={`inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                  synthOn
                    ? 'bg-[#D7F04A] text-[#0E0D0B]'
                    : 'border border-[#FAF6EC]/25 text-[#FAF6EC] hover:border-[#D7F04A]'
                }`}
              >
                <RotateCw className="h-3.5 w-3.5" />
                {muted ? 'Unmute to hear synth' : synthOn ? 'Stop filter synth' : 'Hear filter sweep'}
              </button>
              <span className="font-hand text-lg text-[#B6AFA0]">twist the cap</span>
            </div>
          </div>

          {/* 4. LETTER KEYS — Types real characters into a paper strip */}
          <div className="flex flex-col justify-between rounded-xl border border-[#FAF6EC]/14 bg-[#151310] p-6 sm:p-7">
            <div>
              <h3 className="font-display text-2xl font-bold text-[#FAF6EC]">
                Letter keys — type for real
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[#B6AFA0]">
                Draw boxes with letters inside. Tapping the ink sends real keystrokes to your
                laptop.
              </p>
            </div>

            <div className="my-6">
              {/* Live output strip */}
              <div
                data-testid="letter-keys-output"
                className="flex min-h-12 items-center justify-between rounded-md border border-[#FAF6EC]/18 bg-[#0E0D0B] px-4 py-2.5 font-mono text-base tracking-wider text-[#D7F04A]"
              >
                <span className="truncate">
                  {typedText || <span className="text-[#7C7568]">tap keys below...</span>}
                  <span aria-hidden="true" className="ml-0.5 inline-block h-4 w-2 bg-[#D7F04A]/80 align-middle" />
                </span>
                <button
                  type="button"
                  onClick={() => handleKeyPress('BACKSPACE')}
                  aria-label="Backspace typed ink letter"
                  className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded text-[#B6AFA0] hover:bg-[#FAF6EC]/10 hover:text-[#FAF6EC] cursor-pointer"
                >
                  <Delete className="h-4 w-4" />
                </button>
              </div>

              {/* Drawn Keycaps */}
              <div className="mt-4 flex flex-wrap gap-2">
                {INK_LETTERS.map((letter) => (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => handleKeyPress(letter)}
                    className={`relative flex h-12 items-center justify-center border border-[#FAF6EC]/40 bg-[#0E0D0B] font-mono text-sm font-semibold text-[#FAF6EC] hover:border-[#D7F04A] hover:text-[#D7F04A] active:scale-95 transition-all cursor-pointer ${
                      letter === 'SPACE' ? 'px-5 flex-1 min-w-[92px]' : 'w-12'
                    }`}
                  >
                    {letter === 'SPACE' ? 'SPACE' : letter}
                  </button>
                ))}
              </div>
            </div>

            <p className="font-hand text-xl text-[#B6AFA0]">
              ink taps straight into your active window
            </p>
          </div>

          {/* 5. WASD GAME PAD — Drives a live ink rover on a 5x5 paper grid */}
          <div className="flex flex-col justify-between rounded-xl border border-[#FAF6EC]/14 bg-[#151310] p-6 sm:p-7">
            <div>
              <h3 className="font-display text-2xl font-bold text-[#FAF6EC]">WASD game pad</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[#B6AFA0]">
                Draw four directional boxes on paper and steer a game right under the camera.
              </p>
            </div>

            <div className="my-5 flex items-center justify-between gap-5">
              {/* Mini 5x5 paper grid */}
              <div
                data-testid="wasd-rover-grid"
                data-pos={`${roverPos.x},${roverPos.y}`}
                className="grid grid-cols-5 gap-1 rounded-md border border-[#FAF6EC]/15 bg-[#0E0D0B] p-2.5"
                aria-label={`Game rover at column ${roverPos.x + 1}, row ${roverPos.y + 1}`}
              >
                {Array.from({ length: 25 }).map((_, idx) => {
                  const x = idx % 5;
                  const y = Math.floor(idx / 5);
                  const isRover = roverPos.x === x && roverPos.y === y;
                  return (
                    <div
                      key={idx}
                      className={`h-5 w-5 rounded-[2px] border transition-colors ${
                        isRover
                          ? 'border-[#D7F04A] bg-[#D7F04A]'
                          : 'border-[#FAF6EC]/12 bg-transparent'
                      }`}
                    />
                  );
                })}
              </div>

              {/* Drawn WASD cluster */}
              <div className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleWasd('W')}
                  aria-label="Move up W"
                  className={`flex h-11 w-11 items-center justify-center border font-mono text-sm font-bold cursor-pointer active:scale-95 transition-colors ${
                    lastDir === 'W'
                      ? 'border-[#D7F04A] bg-[#D7F04A]/18 text-[#D7F04A]'
                      : 'border-[#FAF6EC]/40 bg-[#0E0D0B] text-[#FAF6EC] hover:border-[#D7F04A]'
                  }`}
                >
                  W
                </button>
                <div className="flex gap-1.5">
                  {(['A', 'S', 'D'] as Direction[]).map((dir) => (
                    <button
                      key={dir}
                      type="button"
                      onClick={() => handleWasd(dir)}
                      aria-label={`Move ${dir === 'A' ? 'left' : dir === 'S' ? 'down' : 'right'} ${dir}`}
                      className={`flex h-11 w-11 items-center justify-center border font-mono text-sm font-bold cursor-pointer active:scale-95 transition-colors ${
                        lastDir === dir
                          ? 'border-[#D7F04A] bg-[#D7F04A]/18 text-[#D7F04A]'
                          : 'border-[#FAF6EC]/40 bg-[#0E0D0B] text-[#FAF6EC] hover:border-[#D7F04A]'
                      }`}
                    >
                      {dir}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between font-mono text-xs text-[#7C7568] tabular-nums">
              <span className="font-hand text-xl text-[#B6AFA0]">paper drives the sprite</span>
              <span>
                ({roverPos.x}, {roverPos.y})
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
