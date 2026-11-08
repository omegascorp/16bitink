import type { Rng } from '../../logic/rng';
import { polar } from '../groundKit';
import { bezier, closed, cub, type Draw, pt, ribbon } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { type Blade, boxOf, coat, ellipseAt, glaze, model, rimLight, vane } from '../critters/birdKit';
import { covertRows, paintWing, type Wing } from '../critters/birdWing';

/**
 * The grey heron's paint: ash-grey back and coverts, slate-black flight
 * feathers, a black patch at the bend of each wing, long pale plumes down
 * the back; a white neck washed grey behind, a white head with a broad black
 * stripe running back from the eye into thin black crest plumes, and a long
 * yellow dagger of a bill. Facing +x, light from the upper left.
 */
export const HERON = {
  grey: '#9ba3ab',
  greyLight: '#c3c9ce',
  greyDeep: '#5f6870',
  slate: '#363c44',
  black: '#17191d',
  white: '#f3f1ea',
  plume: '#dfe1de',
  bill: '#e0b53c',
  billDeep: '#a4771f',
  leg: '#b59a5c',
  legDeep: '#6f5a30',
  eye: '#e8c43a',
} as const;

/** A slate flight feather, darker at its tip. */
export function heronFlight(d: Draw, f: Blade, w: number, primary: boolean): void {
  vane(d, f, w, {
    base: primary ? HERON.slate : mix(HERON.slate, HERON.greyDeep, 0.35),
    alpha: 0.94,
    deep: HERON.black,
    glazes: [HERON.greyDeep],
    glazeAlpha: 0.25,
    tip: HERON.black,
    tipFrom: 0.72,
    tipAlpha: 0.5,
    shaft: HERON.greyLight,
    barbs: HERON.black,
    barbAlpha: 0.2,
    lit: HERON.greyLight,
    line: primary ? 0.5 : 0.4,
    lineAlpha: 0.7,
  });
}

/** A small grey feather with a paler fringe. */
function greyFeather(d: Draw, f: Blade, s: number, r: number): void {
  const { pen } = d;
  const tone = r < 0.35 ? HERON.grey : r < 0.75 ? mix(HERON.grey, HERON.greyLight, 0.45) : mix(HERON.grey, HERON.greyDeep, 0.3);
  pen.fill(f.shape, tone, 0.6);
  pen.hair(f.shape.slice(5, 13), Math.max(0.35, s * 0.1), HERON.white, 0.45);
  pen.hair(f.shape.slice(3, 15), 0.25, HERON.greyDeep, 0.45);
}

/** Grey plumage over a shape: a wash, a coat of small feathers lying back, modelled. */
export function greyPlumage(d: Draw, shape: readonly Pt[], rng: Rng, n: number, size: number, line = 0.9): void {
  const { pen } = d;
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, HERON.grey, 0.9);
  const b = boxOf(shape);
  pen.clipped(shape, () => glaze(d, b.cx - b.rx * 0.3, b.cy - b.ry * 0.3, b.rx * 0.6, b.ry * 0.5, 0, HERON.greyLight, 0.5));
  coat(d, shape, rng, { dir: () => Math.PI, n, size, paint: ({ f, s, r }) => greyFeather(d, f, s, r) });
  model(d, shape, Math.max(2.5, Math.min(b.rx, b.ry) * 0.4), HERON.greyDeep, { shade: 0.35, hatch: 0.22, lit: 0.15, line: 0 });
  rimLight(d, shape, HERON.white, 0.8, 0.35);
  if (line > 0) pen.stroke(closed(shape), line, d.ink, 0.95);
}

/** An open wing: slate flight feathers, grey coverts with a black patch at the bend and a pale leading edge. */
export function paintHeronWing(d: Draw, w: Wing, rng: Rng, depth: (t: number) => number): void {
  paintWing(d, w, {
    feather: (x) => heronFlight(d, x.f, x.w, x.primary),
    coverts: (wing) => {
      const { pen } = d;
      const b = boxOf(wing.coverts);
      pen.fill(wing.coverts, PAPER_FILL, 1);
      pen.fill(wing.coverts, HERON.grey, 0.92);
      pen.clipped(wing.coverts, () => {
        glaze(d, b.cx, b.cy, b.rx * 0.7, b.ry * 0.5, 0.5, HERON.greyLight, 0.35);
        covertRows(wing, 4, depth, (t, r) => 6 - r * 1 - t * 1.4, (f, s, _t, r) => greyFeather(d, f, s, 0.1 + rng() * 0.9 - r * 0.05));
        pen.stroke(Array.from({ length: 20 }, (_, i) => wing.at(i / 19, 0.04)), 2.2, HERON.white, 0.6, false);
      });
      model(d, wing.coverts, 3, HERON.greyDeep, { shade: 0.3, hatch: 0.18, lit: 0.12, line: 0 });
    },
  });
}

/** The neck along its spine (shoulders first): white, washed grey along its back, a line of dark streaks down its front. */
export function paintNeck(d: Draw, spine: readonly Pt[], w0: number, w1: number): Pt[] {
  const { pen } = d;
  const { shape, top, bot } = ribbon(spine, (u) => w0 + (w1 - w0) * u);
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, HERON.white, 0.95);
  pen.clipped(shape, () => {
    pen.crescent(shape, pt(-0.8, -1.2), () => pen.fill(shape, HERON.grey, 0.55));
    pen.hair(spine.map((p, i) => pt((p.x + top[i]!.x) / 2, (p.y + top[i]!.y) / 2)), 0.5, HERON.greyLight, 0.5);
    for (let i = 2; i < spine.length - 2; i += 2) pen.hair([spine[i]!, spine[i + 1]!], 0.55, HERON.slate, 0.55);
    for (let i = 1; i < spine.length - 1; i++) pen.hair([bot[i]!, pt((bot[i]!.x + spine[i]!.x) / 2, (bot[i]!.y + spine[i]!.y) / 2)], 0.2, HERON.greyDeep, 0.35);
  });
  pen.stroke(closed(shape), 0.4, d.ink, 0.85, false);
  return shape;
}

/**
 * The head at c turned to `ang`: white, the black stripe from the eye back
 * into two thin crest plumes, the yellow eye, and the bill `bill` long
 * (short when it points down at the ground, foreshortened).
 */
export function heronHead(d: Draw, c: Pt, ang: number, bill: number): void {
  const { pen } = d;
  const u = pt(Math.cos(ang), Math.sin(ang));
  const v = pt(-u.y, u.x);
  const at = (x: number, y: number): Pt => pt(c.x + u.x * x + v.x * y, c.y + u.y * x + v.y * y);
  // Crest plumes trailing back over the neck.
  for (const s of [-1, 1]) pen.stroke(bezier(at(-2, s * 0.8), at(-7, s * 1.6), at(-11, s * 0.6), 8), 0.7, HERON.black, 0.9, false);
  const head = ellipseAt(c.x, c.y, 4.6, 3.3, ang, 18);
  pen.fill(head, PAPER_FILL, 1);
  pen.fill(head, HERON.white, 0.95);
  pen.clipped(head, () => {
    for (const s of [-1, 1]) pen.fill([at(1.8, s * 1.4), at(-1, s * 2.8), at(-5, s * 1.6), at(-4.6, s * 0.4), at(0, s * 0.9)], HERON.black, 0.9);
    pen.crescent(head, pt(-0.6, -0.9), () => pen.fill(head, HERON.greyLight, 0.6));
  });
  pen.stroke(closed(head), 0.45, d.ink, 0.9);
  for (const s of [-1, 1]) {
    const e = at(1.9, s * 2.2);
    pen.dot(e.x, e.y, 0.75, HERON.eye, 1);
    pen.dot(e.x, e.y, 0.38, HERON.black, 1);
  }
  const b0 = 3.6;
  const blade = [...cub(at(b0, -1.25), at(b0 + bill * 0.4, -1.1), at(b0 + bill * 0.8, -0.5), at(b0 + bill, 0), 8), ...cub(at(b0 + bill, 0), at(b0 + bill * 0.8, 0.5), at(b0 + bill * 0.4, 1.1), at(b0, 1.25), 8).slice(1)];
  pen.fill(blade, HERON.bill, 1);
  pen.clipped(blade, () => pen.crescent(blade, pt(-0.4, -0.6), () => pen.fill(blade, HERON.billDeep, 0.55)));
  pen.hair([at(b0 + 0.5, 0), at(b0 + bill * 0.92, 0)], 0.25, HERON.billDeep, 0.8);
  pen.hair([at(b0 + 0.6, -0.55), at(b0 + bill * 0.6, -0.4)], 0.3, PAPER_FILL, 0.5);
  pen.stroke(closed(blade), 0.45, d.ink, 0.95, false);
}

/** A long thin leg from the knee to a foot of three long toes forward and one back, pointing `ang`. */
export function heronFoot(d: Draw, knee: Pt, foot: Pt, ang: number, toes = 1): void {
  const { pen } = d;
  pen.stroke([knee, foot], 1.6, HERON.leg, 1, false);
  pen.hair([knee, foot], 0.4, d.ink, 0.7);
  for (const a of [-0.45, 0, 0.45]) {
    const tip = polar(foot, ang + a, 7 * toes);
    const mid = polar(foot, ang + a * 1.1, 3.6 * toes);
    pen.stroke([foot, mid, tip], 1.1, HERON.leg, 1, false);
    pen.hair([foot, mid, tip], 0.35, HERON.legDeep, 0.9);
  }
  const hind = polar(foot, ang + Math.PI, 3.2 * toes);
  pen.stroke([foot, hind], 1, HERON.leg, 1, false);
  pen.hair([foot, hind], 0.3, HERON.legDeep, 0.9);
  pen.dot(foot.x, foot.y, 0.9, HERON.legDeep, 1);
}
