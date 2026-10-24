import type { Rng } from '../../logic/rng';
import { bezier, closed, oval, pt, type Draw } from '../kit';
import type { Pt } from '../pen';
import { backArc, beam, block, frontArc, frontOf, gable, HOLE, PLANK, quad, roundWash, SHINGLE, STONE, THATCH } from '../sites/build';
import { blob, crisp, dab, flat, LIGHT, mix, paint, rgba, SHADOW, soft } from '../sites/paintKit';
import { BARK, broken, bush, crownLine, curve, cypress, EARTH, GRASS_DEEP, GRASS_FAR, IVORY, LEAF, LEAF_DARK, LEAF_LIT, litEdge, type Puff, puffPath, road, rock, ROCK, strip, tree, tuft, wood, yAt } from './groundParts';
import { TOWN_VIEW } from './types';

/**
 * The country either side of the town (ground.ts paints the town in the
 * middle), view units, on the same hill and in the same near view:
 *
 * West: the crag's outcrops sink into a wood's edge; sheep graze below it,
 * a spring under the rocks runs down as a stream, under a little stone
 * bridge where the lane leaves town, past a thatched barn and its ricks.
 *
 * East: the monastery's terrace runs on as a vineyard up to a windmill on
 * the rise, and the lane climbs away over the brow towards the hills,
 * past a wayside shrine. Hedges below; trees close both ends of the view.
 *
 * All of it painted quieter than the town (lighter pen, no silhouette
 * finish), so it frames the buildings rather than competing with them.
 */
const { w: W } = TOWN_VIEW;

/** How the core's lanes run on, view units, from where the town's part of them ends. */
export const FLANK_LANES = {
  left: [pt(340, 410), pt(290, 406), pt(252, 404), pt(214, 402), pt(150, 396), pt(86, 392), pt(20, 394), pt(-14, 396)],
  right: [pt(1680, 398), pt(1760, 372), pt(1830, 338), pt(1890, 308), pt(1950, 282), pt(W + 14, 262)],
} as const;

/** Water holding the evening sky: dusky blue-grey, amber glints. */
const WATER = '#4e566a';
const WATER_DEEP = '#263049';
const GLINT = '#d8b47a';
const WOOL = '#c4b898';
const FACE = '#2a221c';
const VINE = '#3d5a28';
const WHITEWASH = '#7a6e5a';
const POST = '#5e5040';

const at = (d: Draw, p: Pt, paint: () => void): void => {
  const ctx = d.pen.ctx;
  ctx.save();
  ctx.translate(p.x, p.y);
  paint();
  ctx.restore();
};

// ---- West: the wood's edge, the sheep, the spring and its stream ----

function woodEdge(d: Draw, rng: Rng): void {
  // The wood behind, one dark mass of crowns, then single trees standing out in front of it.
  wood(d, rng, -24, 196, 300, 34, mix(LEAF_DARK, LEAF, 0.4), 3.4);
  wood(d, rng, 150, 300, 306, 14, mix(LEAF_DARK, LEAF, 0.5), 2.6);
  tree(d, rng, pt(98, 308), 0.92, 0.55);
  tree(d, rng, pt(196, 312), 0.78, 0.7);
  tree(d, rng, pt(30, 322), 1.2, 0.3);
}

/** A sheep: a rounded fleece lit from the upper left, a dark face, four stick legs; `grazing` puts its head down. */
function sheep(d: Draw, rng: Rng, foot: Pt, facing: 1 | -1, grazing: boolean): void {
  const { x, y } = foot;
  dab(d, oval(x + 2, y + 0.6, 8, 1.8, 14), SHADOW, 0.3, 1);
  for (const dx of [-3.6, -1.6, 2.2, 4]) d.pen.hair([pt(x + dx, y - 3.5), pt(x + dx + (rng() - 0.5) * 0.6, y)], 0.8, FACE, 0.9);
  const body = blob(pt(x, y - 6), 6.4, 4.2, rng, 0.16, 16);
  paint(d, body, WOOL, { shadow: 0.7, hatch: 0.16, line: 0.45 });
  d.pen.clipped(body, () => {
    for (let k = 0; k < 7; k++) {
      const c = pt(x - 4 + rng() * 8, y - 8.5 + rng() * 5);
      d.pen.hair([pt(c.x - 1, c.y + 0.4), pt(c.x, c.y - 0.5), pt(c.x + 1, c.y + 0.3)], 0.35, mix(WOOL, SHADOW, 0.35), 0.5);
    }
  });
  const head = pt(x + facing * 6.6, y - (grazing ? 3 : 7.4));
  const face = blob(head, 2.4, 1.7, rng, 0.1, 10, facing * (grazing ? 0.9 : 0.35));
  d.pen.fill(face, FACE, 0.95);
  d.pen.fill(blob(pt(head.x - 0.6, head.y - 0.6), 0.9, 0.6, rng, 0.1, 8), mix(FACE, LIGHT, 0.3), 0.6);
  d.pen.hair([pt(head.x - facing * 1.4, head.y - 1.2), pt(head.x - facing * 3, head.y - 1.8)], 0.7, FACE, 0.9);
  if (grazing) tuft(d, rng, pt(head.x + facing, head.y + 2), 2.4, 0.7);
}

/** A post-and-rail fence along a line: grey posts lit on the left, two rails sagging a little between them. */
function fence(d: Draw, rng: Rng, line: readonly Pt[], gap = 16): void {
  const posts: Pt[] = [];
  for (let i = 0; i < line.length; i++) {
    const p = line[i]!;
    if (posts.length === 0 || Math.hypot(p.x - posts[posts.length - 1]!.x, p.y - posts[posts.length - 1]!.y) >= gap) posts.push(p);
  }
  for (const v of [5.5, 9.5]) {
    for (let i = 0; i + 1 < posts.length; i++) {
      const a = posts[i]!;
      const b = posts[i + 1]!;
      const rail = bezier(pt(a.x, a.y - v), pt((a.x + b.x) / 2, (a.y + b.y) / 2 - v + 0.8), pt(b.x, b.y - v), 6);
      d.pen.hair(rail, 1.3, mix(POST, LIGHT, 0.2), 0.9);
      d.pen.hair(rail.map((p) => pt(p.x, p.y + 0.6)), 0.45, d.ink, 0.6);
    }
  }
  for (const p of posts) {
    const post = crisp([pt(p.x - 0.9, p.y - 12 - rng()), pt(p.x + 0.9, p.y - 12.4), pt(p.x + 1, p.y), pt(p.x - 1, p.y)], 2);
    flat(d, post, POST, { tone: 0.1, line: 0.45 });
    tuft(d, rng, pt(p.x, p.y + 0.5), 3, 0.6);
  }
}

/** The stream's course, from the spring under the crag's outcrops down past the bridge and out at the near edge. */
const STREAM = curve([pt(306, 320), pt(298, 334), pt(310, 350), pt(292, 366), pt(266, 378), pt(256, 392), pt(252, 404), pt(242, 420), pt(248, 438), pt(234, 458), pt(224, 484)], 4);

/** Water the colour of the sky, the far bank's shade in it, glints across, the banks inked and grassed, stones at the edge. */
function stream(d: Draw, rng: Rng): void {
  const ctx = d.pen.ctx;
  const s = strip(STREAM, (u) => 2.5 + u * 13 + 2.2 * Math.sin(u * 17));
  dab(d, s.shape.map((p) => pt(p.x + 1, p.y + 1.5)), mix(GRASS_DEEP, SHADOW, 0.3), 0.45, 1.5);
  d.pen.fill(s.shape, WATER_DEEP, 1);
  d.pen.clipped(s.shape, () => {
    const g = ctx.createLinearGradient(0, 320, 0, 480);
    g.addColorStop(0, rgba(mix(WATER, GLINT, 0.25), 0.95));
    g.addColorStop(1, rgba(mix(WATER, WATER_DEEP, 0.3), 0.95));
    ctx.fillStyle = g;
    ctx.fillRect(200, 320, 150, 170);
    // The far (left, upper) bank throws its shade on the water; the open sky shows in the middle.
    soft(ctx, 1.5, () => d.pen.fill([...s.left, ...s.left.slice().reverse().map((p) => pt(p.x + 3, p.y + 2.5))], mix(WATER_DEEP, SHADOW, 0.3), 0.5));
    for (let i = 4; i < STREAM.length - 2; i += 2) {
      const p = STREAM[i]!;
      const w = 2 + (i / STREAM.length) * 5;
      d.pen.hair([pt(p.x - w + rng() * 2, p.y + rng()), pt(p.x + w * 0.4 + rng() * 2, p.y + rng())], 0.6, GLINT, 0.6);
    }
  });
  broken(d, rng, s.left, 0.55, d.ink, 0.7, 0.85);
  broken(d, rng, s.right, 0.6, d.ink, 0.5, 0.7);
  for (const edge of [s.left, s.right]) for (const p of edge) if (rng() < 0.5) tuft(d, rng, pt(p.x, p.y + 0.5), 3.4, 0.7);
  // The spring: water welling out between stones at the foot of the rocks.
  for (const [x, y, r] of [[296, 322, 6], [316, 324, 5], [318, 352, 4], [284, 368, 4.5], [270, 384, 3.5], [258, 432, 5], [244, 462, 6]] as const) rock(d, rng, pt(x, y), r, r * 0.55);
  d.pen.fill(oval(305, 322, 4, 1.4, 12), GLINT, 0.55);
  // Reeds where it slows.
  for (const [x, y] of [[226, 440], [262, 446], [272, 372], [236, 470]] as const) {
    for (let k = 0; k < 5; k++) d.pen.hair([pt(x + k * 1.4, y), pt(x + k * 1.4 + (rng() - 0.3) * 2, y - 6 - rng() * 4)], 0.5, mix(GRASS_DEEP, SHADOW, 0.2), 0.8);
  }
}

// ---- West, near: the bridge, the barn and its ricks ----

/** A little humped stone bridge carrying the lane over the stream: parapets lit on their coping, one arch with the water running out of it. */
function bridge(d: Draw, rng: Rng): void {
  const [x0, x1] = [228, 278];
  const hump = (x: number): number => -2.2 * Math.sin(Math.max(0, Math.min(1, (x - x0) / (x1 - x0))) * Math.PI);
  const course = (y: number): Pt[] => Array.from({ length: 11 }, (_, i) => pt(x0 + ((x1 - x0) * i) / 10, y + hump(x0 + ((x1 - x0) * i) / 10)));
  const parapet = (y: number, h: number, flare: number): void => {
    const top = course(y - h);
    const base = course(y);
    const face = [pt(x0 - flare, y + 1), ...base, pt(x1 + flare, y + 1), pt(x1 + flare, y + 1 - h), ...top.slice().reverse(), pt(x0 - flare, y + 1 - h)];
    flat(d, crisp(face, 3), ROCK, { tone: 0.05, line: 0.6 });
    d.pen.clipped(face, () => {
      for (let x = x0 - flare + rng() * 3; x < x1 + flare; x += 4 + rng() * 3) d.pen.hair([pt(x, y - h + hump(x) + 0.6), pt(x, y + hump(x) - 0.4)], 0.4, d.ink, 0.45);
      d.pen.hair(base.map((p) => pt(p.x, p.y - h / 2)), 0.4, d.ink, 0.35);
    });
    d.pen.hair(top.map((p) => pt(p.x, p.y + 0.4)), 0.9, litEdge(ROCK, 0.45), 0.6);
  };
  parapet(399, 4.5, 2);
  // The near face: a span of stone from the parapet down to the water, the arch's dark mouth in it.
  const deckFoot = course(422);
  const face = [pt(x0 - 6, 424), ...deckFoot, pt(x1 + 6, 424), pt(x1 + 4, 410), ...course(410).slice().reverse(), pt(x0 - 4, 410)];
  flat(d, crisp(face, 3), ROCK, { tone: 0.12, line: 0, from: pt(x0, 410), to: pt(x1, 424) });
  const cx = yAt(STREAM.map((p) => pt(p.y, p.x)), 420);
  const mouth = [pt(cx - 9, 423), ...Array.from({ length: 13 }, (_, i) => {
    const a = Math.PI + (i / 12) * Math.PI;
    return pt(cx + Math.cos(a) * 9, 422 + Math.sin(a) * 8 + hump(cx));
  }), pt(cx + 9, 423)];
  d.pen.fill(mouth, HOLE, 0.85);
  d.pen.clipped(mouth, () => d.pen.fill(oval(cx - 2, 423, 9, 2.5, 14), mix(WATER, WATER_DEEP, 0.5), 0.6));
  d.pen.clipped(face, () => {
    for (let y = 413; y < 424; y += 3.6) {
      for (let x = x0 - 6 + rng() * 4; x < x1 + 6; x += 4.5 + rng() * 3) {
        d.pen.hair([pt(x, y + hump(x)), pt(x, y + hump(x) + 3.2)], 0.4, d.ink, 0.4);
        if (rng() < 0.3) d.pen.fill(crisp([pt(x + 0.4, y + hump(x) + 0.4), pt(x + 4, y + hump(x) + 0.4), pt(x + 4, y + hump(x) + 3), pt(x + 0.4, y + hump(x) + 3)], 2), mix(ROCK, LIGHT, 0.5), 0.3);
      }
      d.pen.hair(course(y), 0.35, d.ink, 0.35);
    }
    soft(d.pen.ctx, 1.5, () => d.pen.fill(course(420).concat(course(428).reverse()), SHADOW, 0.25));
  });
  for (let i = 0; i <= 12; i += 2) {
    const a = Math.PI + (i / 12) * Math.PI;
    d.pen.hair([pt(cx + Math.cos(a) * 9, 422 + Math.sin(a) * 8 + hump(cx)), pt(cx + Math.cos(a) * 12, 422 + Math.sin(a) * 11 + hump(cx))], 0.45, d.ink, 0.6);
  }
  d.pen.stroke(mouth.slice(1, -1), 0.6, d.ink, 0.85, false);
  d.pen.stroke(closed(crisp(face, 3)), 0.6, d.ink, 0.7);
  parapet(410, 4.5, 4);
  for (const x of [x0 - 6, x1 + 6]) tuft(d, rng, pt(x, 424), 3.4, 0.7);
}

/** A rick of hay: a round stack, its thatched cap drawn down over the shoulders, straw sticking out. */
function rick(d: Draw, rng: Rng, foot: Pt, r: number, h: number): void {
  const { x, y } = foot;
  dab(d, oval(x + r * 0.7, y + 1, r * 1.6, r * 0.35, 14), SHADOW, 0.3, 1.4);
  const body = [...frontArc(x, y, r), ...backArc(x, y - h, r)];
  roundWash(d, body, x - r, x + r, '#94733a', 0.3);
  d.pen.clipped(body, () => {
    for (let k = 0; k < r * 3; k++) {
      const px = x - r + rng() * r * 2;
      const py = y - h + rng() * h;
      d.pen.hair([pt(px, py), pt(px + (rng() - 0.5), py + 2 + rng() * 2)], 0.35, rng() < 0.5 ? mix(THATCH, SHADOW, 0.45) : mix(THATCH, LIGHT, 0.5), 0.6);
    }
  });
  d.pen.stroke(closed(crisp(body, 4)), 0.55, d.ink, 0.75);
  const eave = frontArc(x, y - h + 1.5, r + 1.6, 12);
  const crown = [pt(x - r - 1.6, y - h + 1.5), ...bezier(pt(x - r - 1.6, y - h + 1.5), pt(x - r * 0.9, y - h - r * 1.5), pt(x, y - h - r * 1.45), 8).slice(1), ...bezier(pt(x, y - h - r * 1.45), pt(x + r * 0.9, y - h - r * 1.5), pt(x + r + 1.6, y - h + 1.5), 8).slice(1)];
  const cap = [...crown, ...eave.slice().reverse().slice(1, -1)];
  paint(d, cap, THATCH, { shadow: 0.6, hatch: 0.22, line: 0.6 });
  d.pen.clipped(cap, () => {
    for (let k = 0; k < r * 5; k++) {
      const t = rng();
      const p = pt(x - r + t * r * 2, y - h - r * 1.2 * Math.sin(t * Math.PI) + rng() * r * 1.4);
      d.pen.hair([p, pt(p.x + (t - 0.5) * 2, p.y + 2.5)], 0.35, rng() < 0.55 ? mix(THATCH, SHADOW, 0.45) : mix(THATCH, LIGHT, 0.5), 0.55);
    }
  });
  d.pen.hair([pt(x, y - h - r * 1.45), pt(x + 0.5, y - h - r * 1.45 - 4)], 0.8, d.ink, 0.8);
  for (const p of eave) if (rng() < 0.6) d.pen.hair([p, pt(p.x + (rng() - 0.5) * 2, p.y + 1.5 + rng() * 1.5)], 0.4, mix(THATCH, SHADOW, 0.3), 0.7);
}

/** A thatched barn in the oblique view of the town's buildings, weathered boards, its great doors standing open. */
function barn(d: Draw, rng: Rng, foot: Pt): void {
  at(d, foot, () => {
    dab(d, oval(16, 2, 60, 8, 20), SHADOW, 0.25, 2.5);
    const b = { x0: -38, x1: 38, z0: 0, z1: 28, h0: 0, h1: 30 };
    const { front } = block(d, rng, b, mix(PLANK, '#5e584c', 0.4), 'plank', false);
    // A footing of field stones.
    const face = frontOf(b);
    d.pen.clipped(front, () => d.pen.fill(crisp(quad(face, -1, -1, 77, 4.5), 3), mix(ROCK, SHADOW, 0.15), 0.85));
    d.pen.hair([face(0, 4.5), face(76, 4.5)], 0.45, d.ink, 0.6);
    // The doors: a dark threshold, one leaf swung back against the wall.
    const door = crisp(quad(face, 27, 0, 49, 23), 3);
    d.pen.fill(door, HOLE, 0.88);
    d.pen.clipped(door, () => d.pen.fill(crisp(quad(face, 27, 0, 33, 23), 3), mix(HOLE, LIGHT, 0.25), 0.5));
    d.pen.stroke(closed(door), 0.6, d.ink, 0.9);
    const leaf = crisp([face(49, 0), face(49, 23), pt(face(49, 23).x + 10, face(49, 23).y + 3), pt(face(49, 0).x + 10, face(49, 0).y + 2)], 2);
    flat(d, leaf, PLANK, { tone: -0.05, line: 0.55 });
    d.pen.hair([pt(leaf[0]!.x + 5, leaf[0]!.y - 0.5), pt(leaf[0]!.x + 5, leaf[0]!.y - 23)], 0.4, d.ink, 0.5);
    d.pen.fill(crisp(quad(face, 11, 15, 17, 20), 2), HOLE, 0.85);
    d.pen.fill(crisp(quad(face, 61, 15, 67, 20), 2), HOLE, 0.85);
    gable(d, rng, b, 26, 'x', THATCH, 'thatch', mix(PLANK, '#5e584c', 0.4), 3);
  });
}

// ---- East: the windmill, the vineyard ----

/** A tower mill on the rise: a whitewashed tower tapering up, a shingled cap, four latticed sails half clothed. */
function windmill(d: Draw, rng: Rng, foot: Pt): void {
  const { x, y } = foot;
  const [rb, rt, h] = [12, 9, 46];
  dab(d, oval(x + 10, y + 1, 22, 4, 16), SHADOW, 0.25, 2);
  const body = [...frontArc(x, y, rb), ...backArc(x, y - h, rt)];
  roundWash(d, body, x - rb, x + rb, WHITEWASH, 0.25);
  d.pen.clipped(body, () => {
    for (let v = 8; v < h; v += 9) d.pen.hair(frontArc(x, y - v, rb - ((rb - rt) * v) / h, 12), 0.35, mix(WHITEWASH, SHADOW, 0.4), 0.45);
    soft(d.pen.ctx, 1.4, () => d.pen.fill(frontArc(x, y - 3, rb + 2).concat([pt(x + rb + 2, y + 6), pt(x - rb - 2, y + 6)]), mix(WHITEWASH, SHADOW, 0.5), 0.25));
  });
  d.pen.stroke(closed(crisp(body, 4)), 0.6, d.ink, 0.8);
  // A door at its foot and a little window up the tower.
  const door = [pt(x - 3.5, y + 4.8), pt(x - 3.5, y - 5), ...bezier(pt(x - 3.5, y - 5), pt(x, y - 9), pt(x + 3.5, y - 5), 6).slice(1), pt(x + 3.5, y + 4.8)];
  d.pen.fill(door, HOLE, 0.85);
  d.pen.stroke(door, 0.5, d.ink, 0.8, false);
  d.pen.fill(crisp([pt(x - 4.5, y - 28), pt(x - 1.5, y - 28.5), pt(x - 1.5, y - 23.5), pt(x - 4.5, y - 23)], 1.5), HOLE, 0.85);
  // The cap, a shingled hood turned to the wind.
  const top = y - h;
  const capRing = frontArc(x, top, rt + 1.6, 12);
  const hood = [pt(x - rt - 1.6, top), ...bezier(pt(x - rt - 1.6, top), pt(x - rt * 0.8, top - 13), pt(x + 1, top - 15), 8).slice(1), ...bezier(pt(x + 1, top - 15), pt(x + rt * 0.9, top - 12), pt(x + rt + 1.6, top), 8).slice(1), ...capRing.slice().reverse().slice(1, -1)];
  paint(d, hood, SHINGLE, { shadow: 0.6, hatch: 0.28, line: 0.65 });
  d.pen.clipped(hood, () => {
    for (let v = 3; v < 15; v += 3) d.pen.hair(frontArc(x, top - v, (rt + 1.6) * (1 - v / 17), 10), 0.4, d.ink, 0.35);
  });
  // The sails, turning in the plane of the view, the light on their left edges.
  const hub = pt(x + 1, top - 3);
  const turn = 0.42;
  for (let k = 0; k < 4; k++) {
    const a = turn + (k * Math.PI) / 2;
    const dir = pt(Math.cos(a), Math.sin(a));
    const side = pt(-dir.y, dir.x);
    const tip = pt(hub.x + dir.x * 44, hub.y + dir.y * 44);
    const along = (t: number, s: number): Pt => pt(hub.x + dir.x * t + side.x * s, hub.y + dir.y * t + side.y * s);
    const frame = [along(10, 0), along(44, 0), along(44, 8), along(10, 8)];
    if (k % 2 === 0) {
      const cloth = [along(12, 0.6), along(43, 0.6), along(43, 7.4), along(12, 7.4)];
      paint(d, cloth, '#a89878', { shadow: 0.5, hatch: 0, line: 0 });
    }
    for (let t = 10; t <= 44; t += 3.4) d.pen.hair([along(t, 0), along(t, 8)], 0.45, '#3a2a1e', 0.85);
    d.pen.hair([frame[3]!, frame[2]!], 0.6, '#3a2a1e', 0.9);
    beam(d, hub, tip, 1.6, BARK, 0.45);
  }
  d.pen.dot(hub.x, hub.y, 2.4, '#3a2a1e', 1);
  d.pen.dot(hub.x - 0.7, hub.y - 0.7, 0.8, LIGHT, 0.7);
  void rng;
}

/**
 * The vineyard on the terrace beyond the monastery: rows of vines along the
 * slope between the brow and the revetment, the earth showing between
 * them, smaller and paler up towards the windmill.
 */
function vineyard(d: Draw, rng: Rng, horizon: readonly Pt[], front: readonly Pt[], mill: Pt): void {
  const last = front[front.length - 1]!.x;
  const top = (x: number): number => yAt(horizon, x) + 12 + 16 * Math.exp(-(((x - mill.x) / 34) ** 2));
  const lip = (x: number): number => yAt(front, x) - 3;
  // The planted ground ends in a soft curve each side: narrower up the slope, ragged where the last vines were set.
  const ends = (f: number): [number, number] => [1612 + 30 * (1 - f) ** 1.5, last - 14 - 40 * (1 - f) ** 1.3];
  const rows = 10;
  const edge: Pt[] = [];
  for (let k = 0; k <= rows; k++) {
    const f = k / rows;
    const [a] = ends(f);
    edge.push(pt(a - 4, top(a) + (lip(a) - top(a)) * f));
  }
  for (let k = rows; k >= 0; k--) {
    const f = k / rows;
    const [, b] = ends(f);
    edge.push(pt(b + 4, top(b) + (lip(b) - top(b)) * f));
  }
  dab(d, curve([...edge, edge[0]!], 4), mix(EARTH, GRASS_FAR, 0.5), 0.4, 3);
  for (let k = 0; k < rows; k++) {
    const f = (k + 0.6) / rows;
    const near = 0.55 + f * 0.45;
    const [a, b] = ends(f).map((x, i) => x + (i === 0 ? 1 : -1) * rng() * 8);
    const rowAt = (x: number): number => top(x) + (lip(x) - top(x)) * f;
    const line = Array.from({ length: Math.ceil((b! - a!) / 6) + 1 }, (_, i) => pt(Math.min(b!, a! + i * 6), rowAt(Math.min(b!, a! + i * 6))));
    soft(d.pen.ctx, 0.8, () => d.pen.stroke(line.map((p) => pt(p.x + 1, p.y + 1.6 * near)), 1.6 * near, mix(GRASS_DEEP, SHADOW, 0.4), 0.3, false));
    for (let x = a! + rng() * 4; x < b!; x += (4.2 + rng() * 1.6) * near) {
      if (Math.min(x - a!, b! - x) < 14 && rng() < 0.35) continue;
      const y = rowAt(x);
      const r = (2.3 + rng() * 0.8) * near;
      const tint = mix(VINE, k < 3 ? '#5d6a4a' : LEAF_LIT, rng() * 0.6);
      d.pen.fill(blob(pt(x, y - r * 0.6), r, r * 0.75, rng, 0.25, 9), tint, 0.92);
      d.pen.fill(blob(pt(x - r * 0.35, y - r * 1.05), r * 0.5, r * 0.35, rng, 0.25, 8), mix(tint, LIGHT, 0.3), 0.65);
      if (rng() < 0.35) d.pen.hair([pt(x + r * 0.2, y - r * 1.4), pt(x + r * 0.9, y - r * 0.2)], 0.4, d.ink, 0.45);
    }
    broken(d, rng, line.map((p) => pt(p.x, p.y + 0.4)), 0.45, d.ink, 0.35 * near, 0.6);
  }
}

// ---- East, near: the shrine ----

/** A wayside shrine: a stone post with a little gabled hood, a niche with a gilt figure, flowers at its foot. */
function shrine(d: Draw, rng: Rng, foot: Pt): void {
  at(d, foot, () => {
    dab(d, oval(5, 1, 10, 2, 12), SHADOW, 0.3, 1.2);
    const b = { x0: -3.5, x1: 3.5, z0: 0, z1: 4, h0: 0, h1: 21 };
    block(d, rng, b, STONE, 'none', false);
    const face = frontOf(b);
    const niche = [face(1.6, 12), face(1.6, 16.5), ...bezier(face(1.6, 16.5), face(3.5, 19), face(5.4, 16.5), 6).slice(1), face(5.4, 12)];
    d.pen.fill(niche, HOLE, 0.85);
    d.pen.dot(face(3.5, 14).x, face(3.5, 14).y, 0.9, '#c4983a', 0.95);
    d.pen.stroke(closed(niche), 0.45, d.ink, 0.8);
    gable(d, rng, b, 5, 'z', SHINGLE, 'shingle', STONE, 1.4);
    d.pen.hair([pt(face(3.5, 26).x, face(3.5, 26).y - 0.5), pt(face(3.5, 26).x, face(3.5, 26).y - 4)], 0.6, d.ink, 0.85);
    d.pen.hair([pt(face(3.5, 26).x - 1.6, face(3.5, 26).y - 2.8), pt(face(3.5, 26).x + 1.6, face(3.5, 26).y - 2.8)], 0.6, d.ink, 0.85);
    for (const [dx, c] of [[-5, '#9c4436'], [-3, IVORY], [5, '#c4983a'], [6.5, '#9c4436']] as const) {
      tuft(d, rng, pt(dx, 1), 3, 0.7);
      d.pen.dot(dx + (rng() - 0.5), -2.2, 0.9, c, 0.95);
    }
  });
}

/**
 * A hedgerow along a line: one dense mass of leafy crowns (a hawthorn or a
 * holly standing up out of it here and there), lit on top, shade pooled
 * along its foot and its shadow thrown on the grass, the pen along its crown.
 */
function hedge(d: Draw, rng: Rng, pts: readonly Pt[], s = 1): void {
  const ctx = d.pen.ctx;
  const line = curve(pts, 3);
  const puffs: Puff[] = [];
  for (let i = 0; i < line.length; i += 1 + Math.floor(rng() * 3)) {
    const p = line[i]!;
    const tall = rng() < 0.1 ? 1.7 : 1;
    const r = (4.5 + rng() * 3.5) * s * tall;
    puffs.push({ c: pt(p.x, p.y - r * 0.8), r });
    if (rng() < 0.5) puffs.push({ c: pt(p.x + (rng() - 0.5) * 4, p.y - r * 0.35), r: r * 0.7 });
  }
  const tint = mix(LEAF, LEAF_DARK, 0.3);
  const none = (): { dx: number; dy: number; k: number } => ({ dx: 0, dy: 0, k: 1 });
  dab(d, strip(line.map((p) => pt(p.x + 7 * s, p.y + 1)), () => 8 * s).shape, SHADOW, 0.38, 2);
  ctx.save();
  puffPath(ctx, puffs, none);
  ctx.fillStyle = tint;
  ctx.fill();
  ctx.clip();
  soft(ctx, 1.2, () => {
    puffPath(ctx, puffs, (p) => ({ dx: -p.r * 0.3, dy: -p.r * 0.35, k: 0.6 }));
    ctx.fillStyle = rgba(mix(tint, LEAF_LIT, 0.6), 0.55);
    ctx.fill();
  });
  soft(ctx, 2, () => {
    puffPath(ctx, puffs, (p) => ({ dx: p.r * 0.35, dy: p.r * 0.6, k: 0.8 }));
    ctx.fillStyle = rgba(mix(tint, SHADOW, 0.55), 0.6);
    ctx.fill();
  });
  for (const p of puffs) {
    if (rng() < 0.6) d.pen.hair([pt(p.c.x - p.r * 0.5, p.c.y - p.r * 0.2), pt(p.c.x - p.r * 0.1, p.c.y - p.r * 0.45), pt(p.c.x + p.r * 0.2, p.c.y - p.r * 0.2)], 0.45, mix(LEAF_LIT, LIGHT, 0.3), 0.5);
  }
  ctx.restore();
  crownLine(d, rng, puffs, Math.max(...line.map((p) => p.y)) + 2, 0.45, 0.45);
  broken(d, rng, line.map((p) => pt(p.x, p.y + 0.5)), 0.6, d.ink, 0.5, 0.6);
  for (const p of line) if (rng() < 0.3) tuft(d, rng, pt(p.x, p.y + 1), 3, 0.65);
}

// ---- The two passes ----

const MILL = pt(1752, 0);

/**
 * The flanks' ground, painted over the hill and the meadow but under the
 * lanes: the wood's edge, the sheep, the stream; the windmill and the
 * vineyard. `horizon` is the hill's back edge and `terrace` the
 * revetment's lip, both in view units.
 */
export function flanksGround(d: Draw, rng: Rng, horizon: readonly Pt[], terrace: readonly Pt[]): void {
  woodEdge(d, rng);
  // Boulders broken off the crag's last shoulder, lying at the wood's edge.
  for (const [x, y, r] of [[262, 308, 11], [244, 314, 7], [284, 316, 8]] as const) rock(d, rng, pt(x, y), r, r * 0.6);
  for (const [x, y, f, g] of [[214, 324, -1, true], [244, 318, 1, false], [270, 330, -1, true], [190, 334, 1, true]] as const) sheep(d, rng, pt(x, y), f, g);
  fence(d, rng, curve([pt(160, 344), pt(226, 344), pt(296, 352)], 2));
  stream(d, rng);
  const mill = pt(MILL.x, yAt(horizon, MILL.x) + 12);
  windmill(d, rng, mill);
  vineyard(d, rng, horizon, terrace, mill);
  // A little orchard under the terrace.
  for (const [x, y, s] of [[1668, 350, 0.6], [1722, 340, 0.56], [1696, 368, 0.62]] as const) tree(d, rng, pt(x, y), s, 0.75);
}

/** The flanks' near things, over the lanes: the bridge, the barn and its ricks, the shrine, hedges, and the trees closing each end. */
export function flanksNear(d: Draw, rng: Rng): void {
  bridge(d, rng);
  road(d, rng, curve([pt(132, 394), pt(126, 374), pt(118, 356)], 4), (u) => 14 - u * 4, false);
  barn(d, rng, pt(112, 356));
  rick(d, rng, pt(186, 360), 10, 12);
  rick(d, rng, pt(212, 368), 8.5, 10);
  hedge(d, rng, [pt(-10, 452), pt(80, 448), pt(170, 446), pt(212, 452)]);
  tree(d, rng, pt(-12, 392), 1.7, 0.25);
  tree(d, rng, pt(22, 478), 1.9, 0.55);
  for (const [x, y, s] of [[300, 446, 0.7], [166, 420, 0.6], [330, 384, 0.55]] as const) bush(d, rng, pt(x, y), s);
  shrine(d, rng, pt(1812, 376));
  hedge(d, rng, [pt(1630, 456), pt(1700, 450), pt(1760, 440)]);
  hedge(d, rng, [pt(1790, 434), pt(1880, 416), pt(1950, 404)]);
  cypress(d, rng, pt(1948, 296), 62);
  cypress(d, rng, pt(1966, 300), 48);
  tree(d, rng, pt(2000, 380), 1.7, 0.3);
  tree(d, rng, pt(1978, 478), 1.9, 0.6);
  for (const [x, y, s] of [[1690, 470, 0.7], [1870, 380, 0.55]] as const) bush(d, rng, pt(x, y), s);
}
