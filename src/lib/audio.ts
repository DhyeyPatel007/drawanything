// DrawAnything audio — panel Round 3 method: real acoustic samples, preloaded
// AudioBuffers, native Web Audio, source.start(0). No Tone.js, no synth drums.
// Samples: Virtuosity Drums (CC0) overhead recordings, 2 velocity layers,
// round-robin on kick/hats. The bottle-cap dial sweeps a lowpass filter that
// sits on the drum bus AND on a small synth voice (so the dial always has an
// audible effect, even between drum hits).

import type { DrumPiece } from "./types";

const SAMPLE_FILES: Record<DrumPiece, { soft: string[]; hard: string[] }> = {
  kick: { soft: ["kick_soft_1.ogg", "kick_soft_2.ogg"], hard: ["kick_hard_1.ogg", "kick_hard_2.ogg"] },
  snare: { soft: ["snare_soft.ogg"], hard: ["snare_hard.ogg"] },
  rim: { soft: ["rim_soft.ogg"], hard: ["rim_hard.ogg"] },
  hatc: { soft: ["hatc_soft_1.ogg", "hatc_soft_2.ogg"], hard: ["hatc_hard_1.ogg", "hatc_hard_2.ogg"] },
  hato: { soft: ["hato_soft_1.ogg"], hard: ["hato_hard_1.ogg"] },
  tomh: { soft: ["tomh_soft.ogg"], hard: ["tomh_hard.ogg"] },
  toml: { soft: ["toml_soft.ogg"], hard: ["toml_hard.ogg"] },
  crash: { soft: ["crash_soft.ogg"], hard: ["crash_hard.ogg"] },
};

export class AudioEngine {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private drumBus!: GainNode;
  private filter!: BiquadFilterNode;
  private buffers = new Map<string, AudioBuffer[]>();
  private rr = new Map<string, number>();
  private openHatVoices: { src: AudioBufferSourceNode; gain: GainNode }[] = [];
  private synthOsc: OscillatorNode | null = null;
  private synthGain: GainNode | null = null;
  muted = false;
  loaded = false;

  async init() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") await this.ctx.resume();
      return;
    }
    const ctx = new AudioContext({ latencyHint: "interactive", sampleRate: 48000 });
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.ratio.value = 8;
    this.master.connect(comp);
    comp.connect(ctx.destination);

    this.filter = ctx.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.frequency.value = 18000;
    this.filter.Q.value = 0.8;
    this.drumBus = ctx.createGain();
    this.drumBus.gain.value = 1;
    this.drumBus.connect(this.filter);
    this.filter.connect(this.master);

    await this.loadSamples();
    this.loaded = true;
  }

  private async loadSamples() {
    const ctx = this.ctx!;
    const jobs: Promise<void>[] = [];
    (Object.keys(SAMPLE_FILES) as DrumPiece[]).forEach((piece) => {
      const layers = SAMPLE_FILES[piece];
      (["soft", "hard"] as const).forEach((layer) => {
        layers[layer].forEach((file) => {
          const key = `${piece}:${layer}`;
          jobs.push(
            fetch(`/samples/${file}`)
              .then((r) => r.arrayBuffer())
              .then((ab) => ctx.decodeAudioData(ab))
              .then((buf) => {
                const arr = this.buffers.get(key) ?? [];
                arr.push(buf);
                this.buffers.set(key, arr);
              })
              .catch(() => undefined)
          );
        });
      });
    });
    await Promise.all(jobs);
  }

  /** Output latency in ms as reported by the browser (base + output). */
  latencyMs(): number {
    if (!this.ctx) return 0;
    return Math.round((this.ctx.baseLatency + (this.ctx.outputLatency || 0)) * 1000);
  }

  triggerDrum(piece: DrumPiece, velocity = 0.8) {
    const ctx = this.ctx;
    if (!ctx || this.muted) return;
    const layer = velocity < 0.55 ? "soft" : "hard";
    const key = `${piece}:${layer}`;
    const bufs = this.buffers.get(key);
    if (!bufs || bufs.length === 0) return;
    const idx = (this.rr.get(key) ?? 0) % bufs.length;
    this.rr.set(key, idx + 1);

    // hi-hat choke: closed hat kills a ringing open hat
    if (piece === "hatc") {
      for (const v of this.openHatVoices) {
        try {
          v.gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.008);
          v.src.stop(ctx.currentTime + 0.05);
        } catch { /* already stopped */ }
      }
      this.openHatVoices = [];
    }

    const src = ctx.createBufferSource();
    src.buffer = bufs[idx];
    src.playbackRate.value = 1 + (Math.random() - 0.5) * 0.02;
    const g = ctx.createGain();
    g.gain.value = 0.35 + velocity * 0.65;
    src.connect(g);
    g.connect(this.drumBus);
    if (piece === "hato") {
      this.openHatVoices.push({ src, gain: g });
      src.onended = () => {
        this.openHatVoices = this.openHatVoices.filter((v) => v.src !== src);
      };
    }
    src.start(0);
  }

  /** Bottle-cap dial: 0..1 -> lowpass 180 Hz..18 kHz (log sweep). */
  setFilterNorm(t: number) {
    if (!this.ctx) return;
    const f = 180 * Math.pow(100, Math.min(1, Math.max(0, t)));
    this.filter.frequency.setTargetAtTime(f, this.ctx.currentTime, 0.008);
  }

  /** A soft synth voice so the dial's sweep is audible on its own. Toggle. */
  setSynthOn(on: boolean) {
    const ctx = this.ctx;
    if (!ctx) return;
    if (on && !this.synthOsc) {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = 110;
      const g = ctx.createGain();
      g.gain.value = 0;
      g.gain.setTargetAtTime(0.06, ctx.currentTime, 0.05);
      osc.connect(g);
      g.connect(this.filter);
      osc.start();
      this.synthOsc = osc;
      this.synthGain = g;
    } else if (!on && this.synthOsc) {
      const osc = this.synthOsc;
      this.synthGain?.gain.setTargetAtTime(0, ctx.currentTime, 0.03);
      window.setTimeout(() => { try { osc.stop(); } catch { /* noop */ } }, 150);
      this.synthOsc = null;
      this.synthGain = null;
    }
  }

  private localVolume = 0.7;

  /** The paper VOL slider also trims the app's own output, so the demo is
   *  fully audible even when the Windows bridge isn't running. */
  setLocalVolume(v: number) {
    this.localVolume = Math.min(1, Math.max(0, v));
    if (this.ctx && this.master && !this.muted) {
      this.master.gain.setTargetAtTime(0.15 + this.localVolume * 0.85, this.ctx.currentTime, 0.02);
    }
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.15 + this.localVolume * 0.85, this.ctx.currentTime, 0.01);
    }
  }
}

export const audio = new AudioEngine();
