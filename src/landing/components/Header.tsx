
interface HeaderProps {
  onTryDesk: () => void;
}

export function Header({ onTryDesk }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#FAF6EC]/10 bg-[#0E0D0B]/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between gap-8 px-5 sm:px-8">
        <a
          href="#top"
          className="font-display text-lg font-bold tracking-tight text-[#FAF6EC] whitespace-nowrap shrink-0 hover:text-[#FF4B2E] transition-colors"
        >
          DrawAnything
        </a>

        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-[#B6AFA0]"
        >
          <a
            href="#try-it"
            className="whitespace-nowrap shrink-0 hover:text-[#FAF6EC] transition-colors"
          >
            Try It
          </a>
          <a
            href="#the-moment"
            className="whitespace-nowrap shrink-0 hover:text-[#FAF6EC] transition-colors"
          >
            The Moment
          </a>
          <a
            href="#how-it-works"
            className="whitespace-nowrap shrink-0 hover:text-[#FAF6EC] transition-colors"
          >
            How It Works
          </a>
          <a
            href="#the-desk"
            className="whitespace-nowrap shrink-0 hover:text-[#FAF6EC] transition-colors"
          >
            The Desk
          </a>
          <a
            href="#verified"
            className="whitespace-nowrap shrink-0 hover:text-[#FAF6EC] transition-colors"
          >
            Verified
          </a>
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onTryDesk}
            className="rounded-md bg-[#FF4B2E] px-4 py-2 text-xs font-semibold text-[#0E0D0B] whitespace-nowrap shrink-0 hover:bg-[#ff6248] active:scale-[0.98] transition-all cursor-pointer"
          >
            Play the Desk
          </button>
        </div>
      </div>
    </header>
  );
}
