import { bezier, cub, type Draw, oval, pt } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL, RED } from '../palette';
import { figure, wash } from './boats';
import { edges, FAR } from './common';
import { glow } from './estuary';
import { LAMP } from './nightCoast';
import { moonlit, NIGHT } from './nightSky';

/**
 * The boats out on the bay at night: a Queensland prawn trawler working
 * the dark, her outrigger booms up and her nets hanging off them, her deck
 * lit up under floodlights, her running lights burning; and a tinnie, a
 * little aluminium dinghy, a man sitting in her with his rod out and a
 * hurricane lantern hung at her bow. Both face right; `s` scales them.
 * Each is drawn as by day and sunk into the night (see `moonlit`), then
 * its lights are laid on, with their long reflections down the water.
 */
const HULL = '#eef0ec';
const BAND = '#2f5f8f';
const BOOT = '#7a2f2a';
const HOUSE = '#f4f1ea';
const NET = '#7f9f8a';
const ALLOY = '#aeb6bc';
const ENGINE = '#3f4448';
const GREEN_LIGHT = '#5cf08a';
const WHITE_LIGHT = '#fff8dc';
const FLOOD = '#fff1c2';

/** A shape on paper under a wash, its edge inked. */
function washed(t: Draw, shape: readonly Pt[], color: string, alpha: number, w = 0.5, ink = 1): void {
  t.pen.fill(shape, PAPER_FILL, 1);
  t.pen.fill(shape, color, alpha);
  t.pen.stroke(edges(shape, 2), w, t.ink, FAR * ink, false);
}

/** A light's reflection: a broken column of short strokes straight down the water from `x`, fading. */
export function lightPath(t: Draw, x: number, water: number, len: number, color: string, alpha: number): void {
  const { pen } = t;
  for (let y = water + 1.2; y < water + len; y += 1.4) {
    const k = (y - water) / len;
    if (pen.rng() < 0.25) continue;
    const half = 0.8 + pen.rng() * 1.6 + k * 1.2;
    const cx = x + pen.jitter(0.8 + k);
    pen.hair([pt(cx - half, y), pt(cx + half, y)], 0.7, color, alpha * (1 - k));
  }
}

/** A lamp burning: a white-hot point in a soft halo of its colour. */
function lamp(t: Draw, x: number, y: number, r: number, color: string): void {
  glow(t, x, y, r * 3.2, r * 3.2, color, 0.45);
  glow(t, x, y, r * 1.2, r * 1.2, color, 0.9);
  t.pen.dot(x, y, Math.max(0.4, r * 0.35), PAPER_FILL, 1);
}

/** The trawler's hull, house, booms and nets, as by day. */
function trawlerBody(t: Draw, x: number, water: number, s: number): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, water + dy * s);
  // The outrigger booms, raised in a tall V off the mast's foot, the nets hanging from their ends.
  const foot = P(-6, -10);
  for (const [tip, net] of [[P(-32, -40), -1], [P(18, -44), 1]] as const) {
    pen.stroke([foot, tip], 0.8 * s, t.ink, FAR, false);
    pen.hair([P(-4, -48), tip], 0.3, t.ink, FAR * 0.6);
    const bag = [tip, pt(tip.x + net * 2 * s, tip.y + 6 * s), pt(tip.x + net * 1 * s, tip.y + 15 * s), pt(tip.x - net * 2.5 * s, tip.y + 13 * s), pt(tip.x - net * 2 * s, tip.y + 4 * s)];
    washed(t, bag, NET, 0.55, 0.4, 0.7);
    pen.clipped(bag, () => {
      pen.hatch(bag, 1, 0.8, 0.25, { color: t.ink, alpha: FAR * 0.5 });
      pen.hatch(bag, 1, -0.8, 0.25, { color: t.ink, alpha: FAR * 0.5 });
    });
    pen.dot(tip.x - net * 1 * s, tip.y + 15 * s, 0.7 * s, '#e8823a', 0.9);
  }
  // The mast with its crosstree, the stay to the bow, the aerials.
  pen.stroke([P(-4, -10), P(-4, -50)], 0.9 * s, t.ink, FAR, false);
  pen.hair([P(-7, -44), P(-1, -44)], 0.5, t.ink, FAR);
  pen.hair([P(-4, -50), P(27, -12)], 0.3, t.ink, FAR * 0.6);
  // The wheelhouse forward, its windows raked.
  const house = [P(4, -10), P(19, -10), P(20.5, -19), P(5, -19.5)];
  washed(t, house, HOUSE, 0.8, 0.55);
  washed(t, [P(3.4, -19.5), P(21.4, -19), P(21, -21), P(3.8, -21.2)], BAND, 0.6, 0.45);
  pen.hair([P(9, -21.2), P(9, -27)], 0.4, t.ink, FAR);
  pen.hair([P(13, -21.2), P(13, -25)], 0.4, t.ink, FAR);
  // The hull: high in the bow, low aft where the catch is worked.
  const sheer = cub(P(-30, -8), P(-12, -7.5), P(10, -9), P(28, -15), 14);
  const stem = cub(P(28, -15), P(26.5, -8), P(24.5, -3), P(20, 0), 6);
  const hull = [...sheer, ...stem.slice(1), P(-24, 0), P(-29.5, -3.5)];
  washed(t, hull, HULL, 0.85, 0.8, 1.1);
  pen.clipped(hull, () => {
    pen.fill([...sheer.map((p) => pt(p.x, p.y + 2.4 * s)), ...[...sheer].reverse().map((p) => pt(p.x, p.y + 3.8 * s))], BAND, 0.7);
    pen.fill([P(-32, -1.8), P(32, -1.8), P(32, 1), P(-32, 1)], BOOT, 0.6);
    pen.hatch(hull, 1.5, 0.3, 0.35, { color: t.ink, alpha: FAR * 0.4, onlyBelow: water - 4 * s });
  });
  // A deckhand sorting the catch aft.
  figure(t, x - 16 * s, water - 8 * s, s * 0.9, '#e8823a', false);
  for (const dx of [-24, -20]) washed(t, [P(dx, -8), P(dx + 3, -8), P(dx + 3.2, -10.5), P(dx - 0.2, -10.5)], '#5f86a0', 0.6, 0.4);
}

/**
 * A prawn trawler working at night: a white wooden hull with a blue band,
 * the wheelhouse forward, a mast with her outrigger booms raised in a tall
 * V and her nets hanging off their ends to dry; floodlights on the mast
 * pouring light over the after deck, her lit wheelhouse windows, a white
 * masthead light and her green starboard light, all reflected down the water.
 */
export function prawnTrawler(t: Draw, x: number, water: number, s: number): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, water + dy * s);
  moonlit(t, NIGHT, 0.42, (n) => trawlerBody(n, x, water, s));
  // The floodlit deck, and the wheelhouse windows lit warm.
  glow(t, x - 12 * s, water - 14 * s, 22 * s, 12 * s, FLOOD, 0.4);
  for (const dx of [6, 10, 14.5]) {
    const pane = [P(dx, -14.5), P(dx + 3, -14.5), P(dx + 3.2, -17.6), P(dx, -17.6)];
    pen.fill(pane, LAMP, 0.9);
  }
  glow(t, x + 12 * s, water - 16 * s, 9 * s, 4 * s, LAMP, 0.35);
  for (const [dx, dy] of [[-7, -36], [-1, -36]] as const) {
    lamp(t, x + dx * s, water + dy * s, 1.6 * s, FLOOD);
    pen.fill([P(dx - 1, dy + 1), P(dx + 1, dy + 1), P(dx - 8, -10), P(dx - 20, -10)], FLOOD, 0.12);
  }
  lamp(t, x - 4 * s, water - 50.5 * s, 1 * s, WHITE_LIGHT);
  lamp(t, x + 21 * s, water - 13.5 * s, 1 * s, GREEN_LIGHT);
  for (const [dx, len, color] of [[-10, 14, FLOOD], [-4, 11, FLOOD], [11, 10, LAMP], [21, 9, GREEN_LIGHT]] as const) lightPath(t, x + dx * s, water, len * s, color, 0.75);
  wash(t, P(21, 0), P(-26, 0), s * 0.6);
}

/** The tinnie and her fisherman, as by day. */
function tinnieBody(t: Draw, x: number, water: number, s: number): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, water + dy * s);
  // The outboard tilted on her transom, its leg down in the water.
  pen.stroke([P(-14, -4), P(-16.5, 2)], 0.8 * s, t.ink, FAR, false);
  washed(t, [P(-17.5, -5), P(-13, -5.4), P(-12.6, -9), P(-17, -9.2)], ENGINE, 0.7, 0.45);
  pen.hair([P(-13, -7.5), P(-9, -8)], 0.5, t.ink, FAR);
  // The fisherman on the middle thwart, hat on, his rod out over the side.
  figure(t, x - 3 * s, water - 4.5 * s, s * 1.1, '#5f7f9a', true);
  pen.fill([P(-5.4, -11), P(-0.6, -11), P(-1.5, -12.4), P(-4.5, -12.4)], '#b39f7e', 0.85);
  pen.hair(bezier(P(-1, -6), P(8, -16), P(20, -18), 8), 0.4, t.ink, FAR * 0.8);
  pen.hair(bezier(P(20, -18), P(21, -10), P(21.5, 0), 6), 0.25, PAPER_FILL, 0.5);
  // The lantern's pole at the bow.
  pen.stroke([P(9, -5), P(9.5, -15)], 0.6 * s, t.ink, FAR, false);
  pen.hair([P(9.5, -15), P(11.5, -15)], 0.5, t.ink, FAR);
  // The hull: pressed aluminium, a ridge along her side, a blunt bow.
  const sheer = cub(P(-15, -5.5), P(-5, -4.8), P(6, -5), P(13.5, -7.5), 12);
  const stem = cub(P(13.5, -7.5), P(13, -4.5), P(11.5, -1.5), P(9, 0), 6);
  const hull = [...sheer, ...stem.slice(1), ...bezier(P(9, 0), P(-2, 0.8), P(-14, 0), 6).slice(1), P(-15.5, -5.5)];
  washed(t, hull, ALLOY, 0.65, 0.8, 1.1);
  pen.clipped(hull, () => {
    pen.hair(sheer.map((p) => pt(p.x, p.y + 2 * s)), 0.5, t.ink, FAR * 0.5);
    pen.hair(sheer.map((p) => pt(p.x, p.y + 2.6 * s)), 0.5, PAPER_FILL, 0.6);
    for (let dx = -12; dx < 10; dx += 3.5) pen.hair([P(dx, -3.8), P(dx + 0.4, -0.5)], 0.3, t.ink, FAR * 0.3);
    pen.hatch(hull, 1.4, 0.3, 0.3, { color: t.ink, alpha: FAR * 0.4, onlyBelow: water - 2.5 * s });
  });
}

/**
 * A tinnie out on the bay: an aluminium dinghy, an outboard tilted on her
 * transom, a man sitting with his rod out, and a hurricane lantern hung
 * from a pole at her bow, its warm light on him and down the water.
 */
export function tinnie(t: Draw, x: number, water: number, s: number): void {
  const { pen } = t;
  moonlit(t, NIGHT, 0.4, (n) => tinnieBody(n, x, water, s));
  const lx = x + 11.5 * s;
  const ly = water - 13 * s;
  glow(t, lx, ly + 2 * s, 18 * s, 12 * s, LAMP, 0.3);
  pen.hair([pt(lx, water - 15 * s), pt(lx, ly - 1.4 * s)], 0.3, t.ink, FAR);
  const glass = oval(lx, ly, 1.1 * s, 1.5 * s, 10);
  pen.fill(glass, LAMP, 0.9);
  pen.hair(edges(glass), 0.4, t.ink, FAR);
  lamp(t, lx, ly, 1.3 * s, LAMP);
  // His face and shoulder lit by it.
  pen.hair([pt(x - 2 * s, water - 11 * s), pt(x - 1.7 * s, water - 8 * s)], 0.6, LAMP, 0.7);
  lightPath(t, lx, water, 14 * s, LAMP, 0.8);
  pen.dot(x + 21.5 * s, water, 0.5, RED, 0.8);
}
