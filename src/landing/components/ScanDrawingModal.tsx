import { useEffect, useState } from 'react';
import { Check, Copy, ExternalLink, ScanLine, X } from 'lucide-react';

interface ScanDrawingModalProps {
  open: boolean;
  onClose: () => void;
}

const DETECTED_REGIONS = [
  { id: 'kick', label: 'KICK', type: 'drum pad', x: 8, y: 12, w: 32, h: 32 },
  { id: 'snare', label: 'SNARE', type: 'drum pad', x: 44, y: 12, w: 32, h: 32 },
  { id: 'hat', label: 'HAT', type: 'drum pad', x: 8, y: 50, w: 32, h: 32 },
  { id: 'tom', label: 'TOM', type: 'drum pad', x: 44, y: 50, w: 32, h: 32 },
  { id: 'vol', label: 'VOL', type: 'slider', x: 82, y: 12, w: 11, h: 48 },
  { id: 'mute', label: 'MUTE', type: 'kill switch', x: 80, y: 66, w: 14, h: 16 },
] as const;

// Deterministic minimalist QR-style handoff visual matrix (21x21)
const QR_ROWS = [
  '111111101010101111111',
  '100000100110001000001',
  '101110101101101011101',
  '101110100010101011101',
  '101110101011001011101',
  '100000101100101000001',
  '111111101010101111111',
  '000000001101000000000',
  '101101110110111010110',
  '010010001001000101001',
  '110111101110110110101',
  '001001010011001001110',
  '101110111010110111001',
  '000000001011010010110',
  '111111100100111001011',
  '100000101101001110100',
  '101110101011100101011',
  '101110100110011011100',
  '101110101101101100111',
  '100000100010100011001',
  '111111101101011101010',
];

export function ScanDrawingModal({ open, onClose }: ScanDrawingModalProps) {
  const [scanPhase, setScanPhase] = useState<'parsed' | 'qr'>('parsed');
  const [selectedRegion, setSelectedRegion] = useState<string>('kick');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const liveUrl = 'https://drawanything-xi.vercel.app';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(liveUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="scan-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl rounded-xl border border-[#FAF6EC]/15 bg-[#141310] p-6 sm:p-8 text-[#FAF6EC]">
        <div className="flex items-start justify-between gap-4 border-b border-[#FAF6EC]/10 pb-4">
          <div>
            <p className="font-mono text-xs text-[#B6AFA0]">
              Phone scan · One-time setup · Phone goes away
            </p>
            <h2
              id="scan-modal-title"
              className="mt-1 font-display text-2xl font-bold tracking-tight text-[#FAF6EC]"
            >
              Scan a drawing into your laptop
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close scan preview dialog"
            className="flex h-10 w-10 items-center justify-center rounded-md border border-[#FAF6EC]/15 text-[#B6AFA0] hover:border-[#FAF6EC]/40 hover:text-[#FAF6EC] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mode switch */}
        <div className="mt-5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setScanPhase('parsed')}
            className={`rounded-md px-3.5 py-2 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
              scanPhase === 'parsed'
                ? 'bg-[#D7F04A] text-[#0E0D0B]'
                : 'border border-[#FAF6EC]/15 text-[#B6AFA0] hover:text-[#FAF6EC]'
            }`}
          >
            1. AI Layout Parse (6/6 regions)
          </button>
          <button
            type="button"
            onClick={() => setScanPhase('qr')}
            className={`rounded-md px-3.5 py-2 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
              scanPhase === 'qr'
                ? 'bg-[#D7F04A] text-[#0E0D0B]'
                : 'border border-[#FAF6EC]/15 text-[#B6AFA0] hover:text-[#FAF6EC]'
            }`}
          >
            2. QR Handoff to Laptop
          </button>
        </div>

        {scanPhase === 'parsed' ? (
          <div className="mt-5 grid gap-5 sm:grid-cols-[1.35fr_1fr]">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-[#FAF6EC]/15 bg-[#0E0D0B] desk-dot-grid p-3">
              {DETECTED_REGIONS.map((region) => {
                const isSelected = selectedRegion === region.id;
                return (
                  <button
                    key={region.id}
                    type="button"
                    onClick={() => setSelectedRegion(region.id)}
                    style={{
                      left: `${region.x}%`,
                      top: `${region.y}%`,
                      width: `${region.w}%`,
                      height: `${region.h}%`,
                    }}
                    className={`absolute flex flex-col items-center justify-center rounded-sm border transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-[#D7F04A] bg-[#D7F04A]/15 text-[#D7F04A]'
                        : 'border-[#FAF6EC]/35 bg-[#FAF6EC]/[0.03] text-[#FAF6EC]/85 hover:border-[#D7F04A]/70'
                    }`}
                  >
                    <span className="font-mono text-[10px] font-semibold tracking-wider">
                      {region.label}
                    </span>
                  </button>
                );
              })}
              <span className="pointer-events-none absolute bottom-2 left-3 font-hand text-base text-[#D7F04A]">
                click any parsed box
              </span>
            </div>

            <div className="flex flex-col justify-between gap-4">
              <div>
                <p className="font-mono text-xs text-[#D7F04A]">6/6 regions detected</p>
                <p className="mt-2 text-sm leading-relaxed text-[#B6AFA0]">
                  Snap one photo of your A4 sheet with your phone. AI reads each hand-drawn box,
                  slider track, and label, then packs the coordinates into a single QR code for your
                  laptop webcam.
                </p>
                <div className="mt-4 border-t border-[#FAF6EC]/10 pt-3">
                  <p className="font-mono text-xs text-[#7C7568]">Selected region</p>
                  <p className="mt-1 font-display text-lg font-semibold text-[#FAF6EC]">
                    {DETECTED_REGIONS.find((r) => r.id === selectedRegion)?.label}{' '}
                    <span className="font-mono text-xs font-normal text-[#B6AFA0]">
                      — {DETECTED_REGIONS.find((r) => r.id === selectedRegion)?.type}
                    </span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setScanPhase('qr')}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#FAF6EC] px-4 py-2.5 text-xs font-semibold text-[#0E0D0B] hover:bg-[#D7F04A] transition-colors cursor-pointer"
              >
                <ScanLine className="h-3.5 w-3.5" />
                Next: QR handoff
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-5 grid gap-6 sm:grid-cols-[180px_1fr] items-center">
            <div className="mx-auto rounded-lg border border-[#FAF6EC]/20 bg-[#FAF6EC] p-3">
              <svg
                viewBox="0 0 21 21"
                className="h-36 w-36"
                role="img"
                aria-label="Layout handoff QR schematic"
              >
                {QR_ROWS.map((row, y) =>
                  row.split('').map((cell, x) =>
                    cell === '1' ? (
                      <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#0E0D0B" />
                    ) : null
                  )
                )}
              </svg>
            </div>

            <div>
              <p className="font-hand text-2xl text-[#D7F04A]">
                hold QR up to the webcam, then put the phone away.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[#B6AFA0]">
                The scanner lives on the live DrawAnything app. Open it on your phone to photograph
                your sheet and hand the layout straight to your laptop — no accounts, no cloud sync.
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <a
                  href="#/scan"
                  className="inline-flex items-center gap-2 rounded-md bg-[#FF4B2E] px-4 py-2.5 text-xs font-semibold text-[#0E0D0B] hover:bg-[#ff6248] transition-colors whitespace-nowrap"
                >
                  Open live scanner
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-2 rounded-md border border-[#FAF6EC]/20 px-4 py-2.5 text-xs font-medium text-[#FAF6EC] hover:border-[#FAF6EC]/50 transition-colors whitespace-nowrap cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-[#D7F04A]" />
                      Link copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy live app URL
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
