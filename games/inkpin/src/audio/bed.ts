/**
 * The Volcano Shrine's sound bed, under the effects: a low rumble from deep
 * below that swells and settles, and distant lava bubbling, a soft blip now
 * and then. Synthesized like the rest: looped noise through a low filter,
 * and short sine bloops on a timer. It fades in, and out when stopped.
 */

/** The rumble's level, and how slowly it swells (Hz). */
const RUMBLE = 0.16;
const SWELL_HZ = 0.07;
/** Seconds between bubbles: at least this, plus up to this much again. */
const BUBBLE_GAP = 0.45;
const FADE_S = 1.2;

export class VolcanoBed {
  private readonly out: GainNode;
  private readonly sources: AudioScheduledSourceNode[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;

  constructor(private readonly ctx: AudioContext, master: AudioNode, private readonly noise: AudioBuffer) {
    const t = ctx.currentTime;
    this.out = ctx.createGain();
    this.out.gain.setValueAtTime(0.0001, t);
    this.out.gain.exponentialRampToValueAtTime(1, t + FADE_S);
    this.out.connect(master);
    this.rumble(t);
    this.bubbleLater();
  }

  /** Looped noise through a low-pass filter, its loudness swelling slowly with an LFO. */
  private rumble(t: number): void {
    const { ctx } = this;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 85;
    low.Q.value = 0.7;
    const level = ctx.createGain();
    level.gain.value = RUMBLE;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = SWELL_HZ;
    const depth = ctx.createGain();
    depth.gain.value = RUMBLE * 0.6;
    lfo.connect(depth).connect(level.gain);
    src.connect(low).connect(level).connect(this.out);
    src.start(t);
    lfo.start(t);
    this.sources.push(src, lfo);
  }

  /** One distant bubble: a short sine rising in pitch, quiet and a little muffled, then the next one later. */
  private bubbleLater(): void {
    if (this.stopped) return;
    const wait = BUBBLE_GAP + Math.random() * BUBBLE_GAP * 2;
    this.timer = setTimeout(() => {
      if (this.stopped) return;
      const { ctx } = this;
      const t = ctx.currentTime;
      const pops = Math.random() < 0.3 ? 2 : 1;
      for (let k = 0; k < pops; k++) {
        const at = t + k * 0.09;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        const f = 90 + Math.random() * 110;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, at);
        osc.frequency.exponentialRampToValueAtTime(f * 2.6, at + 0.09);
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(0.05 + Math.random() * 0.04, at + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, at + 0.12);
        osc.connect(g).connect(this.out);
        osc.start(at);
        osc.stop(at + 0.14);
      }
      this.bubbleLater();
    }, wait * 1000);
  }

  stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    if (this.timer !== null) clearTimeout(this.timer);
    const t = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setValueAtTime(Math.max(0.0001, this.out.gain.value), t);
    this.out.gain.exponentialRampToValueAtTime(0.0001, t + FADE_S * 0.5);
    for (const s of this.sources) s.stop(t + FADE_S * 0.5 + 0.05);
    setTimeout(() => this.out.disconnect(), (FADE_S * 0.5 + 0.2) * 1000);
  }
}
