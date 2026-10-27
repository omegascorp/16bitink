/**
 * Synthesized sound effects, as in the other games: no audio files. The
 * context starts on the first tap (browsers require a gesture), and each
 * sound has a minimum gap so a pour of a hundred grains doesn't become a
 * hundred sounds.
 */
export type Sfx = 'pull' | 'blocked' | 'jump' | 'sizzle' | 'coin' | 'splash' | 'squelch' | 'win' | 'fail' | 'tap';

const GAP_MS: Record<Sfx, number> = { pull: 60, blocked: 150, jump: 120, sizzle: 140, coin: 45, splash: 220, squelch: 200, win: 500, fail: 500, tap: 60 };

export class SoundBoard {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private readonly lastAt = new Map<Sfx, number>();
  muted = false;

  /** Call from a pointer or key event. */
  unlock(): void {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    const len = this.ctx.sampleRate;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    let seed = 7;
    for (let i = 0; i < len; i++) {
      seed = (seed * 16807) % 2147483647;
      data[i] = (seed / 2147483647) * 2 - 1;
    }
  }

  play(name: Sfx, strength = 1): void {
    const { ctx, master } = this;
    if (!ctx || !master || this.muted) return;
    const now = performance.now();
    if (now - (this.lastAt.get(name) ?? -1e9) < GAP_MS[name]) return;
    this.lastAt.set(name, now);
    const t = ctx.currentTime;
    switch (name) {
      case 'pull':
        this.tone(1400, 2600, 0.12, 0.22, 'triangle', t);
        this.tone(2800, 3600, 0.06, 0.06, 'sine', t);
        this.hiss(0.08, 4000, 0.12, t);
        break;
      case 'blocked':
        // A dull clunk: the pin knocks against the one in its way.
        this.tone(180, 120, 0.12, 0.25, 'square', t);
        this.hiss(0.05, 900, 0.1, t);
        break;
      case 'jump':
        // A springy boing, rising.
        this.tone(260, 620, 0.16, 0.16, 'triangle', t);
        break;
      case 'tap':
        this.tone(900, 700, 0.05, 0.08, 'triangle', t);
        break;
      case 'sizzle':
        this.hiss(0.35, 3000, 0.16 * strength, t);
        break;
      case 'coin':
        this.tone(1900 + Math.random() * 500, 2400, 0.08, 0.07, 'sine', t);
        this.tone(2900, 3100, 0.06, 0.04, 'sine', t + 0.03);
        break;
      case 'splash':
        this.hiss(0.4, 700, 0.18 * strength, t);
        break;
      case 'squelch':
        this.tone(320, 90, 0.25, 0.2, 'sawtooth', t);
        break;
      case 'win':
        [523, 659, 784, 1047].forEach((f, i) => this.tone(f, f, 0.18, 0.16, 'triangle', t + i * 0.1));
        break;
      case 'fail':
        // A cartoon "wah-wah": two sliding notes down.
        this.tone(440, 330, 0.28, 0.18, 'square', t);
        this.tone(330, 180, 0.45, 0.18, 'square', t + 0.3);
        break;
    }
  }

  private tone(from: number, to: number, dur: number, vol: number, type: OscillatorType, at: number): void {
    const { ctx, master } = this;
    if (!ctx || !master) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, at);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), at + dur);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(vol, at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(gain).connect(master);
    osc.start(at);
    osc.stop(at + dur + 0.02);
  }

  private hiss(dur: number, freq: number, vol: number, at: number): void {
    const { ctx, master, noise } = this;
    if (!ctx || !master || !noise) return;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(filter).connect(gain).connect(master);
    src.start(at, Math.random() * 0.5);
    src.stop(at + dur);
  }

  destroy(): void {
    void this.ctx?.close();
    this.ctx = null;
  }
}
