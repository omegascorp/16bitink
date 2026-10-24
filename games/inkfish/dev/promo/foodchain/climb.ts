import { smooth } from '../short';
import { SPECIES, type Kind } from './species';

/**
 * The chain in world space (metres): each animal swims along a path that
 * puts its mouth on its prey at the moment it gulps it, then cruises on as
 * the new hero; and a camera that zooms out (in log space) from one hero's
 * framing to the next. The cold open and the climb are two of these, with
 * their own gulp times.
 */

export interface Pt {
  readonly x: number;
  readonly y: number;
}

export interface LinkSpec {
  readonly kind: Kind;
  /** When it gulps the link before it (ignored for the first). */
  readonly gulp: number;
  /** The camera's zoom from the previous framing to this one. */
  readonly zoomFrom: number;
  readonly zoomTo: number;
  /** Screen width in body lengths once it's the hero. */
  readonly frame: number;
  /** How far off it hovers before the lunge, relative to the usual (the cold open's are close, to share the frame). */
  readonly reach?: number;
}

export interface Link extends LinkSpec {
  readonly length: number;
  /** +1 swims right, -1 left. */
  readonly dir: 1 | -1;
  /** Where its mouth closes on its prey (world m); the first link's resting point. */
  readonly at: Pt;
  /** When it's swallowed by the next link (Infinity if never). */
  readonly eaten: number;
}

/** Mouth distance from the body's centre, in body lengths (as the chain short's). */
export const NOSE = 0.46;
/** Cruising speed after a meal, body lengths per second. */
const CRUISE = 0.09;
/** How far it rises and sinks, body lengths, and how fast. */
const BOB = 0.025;
const BOB_HZ = 0.21;
/** How long the prey takes to vanish into the mouth. */
export const SWALLOW_S = 0.18;

/** How far the mouth is behind the gulp point `d` seconds before it: hovering about a body length off, then a lunge. */
const approach = (d: number): number => 0.85 * (1 - Math.exp(-d / 0.42)) + 0.04 * d;

export interface Climb {
  readonly links: readonly Link[];
  /** The mouth of link i at time t (world m). */
  mouth(i: number, t: number): Pt;
  /** The centre of link i's body. */
  body(i: number, t: number): Pt;
  /** Nose-up tilt, radians. */
  tilt(i: number, t: number): number;
  /** Tail-beat phase (radians) and effort (0..1), faster in the lunge. */
  beat(i: number, t: number): { readonly phase: number; readonly effort: number };
  /** Jaw opening 0..1: open for the lunge, shut on the gulp. */
  jaw(i: number, t: number): number;
  /** How much of link i is left (1 whole .. 0 swallowed). */
  left(i: number, t: number): number;
  /** The hero at time t: the newest link that has started its zoom. */
  heroAt(t: number): number;
  /** The camera: world point at the screen centre and screen width in metres. */
  camera(t: number): { readonly centre: Pt; readonly width: number };
}

export function createClimb(specs: readonly LinkSpec[], start: Pt = { x: 0, y: 0 }): Climb {
  const links: Link[] = [];
  // Each link's path depends on where its prey is when it gulps, so they're laid out in order.
  const cruiseMouth = (l: { at: Pt; dir: 1 | -1; length: number; gulp: number }, t: number): Pt => {
    const u = Math.max(0, t - l.gulp);
    return {
      x: l.at.x + l.dir * CRUISE * l.length * u,
      y: l.at.y - BOB * l.length * Math.sin(2 * Math.PI * BOB_HZ * u),
    };
  };
  specs.forEach((spec, i) => {
    const length = SPECIES[spec.kind].length;
    const dir: 1 | -1 = i % 2 === 0 ? 1 : -1;
    const prev = links[i - 1];
    const at = prev ? cruiseMouth(prev, spec.gulp) : start;
    links.push({ ...spec, length, dir, at, eaten: Infinity });
  });
  const linked: Link[] = links.map((l, i) => ({ ...l, eaten: links[i + 1]?.gulp ?? Infinity }));

  const mouth = (i: number, t: number): Pt => {
    const l = linked[i]!;
    if (i === 0 || t >= l.gulp) return cruiseMouth(l, t);
    const d = l.gulp - t;
    return { x: l.at.x - l.dir * approach(d) * (l.reach ?? 1) * l.length, y: l.at.y + 0.06 * l.length * Math.sin(d * 0.9) };
  };
  const body = (i: number, t: number): Pt => {
    const l = linked[i]!;
    const m = mouth(i, t);
    return { x: m.x - l.dir * NOSE * l.length, y: m.y };
  };
  const tilt = (i: number, t: number): number => {
    const l = linked[i]!;
    const a = mouth(i, t - 0.05);
    const b = mouth(i, t + 0.05);
    const dx = (b.x - a.x) * l.dir;
    return Math.max(-0.25, Math.min(0.25, Math.atan2(-(b.y - a.y), Math.max(1e-9, dx))));
  };
  const beat = (i: number, t: number): { phase: number; effort: number } => {
    const l = linked[i]!;
    const d = l.gulp - t;
    const lunge = i > 0 && d > -0.3 && d < 0.8 ? 1 - Math.abs(d - 0.25) / 0.55 : 0;
    const effort = Math.max(0.25, Math.min(1, lunge));
    return { phase: 2 * Math.PI * (1.4 * t + 0.6 * smooth(-d / 0.6)), effort };
  };
  const jaw = (i: number, t: number): number => {
    const l = linked[i]!;
    if (i === 0) return 0;
    const d = l.gulp - t;
    if (d > 0.7 || d < -0.25) return 0;
    return d > 0 ? smooth((0.7 - d) / 0.45) : 1 - smooth(-d / 0.25);
  };
  const left = (i: number, t: number): number => {
    const e = linked[i]!.eaten;
    return t < e ? 1 : Math.max(0, 1 - (t - e) / SWALLOW_S);
  };
  const heroAt = (t: number): number => {
    let h = 0;
    linked.forEach((l, i) => {
      if (i > 0 && t >= l.zoomFrom) h = i;
    });
    return h;
  };
  /** Where the camera looks while link i is the hero: its body, drawn towards its prey before the gulp. */
  const focus = (i: number, t: number): Pt => {
    const b = body(i, t);
    const l = linked[i]!;
    if (i === 0) return b;
    const prey = mouth(i - 1, Math.min(t, l.gulp));
    const k = 0.5 * (1 - smooth((t - l.gulp) / 1.2));
    return { x: b.x + (prey.x - b.x) * k, y: b.y + (prey.y - b.y) * k };
  };
  const widthOf = (i: number): number => linked[i]!.frame * linked[i]!.length;
  const camera = (t: number): { centre: Pt; width: number } => {
    const h = heroAt(t);
    const l = linked[h]!;
    if (h === 0 || t >= l.zoomTo) return { centre: focus(h, t), width: widthOf(h) };
    const u = smooth((t - l.zoomFrom) / (l.zoomTo - l.zoomFrom));
    const a = focus(h - 1, t);
    const b = focus(h, t);
    const w = Math.exp(Math.log(widthOf(h - 1)) + (Math.log(widthOf(h)) - Math.log(widthOf(h - 1))) * u);
    // The centre moves with the log of the width, so the zoom looks steady.
    return { centre: { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u }, width: w };
  };
  return { links: linked, mouth, body, tilt, beat, jaw, left, heroAt, camera };
}
