import { closed, type Draw, pt } from '../kit';
import type { Pt } from '../pen';
import { type Blade, petalBlade } from './birdKit';

/**
 * An open wing seen from above, for the +y side (mirror y for the other):
 * a leading edge from the shoulder through the wrist to the end of the
 * hand, flight feathers rooted along it pointing back to the trailing edge
 * (secondaries along the arm, primaries fanned at the hand, the outermost
 * fingered), and the coverts over their roots. A bird supplies the paint.
 */
export interface WingSpec {
  /** Leading edge, shoulder (t = 0) to the end of the hand (t = 1). */
  readonly lead: readonly Pt[];
  /** Where along the leading edge the hand begins, 0..1. */
  readonly wrist: number;
  /** Angle the flight feathers rooted at t point (towards the trailing edge). */
  readonly dir: (t: number) => number;
  /** Length of the flight feathers rooted at t. */
  readonly chord: (t: number) => number;
  readonly secondaries: number;
  readonly primaries: number;
  readonly secW: number;
  readonly priW: number;
  /** How far across the chord the coverts reach at t, 0..1. */
  readonly coverts: (t: number) => number;
  /** How many of the outer primaries are separated fingers (pointed, narrower). */
  readonly fingers?: number;
}

export interface WingFeather {
  readonly f: Blade;
  readonly w: number;
  /** 0 at the body, 1 at the tip. */
  readonly t: number;
  readonly primary: boolean;
}

export interface Wing {
  /** Point t along the wing, k across the chord (0 the leading edge, 1 the trailing edge). */
  readonly at: (t: number, k: number) => Pt;
  /** Back to front: outermost primary first, the innermost secondary last. */
  readonly feathers: readonly WingFeather[];
  readonly coverts: Pt[];
  readonly dir: (t: number) => number;
  readonly chord: (t: number) => number;
}

/** A polyline resampled by arc length: the point t (0..1) of the way along it. */
export function along(line: readonly Pt[]): (t: number) => Pt {
  const len: number[] = [0];
  for (let i = 1; i < line.length; i++) len.push(len[i - 1]! + Math.hypot(line[i]!.x - line[i - 1]!.x, line[i]!.y - line[i - 1]!.y));
  const total = len[len.length - 1]! || 1;
  return (t) => {
    const s = Math.max(0, Math.min(1, t)) * total;
    let i = 1;
    while (i < len.length - 1 && len[i]! < s) i++;
    const a = line[i - 1]!;
    const b = line[i]!;
    const u = (s - len[i - 1]!) / (len[i]! - len[i - 1]! || 1);
    return pt(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u);
  };
}

/** Builds a wing's feathers and coverts from its spec. */
export function buildWing(spec: WingSpec): Wing {
  const lead = along(spec.lead);
  const at = (t: number, k: number): Pt => {
    const p = lead(t);
    const a = spec.dir(t);
    const c = spec.chord(t) * k;
    return pt(p.x + Math.cos(a) * c, p.y + Math.sin(a) * c);
  };
  const feathers: WingFeather[] = [];
  const fingers = spec.fingers ?? 0;
  for (let j = spec.primaries - 1; j >= 0; j--) {
    const t = spec.wrist + (1 - spec.wrist) * ((j + 0.35) / spec.primaries);
    const finger = j >= spec.primaries - fingers;
    const w = spec.priW * (finger ? 0.78 : 1);
    const root = at(t, 0.06);
    const len = spec.chord(t) * 0.97;
    const f = petalBlade(root, spec.dir(t), len, finger ? w * 0.95 : w, finger ? 0.035 : 0.02);
    feathers.push({ f, w, t, primary: true });
  }
  for (let i = spec.secondaries - 1; i >= 0; i--) {
    const t = 0.03 + (spec.wrist - 0.03) * ((i + 0.5) / spec.secondaries);
    const f = petalBlade(at(t, 0.08), spec.dir(t), spec.chord(t) * 0.93, spec.secW, 0, 12);
    feathers.push({ f, w: spec.secW, t, primary: false });
  }
  const ts = Array.from({ length: 25 }, (_, i) => i / 24);
  const coverts = [...ts.map((t) => at(t, 0)), ...[...ts].reverse().map((t) => at(t, spec.coverts(t)))];
  return { at, feathers, coverts, dir: spec.dir, chord: spec.chord };
}

/** A wing with every point moved through `f` (mirrored, swept). */
export function mapWing(w: Wing, f: (p: Pt) => Pt): Wing {
  return {
    at: (t, k) => f(w.at(t, k)),
    feathers: w.feathers.map((x) => ({ ...x, f: { shape: x.f.shape.map(f), at: (t: number, k: number) => f(x.f.at(t, k)) } })),
    coverts: w.coverts.map(f),
    dir: w.dir,
    chord: w.chord,
  };
}

export const mirrorY = (p: Pt): Pt => pt(p.x, -p.y);

/** A wing's every outline, for a cast shadow. */
export function wingOutlines(w: Wing): Pt[][] {
  return [...w.feathers.map((x) => x.f.shape), w.coverts];
}

/** How a bird paints its wing: each flight feather, then the covert mass over their roots. */
export interface WingPaint {
  readonly feather: (x: WingFeather) => void;
  readonly coverts: (w: Wing) => void;
}

/** Paints a wing back to front. */
export function paintWing(d: Draw, w: Wing, paint: WingPaint): void {
  for (const x of w.feathers) paint.feather(x);
  paint.coverts(w);
  // The leading edge, the firmest line on a wing.
  d.pen.stroke(closed(w.coverts).slice(0, 25), 0.95, d.ink, 0.95, false);
}

/**
 * Rows of small covert feathers across the wing from the greater coverts
 * (k = `from`, painted first) up to the leading edge, each row lying over
 * the one behind it; `feather` paints one (its blade, size, t and row).
 */
export function covertRows(w: Wing, rows: number, from: (t: number) => number, size: (t: number, row: number) => number, feather: (f: Blade, s: number, t: number, row: number) => void, t1 = 1): void {
  for (let r = 0; r < rows; r++) {
    const u = r / rows;
    let t = 0.02 + (r % 2) * 0.012;
    while (t < t1) {
      const s = size(t, r);
      const k = from(t) * (1 - u) - (s / w.chord(t)) * 0.9;
      const root = w.at(t, Math.max(0, k));
      const tip = w.at(t, Math.max(0.02, k + (s / w.chord(t)) * 0.95));
      const ang = Math.atan2(tip.y - root.y, tip.x - root.x);
      feather(petalBlade(root, ang, s, s * 0.95, 0, 8), s, t, r);
      const step = Math.hypot(w.at(t + 0.01, k).x - w.at(t, k).x, w.at(t + 0.01, k).y - w.at(t, k).y) / 0.01 || 1;
      t += (s * 0.72) / step;
    }
  }
}
