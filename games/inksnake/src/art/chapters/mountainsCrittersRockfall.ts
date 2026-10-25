import { createRng, type Rng } from '../../logic/rng';
import { blob, outline, polar, SHADOW } from '../groundKit';
import { bezier, type Draw, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import type { SpriteArt } from '../types';
import { mix } from '../wash';
import { glaze } from '../critters/preyKit';

/**
 * A rockfall coming down the slope (+x), seen from above: a tumble of pale
 * limestone blocks and stones about 70 across the lane, faceted, cracked
 * and lichen-spotted, some bouncing clear of their shadows; scree and grit
 * flung ahead; a cloud of ochre dust rolling up behind and spreading to the
 * sides, and the scraped track it leaves. 'rocks0' and 'rocks1' are two
 * turns of the tumble; the boil frame shifts the dust a little.
 */
type Pose = 'rocks0' | 'rocks1';

const R = {
  lit: '#e4ded0',
  stone: '#c3bba9',
  mid: '#a39a87',
  dark: '#776f60',
  deep: '#4f493f',
  lichen: '#a9a46e',
  lichenOrange: '#c98d4a',
  dust: '#c8b896',
  dustPale: '#e7ddc7',
  dustDeep: '#9c8b6c',
  scrape: '#8e8168',
} as const;

const HALF = 33;

interface Rock {
  readonly c: Pt;
  readonly r: number;
  readonly turn: number;
  /** How high it is bouncing (its shadow falls away from it). */
  readonly up: number;
  readonly seed: number;
}

/** The tumble: a few big blocks at the front, more stones round them, gravel among them; turned and bounced by phase. */
function rocksOf(phase: number): Rock[] {
  const rng = createRng(6100);
  const out: Rock[] = [];
  const add = (x: number, y: number, r: number, i: number): void => {
    const spin = rng() * TAU;
    const bounce = rng();
    // Each stone turns over as it rolls; in the other phase some have hit the ground and others leapt.
    const up = Math.max(0, Math.sin(bounce * TAU + phase * Math.PI)) * (r > 6 ? 2.5 : 4);
    out.push({ c: pt(x + phase * (1 + rng() * 2) - up * 0.4, y), r, turn: spin + phase * (1.2 + rng()), up, seed: 6200 + i * 17 });
  };
  const big: readonly (readonly [number, number, number])[] = [[9, -13, 10], [6, 7, 11.5], [15, 21, 7.5], [-5, -3, 8], [16, -26, 6.5], [-6, 19, 7], [19, 2, 6], [-14, -18, 5.5]];
  big.forEach(([x, y, r], i) => add(x + (rng() - 0.5) * 2, y, r, i));
  for (let i = 0; i < 18; i++) add(-14 + rng() * 38, (rng() - 0.5) * HALF * 1.9, 1.6 + rng() * 3, 10 + i);
  return out.sort((a, b) => a.r - b.r);
}

/** The scraped, dusty track behind the tumble: gouges in the scree, scattered grit. */
function track(d: Draw, rng: Rng): void {
  const { pen } = d;
  for (let i = 0; i < 9; i++) {
    const y = (rng() - 0.5) * HALF * 1.7;
    const x0 = -12 + rng() * 8;
    const line = bezier(pt(x0, y), pt(x0 - 18, y + (rng() - 0.5) * 4), pt(x0 - 38 - rng() * 10, y + (rng() - 0.5) * 6), 8);
    pen.hair(line, 0.9 + rng() * 0.8, R.scrape, 0.35);
    pen.hair(line.map((p) => pt(p.x + 0.5, p.y - 0.9)), 0.5, R.dustPale, 0.45);
  }
  for (let i = 0; i < 70; i++) {
    const x = -50 + rng() ** 0.7 * 55;
    const y = (rng() - 0.5) * HALF * 1.9;
    pen.dot(x, y, 0.3 + rng() * 0.6, rng() < 0.6 ? R.dark : R.mid, 0.4 + rng() * 0.4);
  }
}

/** A rolling bank of dust: overlapping billows dragged back from the rocks and spreading at the sides, paler and wider as they go. */
function dust(d: Draw, rng: Rng, drift: number, front: boolean): void {
  const { pen } = d;
  const n = front ? 7 : 16;
  for (let i = 0; i < n; i++) {
    const t = front ? rng() * 0.3 : rng();
    const y = (rng() - 0.5) * HALF * (1.6 + t * 0.7);
    const c = pt((front ? 2 : -6) - t * 42 + drift, y + Math.sign(y) * t * 6);
    const r = (front ? 4 : 6) + t * 9 + rng() * 3;
    glaze(d, c.x + 1.5, c.y + 2, r * 1.15, r * 0.95, 0, R.dustDeep, (front ? 0.12 : 0.18) * (1 - t * 0.5));
    glaze(d, c.x, c.y, r * 1.1, r * 0.9, 0, R.dust, (front ? 0.36 : 0.52) * (1 - t * 0.55));
    glaze(d, c.x - r * 0.3, c.y - r * 0.35, r * 0.65, r * 0.5, 0, R.dustPale, 0.42 * (1 - t * 0.4));
    // A pen curl round the billow's lit edge, the way an inker draws a dust cloud.
    if (rng() < 0.55) {
      const a0 = Math.PI * (0.9 + rng() * 0.5);
      const arc = Array.from({ length: 7 }, (_, j) => {
        const a = a0 + (j / 6) * (1.5 + rng() * 0.4);
        return pt(c.x + Math.cos(a) * r * 0.9, c.y + Math.sin(a) * r * 0.8);
      });
      pen.hair(arc, 0.4, d.ink, 0.22 * (1 - t * 0.6));
    }
    if (rng() < 0.4) pen.fill(blob(c, r * 0.7, r * 0.55, rng, 0.3, 14, rng() * TAU), R.dustPale, 0.08);
  }
}

/**
 * One rock: an angular block washed pale limestone, its lit facet bleached,
 * its far facets in shade and hatched, a ridge where they meet, cracks and
 * lichen; its shadow beneath (thrown off when it bounces).
 */
function rock(d: Draw, k: Rock): void {
  const { pen } = d;
  const rng = createRng(k.seed);
  const sides = k.r > 5 ? 7 + Math.floor(rng() * 3) : 5 + Math.floor(rng() * 3);
  const shape = blob(k.c, k.r, k.r * (0.72 + rng() * 0.2), rng, 0.34, sides, k.turn);
  const lift = 1 + k.up * 0.025;
  const body = shape.map((p) => pt(k.c.x + (p.x - k.c.x) * lift, k.c.y + (p.y - k.c.y) * lift));
  const off = 1 + k.up * 1.1;
  pen.fill(shape.map((p) => pt(p.x + off * 0.6, p.y + off * 0.85)), d.ink, k.up > 0.5 ? 0.14 : 0.22);
  pen.fill(body, PAPER_FILL, 1);
  pen.fill(body, mix(R.stone, R.mid, rng() * 0.4), 0.9);
  // The facets: a ridge across it, the face beyond it (turned from the light) in shade.
  const a = body[Math.floor(rng() * body.length)]!;
  const ridgeEnd = polar(k.c, Math.atan2(k.c.y - a.y, k.c.x - a.x) + (rng() - 0.5) * 0.6, k.r * 1.2);
  const ridge = [a, pt(k.c.x + (rng() - 0.5) * k.r * 0.3, k.c.y + (rng() - 0.5) * k.r * 0.3), ridgeEnd];
  const ux = ridgeEnd.x - a.x;
  const uy = ridgeEnd.y - a.y;
  const flip = -uy * SHADOW.x + ux * SHADOW.y > 0 ? 1 : -1;
  const nx = (-uy / (Math.hypot(ux, uy) || 1)) * flip * 40;
  const ny = (ux / (Math.hypot(ux, uy) || 1)) * flip * 40;
  const far = [a, ridge[1]!, ridgeEnd, pt(ridgeEnd.x + nx, ridgeEnd.y + ny), pt(a.x + nx, a.y + ny)];
  pen.clipped(body, () => {
    glaze(d, k.c.x - k.r * 0.35, k.c.y - k.r * 0.4, k.r * 0.8, k.r * 0.6, -0.5, R.lit, 0.8);
    pen.fill(far, R.mid, 0.6);
    pen.crescent(body, pt(-k.r * 0.35, -k.r * 0.5), () => pen.fill(body, R.dark, 0.55));
    pen.crescent(body, pt(-k.r * 0.2, -k.r * 0.28), () => pen.hatch(body, Math.max(1, k.r / 5), 0.9, 0.4, { color: d.ink, alpha: 0.45 }));
    if (k.r > 4) {
      pen.hair(ridge, 0.5, R.deep, 0.6);
      pen.hair(ridge.map((p) => pt(p.x - 0.5, p.y - 0.6)), 0.6, R.lit, 0.6);
      // Cracks across it.
      for (let i = 0; i < 2; i++) {
        const s = polar(k.c, rng() * TAU, k.r * 0.9);
        const m = polar(s, Math.atan2(k.c.y - s.y, k.c.x - s.x) + (rng() - 0.5), k.r * 0.4);
        pen.hair([s, m, polar(m, rng() * TAU, k.r * 0.35)], 0.35, R.deep, 0.65);
      }
      // Lichen and pitting.
      for (let i = 0; i < Math.round(k.r * 0.8); i++) {
        const p = polar(k.c, rng() * TAU, rng() * k.r * 0.8);
        pen.dot(p.x, p.y, 0.4 + rng() * 0.9, rng() < 0.7 ? R.lichen : R.lichenOrange, 0.45);
      }
      pen.stipple(body, Math.round(k.r * 8), (_, y) => (y > k.c.y ? 0.7 : 0.25), 0.3, R.deep);
    }
  });
  pen.stroke(outline(body, 1.5), k.r > 5 ? 0.8 : 0.5, d.ink, 0.95);
}

/** Speed in a still: short swept strokes behind the bigger rocks, grit flung out ahead and to the sides. */
function motion(d: Draw, rocks: readonly Rock[], rng: Rng): void {
  const { pen } = d;
  for (const k of rocks) {
    if (k.r < 5) continue;
    for (const s of [-0.6, 0.6]) {
      const from = pt(k.c.x - k.r * 1.2, k.c.y + s * k.r);
      pen.hair([from, pt(from.x - 6 - rng() * 6, from.y + s * 0.5)], 0.45, d.ink, 0.4);
    }
  }
  for (let i = 0; i < 26; i++) {
    const p = pt(14 + rng() * 22, (rng() - 0.5) * HALF * 2);
    const l = 0.6 + rng() * 1.6;
    if (rng() < 0.5) pen.hair([p, pt(p.x - l, p.y)], 0.5, R.dark, 0.7);
    else pen.dot(p.x, p.y, 0.35 + rng() * 0.45, rng() < 0.5 ? R.mid : R.deep, 0.85);
  }
}

function draw(d: Draw, pose: Pose): void {
  const phase = pose === 'rocks0' ? 0 : 1;
  const rng = createRng(6001 + phase * 7);
  track(d, createRng(6050));
  dust(d, createRng(6060 + phase), d.f * 1.2 - phase * 2, false);
  const rocks = rocksOf(phase);
  for (const k of rocks) rock(d, k);
  dust(d, createRng(6070 + phase), d.f * 0.8, true);
  motion(d, rocks, rng);
}

export const ROCKFALL_ART: SpriteArt<Pose> = { frame: 120, res: 2, poses: ['rocks0', 'rocks1'], draw };
