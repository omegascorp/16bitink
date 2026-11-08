import { createRng } from '../../logic/rng';
import { capsule, closed, type Draw, pt, ribbon } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { castShadow, ellipseAt } from './preyKit';
import type { RodentLook } from './preyRodent';

/**
 * A rodent's pink parts: the long ringed tail, the long hind feet and the
 * small forepaws, each washed, shaded away from the light and inked.
 */

/** The spine resampled every `step` px, so rings and bristles space evenly. */
function resample(spine: readonly Pt[], step: number): Pt[] {
  const out: Pt[] = [spine[0]!];
  let carry = 0;
  for (let i = 1; i < spine.length; i++) {
    const a = spine[i - 1]!;
    const b = spine[i]!;
    const l = Math.hypot(b.x - a.x, b.y - a.y);
    let t = step - carry;
    while (t <= l) {
      out.push(pt(a.x + ((b.x - a.x) * t) / l, a.y + ((b.y - a.y) * t) / l));
      t += step;
    }
    carry = l - (t - step);
  }
  return out;
}

/** The tail: a tapering pink-grey tube, rounded by shade along its far side, ringed with fine scales. */
export function paintTail(d: Draw, look: RodentLook, spine: readonly Pt[]): void {
  const { pen } = d;
  const even = resample(spine, look.ring);
  const width = (u: number): number => look.tailW * (1 - 0.8 * u);
  const { shape, top, bot } = ribbon(even, width);
  castShadow(d, shape, pt(look.tailW * 0.7, look.tailW * 1.1), 0.15);
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, look.tail, 0.9);
  pen.clipped(shape, () => {
    const lit = top.map((p, i) => pt(p.x * 0.5 + even[i]!.x * 0.5 - 0.15, p.y * 0.5 + even[i]!.y * 0.5 - 0.25));
    pen.crescent(shape, pt(-look.tailW * 0.3, -look.tailW * 0.45), () => pen.fill(shape, look.tailDeep, 0.5));
    pen.hair(lit, look.tailW * 0.22, PAPER_FILL, 0.55);
    for (let i = 2; i < even.length - 2; i++) {
      const a = top[i]!;
      const b = bot[i]!;
      const m = pt((a.x + b.x) / 2 - (b.y - a.y) * 0.12, (a.y + b.y) / 2 + (b.x - a.x) * 0.12);
      pen.hair([a, m, b], Math.max(0.16, look.tailW * 0.09), look.tailDeep, look.ringAlpha);
    }
  });
  if (look.guard > 0) bristles(d, look, even, top, bot);
  pen.stroke(closed(shape), look.line * 0.55, d.ink, 0.85, false);
}

/** A few sparse, short bristles standing off a rat's tail. */
function bristles(d: Draw, look: RodentLook, even: readonly Pt[], top: readonly Pt[], bot: readonly Pt[]): void {
  const rng = createRng(look.seed + 11);
  for (let i = 3; i < even.length - 3; i += 2) {
    if (rng() < 0.4) continue;
    const side = rng() < 0.5 ? top : bot;
    const p = side[i]!;
    const c = even[i]!;
    const n = Math.hypot(p.x - c.x, p.y - c.y) || 1;
    const l = 0.9 + rng() * 0.8;
    const back = even[Math.min(even.length - 1, i + 1)]!;
    const q = pt(p.x + ((p.x - c.x) / n) * l + (back.x - c.x) * 0.4, p.y + ((p.y - c.y) / n) * l + (back.y - c.y) * 0.4);
    d.pen.hair([p, q], 0.22, d.ink, 0.5);
  }
}

/** A pink pad washed, shaded on its far side and inked. */
function pad(d: Draw, look: RodentLook, shape: readonly Pt[], line: number): void {
  const { pen } = d;
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, mix(look.pink, look.pale, 0.3), 0.92);
  pen.clipped(shape, () => pen.crescent(shape, pt(-0.35 * (look.wide / 13), -0.55 * (look.wide / 13)), () => pen.fill(shape, look.pinkDeep, 0.55)));
  pen.stroke(closed(shape), line, d.ink, 0.9, false);
}

/** Toes fanned round `ang` from `base`, each a small pink capsule with a dark claw at its tip. */
function toes(d: Draw, look: RodentLook, base: Pt, ang: number, spread: number, lens: readonly number[], w: number): void {
  const n = lens.length;
  lens.forEach((l, i) => {
    const a = ang + (i / (n - 1) - 0.5) * spread;
    const tip = pt(base.x + Math.cos(a) * l, base.y + Math.sin(a) * l);
    pad(d, look, capsule(base, tip, w, w * 0.75), look.line * 0.4);
    d.pen.hair([tip, pt(tip.x + Math.cos(a) * w * 0.7, tip.y + Math.sin(a) * w * 0.7)], w * 0.32, d.ink, 0.8);
  });
}

/** A long hind foot from the heel, pointing forward (turned out by `turn`), five toes at its front. */
export function rodentFoot(d: Draw, look: RodentLook, heel: Pt, s: number, turn: number): void {
  const k = look.wide / 13;
  const fl = look.len * 0.15;
  const fw = 1.9 * k;
  const c = pt(heel.x + Math.cos(turn) * fl * 0.45, heel.y + Math.sin(turn) * fl * 0.45);
  const front = pt(heel.x + Math.cos(turn) * fl * 0.82, heel.y + Math.sin(turn) * fl * 0.82);
  const sole = ellipseAt(c.x, c.y, fl * 0.5, fw * 0.5, turn, 16);
  castShadow(d, sole, pt(0.5 * k, 0.8 * k), 0.15);
  toes(d, look, front, turn + s * 0.05, 1.5, [1 * k, 1.35 * k, 1.5 * k, 1.35 * k, 0.95 * k], 0.75 * k);
  pad(d, look, sole, look.line * 0.5);
}

/** A small forepaw at the wrist: a round palm and four slim fingers splayed forward. */
export function rodentHand(d: Draw, look: RodentLook, wrist: Pt, s: number, turn: number): void {
  const k = look.wide / 13;
  const c = pt(wrist.x + Math.cos(turn) * 0.6 * k, wrist.y + Math.sin(turn) * 0.6 * k);
  const palm = ellipseAt(c.x, c.y, 1.15 * k, 0.95 * k, turn, 14);
  castShadow(d, palm, pt(0.4 * k, 0.6 * k), 0.15);
  toes(d, look, pt(c.x + Math.cos(turn) * 0.5 * k, c.y + Math.sin(turn) * 0.5 * k), turn + s * 0.1, 1.6, [1.1 * k, 1.35 * k, 1.3 * k, 1 * k], 0.65 * k);
  pad(d, look, palm, look.line * 0.45);
}
