import type { Rng } from '../../logic/rng';
import { bezier, closed, cub, type Draw, pt, TAU, tube } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { boxOf, coat, ellipseAt, glaze, model, petalBlade, rimLight, vane } from '../critters/birdKit';
import { type TailSpec, tailShape } from '../critters/birdHawkParts';
import { EAGLE, spotFeather } from './rainforestBossWings';

/**
 * The Crested Serpent Eagle's body, tail and head from above: dark brown,
 * the back lightly spotted; the blackish tail crossed by one broad white
 * band; a black crown and the full crest of broad black feathers, white at
 * their bases, raised in a ruff over the nape; bare yellow skin from the
 * cere round each yellow eye; a short grey hooked bill.
 */

/** Dark brown plumage over a shape: a coat of feathers, a few white-spotted, and volume. */
export function eaglePlumage(d: Draw, shape: readonly Pt[], rng: Rng, o: { n: number; size: number; spots?: number; line?: number }): void {
  const { pen } = d;
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, EAGLE.brown, 0.9);
  const b = boxOf(shape);
  pen.clipped(shape, () => {
    glaze(d, b.cx + b.rx * 0.3, b.cy, b.rx * 0.6, b.ry * 0.7, 0, EAGLE.mid, 0.4);
    glaze(d, b.cx - b.rx * 0.4, b.cy, b.rx * 0.5, b.ry * 0.6, 0, EAGLE.dark, 0.35);
  });
  coat(d, shape, rng, { dir: () => Math.PI, n: o.n, size: o.size, paint: ({ f, s, r }) => spotFeather(d, f, s, r, o.spots ?? 0.12) });
  model(d, shape, Math.max(3, Math.min(b.rx, b.ry) * 0.4), EAGLE.deep, { shade: 0.4, hatch: 0.25, lit: 0.12, line: 0 });
  rimLight(d, shape, EAGLE.pale, 0.9, 0.3);
  pen.stroke(closed(shape), o.line ?? 1.2, d.ink, 1);
}

/** The tail: blackish feathers, each edged; one broad white band across the middle; a pale tip. */
export function eagleTail(d: Draw, c: TailSpec): void {
  const { pen } = d;
  const shape = tailShape(c);
  const n = 12;
  const tip = (u: number): Pt => {
    const lobe = Math.abs(Math.sin(((u + 1) / 2) * 6 * Math.PI));
    return pt(c.x - c.len * (1 - 0.14 * u * u) - lobe * 0.8, c.half * u * (1 - 0.06 * u * u));
  };
  const at = (u: number, k: number): Pt => {
    const t = tip(u);
    const root = pt(c.x + 2, u * 3.5);
    return pt(root.x + (t.x - root.x) * k, root.y + (t.y - root.y) * k);
  };
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, EAGLE.tail, 0.94);
  pen.clipped(shape, () => {
    const band = [...Array.from({ length: 21 }, (_, i) => at(-1.1 + i * 0.11, 0.42)), ...Array.from({ length: 21 }, (_, i) => at(1.1 - i * 0.11, 0.68))];
    pen.fill(band, EAGLE.tailBand, 0.92);
    pen.clipped(band, () => glaze(d, c.x - c.len * 0.55, c.half * 0.4, c.len * 0.3, c.half * 0.6, 0, EAGLE.band, 0.45));
    for (let i = 0; i < n; i++) {
      const u0 = -1 + (2 * i) / n;
      const u1 = u0 + 2 / n;
      const um = (u0 + u1) / 2;
      pen.fill([at(u1, 0), at(u1, 1.05), at(um + 0.25 / n, 1.05), at(um, 0.1)], EAGLE.deep, 0.3);
      pen.hair([at(um, 0.05), at(um, 0.96)], 0.4, EAGLE.buff, 0.4);
      if (i > 0) pen.hair([at(u0, 0.05), at(u0, 1)], 0.45, d.ink, 0.5);
    }
    pen.stroke(Array.from({ length: 21 }, (_, i) => at(-1.1 + i * 0.11, 1)), 1.4, EAGLE.band, 0.7, false);
  });
  pen.crescent(shape, pt(-2, -3), () => pen.fill(shape, EAGLE.deep, 0.3));
  pen.stroke(closed(shape), 1, d.ink, 1);
}

export interface EagleHead {
  readonly c: Pt;
  readonly r: number;
}

/** The crest: a fan of broad black feathers over the nape, white at their bases; `raise` lifts and spreads it. */
function crest(d: Draw, h: EagleHead, raise: number): void {
  const { c, r } = h;
  const n = 9;
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1) - 0.5;
    const ang = Math.PI + u * (1.6 + raise * 0.9);
    const root = pt(c.x - r * 0.2 + Math.abs(u) * r * 0.6, c.y + u * r * 0.9);
    const len = r * (1.2 + raise * 0.6) * (1 - Math.abs(u) * 0.45);
    const f = petalBlade(root, ang, len, r * 0.62, u * 0.1, 12);
    vane(d, f, r * 0.31, { base: EAGLE.black, alpha: 0.96, deep: '#000000', glazes: [EAGLE.dark], glazeAlpha: 0.3, shaft: EAGLE.dark, lit: EAGLE.mid, line: 0.55, lineAlpha: 0.85 });
    d.pen.clipped(f.shape, () => {
      const p = f.at(0.3, 0);
      glaze(d, p.x, p.y, r * 0.4, r * 0.26, ang, EAGLE.spot, 0.95);
      // White bars across each crest feather.
      for (const t of [0.55, 0.78]) d.pen.hair([f.at(t, -r * 0.25), f.at(t + 0.04, r * 0.25)], r * 0.07, EAGLE.spot, 0.75);
    });
  }
}

/** The head: crest behind, black crown, the yellow bare face round the eyes, the cere and the short hooked bill. */
export function eagleHead(d: Draw, rng: Rng, h: EagleHead, raise: number, down = 0): Pt[] {
  const { pen } = d;
  const { c, r } = h;
  crest(d, h, raise);
  const shape = Array.from({ length: 36 }, (_, i) => {
    const a = (i / 36) * TAU;
    return pt(c.x + Math.cos(a) * r * (1.05 + 0.12 * Math.max(0, Math.cos(a))), c.y + Math.sin(a) * r * (0.92 - 0.1 * Math.max(0, Math.cos(a))));
  });
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, EAGLE.black, 0.92);
  pen.clipped(shape, () => {
    glaze(d, c.x - r * 0.3, c.y, r * 0.9, r * 0.7, 0, EAGLE.dark, 0.5);
    for (let i = 0; i < 20; i++) {
      const y = (rng() - 0.5) * r * 1.5;
      const x = c.x - r + rng() * r * 1.4;
      pen.hair([pt(x + 1.8, c.y + y), pt(x, c.y + y * 1.04)], 0.4, rng() < 0.6 ? EAGLE.mid : EAGLE.deep, 0.55);
    }
    // Bare yellow skin from the cere back round each eye.
    for (const s of [-1, 1]) {
      const face = ellipseAt(c.x + r * 0.72, c.y + s * r * 0.6, r * 0.45, r * 0.26, s * 0.3, 16);
      pen.fill(face, EAGLE.face, 0.95);
      pen.clipped(face, () => pen.crescent(face, pt(-0.5, -0.8), () => pen.fill(face, EAGLE.faceDeep, 0.5)));
    }
  });
  pen.crescent(shape, pt(-1.6, -2.4), () => pen.fill(shape, '#000000', 0.25));
  pen.clipped(shape, () => glaze(d, c.x - 1, c.y - r * 0.45, r * 0.5, r * 0.3, -0.3, EAGLE.pale, 0.2));
  const ring = closed(shape);
  pen.stroke([...ring.slice(27), ...ring.slice(1, 11)], 1.1, d.ink, 1, false);
  pen.hair(ring.slice(10, 28), 0.55, d.ink, 0.7);
  for (const s of [-1, 1]) {
    const e = pt(c.x + r * 0.5, c.y + s * r * 0.74);
    pen.fill(ellipseAt(e.x, e.y, 1.9, 1.5, 0, 14), EAGLE.eye, 1);
    pen.hair(closed(ellipseAt(e.x, e.y, 1.9, 1.5, 0, 14)).slice(6, 16), 0.35, d.ink, 0.8);
    pen.dot(e.x + 0.3, e.y + s * 0.1, 0.8, '#120b07', 1);
    pen.dot(e.x - 0.3, e.y - 0.25, 0.38, PAPER_FILL, 0.95);
    // The stern brow: a dark shelf over the eye.
    pen.stroke(bezier(pt(e.x - 3.4, e.y - s * 1.1), pt(e.x - 0.4, e.y - s * 2), pt(e.x + 2.8, e.y - s * 0.9), 8), 1.3, EAGLE.deep, 0.9, false);
  }
  const b0 = c.x + r * 1.05;
  const bl = 6.8 * (1 - down * 0.35);
  const bw = 2.8;
  const bill = [...cub(pt(b0, -bw), pt(b0 + bl * 0.5, -bw), pt(b0 + bl * 0.9, -bw * 0.55), pt(b0 + bl, 0), 8), ...cub(pt(b0 + bl, 0), pt(b0 + bl * 0.9, bw * 0.55), pt(b0 + bl * 0.5, bw), pt(b0, bw), 8).slice(1)];
  pen.fill(bill, EAGLE.bill, 1);
  pen.clipped(bill, () => {
    pen.fill(ellipseAt(b0, 0, 2.7, bw + 0.3, 0, 14), EAGLE.cere, 1);
    pen.hair([pt(b0 + 2.3, -0.6), pt(b0 + bl * 0.8, -0.4)], 0.8, '#9aa1b1', 0.8);
    pen.crescent(bill, pt(-0.6, -1), () => pen.fill(bill, '#000000', 0.4));
  });
  for (const s of [-1, 1]) pen.dot(b0 + 1.1, s * bw * 0.45, 0.45, EAGLE.deep, 0.9);
  pen.stroke(closed(bill), 0.8, d.ink, 1, false);
  return shape;
}

/** A short mossy branch across the crown it's perched on, for the talons to grip. */
export function perchBranch(d: Draw, x: number, half: number): void {
  const { pen } = d;
  const spine = bezier(pt(x - 4, -half), pt(x + 3, 0), pt(x + 1, half), 12);
  const bark = tube(spine, 6.4, 4.6);
  pen.fill(bark.map((p) => pt(p.x + 2.6, p.y + 3.8)), d.ink, 0.16);
  pen.fill(bark, PAPER_FILL, 1);
  pen.fill(bark, '#5d4834', 0.95);
  pen.clipped(bark, () => {
    pen.crescent(bark, pt(-1.2, -0.4), () => pen.fill(bark, '#2e2216', 0.55));
    pen.hair(spine.map((p) => pt(p.x - 1.4, p.y)), 0.9, '#9a8262', 0.6);
    for (let i = 1; i < spine.length - 1; i += 2) pen.hair([pt(spine[i]!.x - 2.4, spine[i]!.y), pt(spine[i]!.x + 2.4, spine[i]!.y + 1.2)], 0.25, '#2e2216', 0.55);
    for (const t of [2, 6, 10]) glaze(d, spine[t]!.x - 1, spine[t]!.y, 2.6, 2, 0, mix('#7d9a4a', PAPER_FILL, 0.1), 0.75);
  });
  pen.stroke(closed(bark), 0.6, d.ink, 0.9, false);
}
