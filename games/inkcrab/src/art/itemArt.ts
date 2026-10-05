import type { FoodKind } from '../logic/items';
import { add, bezier, contact, cub, type Draw, edge, eyeDot, glint, lerp, oval, pt, ribbon, shade, skin, tint } from './kit';
import type { Pt } from './pen';
import { HIGHLIGHT } from './palette';

/** Food is drawn in a FOOD_FRAME square, centred, resting on local y = FOOD_GROUND. */
export const FOOD_FRAME = 48;
export const FOOD_GROUND = 18;
/** Texture pixels per food frame unit. */
export const FOOD_RES = 3;

/** A crust of bread: toasted edge, airy crumb. */
function crumb(d: Draw): void {
  contact(d, 0, 12);
  const shape: Pt[] = [pt(-12, 17), pt(-14, 8), pt(-8, 1), pt(2, -1), pt(11, 3), pt(14, 11), pt(10, 18)];
  skin(d, shape, '#e8c98a', 0.7);
  d.pen.clipped(shape, () => {
    d.pen.stroke([pt(-15, 9), pt(-8, 0), pt(3, -2), pt(12, 2), pt(15, 10)], 4, '#a8642a', 0.75, false);
    for (let i = 0; i < 7; i++) d.pen.dot(-7 + d.pen.rng() * 15, 7 + d.pen.rng() * 8, 0.9, '#8a5a2a', 0.7);
  });
  edge(d, shape, 1.1);
}

/** A sand hopper: curled amber body, many little legs, long antennae. */
function hopper(d: Draw): void {
  contact(d, 0, 14);
  const spine = cub(pt(-16, 8), pt(-12, -4), pt(6, -6), pt(14, 2), 12);
  const { top, bot, shape } = ribbon(spine, (u) => 9 - Math.abs(u - 0.45) * 8);
  for (let i = 2; i < 12; i += 2) {
    const b = bot[i]!;
    d.pen.stroke([b, add(b, pt(-1 + (i % 4), 6)), add(b, pt(1, 10 + (d.f + i) % 2))], 0.7, d.ink, 0.9, false);
  }
  skin(d, shape, '#d6a95a', 0.75);
  d.pen.clipped(shape, () => {
    for (let i = 1; i < 12; i += 2) d.pen.hair([top[i]!, bot[i]!], 0.5, d.ink, 0.6);
    glint(d, spine.slice(2, 10).map((p, i) => lerp(p, top[i + 2]!, 0.5)), 1.2, 0.7);
  });
  edge(d, shape, 1);
  d.pen.stroke(bezier(pt(14, 0), pt(20, -10), pt(23, -14), 6), 0.5, d.ink, 0.9, false);
  d.pen.stroke(bezier(pt(13, -1), pt(17, -12), pt(16, -18), 6), 0.5, d.ink, 0.9, false);
  eyeDot(d, 11, -1, 1.6);
}

/** A little clam, valves just gaping. */
function clam(d: Draw): void {
  contact(d, 0, 14);
  const lower = [...bezier(pt(-14, 10), pt(0, 22), pt(14, 10), 12), ...bezier(pt(14, 10), pt(0, 13), pt(-14, 10), 8).slice(1)];
  const upper = [...bezier(pt(-14, 9), pt(-12, -10), pt(2, -10), 10), ...bezier(pt(2, -10), pt(16, -6), pt(14, 9), 8).slice(1), ...bezier(pt(14, 9), pt(0, 12), pt(-14, 9), 8).slice(1)];
  skin(d, lower, '#b98aa4', 0.65);
  edge(d, lower, 1);
  skin(d, upper, '#d0a6bb', 0.6);
  d.pen.clipped(upper, () => {
    for (let k = -3; k <= 3; k++) d.pen.hair([pt(-2, -8), pt(k * 5, 12)], 0.6, '#7a4a62', 0.6);
    tint(d, oval(-4, -2, 6, 4), '#f7e6ee', 0.6);
  });
  shade(d, upper, 4, 0.45);
  edge(d, upper, 1.2);
  // The gape between the valves.
  d.pen.stroke(bezier(pt(-12, 10), pt(0, 13), pt(12, 10), 8), 1.4, '#2a2228', 0.8, false);
}

const FOODS: Readonly<Record<FoodKind, (d: Draw) => void>> = { crumb, hopper, clam };

export function drawFood(d: Draw, kind: FoodKind): void {
  FOODS[kind](d);
}

/** A highlighter swipe, drawn behind anything the crab can pick up. */
export function drawHighlight(d: Draw, w: number, h: number): void {
  const pts: Pt[] = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    const r = 0.86 + d.pen.rng() * 0.14;
    return pt(w / 2 + Math.cos(a) * (w / 2 - 2) * r, h / 2 + Math.sin(a) * (h / 2 - 2) * r);
  });
  d.pen.fill(pts, HIGHLIGHT, 0.85);
}
