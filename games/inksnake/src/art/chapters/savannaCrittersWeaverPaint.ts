import type { Rng } from '../../logic/rng';
import { closed, cub, type Draw, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { type Blade, boxOf, coat, ellipseAt, glaze, model, petalBlade, rimLight, vane } from '../critters/birdKit';

/**
 * The village weaver's paint (a breeding male): bright egg-yolk yellow,
 * the back mottled black and yellow, a chestnut wash on the nape, the black
 * mask over the face and throat, a red eye, a heavy black cone of a bill,
 * and blackish flight feathers edged in yellow. Board px, facing +x, light
 * from the upper left.
 */
export const WEAVER = {
  yellow: '#f0c629',
  gold: '#d99a1c',
  lemon: '#fbe678',
  black: '#1f1a16',
  deep: '#0d0a08',
  olive: '#6a5a24',
  chestnut: '#9a4e20',
  flight: '#2b241d',
  edge: '#e8c84a',
  bill: '#15120f',
  eye: '#b3271d',
  foot: '#c9a98a',
} as const;

const W = WEAVER;

/** One flight or tail feather: blackish, its edge fringed yellow. */
export function weaverFeather(d: Draw, f: Blade, w: number, line = 0.3): void {
  vane(d, f, w, {
    base: W.flight, alpha: 0.95, deep: W.deep,
    glazes: [W.olive], glazeAlpha: 0.25,
    fringe: W.edge, shaft: W.olive, lit: W.edge, line, lineAlpha: 0.7,
  });
}

/** Yellow plumage over a shape, `mottle(p)` the share of black-centred feathers there (the back). */
export function weaverPlumage(d: Draw, shape: readonly Pt[], rng: Rng, o: { n: number; size: number; mottle: (p: Pt) => number; line?: number }): void {
  const { pen } = d;
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, W.yellow, 0.92);
  const b = boxOf(shape);
  pen.clipped(shape, () => {
    glaze(d, b.cx + b.rx * 0.2, b.cy, b.rx * 0.7, b.ry * 0.6, 0, W.gold, 0.35);
    glaze(d, b.cx - b.rx * 0.2, b.cy - b.ry * 0.3, b.rx * 0.5, b.ry * 0.35, 0, W.lemon, 0.45);
  });
  coat(d, shape, rng, {
    dir: () => Math.PI, n: o.n, size: o.size,
    paint: ({ f, s, r }) => {
      const c = f.at(0.45, 0);
      if (r < o.mottle(c)) {
        pen.fill(f.shape, W.black, 0.55);
        pen.hair(f.shape.slice(2, 10), Math.max(0.3, s * 0.2), W.yellow, 0.9);
      } else {
        pen.fill(f.shape, r < 0.6 ? W.yellow : W.gold, 0.35);
        pen.hair(f.shape.slice(3, 9), 0.22, W.olive, 0.35);
      }
    },
  });
  model(d, shape, Math.max(1.4, Math.min(b.rx, b.ry) * 0.45), W.olive, { shade: 0.35, hatch: 0.2, lit: 0.12, line: 0 });
  rimLight(d, shape, W.lemon, 0.5, 0.45);
  pen.stroke(closed(shape), o.line ?? 0.5, d.ink, 0.95);
}

/** The folded wing on the +y flank: blackish primaries and yellow-edged secondaries, a mottled covert patch at the shoulder. */
export function foldedWing(d: Draw, rng: Rng, side: 1 | -1, k = 1): Pt[] {
  const m = (p: Pt): Pt => pt(p.x, p.y * side);
  for (let i = 0; i < 4; i++) weaverFeather(d, petalBlade(m(pt(1 - i * 0.8, 3.3 - i * 0.12)), Math.PI + side * (0.1 - i * 0.012), (8.5 - i * 0.6) * k, 2.4), 2.4, 0.28);
  for (let i = 0; i < 3; i++) weaverFeather(d, petalBlade(m(pt(3.2 - i * 1.1, 3.9 - i * 0.2)), Math.PI + side * (0.06 + i * 0.02), (6.2 - i * 0.5) * k, 2.8), 2.8, 0.3);
  const coverts = [...cub(pt(4.5, 1.8), pt(4.8, 3.8), pt(3, 4.6), pt(0.5, 4.5), 8), ...cub(pt(0.5, 4.5), pt(-1.5, 4.3), pt(-2, 3), pt(-1, 2), 6).slice(1)].map(m);
  weaverPlumage(d, coverts, rng, { n: 10, size: 1.5, mottle: () => 0.85, line: 0.35 });
  return coverts;
}

/** The head round c (radius r): yellow crown, chestnut nape, the black mask, a red eye, the stout black bill; `down` foreshortens it (beak pointing down). */
export function weaverHead(d: Draw, rng: Rng, c: Pt, r: number, down = 0): void {
  const { pen } = d;
  const shape = Array.from({ length: 28 }, (_, i) => {
    const a = (i / 28) * TAU;
    return pt(c.x + Math.cos(a) * r * (1.05 + 0.08 * Math.max(0, Math.cos(a))), c.y + Math.sin(a) * r * 0.92);
  });
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, W.yellow, 0.95);
  pen.clipped(shape, () => {
    glaze(d, c.x - r * 0.8, c.y, r * 0.7, r * 0.9, 0, W.chestnut, 0.55);
    // The mask: black over the face, from the eyes forward round the bill's base.
    pen.fill(ellipseAt(c.x + r * 0.85, c.y, r * 0.8, r * 1.1, 0, 18), W.black, 0.92);
    for (let i = 0; i < 12; i++) {
      const y = (rng() - 0.5) * r * 1.4;
      const x = c.x - r * 0.3 + rng() * r * 0.9;
      pen.hair([pt(x + 0.8, c.y + y), pt(x - 0.4, c.y + y * 1.05)], 0.22, rng() < 0.5 ? W.gold : W.lemon, 0.7);
    }
  });
  pen.crescent(shape, pt(-r * 0.25, -r * 0.35), () => pen.fill(shape, W.olive, 0.3));
  pen.clipped(shape, () => glaze(d, c.x - r * 0.2, c.y - r * 0.45, r * 0.5, r * 0.3, -0.3, W.lemon, 0.5));
  pen.stroke(closed(shape), 0.45, d.ink, 0.95);
  for (const s of [-1, 1]) {
    const e = pt(c.x + r * 0.45, c.y + s * r * 0.72);
    pen.dot(e.x, e.y, r * 0.17, W.eye, 1);
    pen.dot(e.x + 0.08, e.y, r * 0.08, W.deep, 1);
    pen.dot(e.x - 0.1, e.y - 0.12, 0.16, PAPER_FILL, 0.9);
  }
  // The bill: a deep cone, shorter seen from above when the head points down.
  const b0 = c.x + r * 0.95;
  const bl = r * 1.05 * (1 - down * 0.55);
  const bw = r * 0.48;
  const bill = [...cub(pt(b0, -bw), pt(b0 + bl * 0.5, -bw * 0.9), pt(b0 + bl * 0.9, -bw * 0.4), pt(b0 + bl, 0), 6), ...cub(pt(b0 + bl, 0), pt(b0 + bl * 0.9, bw * 0.4), pt(b0 + bl * 0.5, bw * 0.9), pt(b0, bw), 6).slice(1)];
  pen.fill(bill, W.bill, 1);
  pen.hair([pt(b0 + 0.3, -bw * 0.35), pt(b0 + bl * 0.75, -bw * 0.15)], 0.3, mix(W.bill, PAPER_FILL, 0.5), 0.7);
  pen.stroke(closed(bill), 0.35, d.ink, 1, false);
}

/** A foot gripping (the perch): three pinkish toes forward, one back, dark claws. */
export function weaverFoot(d: Draw, at: Pt, side: 1 | -1): void {
  const { pen } = d;
  for (const a of [-0.5, 0, 0.5, Math.PI]) {
    const l = a > 3 ? 1.3 : 1.8;
    const tip = pt(at.x + Math.cos(a) * l, at.y + side * Math.sin(a) * l);
    pen.stroke([at, tip], 0.55, W.foot, 1, false);
    pen.dot(tip.x, tip.y, 0.25, W.deep, 1);
  }
}
