
function DrawDeskVisual() {
  return (
    <svg
      viewBox="0 0 460 240"
      fill="none"
      role="img"
      aria-label="Hand-drawn A4 sheet with drum pads, volume slider, bottle-cap dial, and WASD keys"
      className="h-auto w-full"
    >
      {/* A4 paper outline */}
      <path
        d="M28 20 C150 17, 310 18, 432 22 C434 90, 433 162, 430 220 C306 222, 152 221, 26 218 C25 152, 26 86, 28 20 Z"
        stroke="#FAF6EC"
        strokeWidth="1.6"
        strokeOpacity="0.45"
        fill="#0E0D0B"
      />
      {/* 4 drawn drum pads */}
      <rect x="46" y="38" width="76" height="58" rx="3" stroke="#FAF6EC" strokeWidth="1.8" />
      <text x="64" y="72" fill="#FAF6EC" fontSize="13" fontFamily="Space Grotesk, sans-serif" fontWeight="700">
        KICK
      </text>
      <rect x="134" y="38" width="76" height="58" rx="3" stroke="#FAF6EC" strokeWidth="1.8" />
      <text x="148" y="72" fill="#FAF6EC" fontSize="13" fontFamily="Space Grotesk, sans-serif" fontWeight="700">
        SNARE
      </text>
      <rect x="46" y="108" width="76" height="58" rx="3" stroke="#FAF6EC" strokeWidth="1.8" />
      <text x="69" y="142" fill="#FAF6EC" fontSize="13" fontFamily="Space Grotesk, sans-serif" fontWeight="700">
        HAT
      </text>
      <rect x="134" y="108" width="76" height="58" rx="3" stroke="#FAF6EC" strokeWidth="1.8" />
      <text x="155" y="142" fill="#FAF6EC" fontSize="13" fontFamily="Space Grotesk, sans-serif" fontWeight="700">
        TOM
      </text>

      {/* Drawn Slider Track */}
      <line x1="248" y1="42" x2="248" y2="164" stroke="#FAF6EC" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="238" y1="88" x2="258" y2="88" stroke="#D7F04A" strokeWidth="3.5" strokeLinecap="round" />
      <text x="234" y="186" fill="#B6AFA0" fontSize="10" fontFamily="JetBrains Mono, monospace">
        VOL
      </text>

      {/* Drawn Circle Dial */}
      <circle cx="332" cy="76" r="30" stroke="#FAF6EC" strokeWidth="1.8" strokeDasharray="5 3" />
      <line x1="332" y1="76" x2="352" y2="58" stroke="#FF4B2E" strokeWidth="2.4" strokeLinecap="round" />
      <text x="314" y="122" fill="#B6AFA0" fontSize="10" fontFamily="JetBrains Mono, monospace">
        FILTER
      </text>

      {/* Drawn WASD cluster */}
      <rect x="318" y="138" width="24" height="22" stroke="#FAF6EC" strokeWidth="1.4" />
      <text x="325" y="153" fill="#FAF6EC" fontSize="10" fontFamily="JetBrains Mono, monospace">W</text>
      <rect x="290" y="164" width="24" height="22" stroke="#FAF6EC" strokeWidth="1.4" />
      <text x="298" y="179" fill="#FAF6EC" fontSize="10" fontFamily="JetBrains Mono, monospace">A</text>
      <rect x="318" y="164" width="24" height="22" stroke="#FAF6EC" strokeWidth="1.4" />
      <text x="326" y="179" fill="#FAF6EC" fontSize="10" fontFamily="JetBrains Mono, monospace">S</text>
      <rect x="346" y="164" width="24" height="22" stroke="#FAF6EC" strokeWidth="1.4" />
      <text x="354" y="179" fill="#FAF6EC" fontSize="10" fontFamily="JetBrains Mono, monospace">D</text>

      {/* Handwritten annotation */}
      <text x="48" y="202" fill="#D7F04A" fontSize="19" fontFamily="Caveat, cursive">
        any ballpoint pen. no ruler needed.
      </text>
    </svg>
  );
}

function ScanOnceVisual() {
  return (
    <svg
      viewBox="0 0 460 240"
      fill="none"
      role="img"
      aria-label="Phone photo scanned by AI into a QR code handoff, after which the phone goes away"
      className="h-auto w-full"
    >
      {/* Phone outline */}
      <rect x="28" y="42" width="84" height="148" rx="12" stroke="#FAF6EC" strokeWidth="1.8" fill="#0E0D0B" />
      <rect x="38" y="58" width="64" height="104" stroke="#FAF6EC" strokeOpacity="0.35" strokeWidth="1.2" />
      {/* Mini parsed boxes inside phone */}
      <rect x="44" y="68" width="22" height="20" stroke="#D7F04A" strokeWidth="1.4" />
      <rect x="72" y="68" width="22" height="20" stroke="#D7F04A" strokeWidth="1.4" />
      <rect x="44" y="94" width="22" height="20" stroke="#D7F04A" strokeWidth="1.4" />
      <rect x="72" y="94" width="22" height="20" stroke="#D7F04A" strokeWidth="1.4" />
      <text x="42" y="148" fill="#D7F04A" fontSize="9" fontFamily="JetBrains Mono, monospace">
        6/6 OK
      </text>

      {/* Hand-drawn arrow 1 */}
      <path d="M126 116 C146 106, 166 106, 184 114" stroke="#FAF6EC" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M176 108 L186 114 L176 121" stroke="#FAF6EC" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />

      {/* QR Code block */}
      <rect x="198" y="66" width="96" height="96" rx="4" stroke="#D7F04A" strokeWidth="2" fill="#0E0D0B" />
      {/* Simplified geometric QR squares */}
      <rect x="210" y="78" width="22" height="22" stroke="#FAF6EC" strokeWidth="2.5" />
      <rect x="217" y="85" width="8" height="8" fill="#FAF6EC" />
      <rect x="260" y="78" width="22" height="22" stroke="#FAF6EC" strokeWidth="2.5" />
      <rect x="267" y="85" width="8" height="8" fill="#FAF6EC" />
      <rect x="210" y="128" width="22" height="22" stroke="#FAF6EC" strokeWidth="2.5" />
      <rect x="217" y="135" width="8" height="8" fill="#FAF6EC" />
      <rect x="242" y="108" width="10" height="10" fill="#D7F04A" />
      <rect x="256" y="120" width="12" height="12" fill="#FAF6EC" />
      <rect x="272" y="136" width="10" height="10" fill="#FAF6EC" />
      <rect x="244" y="136" width="10" height="10" fill="#FAF6EC" />
      <text x="218" y="182" fill="#B6AFA0" fontSize="10" fontFamily="JetBrains Mono, monospace">
        QR LAYOUT
      </text>

      {/* Hand-drawn arrow 2 */}
      <path d="M306 116 C324 122, 344 122, 360 115" stroke="#FAF6EC" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M352 109 L362 115 L353 122" stroke="#FAF6EC" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />

      {/* Crossed-out phone (phone goes away) */}
      <rect x="378" y="74" width="52" height="84" rx="8" stroke="#7C7568" strokeWidth="1.6" strokeDasharray="4 3" />
      <line x1="370" y1="68" x2="438" y2="164" stroke="#FF4B2E" strokeWidth="2.4" strokeLinecap="round" />
      <text x="348" y="196" fill="#FF4B2E" fontSize="19" fontFamily="Caveat, cursive">
        phone goes away!
      </text>
    </svg>
  );
}

function TapInkVisual() {
  return (
    <svg
      viewBox="0 0 460 240"
      fill="none"
      role="img"
      aria-label="A4 sheet propped facing a laptop webcam as a fingertip taps a pad and sound radiates"
      className="h-auto w-full"
    >
      {/* Laptop screen & base on left */}
      <path d="M40 58 L140 58 L148 148 L48 148 Z" stroke="#FAF6EC" strokeWidth="1.8" fill="#0E0D0B" />
      <circle cx="90" cy="66" r="3" fill="#D7F04A" />
      <path d="M48 148 L148 148 L178 176 L36 176 Z" stroke="#FAF6EC" strokeWidth="1.8" fill="#151310" />
      <text x="58" y="108" fill="#B6AFA0" fontSize="10" fontFamily="JetBrains Mono, monospace">
        WEBCAM
      </text>

      {/* Dashed sightline cone from webcam to propped paper */}
      <line x1="93" y1="66" x2="294" y2="46" stroke="#D7F04A" strokeOpacity="0.45" strokeWidth="1.3" strokeDasharray="5 4" />
      <line x1="93" y1="66" x2="262" y2="174" stroke="#D7F04A" strokeOpacity="0.45" strokeWidth="1.3" strokeDasharray="5 4" />

      {/* Propped paper angled like a music stand */}
      <path d="M294 46 L404 58 L374 186 L262 174 Z" stroke="#FAF6EC" strokeWidth="2" fill="#0E0D0B" />
      {/* Ignited drum pad on paper */}
      <path d="M306 80 L356 86 L346 130 L296 124 Z" stroke="#D7F04A" strokeWidth="2.2" fill="rgba(215, 240, 74, 0.16)" />

      {/* Fingertip tapping the ignited spot */}
      <path d="M240 132 C266 126, 294 114, 322 104" stroke="#FAF6EC" strokeWidth="5.5" strokeLinecap="round" />
      <circle cx="324" cy="103" r="6" fill="#D7F04A" />

      {/* Crisp soundwave arcs */}
      <path d="M368 84 C382 96, 384 114, 374 128" stroke="#D7F04A" strokeWidth="2" strokeLinecap="round" />
      <path d="M382 76 C400 94, 402 120, 388 140" stroke="#D7F04A" strokeOpacity="0.65" strokeWidth="1.8" strokeLinecap="round" />

      <text x="206" y="212" fill="#D7F04A" fontSize="19" fontFamily="Caveat, cursive">
        prop it up like a music stand &amp; play
      </text>
    </svg>
  );
}

const STEPS = [
  {
    number: '01',
    title: 'Draw your desk',
    body: 'Sketch boxes for drum pads, a line for a volume slider, a circle for a bottle-cap dial, or keys for typing and games. Plain A4 paper, any pen.',
    visual: <DrawDeskVisual />,
  },
  {
    number: '02',
    title: 'Scan it once',
    body: 'Photograph the sheet once with your phone. AI finds and labels every control, packs the layout into a QR code for your laptop, and your phone goes away.',
    visual: <ScanOnceVisual />,
  },
  {
    number: '03',
    title: 'Tap the ink',
    body: 'Prop the sheet facing your laptop webcam like a music stand. Your webcam tracks your fingertip: drums thump, sliders ride, dials sweep, keys type.',
    visual: <TapInkVisual />,
  },
];

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="mx-auto max-w-[1280px] px-5 py-24 sm:px-8 sm:py-32 border-b border-[#FAF6EC]/10"
    >
      <div className="grid gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:gap-16 items-start">
        {/* Sticky left editorial rail */}
        <div className="lg:sticky lg:top-24">
          <p className="font-mono text-xs text-[#B6AFA0]">Golden path · Three steps</p>
          <h2 className="mt-3 font-display text-[clamp(2.25rem,4.2vw,3.5rem)] font-bold leading-[1.03] tracking-[-0.03em] text-[#FAF6EC] text-balance">
            Blank sheet to live studio desk.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-[#B6AFA0]">
            Everything runs in the browser on your laptop once the QR hands off the layout. No
            dongles, no conductive ink, no phone tethered to the desk.
          </p>

          {/* Architecture in one line */}
          <div className="mt-8 border-t border-[#FAF6EC]/12 pt-5">
            <p className="font-mono text-[11px] text-[#7C7568]">Architecture in one line</p>
            <p className="mt-2 font-mono text-xs leading-relaxed text-[#FAF6EC]">
              A4 ink → phone photo &amp; AI parse → QR code → webcam homography + tap physics →
              Web Audio &amp; real keystrokes.
            </p>
          </div>
        </div>

        {/* Right scrolling chapters with bespoke hand-drawn visuals */}
        <div className="space-y-12">
          {STEPS.map((step) => (
            <article
              key={step.number}
              className="rounded-xl border border-[#FAF6EC]/12 bg-[#151310] p-6 sm:p-8"
            >
              <div className="flex items-baseline gap-4">
                <span className="font-mono text-sm font-semibold text-[#FF4B2E] tabular-nums">
                  {step.number}
                </span>
                <h3 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#FAF6EC]">
                  {step.title}
                </h3>
              </div>
              <p className="mt-3 max-w-xl text-sm sm:text-base leading-relaxed text-[#B6AFA0]">
                {step.body}
              </p>
              <div className="mt-6 rounded-lg border border-[#FAF6EC]/10 bg-[#0E0D0B] p-4 desk-dot-grid">
                {step.visual}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
