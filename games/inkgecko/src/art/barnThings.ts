import type { Rng } from '../logic/rng';
import { blob, body, castShadow, outline, polar, SHADOW } from './groundKit';
import { closed, type Draw, oval, pt, shade, TAU } from './kit';
import { PAPER_FILL } from './palette';
import type { Pt } from './pen';
import { OAK, OAK_DARK } from './barnParts';
import { mix, rgba } from './wash';

/**
 * The barn's things, seen from above: a cart wheel leaning on a wall, milk
 * churns, a lantern on its hook, the ladder up to the hayloft, sacks of
 * grain, a coil of rope and a horseshoe. Board coordinates; each takes the
 * rng it draws its variety from.
 */
const TIN = '#b7bcc0';
const TIN_DEEP = '#6f7780';
const IRON = '#45464e';
const HESSIAN = '#c7a979';
const HESSIAN_DEEP = '#8a6c46';
const ROPE = '#c9a56a';
const LAMP_GLOW = '#f7d77e';
const LADDER_WOOD = '#b28d62';

/** An ellipse round c: radius ra along unit vector u, rb across it. */
function ell(c: Pt, u: Pt, ra: number, rb: number, n = 32): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const t = (i / n) * TAU;
    return pt(c.x + u.x * Math.cos(t) * ra - u.y * Math.sin(t) * rb, c.y + u.y * Math.cos(t) * ra + u.x * Math.sin(t) * rb);
  });
}

/**
 * An old cart wheel, radius r, leaning on a wall whose inward normal is
 * `out`: foreshortened across the wall, iron tyre, felloes, twelve spokes
 * and the hub. `c` is its centre as seen from above.
 */
export function cartWheel(d: Draw, c: Pt, r: number, out: Pt, rng: Rng): void {
  const { pen } = d;
  const along = pt(-out.y, out.x);
  const k = 0.5;
  const rim = ell(c, along, r, r * k, 48);
  const inner = ell(c, along, r - 9, (r - 9) * k, 40);
  // Its shadow: the wheel thrown long across the floor.
  const rimShadow = ell(c, along, r + 1, (r + 1) * k, 40);
  const holeShadow = ell(c, along, r - 10, (r - 10) * k, 32);
  castShadow(d, [...rimShadow, rimShadow[0]!, ...[...holeShadow, holeShadow[0]!].reverse()], 9, 0.16);
  const rimBand = [...rim, rim[0]!, ...[...inner, inner[0]!].reverse()];
  pen.fill(rimBand, PAPER_FILL, 1);
  pen.fill(rimBand, mix(OAK, '#a88660', 0.4), 0.8);
  // Spokes from the hub to the felloes, the far ones in shade.
  for (let i = 0; i < 12; i++) {
    const t = (i / 12) * TAU + 0.13;
    const p = pt(c.x + along.x * Math.cos(t) * (r - 8) + out.x * Math.sin(t) * (r - 8) * k, c.y + along.y * Math.cos(t) * (r - 8) + out.y * Math.sin(t) * (r - 8) * k);
    const q = pt(c.x + (p.x - c.x) * 0.22, c.y + (p.y - c.y) * 0.22);
    pen.stroke([q, p], 3.4, mix(OAK, OAK_DARK, Math.sin(t) > 0 ? 0.1 : 0.4), 0.95, false);
    pen.hair([q, p], 0.5, d.ink, 0.55);
  }
  pen.clipped(rimBand, () => {
    for (let i = 0; i < 6; i++) {
      const t = (i / 6) * TAU + rng() * 0.2;
      const a = pt(c.x + along.x * Math.cos(t) * r + out.x * Math.sin(t) * r * k, c.y + along.y * Math.cos(t) * r + out.y * Math.sin(t) * r * k);
      pen.hair([a, pt(c.x + (a.x - c.x) * 0.8, c.y + (a.y - c.y) * 0.8)], 0.7, d.ink, 0.7);
    }
  });
  pen.crescent(rimBand, pt(-SHADOW.x * 3, -SHADOW.y * 3), () => pen.fill(rimBand, OAK_DARK, 0.35));
  // The iron tyre round it.
  pen.stroke(closed(ell(c, along, r + 1.2, (r + 1.2) * k, 48)), 2.6, IRON, 0.9, false);
  pen.stroke(closed(rim), 0.9, d.ink, 0.9, false);
  pen.hair(closed(inner), 0.7, d.ink, 0.85);
  const hub = ell(c, along, 9, 9 * 0.8, 20);
  body(d, hub, mix(OAK, '#a88660', 0.2), 0.85);
  pen.crescent(hub, pt(-SHADOW.x * 3, -SHADOW.y * 3), () => pen.fill(hub, OAK_DARK, 0.45));
  pen.stroke(closed(ell(c, along, 5, 4, 14)), 1.4, IRON, 0.9, false);
  pen.dot(c.x, c.y, 1.8, d.ink, 0.9);
  pen.stroke(closed(hub), 1, d.ink, 0.9, false);
}

/** A milk churn, radius r, seen from above: tinned shoulders, the neck and its lid with a knob, a handle each side. */
export function milkChurn(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  const body0 = blob(c, r, r, rng, 0.02, 32);
  castShadow(d, body0, r * 0.9, 0.12);
  castShadow(d, body0, r * 0.45, 0.12);
  body(d, body0, TIN, 0.75);
  pen.crescent(body0, pt(-SHADOW.x * r * 0.4, -SHADOW.y * r * 0.4), () => pen.fill(body0, TIN_DEEP, 0.45));
  pen.crescent(body0, pt(SHADOW.x * r * 0.25, SHADOW.y * r * 0.25), () => pen.fill(body0, PAPER_FILL, 0.45));
  shade(d, body0, 0.25);
  // A few dents and rubs.
  for (let k = 0; k < 2; k++) {
    const p = polar(c, rng() * TAU, r * (0.65 + rng() * 0.2));
    pen.hair([polar(p, 0.4, -3), polar(p, 0.6, 3)], 0.5, TIN_DEEP, 0.6);
  }
  for (const s of [1, -1]) {
    const a = polar(c, Math.PI / 2 + s * Math.PI / 2 + 0.2, r - 2);
    const handle = [polar(a, -1.2, 4), polar(a, 0, 6 * s), polar(a, 1.2, 4)];
    pen.stroke(handle, 2.2, IRON, 0.9, false);
  }
  pen.stroke(closed(body0), 1.2, d.ink, 0.9);
  const neck = oval(c.x, c.y, r * 0.58, r * 0.58, 24);
  pen.fill(neck, TIN_DEEP, 0.2);
  pen.hair(closed(neck), 0.8, d.ink, 0.8);
  const lid = oval(c.x - 0.6, c.y - 0.8, r * 0.48, r * 0.48, 24);
  body(d, lid, mix(TIN, '#d9dcde', 0.4), 0.8);
  pen.crescent(lid, pt(-SHADOW.x * 2.5, -SHADOW.y * 2.5), () => pen.fill(lid, TIN_DEEP, 0.4));
  pen.stroke(closed(lid), 0.9, d.ink, 0.9, false);
  // The lid's lifting handle: a little iron bail across it.
  const ha = rng() * Math.PI;
  const h0 = polar(c, ha, r * 0.3);
  const h1 = polar(c, ha + Math.PI, r * 0.3);
  pen.stroke([h0, h1].map((p) => pt(p.x + 1.2, p.y + 1.8)), 2, d.ink, 0.2, false);
  pen.stroke([h0, polar(c, ha + Math.PI / 2, 1.5), h1], 2, IRON, 0.9, false);
  pen.hair(Array.from({ length: 8 }, (_, i) => polar(c, -2.4 + i * 0.12, r * 0.82)), 1.2, PAPER_FILL, 0.8);
}

/** A storm lantern hanging from a hook at `hook` (on a post), seen from above, with its warm glow on the floor. */
export function lantern(d: Draw, hook: Pt, c: Pt): void {
  const { pen } = d;
  const { ctx } = pen;
  const g = ctx.createRadialGradient(c.x + 4, c.y + 6, 4, c.x + 4, c.y + 6, 64);
  g.addColorStop(0, rgba(LAMP_GLOW, 0.35));
  g.addColorStop(0.5, rgba(LAMP_GLOW, 0.12));
  g.addColorStop(1, rgba(LAMP_GLOW, 0));
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(c.x - 64, c.y - 64, 136, 136);
  ctx.restore();
  pen.stroke([hook, pt((hook.x + c.x) / 2, (hook.y + c.y) / 2 - 1), c], 1.3, IRON, 0.95, false);
  const base = oval(c.x, c.y, 9, 9, 20);
  castShadow(d, base, 16, 0.14);
  pen.fill(base, IRON, 0.75);
  const glass = oval(c.x, c.y, 6.5, 6.5, 18);
  pen.fill(glass, LAMP_GLOW, 0.95);
  pen.fill(oval(c.x - 1.5, c.y - 1.5, 3, 3, 10), PAPER_FILL, 0.9);
  pen.hair(closed(glass), 0.6, d.ink, 0.7);
  for (let k = 0; k < 4; k++) pen.hair([polar(c, (k / 4) * TAU + 0.4, 3.5), polar(c, (k / 4) * TAU + 0.4, 8.5)], 1, IRON, 0.9);
  pen.stroke(closed(oval(c.x, c.y, 3.4, 3.4, 12)), 1.2, IRON, 0.95, false);
  pen.stroke(closed(base), 1, d.ink, 0.9, false);
}

/**
 * The ladder up to the hayloft, leaning on a wall: its foot at `foot` on
 * the floor, its top at `top` against the wall, `wide` across. Nearer the
 * eye at the top, so a little wider there; its shadow is thrown long.
 */
export function barnLadder(d: Draw, foot: Pt, top: Pt, wide: number, rng: Rng): void {
  const { pen } = d;
  const len = Math.hypot(top.x - foot.x, top.y - foot.y);
  const u = pt((top.x - foot.x) / len, (top.y - foot.y) / len);
  const n = pt(-u.y, u.x);
  const at = (t: number, s: number): Pt => {
    const half = (wide / 2) * (1 + 0.18 * t);
    return pt(foot.x + u.x * len * t + n.x * half * s, foot.y + u.y * len * t + n.y * half * s);
  };
  const rail = (s: number): Pt[] => [at(0, s - 0.13), at(1, s - 0.13 * 1.2), at(1, s + 0.13 * 1.2), at(0, s + 0.13)];
  const rungs = Array.from({ length: Math.floor(len / 17) }, (_, k) => (k + 0.7) / Math.floor(len / 17));
  for (const s of [1, -1]) castShadow(d, rail(s), 16, 0.13);
  for (const t of rungs) {
    const rung = [at(t - 0.015, -1), at(t + 0.015, -1), at(t + 0.015, 1), at(t - 0.015, 1)];
    castShadow(d, rung, 6 + 12 * t, 0.12);
    body(d, rung, mix(LADDER_WOOD, OAK, rng() * 0.4), 0.72);
    pen.crescent(rung, pt(-SHADOW.x * 1.5, -SHADOW.y * 1.5), () => pen.fill(rung, OAK_DARK, 0.35));
    pen.stroke(outline(rung, 4), 0.8, d.ink, 0.85, false);
  }
  for (const s of [1, -1]) {
    const r = rail(s);
    body(d, r, LADDER_WOOD, 0.75);
    pen.clipped(r, () => {
      for (let k = 0; k < len / 20; k++) {
        const t = rng();
        pen.hair([at(t, s + (rng() - 0.5) * 0.12), at(Math.min(1, t + 0.1 + rng() * 0.1), s + (rng() - 0.5) * 0.12)], 0.4, d.ink, 0.35);
      }
    });
    pen.crescent(r, pt(-SHADOW.x * 2.5, -SHADOW.y * 2.5), () => pen.fill(r, OAK_DARK, 0.35));
    pen.stroke(outline(r, 6), 1, d.ink, 0.9);
  }
}

/** A sack of grain lying on the floor, ~r long either side of c: plump hessian, folds gathered to the tied neck at one end. */
export function grainSack(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  const turn = rng() * TAU;
  const u = pt(Math.cos(turn), Math.sin(turn));
  const n = pt(-u.y, u.x);
  const at = (s: number, t: number): Pt => pt(c.x + u.x * s + n.x * t, c.y + u.y * s + n.y * t);
  // Plump at the bottom end (s = -r), drawn in towards the neck (s = +r).
  const half = (s: number): number => r * 0.62 * (s < 0.35 * r ? 1 - 0.08 * ((s + r) / (1.35 * r)) ** 4 : Math.max(0.28, 1 - ((s - 0.35 * r) / (0.75 * r)) ** 1.6 * 0.72));
  const steps = 14;
  const side = (k: number): Pt[] => Array.from({ length: steps + 1 }, (_, i) => {
    const s = -r + (2 * r * i) / steps;
    return at(s, k * half(s) + Math.sin(i * 1.7 + turn) * 0.8);
  });
  const bottom = Array.from({ length: 7 }, (_, i) => at(-r - Math.sin((i / 6) * Math.PI) * r * 0.18, r * 0.62 * Math.cos((i / 6) * Math.PI)));
  const sack = [...bottom, ...side(-1).slice(1), ...side(1).reverse().slice(1, -1)];
  castShadow(d, sack, r * 0.35, 0.18);
  body(d, sack, mix(HESSIAN, '#b9a283', rng() * 0.5), 0.75);
  const neck = at(r * 1.02, 0);
  pen.clipped(sack, () => {
    pen.hatch(sack, 2.1, turn + 0.05, 0.35, { color: HESSIAN_DEEP, alpha: 0.35 });
    pen.hatch(sack, 2.1, turn + Math.PI / 2, 0.35, { color: HESSIAN_DEEP, alpha: 0.28 });
    // Folds drawn in to the neck.
    for (const t of [-0.45, -0.18, 0.12, 0.4]) pen.hair([neck, at(r * 0.45, t * r * 0.7), at(r * (0.05 - rng() * 0.2), t * r * 1.05)], 0.6, mix(HESSIAN_DEEP, d.ink, 0.3), 0.6);
    // A faded stencil on its belly.
    pen.fill(blob(at(-r * 0.35, 0), r * 0.32, r * 0.2, rng, 0.2, 12, turn), '#6f5a86', 0.13);
    pen.hair([at(-r * 0.6, -r * 0.12), at(-r * 0.1, -r * 0.12)], 0.6, '#6f5a86', 0.25);
  });
  pen.crescent(sack, pt(-SHADOW.x * r * 0.3, -SHADOW.y * r * 0.3), () => pen.fill(sack, HESSIAN_DEEP, 0.4));
  shade(d, sack, 0.25);
  pen.stroke(closed(sack), 1.1, d.ink, 0.9);
  // The tied neck: the string round it and a tuft of hessian beyond.
  const tuft = blob(at(r * 1.12, 0), r * 0.18, r * 0.24, rng, 0.3, 12, turn);
  body(d, tuft, HESSIAN, 0.8);
  pen.hair(closed(tuft), 0.6, d.ink, 0.85);
  pen.stroke([at(r * 0.98, -r * 0.2), at(r * 1.0, 0), at(r * 0.98, r * 0.2)], 1.6, '#6b5233', 0.95, false);
  pen.hair([at(r * 1.0, r * 0.1), at(r * 1.15, r * 0.35), at(r * 1.1, r * 0.5)], 0.7, '#6b5233', 0.85);
}

/** A coil of rope lying on the floor, radius ~r: turns of twisted rope round a hole, a loose end trailing off. */
export function ropeCoil(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  const { ctx } = pen;
  const turns = 4;
  const ph = rng() * TAU;
  const spiral = Array.from({ length: turns * 40 + 1 }, (_, i) => {
    const t = i / 40;
    return polar(c, ph + t * TAU, r * 0.35 + (r * 0.65 * t) / turns);
  });
  const end = spiral[spiral.length - 1]!;
  const tail = [end, polar(end, ph + Math.PI / 2 + 0.4, 14), polar(end, ph + Math.PI / 2 + 0.9, 30), polar(end, ph + Math.PI / 2 + 0.5, 44)];
  const all = [...spiral, ...tail.slice(1)];
  pen.stroke(all.map((p) => pt(p.x + SHADOW.x * 4, p.y + SHADOW.y * 4)), 6, d.ink, 0.14, false);
  pen.stroke(all, 5.4, mix(ROPE, '#e2c890', 0.2), 0.95, false);
  // The twist: short slanting strokes all along it.
  ctx.save();
  ctx.strokeStyle = rgba(mix(ROPE, d.ink, 0.55), 0.55);
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  for (let i = 1; i < all.length - 1; i += 2) {
    const a = all[i - 1]!;
    const b = all[i + 1]!;
    const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const v = pt((b.x - a.x) / l, (b.y - a.y) / l);
    const nn = pt(-v.y, v.x);
    const p = all[i]!;
    ctx.moveTo(p.x + nn.x * 2.4 - v.x * 1.2, p.y + nn.y * 2.4 - v.y * 1.2);
    ctx.lineTo(p.x - nn.x * 2.4 + v.x * 1.2, p.y - nn.y * 2.4 + v.y * 1.2);
  }
  ctx.stroke();
  ctx.restore();
  pen.fill(oval(c.x, c.y, r * 0.24, r * 0.24, 14), OAK_DARK, 0.3);
  pen.hair(all.map((p, i) => {
    const a = all[Math.max(0, i - 1)]!;
    const b = all[Math.min(all.length - 1, i + 1)]!;
    const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return pt(p.x - ((b.y - a.y) / l) * 2.7, p.y + ((b.x - a.x) / l) * 2.7);
  }), 0.6, d.ink, 0.75);
  // A frayed end.
  const last = tail[tail.length - 1]!;
  for (let k = 0; k < 4; k++) pen.hair([last, polar(last, ph + 0.5 + Math.PI / 2 + (rng() - 0.5) * 1.2, 4 + rng() * 3)], 0.6, ROPE, 0.9);
}

/** A horseshoe nailed up for luck, ends up, `s` across, centred at c. */
export function horseshoe(d: Draw, c: Pt, s: number): void {
  const { pen } = d;
  const shoe = Array.from({ length: 15 }, (_, i) => polar(c, -Math.PI * 0.15 + (i / 14) * Math.PI * 1.3, s * 0.5));
  pen.stroke(shoe.map((p) => pt(p.x + 1.5, p.y + 2.2)), s * 0.22, d.ink, 0.25, false);
  pen.stroke(shoe, s * 0.22, IRON, 0.95, false);
  pen.hair(shoe.map((p) => pt(p.x - 0.6, p.y - 0.6)), 0.4, '#a9abb2', 0.8);
  for (const i of [2, 5, 9, 12]) pen.dot(shoe[i]!.x, shoe[i]!.y, 0.45, PAPER_FILL, 0.8);
  pen.dot(c.x, c.y - s * 0.32, 0.9, '#2b2b30', 1);
}
