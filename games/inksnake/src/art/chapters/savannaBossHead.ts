import type { Rng } from '../../logic/rng';
import { closed, cub, type Draw, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { ellipseAt, glaze, petalBlade, shadowOf } from '../critters/birdKit';
import { blackFeather, greyPlumage, SEC } from './savannaBossPaint';

/**
 * The Secretary Bird's head and neck from above: a small grey head on a
 * longish grey neck, the bare orange skin round each eye showing at the
 * sides, a stout hooked grey bill, and the crest: a dozen long black
 * quills, broad at their tips, lying back off the nape or (raised) fanned
 * out round the back of the head like quill pens behind a clerk's ear.
 */
const S = SEC;

export interface SecHead {
  readonly c: Pt;
  readonly r: number;
  /** 0 lying back, 1 fanned up and out. */
  readonly crest: number;
  /** 0 level, 1 pointing down at the ground (foreshortened: the bill looks short). */
  readonly down: number;
  /** Beak open (startled, calling). */
  readonly open?: boolean;
}

/** The crest's quills, rooted round the nape, painted under the head. */
function crest(d: Draw, h: SecHead): Pt[][] {
  const out: Pt[][] = [];
  const n = 10;
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1) - 0.5;
    const side = Math.sign(u) || 1;
    const back = Math.PI + u * (0.75 + h.crest * 2.2);
    const root = pt(h.c.x - h.r * 0.55, h.c.y + u * h.r * 0.9);
    const len = h.r * (2.6 + (1 - Math.abs(u) * 1.4) * 1.1) * (1 - h.crest * 0.15);
    const f = petalBlade(root, back, len, 2.3 + h.crest * 0.4, side * 0.05);
    out.push(f.shape);
    blackFeather(d, f, 2.3, 0.4);
  }
  return out;
}

export function neckShape(from: Pt, to: Pt, w0: number, w1: number): Pt[] {
  const ang = Math.atan2(to.y - from.y, to.x - from.x);
  const n = pt(-Math.sin(ang), Math.cos(ang));
  const side = (s: number, w: number, p: Pt): Pt => pt(p.x + n.x * s * w / 2, p.y + n.y * s * w / 2);
  const mid = pt((from.x + to.x) / 2, (from.y + to.y) / 2);
  return [
    ...cub(side(1, w0, from), side(1, w0 * 0.85, mid), side(1, w1 * 1.1, mid), side(1, w1, to), 8),
    ...cub(side(-1, w1, to), side(-1, w1 * 1.1, mid), side(-1, w0 * 0.85, mid), side(-1, w0, from), 8),
  ];
}

/** Paints the neck (from the shoulders to the head) and the head with its crest. */
export function paintHead(d: Draw, rng: Rng, from: Pt, h: SecHead): void {
  const { pen } = d;
  const { c, r } = h;
  const neck = neckShape(from, pt(c.x - r * 0.3, c.y), 13, r * 1.35);
  const ang = Math.atan2(c.y - from.y, c.x - from.x);
  greyPlumage(d, neck, rng, { n: 40, size: 3.4, dir: () => ang + Math.PI, line: 0.9 });
  const quills = crest(d, h);
  shadowOf(d, quills, 1.5, 0.08);
  const shape = Array.from({ length: 32 }, (_, i) => {
    const a = (i / 32) * TAU;
    return pt(c.x + Math.cos(a) * r * (1.1 + 0.15 * Math.max(0, Math.cos(a))), c.y + Math.sin(a) * r * 0.88);
  });
  greyPlumage(d, shape, rng, { n: 26, size: 2.4, dir: () => Math.PI, line: 1 });
  // The bare orange face round each eye, the dark eye in it, a lash-like brow.
  for (const s of [-1, 1]) {
    const e = pt(c.x + r * 0.55, c.y + s * r * 0.62);
    const skin = ellipseAt(e.x + 0.8, e.y + s * 0.15, r * 0.48, r * 0.26, s * 0.2, 16);
    pen.fill(skin, S.face, 1);
    pen.clipped(skin, () => glaze(d, e.x + 1.4, e.y + s * 0.8, r * 0.4, r * 0.25, 0, S.faceDeep, 0.6));
    pen.stroke(closed(skin), 0.4, d.ink, 0.8, false);
    pen.dot(e.x, e.y + s * 0.1, r * 0.12, S.eye, 1);
    pen.dot(e.x + 0.1, e.y + s * 0.1, r * 0.06, S.ink, 1);
    pen.dot(e.x - 0.15, e.y - 0.15 + s * 0.1, 0.3, PAPER_FILL, 0.9);
    pen.stroke([pt(e.x - r * 0.4, e.y - s * r * 0.18), pt(e.x + r * 0.2, e.y - s * r * 0.3), pt(e.x + r * 0.55, e.y - s * r * 0.16)], 0.8, S.black, 0.85, false);
  }
  // The bill: stout, hooked, pale grey with a dark tip; foreshortened when the head points down.
  const b0 = c.x + r * 1.1;
  const bl = r * 1.25 * (1 - h.down * 0.5);
  const bw = r * 0.5;
  pen.ctx.save();
  pen.ctx.translate(0, c.y);
  const jaw = (k: number): Pt[] => [...cub(pt(b0, -bw), pt(b0 + bl * 0.5, -bw * k), pt(b0 + bl * 0.88, -bw * 0.5 * k), pt(b0 + bl, 0), 8), ...cub(pt(b0 + bl, 0), pt(b0 + bl * 0.88, bw * 0.5 * k), pt(b0 + bl * 0.5, bw * k), pt(b0, bw), 8).slice(1)];
  if (h.open) {
    const lower = jaw(1.25);
    pen.fill(lower, S.faceDeep, 1);
    pen.stroke(closed(lower), 0.5, d.ink, 1, false);
  }
  const bill = jaw(0.95);
  pen.fill(bill, S.bill, 1);
  pen.clipped(bill, () => {
    pen.fill(ellipseAt(b0 + bl, 0, bl * 0.32, bw, 0, 12), S.billDark, 1);
    pen.hair([pt(b0 + 0.8, -bw * 0.4), pt(b0 + bl * 0.7, -bw * 0.25)], 0.6, PAPER_FILL, 0.55);
    pen.crescent(bill, pt(-0.6, -0.9), () => pen.fill(bill, S.billDark, 0.4));
  });
  pen.stroke(closed(bill), 0.7, d.ink, 1, false);
  pen.ctx.restore();
}
