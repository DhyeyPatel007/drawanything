import { useCallback, useEffect, useRef, useState } from 'react';
import { drumEngine } from './audio/drumEngine';
import {
  DEMO_GROOVE_STEPS,
  INITIAL_DESK_STATE,
  recordPadHit,
  setVolumeState,
  toggleMuteState,
} from './utils/deskState';
import type { DeskAudioState, DrumPadId } from './utils/deskState';
import { Header } from './components/Header';
import { HeroMiniDesk } from './components/HeroMiniDesk';
import { ScanDrawingModal } from './components/ScanDrawingModal';
import {
  MarqueeTicker,
  TheMomentSection,
  TryItSection,
} from './components/TryAndMomentSections';
import { HowItWorksSection } from './components/HowItWorksSection';
import { TheDeskSection } from './components/TheDeskSection';
import {
  Footer,
  TheEngineSection,
  VerifiedSection,
} from './components/VerifiedAndEngineSections';

const EMPTY_ACTIVE_PADS: Record<DrumPadId, boolean> = {
  kick: false,
  snare: false,
  hat: false,
  tom: false,
};

export default function App() {
  const [deskState, setDeskState] = useState<DeskAudioState>(INITIAL_DESK_STATE);
  const [activePads, setActivePads] = useState<Record<DrumPadId, boolean>>(EMPTY_ACTIVE_PADS);
  const [sampleSource, setSampleSource] = useState<'idle' | 'acoustic' | 'synth'>('idle');
  const [scanOpen, setScanOpen] = useState(false);

  const deskRef = useRef<HTMLDivElement | null>(null);
  const padTimersRef = useRef<Partial<Record<DrumPadId, number>>>({});
  const grooveStepRef = useRef<number>(0);

  // Sync audio master gain whenever volume or muted changes
  useEffect(() => {
    drumEngine.setMasterOutput(deskState.volume, deskState.muted);
  }, [deskState.volume, deskState.muted]);

  const flashPad = useCallback((pad: DrumPadId) => {
    setActivePads((prev) => ({ ...prev, [pad]: true }));
    const existing = padTimersRef.current[pad];
    if (existing) {
      window.clearTimeout(existing);
    }
    padTimersRef.current[pad] = window.setTimeout(() => {
      setActivePads((prev) => ({ ...prev, [pad]: false }));
    }, 150);
  }, []);

  const handleTriggerPad = useCallback(
    (pad: DrumPadId, velocity = 1) => {
      const source = drumEngine.playPad(pad, velocity);
      setSampleSource(source);
      flashPad(pad);
      setDeskState((prev) => recordPadHit(prev, pad));
    },
    [flashPad]
  );

  const handleVolumeChange = useCallback((nextVolume: number) => {
    void drumEngine.preloadSamples();
    setDeskState((prev) => setVolumeState(prev, nextVolume));
  }, []);

  const handleToggleMute = useCallback(() => {
    void drumEngine.preloadSamples();
    setDeskState((prev) => toggleMuteState(prev));
  }, []);

  const handleToggleGroove = useCallback(() => {
    void drumEngine.preloadSamples();
    setDeskState((prev) => {
      if (prev.groovePlaying) {
        return { ...prev, groovePlaying: false };
      }
      return {
        ...prev,
        muted: false,
        volume: prev.volume === 0 ? 80 : prev.volume,
        groovePlaying: true,
      };
    });
  }, []);

  const handleStartGroove = useCallback(() => {
    void drumEngine.preloadSamples();
    setDeskState((prev) => ({
      ...prev,
      muted: false,
      volume: prev.volume === 0 ? 80 : prev.volume,
      groovePlaying: true,
    }));
  }, []);

  const handleScrollToDesk = useCallback(() => {
    deskRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    handleTriggerPad('kick', 0.9);
  }, [handleTriggerPad]);

  // Run 8-step acoustic groove when "Play on this laptop" is active
  useEffect(() => {
    if (!deskState.groovePlaying || deskState.muted) return;

    grooveStepRef.current = 0;

    const fireStep = () => {
      const stepPads = DEMO_GROOVE_STEPS[grooveStepRef.current % DEMO_GROOVE_STEPS.length];
      stepPads.forEach((pad) => {
        const vel = pad === 'hat' ? 0.65 : 0.95;
        const source = drumEngine.playPad(pad, vel);
        setSampleSource(source);
        flashPad(pad);
        setDeskState((prev) => recordPadHit(prev, pad));
      });
      grooveStepRef.current += 1;
    };

    fireStep();
    const intervalId = window.setInterval(fireStep, 240);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [deskState.groovePlaying, deskState.muted, flashPad]);

  // Global keyboard bindings for Hero Mini Desk (A, S, D, F, M)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (scanOpen) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;

      const key = e.key.toLowerCase();
      if (key === 'a') handleTriggerPad('kick');
      else if (key === 's') handleTriggerPad('snare');
      else if (key === 'd') handleTriggerPad('hat');
      else if (key === 'f') handleTriggerPad('tom');
      else if (key === 'm') handleToggleMute();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleTriggerPad, handleToggleMute, scanOpen]);

  // Clean up pad flash timers on unmount
  useEffect(() => {
    const timers = padTimersRef.current;
    return () => {
      Object.values(timers).forEach((id) => {
        if (id) window.clearTimeout(id);
      });
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0E0D0B] text-[#FAF6EC]">
      <Header onTryDesk={handleScrollToDesk} />

      <main>
        {/* 1. HERO + PLAYABLE MINI DESK */}
        <HeroMiniDesk
          deskState={deskState}
          activePads={activePads}
          sampleSource={sampleSource}
          onTriggerPad={handleTriggerPad}
          onVolumeChange={handleVolumeChange}
          onToggleMute={handleToggleMute}
          onToggleGroove={handleToggleGroove}
          onOpenScan={() => setScanOpen(true)}
          deskRef={deskRef}
        />

        {/* 2. MARQUEE TICKER */}
        <MarqueeTicker />

        {/* 3. TRY IT WITH NOTHING (Judge path) */}
        <TryItSection onScrollToDesk={handleScrollToDesk} />

        {/* 4. THE MOMENT (MUTE box synced to Hero Desk) */}
        <TheMomentSection
          muted={deskState.muted}
          groovePlaying={deskState.groovePlaying}
          onToggleMute={handleToggleMute}
          onStartGroove={handleStartGroove}
        />

        {/* 5. HOW IT WORKS */}
        <HowItWorksSection />

        {/* 6. THE DESK */}
        <TheDeskSection
          volume={deskState.volume}
          muted={deskState.muted}
          activePads={activePads}
          onTriggerPad={handleTriggerPad}
          onVolumeChange={handleVolumeChange}
        />

        {/* 7. VERIFIED */}
        <VerifiedSection />

        {/* 8. THE ENGINE */}
        <TheEngineSection onTapSound={() => handleTriggerPad('kick', 0.85)} />
      </main>

      {/* 9. FOOTER */}
      <Footer />

      <ScanDrawingModal open={scanOpen} onClose={() => setScanOpen(false)} />
    </div>
  );
}
