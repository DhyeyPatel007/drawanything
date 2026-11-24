import { volumeToGain } from '../utils/deskState';
import type { DrumPadId } from '../utils/deskState';

export const SAMPLE_URLS: Record<DrumPadId, string> = {
  kick: 'https://drawanything-xi.vercel.app/samples/kick_hard_1.ogg',
  snare: 'https://drawanything-xi.vercel.app/samples/snare_hard.ogg',
  hat: 'https://drawanything-xi.vercel.app/samples/hatc_hard_1.ogg',
  tom: 'https://drawanything-xi.vercel.app/samples/tomh_hard.ogg',
};

export type SampleSourceKind = 'acoustic' | 'synth';

class DrawAnythingAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private buffers: Partial<Record<DrumPadId, AudioBuffer>> = {};
  private preloadPromise: Promise<void> | null = null;
  private currentVolume = 82;
  private currentMuted = false;

  // Filter synth nodes for the Bottle-Cap Dial in "The Desk"
  private synthOsc1: OscillatorNode | null = null;
  private synthOsc2: OscillatorNode | null = null;
  private synthFilter: BiquadFilterNode | null = null;
  private synthGain: GainNode | null = null;
  private synthCutoffHz = 870;
  private synthActive = false;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;

    if (!this.ctx) {
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = volumeToGain(this.currentVolume, this.currentMuted);
      this.masterGain.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  public preloadSamples(): Promise<void> {
    if (this.preloadPromise) return this.preloadPromise;

    const ctx = this.ensureContext();
    if (!ctx) return Promise.resolve();

    const entries = Object.entries(SAMPLE_URLS) as [DrumPadId, string][];
    this.preloadPromise = Promise.all(
      entries.map(async ([pad, url]) => {
        try {
          const controller = new AbortController();
          const timeoutId = window.setTimeout(() => controller.abort(), 5000);
          const res = await fetch(url, { mode: 'cors', signal: controller.signal });
          window.clearTimeout(timeoutId);
          if (!res.ok) return;
          const arrayBuf = await res.arrayBuffer();
          const decoded = await ctx.decodeAudioData(arrayBuf.slice(0));
          this.buffers[pad] = decoded;
        } catch {
          // Graceful fallback: playPad will use synthesized Web Audio percussion.
        }
      })
    ).then(() => undefined);

    return this.preloadPromise;
  }

  public setMasterOutput(volume: number, muted: boolean): void {
    this.currentVolume = volume;
    this.currentMuted = muted;
    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      const target = volumeToGain(volume, muted);
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(target, now, 0.008);
    }
    if (muted && this.synthActive) {
      this.stopFilterSynth();
    }
  }

  public playPad(pad: DrumPadId, velocity = 1): SampleSourceKind {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return 'synth';

    // Kick off non-blocking preload on first user gesture
    void this.preloadSamples();

    if (this.currentMuted || this.currentVolume <= 0) {
      return this.buffers[pad] ? 'acoustic' : 'synth';
    }

    const buffer = this.buffers[pad];
    if (buffer) {
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.value = Math.max(0.25, Math.min(1, velocity));
      src.connect(gain);
      gain.connect(this.masterGain);
      src.start(0);
      return 'acoustic';
    }

    this.playSynthDrum(ctx, this.masterGain, pad, velocity);
    return 'synth';
  }

  private playSynthDrum(
    ctx: AudioContext,
    dest: AudioNode,
    pad: DrumPadId,
    velocity: number
  ): void {
    const now = ctx.currentTime;
    const v = Math.max(0.25, Math.min(1, velocity));

    if (pad === 'kick') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(145, now);
      osc.frequency.exponentialRampToValueAtTime(42, now + 0.095);
      gain.gain.setValueAtTime(0.95 * v, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(now);
      osc.stop(now + 0.34);
      return;
    }

    if (pad === 'snare') {
      // Noise burst
      const bufferSize = Math.floor(ctx.sampleRate * 0.16);
      const noiseBuf = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuf;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 1100;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.65 * v, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(dest);
      noise.start(now);

      // Snare body tone
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(210, now);
      osc.frequency.exponentialRampToValueAtTime(115, now + 0.08);
      oscGain.gain.setValueAtTime(0.55 * v, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
      osc.connect(oscGain);
      oscGain.connect(dest);
      osc.start(now);
      osc.stop(now + 0.12);
      return;
    }

    if (pad === 'hat') {
      const bufferSize = Math.floor(ctx.sampleRate * 0.065);
      const noiseBuf = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuf;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 6800;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.45 * v, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      noise.connect(hp);
      hp.connect(gain);
      gain.connect(dest);
      noise.start(now);
      return;
    }

    // High Tom
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(98, now + 0.19);
    gain.gain.setValueAtTime(0.8 * v, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  public startFilterSynth(cutoffHz: number): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || this.currentMuted) return;
    if (this.synthActive) {
      this.setFilterCutoff(cutoffHz);
      return;
    }

    this.synthCutoffHz = cutoffHz;
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(110, now); // A2
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(164.81, now); // E3 fifth

    filter.type = 'lowpass';
    filter.Q.setValueAtTime(5.5, now);
    filter.frequency.setValueAtTime(this.synthCutoffHz, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.24, now + 0.06);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);

    this.synthOsc1 = osc1;
    this.synthOsc2 = osc2;
    this.synthFilter = filter;
    this.synthGain = gain;
    this.synthActive = true;
  }

  public setFilterCutoff(cutoffHz: number): void {
    this.synthCutoffHz = cutoffHz;
    if (this.ctx && this.synthFilter) {
      this.synthFilter.frequency.setTargetAtTime(cutoffHz, this.ctx.currentTime, 0.02);
    }
  }

  public stopFilterSynth(): void {
    if (!this.synthActive || !this.ctx || !this.synthGain) return;
    const now = this.ctx.currentTime;
    try {
      this.synthGain.gain.cancelScheduledValues(now);
      this.synthGain.gain.setTargetAtTime(0.0001, now, 0.025);
      this.synthOsc1?.stop(now + 0.1);
      this.synthOsc2?.stop(now + 0.1);
    } catch {
      // Oscillator already stopped
    }
    this.synthOsc1 = null;
    this.synthOsc2 = null;
    this.synthFilter = null;
    this.synthGain = null;
    this.synthActive = false;
  }

  public isSynthActive(): boolean {
    return this.synthActive;
  }
}

export const drumEngine = new DrawAnythingAudioEngine();
