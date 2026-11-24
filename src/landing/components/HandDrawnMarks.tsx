
export function HandUnderline({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 24"
      fill="none"
      aria-hidden="true"
      preserveAspectRatio="none"
      className={className}
    >
      <path
        d="M4 16.5C58 10.2 142 6.8 214 9.5C255 11.1 292 12.8 315 8.2"
        stroke="#FF4B2E"
        strokeWidth="4.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 20.5C94 15.2 198 13.8 302 15.4"
        stroke="#FF4B2E"
        strokeWidth="2"
        strokeLinecap="round"
        strokeOpacity="0.65"
      />
    </svg>
  );
}

export function MarginArrowRight({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 44" fill="none" aria-hidden="true" className={className}>
      <path
        d="M6 34C26 26 52 14 86 15"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M74 7.5C80 11.5 85 13.8 89 15.2C83.5 18.2 78.5 22 75.5 26.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MarginArrowDown({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 44 76" fill="none" aria-hidden="true" className={className}>
      <path
        d="M18 4C11 22 14 48 27 68"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M16 61.5C20.5 64.5 24.8 67.8 28.2 71C29.5 65.5 32 60 35.5 55.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Slightly irregular hand-inked rectangle border rendered as an absolute SVG overlay
 * so interactive pads and boxes look drawn with a real felt-tip pen rather than CSS boxes.
 */
export function DrawnBoxFrame({
  stroke = '#FAF6EC',
  strokeWidth = 2,
  variant = 0,
  className = '',
}: {
  stroke?: string;
  strokeWidth?: number;
  variant?: 0 | 1 | 2 | 3;
  className?: string;
}) {
  const paths: Record<number, string> = {
    0: 'M6 5.5 C58 3.2, 142 3.8, 194 5.2 C196.2 46, 195.8 98, 194.5 134.5 C140 136.4, 58 135.8, 5.5 134 C4.2 94, 4.8 44, 6 5.5 Z',
    1: 'M5.2 6.2 C66 4.8, 134 3.4, 194.8 6 C195.8 52, 194.5 96, 193.6 133.8 C134 135.2, 62 136.6, 6.2 134.8 C3.8 92, 5.2 46, 5.2 6.2 Z',
    2: 'M6.8 5 C62 6.2, 138 3.6, 193.5 5.8 C196.4 48, 195.2 92, 194.2 134.2 C136 135.8, 60 134.2, 5.4 135 C4.4 96, 5.4 48, 6.8 5 Z',
    3: 'M5.5 6.8 C64 3.5, 138 5.4, 194.6 4.8 C195.4 50, 196.2 96, 194 135 C138 134.2, 64 136.2, 6 133.8 C4.8 90, 4.2 46, 5.5 6.8 Z',
  };

  return (
    <svg
      viewBox="0 0 200 140"
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    >
      <path
        d={paths[variant]}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
