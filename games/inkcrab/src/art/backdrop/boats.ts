import { bezier, cub, type Draw, lerp, oval, pt, tube } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL, RED } from '../palette';
import { edges, FAR } from './common';
import { reflection } from './water';

/**
 * The lagoon's boats, drawn as a marine illustrator would: planked hulls
 * with strakes and a painted band, spars and standing rigging as fine
 * lines, sails with their cloth seams, and a broken reflection beneath.
 * All face right; `s` scales them.
 */
const TEAK = '#c89a66';
const BAND = '#2f7f8f';
const CANVAS = '#eee2c6';
const SAIL = '#f2e9d2';
const HULL_WHITE = '#f4f1ea';
const GLASS = '#7fc4cf';

/** A small figure seen side-on: head, a shirt of colour, sitting or standing. */
function figure(t: Draw, x: number, base: number, s: number, shirt: string, sitting: boolean): void {
  const { pen } = t;
  const h = (sitting ? 6 : 9) * s;
  const body = [pt(x - 1.3 * s, base), pt(x + 1.3 * s, base), pt(x + 1.1 * s, base - h + 2 * s), pt(x - 1.1 * s, base - h + 2 * s)];
  pen.fill(body, shirt, 0.7);
  pen.hair(edges(body), 0.45, t.ink, FAR);
  pen.fill(oval(x, base - h + 0.6 * s, 1.2 * s, 1.3 * s, 10), '#a9774f', 0.8);
  pen.hair(edges(oval(x, base - h + 0.6 * s, 1.2 * s, 1.3 * s, 10)), 0.4, t.ink, FAR);
}

/** The Maldives flag, tiny: red field, green panel, a pale crescent. */
function flag(t: Draw, at: Pt, s: number): void {
  const { pen } = t;
  const field = [at, pt(at.x - 7 * s, at.y + 0.6 * s), pt(at.x - 7 * s, at.y + 4.6 * s), pt(at.x, at.y + 4 * s)];
  pen.fill(field, RED, 0.75);
  pen.fill([pt(at.x - 1.8 * s, at.y + 1.1 * s), pt(at.x - 5.2 * s, at.y + 1.4 * s), pt(at.x - 5.2 * s, at.y + 3.6 * s), pt(at.x - 1.8 * s, at.y + 3.2 * s)], '#3f8f5a', 0.85);
  pen.dot(at.x - 3.4 * s, at.y + 2.3 * s, 0.6 * s, PAPER_FILL, 0.9);
  pen.hair(edges(field), 0.4, t.ink, FAR);
}

/** Foam curling off a bow, and a few streaks of wake. */
function wash(t: Draw, bow: Pt, stern: Pt, s: number): void {
  const { pen } = t;
  pen.hair(bezier(pt(bow.x - 4 * s, bow.y), pt(bow.x + 1 * s, bow.y - 2 * s), pt(bow.x + 4 * s, bow.y + 0.5 * s), 5), 0.9 * s, PAPER_FILL, 0.9);
  pen.hair(bezier(pt(bow.x - 2 * s, bow.y + 1 * s), pt(bow.x + 2 * s, bow.y - 0.5 * s), pt(bow.x + 5 * s, bow.y + 1.2 * s), 4), 0.45, t.ink, FAR * 0.6);
  for (let k = 0; k < 3; k++) pen.hair([pt(stern.x - (3 + k * 5) * s, stern.y + k * 0.8 * s), pt(stern.x - (8 + k * 7) * s, stern.y + k * 0.8 * s)], 0.6, PAPER_FILL, 0.8 - k * 0.2);
}

/**
 * A dhoni: a carvel-planked hull with a painted band, a tall curved prow
 * ending in a scroll, a raised stern with its rudder and tiller, a canvas
 * awning on posts, a square sail on a yard, stays, a flag and a crew.
 */
export function dhoni(t: Draw, x: number, water: number, s: number): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, water + dy * s);
  const sheer = cub(P(-28, -14), P(-16, -6), P(8, -6.5), P(21, -9), 16);
  const keel = cub(P(21, 0), P(10, 1.5), P(-14, 1.5), P(-25, -3), 16);
  const hull = [...sheer, ...cub(P(21, -9), P(23, -6), P(22.5, -2), P(21, 0), 5).slice(1), ...keel.slice(1), ...cub(P(-25, -3), P(-28, -6), P(-29, -11), P(-28, -14), 5).slice(1)];
  const top = P(-6, -46);

  reflection(t, x - 2 * s, water + 1, 50 * s, 10 * s, '#a87b4c', 0.35);
  // Mast, yard and the square sail behind everything else on deck.
  pen.stroke([P(-6, -6), top], 1.1 * s, t.ink, FAR, false);
  const yardL = P(-18, -40);
  const yardR = P(8, -44);
  const footL = P(-17, -15);
  const footR = P(9, -17);
  const sail = [yardL, ...bezier(yardL, P(-4, -43.5), yardR, 6).slice(1), ...bezier(yardR, P(13, -30), footR, 8).slice(1), ...bezier(footR, P(-4, -14), footL, 6).slice(1), ...bezier(footL, P(-13, -28), yardL, 8).slice(1)];
  pen.fill(sail, PAPER_FILL, 1);
  pen.fill(sail, SAIL, 0.8);
  pen.clipped(sail, () => {
    // Cloth seams, the belly's shadow, and a row of reef points.
    for (let k = 1; k < 6; k++) pen.hair([lerp(yardL, yardR, k / 6), lerp(footL, footR, k / 6)], 0.4, t.ink, FAR * 0.55);
    pen.hatch([P(2, -42), P(14, -42), P(14, -14), P(4, -14)], 1.6, 1.25, 0.4, { color: t.ink, alpha: FAR * 0.5 });
    for (let k = 1; k < 9; k++) {
      const p = lerp(P(-17.5, -33), P(9.5, -36), k / 9);
      pen.hair([p, pt(p.x, p.y + 2 * s)], 0.35, t.ink, FAR * 0.7);
    }
  });
  pen.stroke(edges(sail), 0.8, t.ink, FAR, false);
  pen.stroke([pt(yardL.x - 2 * s, yardL.y + 0.3 * s), pt(yardR.x + 2 * s, yardR.y - 0.3 * s)], 1.2 * s, t.ink, FAR * 1.1, false);
  // Standing rigging and the sheet.
  pen.hair([top, P(28, -30)], 0.4, t.ink, FAR * 0.8);
  pen.hair([top, P(-28, -15)], 0.4, t.ink, FAR * 0.8);
  pen.hair(bezier(footR, P(14, -12), P(18, -9), 4), 0.4, t.ink, FAR * 0.8);
  pen.hair(bezier(footL, P(-22, -14), P(-24, -12), 4), 0.4, t.ink, FAR * 0.8);
  flag(t, P(-6, -46), s);

  // The awning: canvas on posts over the after deck, its ribs showing through.
  const roof = [P(-24, -21), ...bezier(P(-24, -21), P(-16, -24), P(-8, -21), 6).slice(1), P(-8, -19), ...bezier(P(-8, -19), P(-16, -21.5), P(-24, -19), 6).slice(1)];
  for (const px of [-23, -19, -15, -11, -8.5]) pen.hair([P(px, -19.5), P(px, -8.5)], 0.5, t.ink, FAR * 0.9);
  pen.fill(roof, PAPER_FILL, 1);
  pen.fill(roof, CANVAS, 0.7);
  for (const px of [-20, -16, -12]) pen.hair([P(px, -22.5), P(px, -19.6)], 0.35, t.ink, FAR * 0.6);
  pen.stroke(edges(roof), 0.7, t.ink, FAR, false);
  const valance: Pt[] = [];
  for (let k = 0; k <= 8; k++) valance.push(P(-24 + 2 * k, k % 2 ? -18 : -19.2));
  pen.hair(valance, 0.4, t.ink, FAR * 0.8);
  figure(t, x - 13 * s, water - 8 * s, s, '#d9876b', true);
  figure(t, x + 10 * s, water - 7.5 * s, s, '#e9dcc0', false);

  // The rudder hung off the sternpost, with its tiller.
  const rudder = [P(-27.5, -7), P(-29.8, -6.5), P(-30.8, 1.2), P(-27.2, 0.6)];
  pen.fill(rudder, PAPER_FILL, 1);
  pen.fill(rudder, TEAK, 0.7);
  pen.stroke(edges(rudder), 0.7, t.ink, FAR, false);
  pen.stroke([P(-29, -10), P(-22, -13)], 0.8 * s, t.ink, FAR, false);

  // The hull: wash, painted band below the sheer, strakes, butt joints, shadow.
  pen.fill(hull, PAPER_FILL, 1);
  pen.fill(hull, TEAK, 0.6);
  pen.clipped(hull, () => {
    const strake = (k: number): Pt[] => sheer.map((p, i) => lerp(p, keel[keel.length - 1 - i]!, k));
    const band = [...strake(0.1), ...[...strake(0.28)].reverse()];
    pen.fill(band, BAND, 0.55);
    for (const k of [0.1, 0.28, 0.48, 0.68]) pen.hair(strake(k), 0.45, t.ink, FAR * 0.75);
    for (let i = 2; i < sheer.length - 2; i += 3) {
      const k = 0.48 + ((i * 7) % 3) * 0.2;
      const a = lerp(sheer[i]!, keel[keel.length - 1 - i]!, k);
      pen.hair([a, pt(a.x + 0.3, a.y + 2.5 * s)], 0.35, t.ink, FAR * 0.6);
    }
    pen.hatch(hull, 1.6, 0.35, 0.4, { color: t.ink, alpha: FAR * 0.55, onlyBelow: water - 3 * s });
  });
  // A rubbing strake along the sheer.
  pen.hair(sheer.map((p) => pt(p.x, p.y + 1.2 * s)), 0.9 * s, '#8a6440', 0.6);
  pen.stroke(edges(hull), 1 * s, t.ink, FAR * 1.15, false);

  // The prow: a tall stem sweeping up and curling over into a carved scroll, notched along its front.
  const stem = bezier(P(19, -8), P(28, -12), P(28, -31), 10);
  const prow = tube(stem, 3.4 * s, 1.8 * s);
  pen.fill(prow, PAPER_FILL, 1);
  pen.fill(prow, TEAK, 0.7);
  pen.stroke(edges(prow), 0.8 * s, t.ink, FAR * 1.1, false);
  for (let i = 3; i < stem.length - 1; i += 2) pen.hair([stem[i]!, pt(stem[i]!.x + 1.6 * s, stem[i]!.y - 0.4 * s)], 0.4, t.ink, FAR * 0.8);
  pen.stroke(bezier(P(28, -31), P(28, -35), P(25, -34), 5).concat(bezier(P(25, -34), P(23.5, -33), P(25, -31.5), 4).slice(1)), 1.1 * s, t.ink, FAR * 1.1, false);
  // The low sternpost.
  pen.stroke(bezier(P(-28, -13), P(-30, -16), P(-29, -19), 4), 1.2 * s, t.ink, FAR, false);
  wash(t, P(21, 0), P(-26, 0), s);
}

/**
 * A cruising catamaran under sail: the near hull and a glimpse of the far
 * one, a deckhouse with a band of windows, a tall mast with battened main
 * and a jib, stays, a flag at the stern.
 */
export function yacht(t: Draw, x: number, water: number, s: number): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, water + dy * s);
  reflection(t, x, water + 0.5, 28 * s, 6 * s, '#9fb6bf', 0.35);
  const farHull = [P(-12, -3.5), P(12, -3.5), P(10, -1.8), P(-11, -1.8)];
  pen.fill(farHull, PAPER_FILL, 1);
  pen.fill(farHull, t.ink, 0.12);
  pen.hair(edges(farHull), 0.5, t.ink, FAR * 0.7);
  // Sails: a big, roached main with battens, then the jib.
  const mast = P(-1, -30);
  const main = [P(-1, -4.5), mast, ...bezier(mast, P(-8, -18), P(-12, -5), 8).slice(1)];
  const jib = [P(0, -27), P(13, -4.5), ...bezier(P(13, -4.5), P(6, -5.5), P(0.5, -5), 4).slice(1)];
  for (const [sail, a] of [[main, 0.9], [jib, 0.85]] as const) {
    pen.fill(sail, PAPER_FILL, 1);
    pen.fill(sail, SAIL, a);
  }
  pen.clipped(main, () => {
    for (let k = 1; k < 5; k++) pen.hair([P(-1, -4.5 - k * 5), P(-12 + k * 1.5, -6 - k * 4.5)], 0.35, t.ink, FAR * 0.6);
  });
  pen.clipped(jib, () => pen.hatch(jib, 1.4, 1.2, 0.35, { color: t.ink, alpha: FAR * 0.35 }));
  pen.stroke(edges(main), 0.6, t.ink, FAR, false);
  pen.stroke(edges(jib), 0.6, t.ink, FAR, false);
  pen.stroke([P(-1, -4), mast], 0.8 * s, t.ink, FAR, false);
  pen.stroke([P(-12.5, -6), P(-1, -6)], 0.7 * s, t.ink, FAR, false);
  pen.hair([mast, P(-14, -4)], 0.35, t.ink, FAR * 0.7);
  // The near hull and deckhouse.
  const house = [P(-7, -4.5), P(4, -4.5), P(2.5, -7), P(-5.5, -7)];
  pen.fill(house, PAPER_FILL, 1);
  pen.fill(house, HULL_WHITE, 0.8);
  pen.fill([P(-5, -5.3), P(2, -5.3), P(1.6, -6.2), P(-4.6, -6.2)], t.ink, FAR * 0.7);
  pen.stroke(edges(house), 0.5, t.ink, FAR, false);
  const hull = [P(-13, -5), P(14, -5), ...bezier(P(14, -5), P(13, -1.5), P(10, 0), 4).slice(1), P(-12, 0), P(-13, -5)];
  pen.fill(hull, PAPER_FILL, 1);
  pen.fill(hull, HULL_WHITE, 0.8);
  pen.hair([P(-12.5, -3), P(13, -3)], 0.6 * s, BAND, 0.6);
  for (let k = 0; k < 3; k++) pen.dot(x + (-6 + k * 4) * s, water - 4 * s, 0.35 * s, t.ink, FAR);
  pen.stroke(edges(hull), 0.6, t.ink, FAR * 1.1, false);
  pen.hair([P(-13, -5), P(-13, -9)], 0.35, t.ink, FAR * 0.8);
  flag(t, P(-13, -9.5), s * 0.45);
  wash(t, P(12, 0), P(-12, 0), s * 0.7);
}

/**
 * A resort launch moored by the jetty: a deep-V white hull with a sheer
 * stripe and portholes, a bow rail on stanchions, a framed windscreen, a
 * bimini on its bows, twin outboards, fenders and the mooring line.
 */
export function speedboat(t: Draw, x: number, water: number, s: number): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, water + dy * s);
  reflection(t, x, water, 36 * s, 7 * s, '#9fb6bf', 0.45);
  // Twin outboards on the transom, tilted down.
  for (const dx of [-17.5, -15.5]) {
    const cowl = [P(dx - 2, -10), P(dx + 1.5, -10), P(dx + 1.5, -6), P(dx - 1.5, -5.5)];
    pen.fill(cowl, PAPER_FILL, 1);
    pen.fill(cowl, '#9aa3a8', 0.6);
    pen.hair(edges(cowl), 0.5, t.ink, FAR);
    pen.hair([P(dx, -5.5), P(dx - 0.5, 1.5)], 0.8 * s, t.ink, FAR);
  }
  // The bimini: canvas over a pair of bows, above the helm.
  for (const [a, b] of [[P(-11, -6), P(-9, -15)], [P(-2, -6), P(-1, -15)]] as const) pen.hair([a, b], 0.5, t.ink, FAR * 0.9);
  const bimini = [P(-11.5, -15), ...bezier(P(-11.5, -15), P(-5, -17), P(1, -15.2), 5).slice(1), P(1, -14), ...bezier(P(1, -14), P(-5, -15.6), P(-11.5, -13.8), 5).slice(1)];
  pen.fill(bimini, PAPER_FILL, 1);
  pen.fill(bimini, BAND, 0.5);
  pen.stroke(edges(bimini), 0.6, t.ink, FAR, false);
  figure(t, x - 6 * s, water - 6 * s, s * 0.9, '#f0d88a', true);
  // Windscreen: a raked frame of glass.
  const screen = [P(0, -6), P(3, -10.5), P(6.5, -10.5), P(8, -6)];
  pen.fill(screen, GLASS, 0.5);
  pen.hair([P(3.3, -10), P(5, -7)], 0.5, PAPER_FILL, 0.8);
  pen.stroke(edges(screen), 0.55, t.ink, FAR, false);
  // The hull.
  const hull = [P(-18, -6.5), P(10, -6.5), P(19, -8.5), ...bezier(P(19, -8.5), P(16, -2), P(8, 0), 6).slice(1), P(-16, 0), P(-18, -3)];
  pen.fill(hull, PAPER_FILL, 1);
  pen.fill(hull, HULL_WHITE, 0.85);
  pen.clipped(hull, () => {
    pen.fill([P(-20, -5.5), P(20, -7.6), P(20, -6.4), P(-20, -4.3)], BAND, 0.6);
    pen.hair([P(-17, -2), P(14, -2.5)], 0.45, t.ink, FAR * 0.5);
    pen.hatch(hull, 1.5, 0.3, 0.35, { color: t.ink, alpha: FAR * 0.45, onlyBelow: water - 2 * s });
  });
  for (const dx of [-10, -6, -2]) {
    pen.fill(oval(x + dx * s, water - 3.6 * s, 0.9 * s, 0.9 * s, 8), GLASS, 0.6);
    pen.hair(edges(oval(x + dx * s, water - 3.6 * s, 0.9 * s, 0.9 * s, 8)), 0.35, t.ink, FAR);
  }
  pen.stroke(edges(hull), 0.8 * s, t.ink, FAR * 1.15, false);
  // Bow rail on stanchions.
  const rail: Pt[] = [];
  for (let k = 0; k <= 4; k++) {
    const base = lerp(P(9, -6.6), P(18, -8.4), k / 4);
    pen.hair([base, pt(base.x, base.y - 2.4 * s)], 0.4, t.ink, FAR);
    rail.push(pt(base.x, base.y - 2.4 * s));
  }
  pen.hair(rail, 0.45, t.ink, FAR);
  // Fenders over the side and the line to the jetty.
  for (const dx of [-12, 2]) {
    pen.hair([P(dx, -6.5), P(dx, -5)], 0.35, t.ink, FAR);
    const f = oval(x + dx * s, water - 3.6 * s, 1.1 * s, 1.8 * s, 10);
    pen.fill(f, PAPER_FILL, 1);
    pen.fill(f, '#e3907a', 0.6);
    pen.hair(edges(f), 0.4, t.ink, FAR);
  }
  pen.hair(bezier(P(-18, -5), P(-24, -1), P(-31, -7), 6), 0.45, t.ink, FAR * 0.8);
}

/**
 * A salmon troller working the swell: a white wooden hull with a high,
 * flared bow and a dark sheer strake, the wheelhouse forward, a stubby
 * mast behind it, and the two long trolling poles raised in a V, their
 * stays and lines fine as hair, the lines trailing into the sea astern.
 */
export function troller(t: Draw, x: number, water: number, s: number): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, water + dy * s);
  reflection(t, x, water + 0.5, 30 * s, 6 * s, '#9fb0ad', 0.35);
  // Poles and mast behind the wheelhouse, with their stays and the lines down to the water.
  const base = P(-3, -6);
  for (const tip of [P(-17, -36), P(4, -38)]) {
    pen.stroke([base, tip], 0.6 * s, t.ink, FAR, false);
    pen.hair([tip, P(-3, -20)], 0.3, t.ink, FAR * 0.6);
    pen.hair(bezier(tip, pt(tip.x - 6 * s, water - 14 * s), pt(tip.x - 14 * s, water + 0.5), 6), 0.3, t.ink, FAR * 0.5);
  }
  pen.stroke([P(-3, -5), P(-3, -22)], 0.8 * s, t.ink, FAR, false);
  pen.hair([P(-3, -21), P(14, -8)], 0.3, t.ink, FAR * 0.6);
  // The wheelhouse forward, a band of windows across its front.
  const house = [P(0, -5.5), P(9, -6), P(8.6, -13), P(0.4, -13.2)];
  pen.fill(house, PAPER_FILL, 1);
  pen.fill(house, HULL_WHITE, 0.8);
  pen.fill([P(4.6, -10.4), P(8.2, -10.6), P(8, -12.2), P(4.6, -12.2)], t.ink, FAR * 0.75);
  pen.fill([P(1.2, -10.4), P(3.6, -10.4), P(3.6, -12.2), P(1.2, -12.2)], t.ink, FAR * 0.6);
  pen.fill([P(-0.4, -13.2), P(9.4, -13), P(9, -14.2), P(0, -14.4)], '#4f6f6a', 0.6);
  pen.stroke(edges(house), 0.5, t.ink, FAR, false);
  pen.hair([P(2, -14.4), P(2, -17)], 0.4, t.ink, FAR);
  // The hull: sheer rising to a high bow, a dark strake under the rail, a red boot-top at the waterline.
  const sheer = bezier(P(-16, -4.6), P(2, -4.2), P(17, -8.6), 10);
  const hull = [...sheer, ...bezier(P(17, -8.6), P(15.5, -3), P(11, 0), 5).slice(1), P(-14, 0), P(-16.5, -2.4)];
  pen.fill(hull, PAPER_FILL, 1);
  pen.fill(hull, HULL_WHITE, 0.85);
  pen.clipped(hull, () => {
    pen.fill([...sheer, ...[...sheer].reverse().map((p) => pt(p.x, p.y + 1.4 * s))], '#3f5f6a', 0.65);
    pen.fill([P(-18, -1.2), P(18, -1.2), P(18, 1), P(-18, 1)], RED, 0.4);
    for (const k of [-3, -2]) pen.hair([P(-15, k), P(15, k - 1.6)], 0.3, t.ink, FAR * 0.4);
    pen.hatch(hull, 1.5, 0.3, 0.35, { color: t.ink, alpha: FAR * 0.4, onlyBelow: water - 2.5 * s });
  });
  pen.stroke(edges(hull), 0.7 * s, t.ink, FAR * 1.1, false);
  // Gurdies at the stern, and a figure at them.
  pen.hair([P(-12, -4.6), P(-12, -7), P(-10, -7)], 0.5, t.ink, FAR);
  figure(t, x - 8 * s, water - 4.5 * s, s * 0.8, '#d9a03a', false);
  wash(t, P(16, 0), P(-15, 0), s * 0.7);
}
