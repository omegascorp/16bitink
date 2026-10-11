import { bezier, closed, cub, type Draw, oval, pt, ribbon, tube } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { edges, FAR } from './common';
import { glow } from './estuary';

/**
 * The life of a cold Pacific Northwest coast, Oregon or Washington: Sitka
 * spruce and Douglas fir, wind-shorn shore pines, salal and dune grass;
 * a white lighthouse on its headland with the keeper's house below; bull
 * kelp floating in rafts, a sea otter on its back among it and a harbor
 * seal hauled out; and the great silver driftwood logs, root wads and
 * all, piled at the back of the beach with the wrack of the last tide.
 * Things face right.
 */
export const CONIFER = '#3d5a48';
export const CONIFER_DARK = '#2c4436';
const BARK = '#7a6656';
const DRIFT = '#bdb7a8';
const DRIFT_SHADE = '#7d786e';
const GRASS = '#a9b27a';
const GRASS_DRY = '#c9bf8c';
const SALAL = '#4f6f47';
const KELP = '#7a6a34';
const KELP_DARK = '#54481f';
const OTTER = '#6d5641';
const OTTER_PALE = '#cbbc9e';
const SEAL = '#8e8c84';
const SEAL_SPOT = '#4f4f4c';
const WALL = '#f3f0e6';
const ROOF = '#b5513f';
const LAMP = '#f6dd8a';

/** A shape on paper under a wash, its edge inked. */
function washed(t: Draw, shape: readonly Pt[], color: string, alpha: number, w = 0.6, ink = 1): void {
  t.pen.fill(shape, PAPER_FILL, 1);
  t.pen.fill(shape, color, alpha);
  t.pen.stroke(edges(shape, 2), w, t.ink, FAR * ink, false);
}

/**
 * A Sitka spruce or Douglas fir: a narrow spire of drooping branch tiers
 * round a straight trunk, dark green, the side away from the light hatched.
 * `fade` (0..1) pales it into the mist.
 */
export function spruce(t: Draw, x: number, ground: number, h: number, fade = 1): void {
  const { pen } = t;
  const w = h * (0.3 + pen.rng() * 0.08);
  const tiers = Math.max(3, Math.round(h / 4.5));
  const side = (dir: 1 | -1): Pt[] => {
    const out: Pt[] = [];
    for (let i = 1; i <= tiers; i++) {
      const u = i / tiers;
      const y = ground - h * 0.92 + h * 0.86 * u;
      const half = (w / 2) * u ** 0.85 * (0.85 + pen.rng() * 0.3);
      out.push(pt(x + dir * half, y + h * 0.03), pt(x + dir * half * 0.45, y - h * 0.02));
    }
    return out;
  };
  const tip = pt(x + pen.jitter(0.4), ground - h);
  const right = side(1);
  const left = side(-1);
  const crown = [tip, ...right, pt(x + 0.8, ground - h * 0.05), pt(x - 0.8, ground - h * 0.05), ...left.reverse()];
  pen.hair([pt(x, ground + 1), pt(x, ground - h * 0.1)], Math.max(0.6, h * 0.05), BARK, 0.7 * fade);
  pen.fill(crown, PAPER_FILL, 0.95 * fade);
  pen.fill(crown, CONIFER, 0.62 * fade);
  pen.clipped(crown, () => {
    pen.fill([pt(x + 0.5, ground - h), pt(x + w, ground - h), pt(x + w, ground + 1), pt(x + 0.5, ground + 1)], CONIFER_DARK, 0.35 * fade);
    if (h > 12) pen.hatch(crown, 1.3, 1.1, 0.3, { color: t.ink, alpha: FAR * 0.35 * fade });
  });
  pen.hair(crown, 0.45, t.ink, FAR * 0.75 * fade);
}

/** Salal: a low thicket of leathery, glossy oval leaves, pale veins catching the light. */
export function salal(t: Draw, x: number, ground: number, w: number, h: number): void {
  const { pen } = t;
  const mound: Pt[] = [pt(x - w / 2, ground + 2)];
  for (let i = 0; i <= 18; i++) {
    const u = i / 18;
    mound.push(pt(x - w / 2 + w * u, ground - h * Math.sin(Math.PI * u) ** 0.7 * (0.9 + 0.12 * Math.sin(u * 19 + x))));
  }
  mound.push(pt(x + w / 2, ground + 2));
  pen.fill(mound, SALAL, 0.4);
  for (let k = 0; k < (w * h) / 9; k++) {
    const u = pen.rng();
    const lx = x - w / 2 + w * u;
    const ly = ground - pen.rng() * h * Math.sin(Math.PI * u) ** 0.7 + 1;
    const a = pen.jitter(1.2) - 0.5;
    const leaf = oval(0, 0, 2.6, 1.5, 10).map((p) => pt(lx + p.x * Math.cos(a) - p.y * Math.sin(a), ly + p.x * Math.sin(a) + p.y * Math.cos(a)));
    pen.fill(leaf, PAPER_FILL, 0.6);
    pen.fill(leaf, SALAL, 0.68 + pen.rng() * 0.2);
    pen.hair(leaf.slice(0, 7), 0.3, t.ink, FAR * 0.6);
    if (k % 3 === 0) pen.hair([pt(lx - Math.cos(a) * 1.6, ly - Math.sin(a) * 1.6), pt(lx + Math.cos(a) * 1.6, ly + Math.sin(a) * 1.6)], 0.3, '#c8d4b0', 0.6);
  }
  pen.hair(mound.slice(1, -1).filter((_, i) => i % 4 < 3), 0.45, t.ink, FAR * 0.55);
}

/** A tuft of European beachgrass on the foredune: long arching blades, pale and dry at the tips, a few seed heads. */
export function beachgrass(t: Draw, x: number, ground: number, h: number): void {
  const { pen } = t;
  const n = 9 + Math.floor(pen.rng() * 6);
  for (let k = 0; k < n; k++) {
    const a = -0.9 + (k / (n - 1)) * 1.6 + pen.jitter(0.15);
    const len = h * (0.55 + pen.rng() * 0.5);
    const tip = pt(x + Math.sin(a) * len + len * 0.25, ground - Math.cos(a) * len * 0.85);
    const blade = bezier(pt(x + pen.jitter(2), ground), pt(x + Math.sin(a) * len * 0.25, ground - len * 0.8), tip, 6);
    pen.hair(blade, 0.9, k % 3 ? GRASS : GRASS_DRY, 0.85);
    pen.hair(blade, 0.35, t.ink, FAR * 0.7);
  }
  for (let k = 0; k < 2; k++) {
    const sx = x + pen.jitter(3);
    const top = pt(sx + 2 + pen.jitter(2), ground - h * (1.05 + pen.rng() * 0.2));
    pen.hair([pt(sx, ground), top], 0.4, t.ink, FAR * 0.7);
    const head = tube([top, pt(top.x + 0.6, top.y + 6)], 1.6, 0.8);
    pen.fill(head, GRASS_DRY, 0.85);
    pen.hair(head, 0.3, t.ink, FAR * 0.6);
  }
}

/**
 * A big driftwood log, bleached silver: a whole trunk lying from `a` to
 * `b`, its grain running along it, checked with cracks, the sawn or
 * snapped end showing growth rings. `wad` sprawls a root wad at `a`.
 */
export function driftLog(t: Draw, a: Pt, b: Pt, r: number, wad = false): void {
  const { pen } = t;
  const spine = bezier(a, pt((a.x + b.x) / 2 + pen.jitter(r * 0.4), (a.y + b.y) / 2 - r * 0.3), b, 14);
  const log = ribbon(spine, (u) => r * 2 * (1 - u * 0.3));
  if (wad) {
    // The root plate seen edge-on: a tall, lumpy slab of matted roots standing across the butt,
    // a few thick stubs snapped off ragged along its rim, roots radiating inside it.
    for (const ang of [-2.5, -1.9, -1.4, -0.8]) {
      const from = pt(a.x + Math.cos(ang) * r * 0.5, a.y - r * 0.9 + Math.sin(ang) * r * 1.8);
      const to = pt(a.x + Math.cos(ang) * r * 1.3 + pen.jitter(r * 0.3), a.y - r * 0.9 + Math.sin(ang) * r * 2.7 + pen.jitter(r * 0.3));
      washed(t, tube([from, pt((from.x + to.x) / 2 + pen.jitter(r * 0.3), (from.y + to.y) / 2), to], r * 0.6, r * 0.3), DRIFT, 0.75, 0.45, 0.85);
    }
    const plate = oval(a.x - r * 0.2, a.y - r * 0.9, r * 1.1, r * 2.2, 22).map((p) => pt(p.x + pen.jitter(r * 0.15), p.y + pen.jitter(r * 0.2)));
    washed(t, plate, DRIFT, 0.72, 0.65);
    pen.clipped(plate, () => {
      pen.fill(plate.map((p) => pt(p.x + r * 0.5, p.y + r * 0.4)), DRIFT_SHADE, 0.35);
      for (let k = 0; k < 9; k++) {
        const ang = (k / 9) * Math.PI * 2 + pen.jitter(0.3);
        pen.hair(bezier(pt(a.x, a.y - r * 0.9), pt(a.x + Math.cos(ang) * r * 0.6 + pen.jitter(r * 0.3), a.y - r * 0.9 + Math.sin(ang) * r * 1.1), pt(a.x + Math.cos(ang) * r * 1.2, a.y - r * 0.9 + Math.sin(ang) * r * 2.3), 6), 0.4, t.ink, FAR * 0.55);
      }
    });
  }
  pen.fill(log.shape, PAPER_FILL, 1);
  pen.fill(log.shape, DRIFT, 0.72);
  pen.clipped(log.shape, () => {
    pen.fill(log.bot.map((p, i) => pt(p.x, p.y - (p.y - spine[i]!.y) * 0.6)).concat([...log.bot].reverse()), DRIFT_SHADE, 0.4);
    for (const k of [-0.6, -0.25, 0.1, 0.4, 0.7]) pen.hair(spine.map((p, i) => pt(p.x + pen.jitter(0.3), p.y + k * r * 2 * (1 - (i / spine.length) * 0.3))).filter((_, i) => (i + Math.round(k * 10)) % 7 < 5), 0.35, t.ink, FAR * 0.5);
    pen.hatch(log.shape, 1.4, 1.2, 0.3, { color: t.ink, alpha: FAR * 0.3, onlyBelow: Math.max(a.y, b.y) - r * 0.2 });
  });
  pen.stroke(edges(log.shape, 3), 0.75, t.ink, FAR, false);
  if (!wad) {
    const end = oval(a.x, a.y, r * 0.55, r, 14);
    washed(t, end, '#e2d8c2', 0.7, 0.5);
    for (const k of [0.35, 0.65]) pen.hair(closed(oval(a.x, a.y, r * 0.55 * k, r * k, 12)), 0.3, t.ink, FAR * 0.55);
  }
}

/**
 * A bed of bull kelp seen across the water: a dark, glassy slick where the
 * canopy lies on the surface, clusters of round floats in it, and the flat
 * blades lying every which way, streaming mostly with the current.
 */
export function kelpBed(t: Draw, x0: number, x1: number, water: (x: number) => number, depth: number, s: number): void {
  const { pen } = t;
  const n = Math.max(2, Math.round((x1 - x0) / (28 * s)));
  for (let i = 0; i < n; i++) {
    const cx = x0 + ((i + 0.5) / n) * (x1 - x0) + pen.jitter(8 * s);
    const cy = water(cx) + pen.jitter(depth * 0.3);
    const rx = (14 + pen.rng() * 10) * s;
    const ry = depth * (0.25 + pen.rng() * 0.2);
    const slick = oval(cx, cy, rx, ry, 18).map((p) => pt(p.x + pen.jitter(2 * s), p.y + pen.jitter(0.5 * s)));
    pen.fill(slick, KELP_DARK, 0.18);
    pen.hair(slick.slice(9, 18), 0.4, PAPER_FILL, 0.5);
    for (let k = 0; k < 14; k++) {
      const bx = cx + pen.jitter(rx * 0.9);
      const by = cy + pen.jitter(ry * 0.8);
      const len = (3 + pen.rng() * 6) * s;
      const a = pen.jitter(0.5) + (pen.rng() < 0.75 ? 0 : Math.PI);
      const blade = ribbon(bezier(pt(bx, by), pt(bx + Math.cos(a) * len * 0.5, by + pen.jitter(1.2 * s)), pt(bx + Math.cos(a) * len, by + Math.sin(a) * len * 0.3), 5), (u) => s * 0.9 * (1 - u * 0.5));
      pen.fill(blade.shape, KELP, 0.6);
    }
    for (let k = 0; k < 3; k++) {
      const bx = cx + pen.jitter(rx * 0.7);
      const by = cy + pen.jitter(ry * 0.6);
      pen.fill(oval(bx, by, 1 * s, 0.7 * s, 10), KELP_DARK, 0.7);
      pen.dot(bx - 0.3 * s, by - 0.3 * s, 0.25 * s, PAPER_FILL, 0.7);
    }
  }
}

/**
 * A sea otter floating on its back among the kelp: head up and looking
 * along its body, forepaws folded on its chest, hind feet and tail
 * sticking up out of the water at the far end, a ripple round it.
 */
export function seaOtter(t: Draw, x: number, water: number, s: number): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, water + dy * s);
  // Rings on the water round it.
  for (const k of [1, 1.35]) pen.hair(oval(x, water + 0.6 * s, 17 * k * s, 1.6 * k * s, 24).slice(0, 13), 0.4, PAPER_FILL, 0.75 / k);
  const tail = [P(-10, -0.4), P(-17, -2.6), P(-17.5, -1.4), P(-10, 0.6)];
  washed(t, tail, OTTER, 0.7, 0.45);
  for (const dx of [-11.5, -9.5]) washed(t, oval(x + dx * s, water - 2.8 * s, 1.3 * s, 2.2 * s, 10), OTTER, 0.75, 0.4);
  const body = [P(-11, 0.5), ...cub(P(-11, 0.5), P(-10, -3.4), P(2, -4.6), P(6.5, -3.6), 10).slice(1), P(7, 0.6)];
  washed(t, body, OTTER, 0.7, 0.55);
  pen.clipped(body, () => pen.fill(body.map((p) => pt(p.x, p.y + 1.6 * s)), '#3f3126', 0.3));
  // Forepaws folded on the chest.
  washed(t, oval(x + 3 * s, water - 4.2 * s, 2 * s, 1.1 * s, 10), OTTER, 0.8, 0.4);
  // The pale, grizzled head, raised, looking down its body (left); a dark nose, small eye, whiskers.
  const head = oval(x + 8.5 * s, water - 4 * s, 3.4 * s, 2.8 * s, 14);
  washed(t, head, OTTER_PALE, 0.75, 0.5);
  pen.stipple(head, Math.round(14 * s), () => 0.7, 0.35, '#8a7a60');
  pen.dot(x + 7 * s, water - 4.6 * s, 0.4 * s, t.ink, FAR * 1.2);
  pen.dot(x + 5.5 * s, water - 4.4 * s, 0.6 * s, '#2a221c', 0.9);
  for (const k of [-1, 1]) pen.hair([P(5.6, -4.2), P(3.4, -4.6 + k * 0.8)], 0.3, t.ink, FAR * 0.6);
  pen.hair([P(-12, 0.8), P(9, 0.8)], 0.5, PAPER_FILL, 0.8);
}

/**
 * A harbor seal hauled out on a rock, in the banana pose: head and hind
 * flippers lifted off the rock, mottled grey with dark spots, a big dark
 * eye and whiskers. `ground` is the rock's top under its belly.
 */
export function harborSeal(t: Draw, x: number, ground: number, s: number): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, ground + dy * s);
  pen.fill(oval(x, ground + 0.6, 16 * s, 1.6, 20), t.ink, 0.12);
  const back = cub(P(-18, -6.5), P(-12, -9), P(-2, -11), P(8, -10.5), 12);
  const head = cub(P(8, -10.5), P(13, -10.5), P(16, -11), P(18.5, -9.6), 6);
  const belly = cub(P(16, -7.4), P(9, -2.6), P(0, 0.6), P(-12, 0), 12);
  const body = [...back, ...head.slice(1), P(19, -8.4), ...belly, ...bezier(P(-12, 0), P(-16, -1.6), P(-18, -6.5), 5).slice(1)];
  washed(t, body, SEAL, 0.62, 0.65);
  pen.clipped(body, () => {
    pen.fill(belly.map((p) => pt(p.x, p.y - 2.5 * s)).concat([...belly].reverse().map((p) => pt(p.x, p.y + 2 * s))), '#d6d2c6', 0.45);
    for (let k = 0; k < 26; k++) pen.fill(oval(x + (-14 + pen.rng() * 26) * s, ground + (-9 + pen.rng() * 6) * s, (0.5 + pen.rng() * 0.6) * s, (0.4 + pen.rng() * 0.4) * s, 6), SEAL_SPOT, 0.55);
    pen.crescent(body, pt(0, -3 * s), () => pen.hatch(body, 1.5, 1.1, 0.35, { color: t.ink, alpha: FAR * 0.4 }));
  });
  // Hind flippers lifted together behind; a fore-flipper flat at its side.
  const hind = [P(-17, -6), P(-23, -9.5), P(-24.5, -7.6), P(-23.5, -5.4), P(-17, -3.6)];
  washed(t, hind, SEAL_SPOT, 0.5, 0.45);
  pen.hair([P(-23.6, -8.6), P(-20, -6)], 0.3, t.ink, FAR * 0.6);
  washed(t, [P(5, -3.6), P(9, -2.6), P(7.6, -1.6), P(3.4, -2.2)], SEAL_SPOT, 0.5, 0.4);
  pen.dot(x + 15.4 * s, ground - 10 * s, 0.9 * s, '#1f1f22', 0.95);
  pen.dot(x + 15.7 * s, ground - 10.3 * s, 0.25 * s, PAPER_FILL, 0.9);
  pen.dot(x + 18.6 * s, ground - 9.3 * s, 0.45 * s, t.ink, FAR * 1.2);
  for (const k of [-1, 0, 1]) pen.hair([P(18, -8.6 + k * 0.3), P(21.5, -8.8 + k * 1.1)], 0.25, t.ink, FAR * 0.6);
}

/**
 * A white lighthouse on its cliff, Heceta Head fashion: a stout conical
 * tower, the lantern glazed and glowing under a black dome with its
 * gallery rail, and a little oil house at its foot.
 */
export function pnwLighthouse(t: Draw, x: number, ground: number, s: number): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, ground + dy * s);
  const lamp = P(0, -22.6);
  glow(t, lamp.x, lamp.y, 26 * s, 14 * s, '#fff4cc', 0.6);
  glow(t, lamp.x, lamp.y, 8 * s, 6 * s, LAMP, 0.8);
  const shed = [P(-9, 0), P(-2.5, 0), P(-2.5, -4.6), P(-9, -4.6)];
  washed(t, shed, WALL, 0.6, 0.45);
  pen.fill([P(-9.6, -4.6), P(-2.2, -4.6), P(-3.6, -6.8), P(-8.4, -6.8)], ROOF, 0.6);
  pen.hair(edges([P(-9.6, -4.6), P(-2.2, -4.6), P(-3.6, -6.8), P(-8.4, -6.8)]), 0.4, t.ink, FAR * 0.8);
  const tower = [P(-3.4, 0), P(3.4, 0), P(2.2, -19), P(-2.2, -19)];
  pen.fill(tower, PAPER_FILL, 1);
  pen.clipped(tower, () => {
    pen.fill([P(0.8, 0), P(4, 0), P(4, -20), P(0.6, -20)], '#9fb0b8', 0.35);
    pen.hatch([P(1.6, 0), P(4, 0), P(4, -20), P(1.4, -20)], 1, 1.25, 0.3, { color: t.ink, alpha: FAR * 0.35 });
  });
  pen.fill([P(-0.5, -11), P(0.5, -11), P(0.5, -9), P(-0.5, -9)], t.ink, FAR * 0.8);
  pen.stroke(edges(tower), 0.55, t.ink, FAR * 1.1, false);
  // The gallery deck and its rail, the glazed lantern, the black dome and its ventilator ball.
  pen.stroke([P(-3.4, -19.2), P(3.4, -19.2)], 0.9 * s, t.ink, FAR * 1.1, false);
  pen.hair([P(-3.2, -20.8), P(3.2, -20.8)], 0.35, t.ink, FAR);
  for (const dx of [-3.2, -1.6, 0, 1.6, 3.2]) pen.hair([P(dx, -19.2), P(dx, -20.8)], 0.3, t.ink, FAR * 0.8);
  const lantern = [P(-1.8, -19.4), P(1.8, -19.4), P(1.8, -23.4), P(-1.8, -23.4)];
  pen.fill(lantern, LAMP, 0.95);
  for (const dx of [-0.6, 0.6]) pen.hair([P(dx, -19.4), P(dx, -23.4)], 0.3, t.ink, FAR * 0.8);
  pen.hair(edges(lantern), 0.4, t.ink, FAR);
  const dome = [P(-2.2, -23.4), ...bezier(P(-2.2, -23.4), P(0, -26.6), P(2.2, -23.4), 6).slice(1)];
  pen.fill(dome, '#2a2a2e', 0.8);
  pen.dot(x, ground - 26 * s, 0.6 * s, '#2a2a2e', 0.85);
}

/**
 * The keeper's house below the light, Queen Anne style: white clapboard,
 * steep red roofs with a cross gable, a porch along the front, chimneys,
 * tall sash windows.
 */
export function keepersHouse(t: Draw, x: number, ground: number, s: number): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, ground + dy * s);
  for (const cx of [-6, 7]) {
    const stack = [P(cx - 0.9, -14), P(cx + 0.9, -14), P(cx + 0.9, -19.5), P(cx - 0.9, -19.5)];
    washed(t, stack, ROOF, 0.55, 0.4);
  }
  const wall = [P(-11, 0), P(11, 0), P(11, -9), P(-11, -9)];
  washed(t, wall, WALL, 0.5, 0.5);
  pen.clipped(wall, () => {
    for (let y = -1.2; y > -9; y -= 1.2) pen.hair([P(-11, y), P(11, y)], 0.25, t.ink, FAR * 0.3);
    pen.fill([P(7, 0), P(11.5, 0), P(11.5, -9.5), P(7, -9.5)], '#9fb0b8', 0.3);
  });
  const roof = [P(-12, -9), P(12, -9), P(9, -15.5), P(-9, -15.5)];
  washed(t, roof, ROOF, 0.6, 0.5);
  const gable = [P(-1, -9), P(7, -9), P(3, -18)];
  washed(t, gable, ROOF, 0.68, 0.5);
  pen.fill([P(1.6, -10.4), P(4.4, -10.4), P(4.4, -13.2), P(1.6, -13.2)], t.ink, FAR * 0.75);
  for (const dx of [-8.5, -4.5, 0.5, 5.5]) {
    const win = [P(dx, -3.6), P(dx + 2, -3.6), P(dx + 2, -7.4), P(dx, -7.4)];
    pen.fill(win, t.ink, FAR * 0.7);
    pen.hair([P(dx, -5.5), P(dx + 2, -5.5)], 0.3, PAPER_FILL, 0.8);
  }
  // The porch: a shed roof on posts along the front, its rail.
  pen.fill([P(-11.5, -3.2), P(11.5, -3.2), P(11.5, -4.4), P(-11.5, -4.4)], ROOF, 0.45);
  for (let dx = -10.5; dx <= 10.5; dx += 3.5) pen.hair([P(dx, -3.2), P(dx, 0)], 0.35, t.ink, FAR * 0.8);
  pen.hair([P(-11, -1.4), P(11, -1.4)], 0.3, t.ink, FAR * 0.7);
}

/**
 * The wrack line where the last tide turned: bull kelp thrown up whole,
 * its long stipes lying in loops with the floats and blades still on, and
 * dark strands of eelgrass tangled through it. `y(x)` is the line.
 */
export function wrackLine(t: Draw, x0: number, x1: number, y: (x: number) => number): void {
  const { pen } = t;
  for (let x = x0; x < x1; x += 3 + pen.rng() * 6) {
    if (pen.rng() < 0.35) continue;
    const len = 4 + pen.rng() * 10;
    const yy = y(x) + pen.jitter(2.5);
    pen.hair(bezier(pt(x, yy), pt(x + len / 2, yy + pen.jitter(2)), pt(x + len, yy + pen.jitter(1.5)), 5), 0.6, '#3f4a2c', 0.55);
  }
  for (let x = x0 + pen.rng() * 60; x < x1; x += 110 + pen.rng() * 120) {
    const yy = y(x);
    const len = 30 + pen.rng() * 30;
    const dir = pen.rng() < 0.5 ? 1 : -1;
    const stipe = cub(pt(x, yy + 1), pt(x + dir * len * 0.3, yy - 3 + pen.jitter(2)), pt(x + dir * len * 0.7, yy + 4 + pen.jitter(2)), pt(x + dir * len, yy + pen.jitter(2)), 14);
    const tubeShape = tube(stipe, 0.9, 2.2);
    washed(t, tubeShape, KELP, 0.6, 0.4, 0.8);
    const end = stipe[stipe.length - 1]!;
    for (let k = 0; k < 4; k++) {
      const a = (dir > 0 ? 0 : Math.PI) + (k - 1.5) * 0.35;
      const l = 8 + pen.rng() * 8;
      const blade = ribbon(bezier(end, pt(end.x + Math.cos(a) * l * 0.5, end.y + Math.sin(a) * l * 0.3 + 1), pt(end.x + Math.cos(a) * l, end.y + Math.sin(a) * l * 0.4 + pen.jitter(1)), 6), (u) => 1.6 * (1 - u * 0.4));
      pen.fill(blade.shape, KELP, 0.55);
      pen.hair(blade.top, 0.3, t.ink, FAR * 0.5);
    }
  }
}
