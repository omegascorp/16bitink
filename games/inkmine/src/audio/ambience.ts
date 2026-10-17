import { depthShade, MOODS, nextBell, type Mood, type MoodSpec, type Shade } from './mood';
import { noiseBuffer, tone } from './synth';

/** Seconds a mood takes to fade in over the last one (and the last to fade out). */
const FADE_S = 2.5;
/** Time constant for depth changes, s: walking down a shaft darkens the sound gradually. */
const DEPTH_TAU = 1.2;
/** How far each pad note's twin oscillators are pulled apart, as a frequency ratio. */
const DETUNE = 0.004;
/** How far the pad's low-pass wanders either way, as a share of its cutoff. */
const FILTER_SWAY = 0.3;
const SURFACE: Shade = { level: 1, cutoff: 1, wind: 1 };

/** Everything sounding for one mood, with the knobs depth turns. */
interface Layer {
  readonly mood: Exclude<Mood, 'none'>;
  readonly spec: MoodSpec;
  readonly out: GainNode;
  readonly pad: GainNode;
  readonly filter: BiquadFilterNode;
  readonly filterSway: GainNode;
  readonly wind: GainNode | null;
  readonly sources: readonly AudioScheduledSourceNode[];
}

/** A slow sine LFO into `param`, swinging it `depth` either way. */
function lfo(ctx: AudioContext, rate: number, depth: number, param: AudioParam, sources: AudioScheduledSourceNode[]): GainNode {
  const osc = ctx.createOscillator();
  osc.frequency.value = rate;
  const amount = ctx.createGain();
  amount.gain.value = depth;
  osc.connect(amount).connect(param);
  sources.push(osc);
  return amount;
}

/** A pad note: two detuned oscillators, each swelling and fading on its own very slow cycle. */
function padNote(ctx: AudioContext, f: number, wave: OscillatorType, gain: number, into: AudioNode, sources: AudioScheduledSourceNode[]): void {
  for (const ratio of [1 - DETUNE, 1 + DETUNE]) {
    const osc = ctx.createOscillator();
    osc.type = wave;
    osc.frequency.value = f * ratio;
    const g = ctx.createGain();
    g.gain.value = gain * 0.5;
    lfo(ctx, 0.03 + Math.random() * 0.08, gain * 0.45, g.gain, sources);
    osc.connect(g).connect(into);
    sources.push(osc);
  }
}

/** Faint wind: looping noise through a wandering band-pass, gusting slowly. */
function windBed(ctx: AudioContext, level: number, into: AudioNode, sources: AudioScheduledSourceNode[]): GainNode {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  src.loop = true;
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.Q.value = 0.6;
  band.frequency.value = 420;
  lfo(ctx, 0.06, 180, band.frequency, sources);
  const gust = ctx.createGain();
  gust.gain.value = 0.6;
  lfo(ctx, 0.045, 0.4, gust.gain, sources);
  const bed = ctx.createGain();
  bed.gain.value = level;
  src.connect(band).connect(gust).connect(bed).connect(into);
  sources.push(src);
  return bed;
}

/**
 * The bed of sound under everything, as in No Man's Sky: a slow, evolving
 * pad (detuned sines or triangles through a wandering low-pass), faint wind
 * on a planet's surface, and now and then a soft tone far off. Each place
 * has its own mood (mood.ts); changing place crossfades. On a planet it
 * grows quieter and darker the deeper you dig.
 */
export class Ambience {
  private layer: Layer | null = null;
  private shade: Shade = SURFACE;
  private bellTimer: ReturnType<typeof setTimeout> | null = null;

  /** `dry` goes straight to the speakers; `wet` through the echo, for the far-off tones' long tails. */
  constructor(private readonly ctx: AudioContext, private readonly dry: AudioNode, private readonly wet: AudioNode) {}

  get mood(): Mood {
    return this.layer?.mood ?? 'none';
  }

  /** Crossfades to `mood`; nothing changes if it's already playing. */
  setMood(mood: Mood): void {
    if (mood === this.mood) return;
    this.fadeOut(this.layer);
    this.layer = mood === 'none' ? null : this.build(mood);
    this.scheduleBell();
  }

  /** How deep the prospector is, in metres: darkens and quietens the planet's pad, and hushes its wind. */
  setDepth(depth: number): void {
    const next = depthShade(depth);
    if (next.level === this.shade.level && next.wind === this.shade.wind) return;
    this.shade = next;
    const l = this.layer;
    if (!l || l.mood !== 'planet') return;
    const t = this.ctx.currentTime;
    l.pad.gain.setTargetAtTime(l.spec.level * next.level, t, DEPTH_TAU);
    l.filter.frequency.setTargetAtTime(l.spec.cutoff * next.cutoff, t, DEPTH_TAU);
    l.filterSway.gain.setTargetAtTime(l.spec.cutoff * next.cutoff * FILTER_SWAY, t, DEPTH_TAU);
    l.wind?.gain.setTargetAtTime(l.spec.wind * next.wind, t, DEPTH_TAU);
  }

  /** Stops everything at once (the context is going away). */
  destroy(): void {
    if (this.bellTimer) clearTimeout(this.bellTimer);
    this.bellTimer = null;
    this.fadeOut(this.layer, 0.05);
    this.layer = null;
  }

  private build(mood: Exclude<Mood, 'none'>): Layer {
    const ctx = this.ctx;
    const spec = MOODS[mood];
    const shade = mood === 'planet' ? this.shade : SURFACE;
    const t = ctx.currentTime;
    const sources: AudioScheduledSourceNode[] = [];
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(1, t + FADE_S);
    out.connect(this.dry);
    const pad = ctx.createGain();
    pad.gain.value = spec.level * shade.level;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 0.5;
    filter.frequency.value = spec.cutoff * shade.cutoff;
    const filterSway = lfo(ctx, 0.025, spec.cutoff * shade.cutoff * FILTER_SWAY, filter.frequency, sources);
    filter.connect(pad).connect(out);
    for (const f of spec.chord) padNote(ctx, f, spec.wave, 1 / spec.chord.length, filter, sources);
    const wind = spec.wind > 0 ? windBed(ctx, spec.wind * shade.wind, out, sources) : null;
    for (const s of sources) s.start(t);
    return { mood, spec, out, pad, filter, filterSway, wind, sources };
  }

  private fadeOut(layer: Layer | null, seconds = FADE_S): void {
    if (!layer) return;
    const t = this.ctx.currentTime;
    layer.out.gain.cancelScheduledValues(t);
    layer.out.gain.setValueAtTime(Math.max(0.0001, layer.out.gain.value), t);
    layer.out.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
    for (const s of layer.sources) s.stop(t + seconds + 0.1);
    setTimeout(() => layer.out.disconnect(), (seconds + 0.5) * 1000);
  }

  /** The next far-off tone, at a random moment in the mood's gap. */
  private scheduleBell(): void {
    if (this.bellTimer) clearTimeout(this.bellTimer);
    this.bellTimer = null;
    const l = this.layer;
    if (!l) return;
    this.bellTimer = setTimeout(() => {
      this.bell(l);
      if (this.layer === l) this.scheduleBell();
    }, nextBell(l.spec, Math.random()) * 1000);
  }

  /** A soft tone far off, most of it heard through the echo; deep underground it's fainter still. */
  private bell(l: Layer): void {
    if (this.layer !== l || this.ctx.state !== 'running') return;
    const f = l.spec.bells[Math.floor(Math.random() * l.spec.bells.length)]!;
    const gain = 0.05 * (l.mood === 'planet' ? this.shade.level : 1);
    const pan = this.ctx.createStereoPanner();
    pan.pan.value = Math.random() * 1.4 - 0.7;
    const send = this.ctx.createGain();
    send.gain.value = 1;
    pan.connect(send).connect(this.wet);
    pan.connect(this.dry);
    const v = { ctx: this.ctx, out: pan, t: this.ctx.currentTime + 0.02, pitch: 1 };
    const dur = l.mood === 'space' ? 2.6 : 4.5;
    tone(v, { from: f, dur, gain, attack: l.mood === 'space' ? 0.05 : 0.7 });
    // Now and then a second note, a fifth above, answering.
    if (Math.random() < 0.4) tone(v, { from: f * 1.5, dur: dur * 0.8, gain: gain * 0.5, attack: 0.4, delay: l.mood === 'space' ? 0.35 : 1.1 });
    setTimeout(() => pan.disconnect(), (dur + 2) * 1000);
  }
}
