import { bezier, cub, type Draw, oval, pt } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL, RED } from '../palette';
import { figure, wash } from './boats';
import { edges, FAR } from './common';
import { reflection } from './water';

/**
 * The boats of a Labrador outport: a Newfoundland longliner, a stout
 * wooden boat with her high, flared bow, wheelhouse forward, a mast and
 * derrick on the foredeck and a little steadying sail aft, tubs of gear on
 * her deck; and a punt, the small open boat everyone keeps, an outboard on
 * her transom and a man in oilskins standing at the tiller. Both face
 * right, shouldering through the chop and throwing spray; `s` scales them.
 */
const HULL_RED = '#a83a2c';
const BULWARK = '#f1eee6';
const BOOT = '#2c2f36';
const HOUSE = '#f4f1ea';
const GLASS = '#6f8fa6';
const SAIL = '#c9a77a';
const PUNT_GREEN = '#3f7a5a';
const OILSKIN = '#e9c23a';
const ENGINE = '#8f979c';
const TUB = '#5f86a0';

/** A shape on paper under a wash, its edge inked. */
function washed(t: Draw, shape: readonly Pt[], color: string, alpha: number, w = 0.5, ink = 1): void {
  t.pen.fill(shape, PAPER_FILL, 1);
  t.pen.fill(shape, color, alpha);
  t.pen.stroke(edges(shape, 2), w, t.ink, FAR * ink, false);
}

/** Spray flung up and blown back off a bow at `bow` as it meets a sea. */
function spray(t: Draw, bow: Pt, s: number): void {
  const { pen } = t;
  for (let k = 0; k < 12; k++) {
    const a = -Math.PI / 2 - 0.2 - pen.rng() * 1.1;
    const r = (2 + pen.rng() * 6) * s;
    const p = pt(bow.x + Math.cos(a) * r * 0.6, bow.y + Math.sin(a) * r);
    if (k % 3) pen.dot(p.x, p.y, (0.3 + pen.rng() * 0.3) * s, PAPER_FILL, 0.9);
    else pen.hair([pt(bow.x, bow.y - 1 * s), p], 0.5, PAPER_FILL, 0.85);
  }
}

/**
 * A Newfoundland longliner: a red wooden hull with a white bulwark and a
 * black boot-top, her sheer sweeping up to a high, flared bow; the
 * wheelhouse forward with its windows, an aerial and a life ring; a mast
 * on the foredeck with its derrick, a tan steadying sail on a mizzen aft,
 * fish tubs on deck and a man in oilskins working aft.
 */
export function longliner(t: Draw, x: number, water: number, s: number): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, water + dy * s);
  reflection(t, x, water + 0.5, 50 * s, 7 * s, HULL_RED, 0.28);
  // The mizzen and its steadying sail, sheeted flat in the wind.
  pen.stroke([P(-23, -9), P(-23, -30)], 0.7 * s, t.ink, FAR, false);
  const sail = [P(-23.3, -29), P(-23.3, -11), P(-31, -11.5)];
  washed(t, sail, SAIL, 0.6, 0.45);
  pen.hair([P(-23.3, -20), P(-27, -11.3)], 0.3, t.ink, FAR * 0.5);
  // The foremast with its crosstree, stays and derrick boom.
  const head = P(17, -40);
  pen.stroke([P(17, -12), head], 0.9 * s, t.ink, FAR, false);
  pen.hair([P(14.5, -34), P(19.5, -34)], 0.5, t.ink, FAR);
  pen.hair([head, P(27, -16)], 0.3, t.ink, FAR * 0.6);
  pen.hair([head, P(-23, -30)], 0.3, t.ink, FAR * 0.5);
  pen.stroke([P(17, -14), P(6, -27)], 0.6 * s, t.ink, FAR * 0.9, false);
  pen.hair([P(17, -38), P(6, -27)], 0.3, t.ink, FAR * 0.6);
  // Fish tubs and a crewman aft.
  for (const dx of [-17, -13.5]) washed(t, [P(dx, -9), P(dx + 3, -9), P(dx + 3.3, -12), P(dx - 0.3, -12)], TUB, 0.6, 0.4);
  figure(t, x - 8 * s, water - 9 * s, s * 0.9, '#e8823a', false);
  // The wheelhouse: raked front windows, a side door, the life ring, an aerial on the roof.
  const house = [P(-2, -9.5), P(11, -9.5), P(12.5, -18.5), P(-1.5, -19)];
  washed(t, house, HOUSE, 0.8, 0.55);
  for (const dx of [0.5, 4, 7.5]) pen.fill([P(dx, -14.5), P(dx + 2.6, -14.5), P(dx + 2.8, -17.6), P(dx, -17.6)], GLASS, 0.7);
  pen.fill([P(9.8, -14.4), P(11.6, -14.4), P(12.2, -17.8), P(10.2, -17.8)], GLASS, 0.6);
  pen.circle(x + 5.5 * s, water - 11.8 * s, 1.1 * s, 0.6 * s, '#e8823a');
  washed(t, [P(-2.6, -19), P(13, -18.5), P(12.6, -20.2), P(-2.2, -20.4)], HULL_RED, 0.6, 0.45);
  pen.hair([P(3, -20.4), P(3, -26)], 0.4, t.ink, FAR);
  pen.hair([P(1.6, -24.5), P(4.4, -24.5)], 0.4, t.ink, FAR);
  // The hull.
  const sheer = cub(P(-28, -8.5), P(-10, -8), P(12, -9), P(27, -16.5), 14);
  const stem = cub(P(27, -16.5), P(25.5, -9), P(23.5, -3), P(19, 0), 6);
  const hull = [...sheer, ...stem.slice(1), P(-22, 0), P(-27, -3.5)];
  pen.fill(hull, PAPER_FILL, 1);
  pen.fill(hull, HULL_RED, 0.62);
  pen.clipped(hull, () => {
    pen.fill([...sheer, ...[...sheer].reverse().map((p) => pt(p.x, p.y + 2.6 * s))], BULWARK, 0.85);
    pen.hair(sheer.map((p) => pt(p.x, p.y + 2.8 * s)), 0.4, t.ink, FAR * 0.6);
    pen.fill([P(-30, -1.8), P(30, -1.8), P(30, 1), P(-30, 1)], BOOT, 0.55);
    pen.hatch(hull, 1.5, 0.3, 0.35, { color: t.ink, alpha: FAR * 0.4, onlyBelow: water - 4 * s });
  });
  pen.stroke(edges(hull), 0.8 * s, t.ink, FAR * 1.1, false);
  spray(t, P(23, -2), s);
  wash(t, P(20, 0), P(-24, 0), s * 0.7);
}

/**
 * A punt: a small open boat painted white with a red gunwale and a green
 * bottom, an outboard on her transom, a heap of orange buoys aboard, one man
 * in yellow oilskins and sou'wester standing at the tiller and another
 * sitting forward.
 */
export function punt(t: Draw, x: number, water: number, s: number): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, water + dy * s);
  reflection(t, x, water + 0.5, 30 * s, 6 * s, BULWARK, 0.3);
  // The outboard: cowl on the transom, the leg raked down into the water.
  pen.stroke([P(-16, -5), P(-18.5, 2)], 0.8 * s, t.ink, FAR, false);
  washed(t, [P(-19.5, -6), P(-15, -6.2), P(-14.6, -9.4), P(-18.8, -9.8)], ENGINE, 0.6, 0.45);
  pen.hair([P(-15, -8), P(-10, -9)], 0.5, t.ink, FAR);
  // The skipper standing at the tiller, the second hand forward, buoys heaped between.
  figure(t, x - 11 * s, water - 5.5 * s, s * 1.1, OILSKIN, false);
  pen.fill(oval(x - 11 * s, water - 14.6 * s, 2.2 * s, 0.6 * s, 10), OILSKIN, 0.85);
  for (const [dx, dy] of [[-2, -6.6], [0.6, -7.2], [3, -6.6], [1.4, -8.6]] as const) {
    const b = oval(x + dx * s, water + dy * s, 1.3 * s, 1.1 * s, 10);
    pen.fill(b, '#e8823a', 0.85);
    pen.hair(edges(b), 0.3, t.ink, FAR * 0.8);
  }
  figure(t, x + 8 * s, water - 5.5 * s, s * 1.1, '#5f7f9a', true);
  const sheer = cub(P(-16, -6.5), P(-6, -5.6), P(6, -5.8), P(15.5, -9), 12);
  const stem = cub(P(15.5, -9), P(14.5, -5), P(13, -2), P(10, 0), 6);
  const hull = [...sheer, ...stem.slice(1), ...bezier(P(10, 0), P(-2, 1), P(-14, 0), 6).slice(1), P(-16.5, -6.5)];
  pen.fill(hull, PAPER_FILL, 1);
  pen.fill(hull, BULWARK, 0.85);
  pen.clipped(hull, () => {
    pen.fill([...sheer, ...[...sheer].reverse().map((p) => pt(p.x, p.y + 1.3 * s))], RED, 0.6);
    pen.fill([P(-20, -1.6), P(20, -1.6), P(20, 2), P(-20, 2)], PUNT_GREEN, 0.55);
    for (const k of [2.8, 4.4]) pen.hair(sheer.map((p) => pt(p.x, p.y + k * s)), 0.3, t.ink, FAR * 0.45);
    pen.hatch(hull, 1.4, 0.3, 0.35, { color: t.ink, alpha: FAR * 0.4, onlyBelow: water - 3 * s });
  });
  pen.stroke(edges(hull), 0.8 * s, t.ink, FAR * 1.1, false);
  spray(t, P(12.5, -2), s * 0.8);
  wash(t, P(11, 0), P(-15, 0), s * 0.7);
}
