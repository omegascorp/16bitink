import type { Rng } from '../../logic/rng';
import { blob, edgeWash, groundWash, polar, SHADOW, wash } from '../groundKit';
import { closed, type Draw, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { type Busy, noiseOf, perArea, strokes } from '../places/farmKit';
import { specks } from '../places/farmGroundParts';
import { mix, rgba } from '../wash';
import {
  GRAVEL, GRAVEL_DEEP, H, QUARTZ, RUST, SAGE, SAGE_DEEP, type SandField, STONE_GREY, STRAW, STRAW_DEEP, VARNISH, W,
} from './dunesPlaceKit';

/**
 * The Dunes' gravel flats, where the sand has blown away: desert pavement,
 * a packed buff ground set close with small stones (dark ones glazed with
 * desert varnish, rusty ones, grey, a few white quartz), each throwing a
 * fleck of shadow; dry galleta tufts, little bursage bushes, fallen twigs.
 */

const PEBBLES = [VARNISH, VARNISH, RUST, STONE_GREY, STONE_GREY, '#b69c78', '#c8b291', QUARTZ] as const;

/** The flats' ground: paper, the buff wash, blooms where it dried, fine grit, the edges pooled darker. */
export function flats(d: Draw, rng: Rng): void {
  groundWash(d, W, H, GRAVEL, 0.7);
  for (let k = 0; k < perArea(70); k++) {
    const p = pt(rng() * W, rng() * H);
    const colour = rng() < 0.4 ? GRAVEL_DEEP : rng() < 0.5 ? '#b89a76' : PAPER_FILL;
    d.pen.fill(blob(p, 40 + rng() * 100, 26 + rng() * 60, rng, 0.35, 18, rng() * TAU), colour, 0.05 + rng() * 0.07);
  }
  for (let k = 0; k < perArea(16); k++) {
    const p = pt(rng() * W, rng() * H);
    wash(d, blob(p, 40 + rng() * 70, 24 + rng() * 40, rng, 0.35, 24, rng() * TAU), rng() < 0.5 ? GRAVEL_DEEP : '#a88a62', 0.06, 0.7);
  }
  const at = (n: number, r0: number, r1: number): (readonly [number, number, number])[] => Array.from({ length: perArea(n) }, () => [rng() * W, rng() * H, r0 + rng() * (r1 - r0)] as const);
  specks(d, GRAVEL_DEEP, 0.3, at(26000, 0.3, 0.7));
  specks(d, PAPER_FILL, 0.4, at(9000, 0.3, 0.6));
}

/** The pavement's stones, fewer where sand drifts over them and on the snake's open middle ground. */
export function pebbles(d: Draw, sand: SandField, busy: Busy, rng: Rng): void {
  const { ctx } = d.pen;
  const patch = noiseOf(rng, 90);
  const groups = PEBBLES.map(() => [] as Pt[][]);
  for (let k = 0; k < perArea(30000); k++) {
    const x = rng() * W;
    const y = rng() * H;
    const s = sand(x, y);
    const keep = (1 - s) ** 2 * (0.45 + 0.4 * patch(x, y) + 0.3 * busy(x, y));
    if (rng() > keep) continue;
    const r = 0.7 + rng() ** 2.5 * 3.2;
    const shape = blob(pt(x, y), r, r * (0.6 + rng() * 0.35), rng, 0.35, 7, rng() * TAU);
    groups[Math.floor(rng() * PEBBLES.length)]!.push(shape);
  }
  const path = (shapes: readonly Pt[][], dx = 0, dy = 0): void => {
    ctx.beginPath();
    for (const s of shapes) s.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x + dx, p.y + dy) : ctx.lineTo(p.x + dx, p.y + dy)));
  };
  ctx.save();
  ctx.fillStyle = rgba(d.ink, 0.2);
  path(groups.flat(), SHADOW.x * 0.9, SHADOW.y * 0.9);
  ctx.fill();
  groups.forEach((shapes, i) => {
    ctx.fillStyle = rgba(PEBBLES[i]!, 0.82);
    path(shapes);
    ctx.fill();
  });
  // Each stone's lit top and its fine edge.
  ctx.fillStyle = rgba(PAPER_FILL, 0.3);
  path(groups.flat().filter(() => rng() < 0.6), -0.35, -0.5);
  ctx.fill();
  ctx.strokeStyle = rgba(d.ink, 0.28);
  ctx.lineWidth = 0.3;
  path(groups.flat().filter((s) => s.length && Math.abs(s[0]!.x - s[3]!.x) > 2.2));
  ctx.stroke();
  ctx.restore();
}

/** A tuft of dry galleta grass: pale straw blades fanning from a dark base. */
function tuft(d: Draw, c: Pt, s: number, rng: Rng): void {
  d.pen.fill(blob(pt(c.x + SHADOW.x * 2, c.y + SHADOW.y * 2), s * 0.6, s * 0.45, rng, 0.3, 10), d.ink, 0.12);
  const n = 10 + Math.floor(rng() * 8);
  strokes(d, STRAW_DEEP, 0.75, 0.55, n, () => [c.x, c.y, rng() * TAU, s * (0.5 + rng() * 0.6), (rng() - 0.5) * 2]);
  strokes(d, STRAW, 0.85, 0.5, n, () => [c.x + (rng() - 0.5), c.y + (rng() - 0.5), -2.2 + (rng() - 0.5) * 3, s * (0.4 + rng() * 0.7), (rng() - 0.5) * 2]);
  d.pen.dot(c.x, c.y, s * 0.12, STRAW_DEEP, 0.6);
}

/** A young bursage: a little grey-green dome of tiny leaves, a few dry twigs. */
function bursage(d: Draw, c: Pt, s: number, rng: Rng): void {
  const { pen } = d;
  const shape = blob(c, s, s * 0.9, rng, 0.3, 16);
  pen.fill(shape.map((p) => pt(p.x + SHADOW.x * s * 0.5, p.y + SHADOW.y * s * 0.5)), d.ink, 0.15);
  pen.fill(shape, SAGE, 0.6);
  for (let k = 0; k < 26; k++) {
    const p = polar(c, rng() * TAU, Math.sqrt(rng()) * s * 0.9);
    const lit = Math.max(0, -((p.x - c.x) * SHADOW.x + (p.y - c.y) * SHADOW.y) / s);
    pen.dot(p.x, p.y, 0.6 + rng() * 0.7, mix(SAGE_DEEP, '#c7cfa8', lit * 0.8 + rng() * 0.2), 0.85);
  }
  pen.hair(closed(shape), 0.45, d.ink, 0.35);
}

/** A fallen twig of creosote: grey, forked, with a few dead leaves. */
function twig(d: Draw, c: Pt, s: number, rng: Rng): void {
  const a = rng() * TAU;
  const end = polar(c, a, s);
  d.pen.hair([pt(c.x + 0.8, c.y + 1.2), pt(end.x + 0.8, end.y + 1.2)], 0.8, d.ink, 0.15);
  d.pen.hair([c, end], 0.7, '#7d7264', 0.85);
  const fork = polar(c, a, s * 0.5);
  d.pen.hair([fork, polar(fork, a + 0.6 * (rng() < 0.5 ? 1 : -1), s * 0.35)], 0.5, '#7d7264', 0.8);
}

/** The flats' small life: tufts, young bursage and twigs, out at the edges and off the level's things. */
export function flatsLife(d: Draw, sand: SandField, busy: Busy, clear: (p: Pt) => boolean, rng: Rng): void {
  for (let k = 0; k < perArea(900); k++) {
    const p = pt(rng() * W, rng() * H);
    if (sand(p.x, p.y) > 0.25 || rng() > busy(p.x, p.y) ** 1.3 || !clear(p)) continue;
    const pick = rng();
    if (pick < 0.5) tuft(d, p, 4 + rng() * 5, rng);
    else if (pick < 0.75) bursage(d, p, 3.5 + rng() * 4, rng);
    else twig(d, p, 6 + rng() * 8, rng);
  }
}

/** The board's edges pooled warmer and darker, so the middle stays light where the snake hunts. */
export function edges(d: Draw): void {
  edgeWash(d, W, H, '#8a6844', 0.3, W * 0.2);
}
