import { FINE } from './path';
import {
  BODY_HALF, BODY_LEN, crush, EGG, eggAt, gape, HEAD_HALF, HINGE_S, isWhole, squeeze, xray, yolkAt, yolkGlow,
} from './story';

/**
 * The snake's body as a function of time: a round tube lying along its path
 * (path.ts), described at each place s (from the snout tip) by the heights
 * of its top and its underside above the ground. Whatever is swallowed
 * swells it: over a whole egg the skin is a round sleeve that follows the
 * egg's own curve, pulled taut to the slim neck behind it; with the egg in
 * the jaws the underside follows the egg too, the jaws wrapped round it.
 * `stretch` (0..1) is how far the skin is pulled: there the scales spread
 * apart and the pale skin between them shows.
 */

export interface Bump {
  /** Centre along the body, half-length, half-height of the skin over it. */
  readonly s: number;
  readonly rx: number;
  readonly h: number;
}

export interface Swallowed {
  /** Centre along the body (world x on the straight neck), half sizes, and whether it is a whole egg. */
  readonly x: number;
  readonly rx: number;
  readonly ry: number;
  readonly whole: boolean;
  /** Height of its centre above the ground. */
  readonly cy: number;
}

export interface BodyModel {
  /** The body's radius at each whole s (0..BODY_LEN). */
  readonly half: readonly number[];
  /** How far the skin is pulled at each whole s, 0..1. */
  readonly stretch: readonly number[];
  /** Fine tables (FINE per unit): the top's and the underside's heights above the ground, the stretch, and the skin's own length coordinate. */
  readonly top: Float64Array;
  readonly bot: Float64Array;
  readonly st: Float64Array;
  readonly sig: Float64Array;
  /** Where the skin of the jaws begins (the lips' ring round an egg), and how wide the mouth is held round one (0..1). */
  readonly front: number;
  readonly open: number;
  readonly bumps: readonly Bump[];
  readonly object: Swallowed | null;
  readonly yolk: { readonly x: number; readonly glow: number } | null;
  readonly xray: number;
  readonly gape: number;
}

/** The skin's thickness over an egg, and how high the egg rests on the skin under it. */
const SKIN = 1.1;
const EGG_REST = 0.5;
/** How steeply the taut skin falls from the egg to the neck behind it, and to the head in front. */
const TAUT_BACK = 1.55;
const TAUT_FRONT = 1.8;
/** Where the lips' ring sits when the jaws hold an egg. */
const LIP_S = 5;
const TAIL = 58;

/** The unswallowed body's top height: a short rounded snout, the head, a slim neck, the body, a tapering tail. */
export function baseTop(s: number): number {
  const head = 2 * HEAD_HALF;
  const body = 2 * BODY_HALF;
  if (s < 0) return 0;
  if (s < 8) return 4.4 + (head - 4.4) * Math.sin(((s / 8) * Math.PI) / 2);
  if (s < HINGE_S - 3) return head;
  if (s < HINGE_S + 7) {
    const u = (s - (HINGE_S - 3)) / 10;
    return head + (body - head) * u * u * (3 - 2 * u);
  }
  if (s > BODY_LEN - TAIL) return Math.max(0.12, body * (1 - ((s - (BODY_LEN - TAIL)) / TAIL) ** 1.15));
  return body + 0.25 * Math.sin(s * 0.11);
}

/** The unswallowed underside's height: the chin lifts a little under the snout. */
export const baseBot = (s: number): number => (s < 4 ? 2.1 * (1 - Math.max(0, s) / 4) ** 2 : 0);

/** Half the height of the egg's outline at dx from its centre (the egg of eggArt.ts: blunt end behind), or 0 outside it. */
export function eggHalfAt(dx: number, rx: number, ry: number, whole: boolean): number {
  if (!whole) {
    const u = dx / rx;
    return Math.abs(u) >= 1 ? 0 : ry * Math.sqrt(1 - u * u);
  }
  if (dx >= rx * 1.07 || dx <= -rx * 0.93) return 0;
  let lo = 0;
  let hi = Math.PI;
  for (let i = 0; i < 26; i++) {
    const a = (lo + hi) / 2;
    const x = rx * Math.cos(a) * (1 + 0.07 * Math.cos(a));
    if (x > dx) lo = a;
    else hi = a;
  }
  const a = (lo + hi) / 2;
  return ry * Math.sin(a) * (1 - 0.04 * Math.cos(a));
}

/** A smooth maximum: rounds the join where the skin over an egg meets the neck. */
const smax = (a: number, b: number, k: number): number => {
  const h = Math.max(0, k - Math.abs(a - b));
  return Math.max(a, b) + (h * h) / (4 * k);
};

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
const smooth01 = (v: number): number => {
  const u = clamp01(v);
  return u * u * (3 - 2 * u);
};

/** How wide the jaws are held round the egg: it must be ahead of the snout and reach back into the mouth. */
function holdOf(o: { readonly x: number; readonly rx: number }): { open: number; reach: number } {
  const ahead = clamp01((2 - (o.x - o.rx)) / 12);
  const inside = clamp01((o.x + o.rx) / 10);
  // `reach`: how much of the egg the skin covers at all (none while it is still out in front of the snout).
  return { open: ahead * inside, reach: 1 - ahead * (1 - inside) };
}

export function modelAt(t: number): BodyModel {
  const ex = eggAt(t);
  const k = crush(t);
  const xr = xray(t);
  const whole = isWhole(t);
  let object: Swallowed | null = null;
  if (ex !== null) {
    const ry = EGG.ry * (1 - 0.6 * k) + 3 * k;
    const rx = EGG.rx * (1 - 0.55 * k) + 3 * k;
    object = { x: ex, rx, ry, whole, cy: ry + EGG_REST };
  }
  const glow = yolkGlow(t);
  const yolk = glow > 0.02 ? { x: yolkAt(t), glow } : null;
  const { open, reach } = object ? holdOf(object) : { open: 0, reach: 0 };
  const front = LIP_S * open;
  const sq = 1 + squeeze(t);
  const n = BODY_LEN * FINE + 1;
  const top = new Float64Array(n);
  const bot = new Float64Array(n);
  const st = new Float64Array(n);
  const sig = new Float64Array(n);
  // The skin's radius over the egg, as a table over the egg's length, for the taut envelope.
  const span: { s: number; r: number }[] = [];
  if (object && object.x + object.rx * 1.07 > -2) {
    const roomy = 1 + 0.05 * xr;
    for (let s = object.x - object.rx * 0.93; s <= object.x + object.rx * 1.07; s += 0.25) {
      const half = eggHalfAt(s - object.x, object.rx, object.ry, object.whole);
      span.push({ s, r: (half + SKIN) * sq * roomy });
    }
  }
  for (let i = 0; i < n; i++) {
    const s = i / FINE;
    const bt = baseTop(s);
    const bb = baseBot(s);
    let tp = bt;
    let bm = bb;
    if (object && span.length) {
      // The skin's radius: round the egg, then pulled taut down to the slim neck.
      let env = 0;
      for (const p of span) {
        const fall = p.s < s ? TAUT_BACK : TAUT_FRONT;
        env = Math.max(env, p.r - fall * Math.abs(s - p.s));
      }
      const rb = (bt - bb) / 2;
      const r = smax(rb, env * reach, 2.5);
      // The body's axis: through the egg's ends (on its axis), then down to the ground either side; with the egg in the jaws, the head is on it.
      const lo = object.x - object.rx * 0.82;
      const hi = object.x + object.rx * 0.82;
      const desc = 0.25 * object.rx + 11;
      const behind = 1 - smooth01((s - hi) / desc);
      const before = s >= lo ? 1 : open + (1 - open) * (1 - smooth01((lo - s) / desc));
      const w = Math.min(behind, before) * reach;
      const c = (bt + bb) / 2 + (object.cy - (bt + bb) / 2) * w;
      tp = c + r;
      bm = c - r;
    }
    if (yolk && yolk.x > 14) {
      const u = (s - yolk.x) / 9;
      if (Math.abs(u) < 1) tp = smax(tp, bb + 2 * (BODY_HALF + 3.2 * Math.min(1, glow * 1.5) * Math.sqrt(1 - u * u)), 1.5);
    }
    top[i] = tp;
    bot[i] = bm;
    const r = (tp - bm) / 2;
    st[i] = clamp01((r - (bt - bb) / 2 - 0.6) / 7);
    sig[i] = i === 0 ? 0 : sig[i - 1]! + 1 / FINE / (1 + 1.4 * st[i]!);
  }
  const half = Array.from({ length: BODY_LEN + 1 }, (_, s) => (top[s * FINE]! - bot[s * FINE]!) / 2);
  const stretch = Array.from({ length: BODY_LEN + 1 }, (_, s) => st[s * FINE]!);
  const bumps: Bump[] = object ? [{ s: object.x, rx: object.rx, h: Math.max(...half) }] : [];
  return { half, stretch, top, bot, st, sig, front, open, bumps, object, yolk, xray: xr, gape: gape(t) };
}

/** A fine table's value at s (interpolated). */
export function at(tab: Float64Array, s: number): number {
  const f = Math.max(0, Math.min(tab.length - 1, s * FINE));
  const i = Math.min(tab.length - 2, Math.floor(f));
  const u = f - i;
  return tab[i]! + (tab[i + 1]! - tab[i]!) * u;
}

/** The top edge's y at s, on the straight neck. */
export const topY = (m: BodyModel, s: number): number => -at(m.top, s);
