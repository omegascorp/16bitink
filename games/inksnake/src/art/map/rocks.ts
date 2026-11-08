import type { Rng } from '../../logic/rng';
import { bezier, closed, oval, pt, TAU } from '../kit';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { blob, boxPts, type Brush, frame, polar, scalloped, turnedBox } from './brush';

/**
 * Stone and earth on the map: boulders, limestone crags and scree, a
 * granite tor, cairns, termite mounds, a ruined temple's platform, and the
 * reef's corals. Each paints or pencils by its Brush, lit from the upper
 * left, its shadow thrown down-right.
 */
export const LIMESTONE = '#cfc6b2';
export const GRANITE = '#9c968a';
export const ROCK_DEEP = '#6d675b';

/** A faceted rock from above. */
export function boulder(b: Brush, c: Pt, r: number, rng: Rng, tone = GRANITE): void {
  const shape = Array.from({ length: 9 }, (_, i) => polar(c, (i / 9) * TAU + rng() * 0.4, r * (0.75 + rng() * 0.35))).map((p) => pt(p.x, c.y + (p.y - c.y) * 0.82));
  b.cast(shape, r * 0.45, 0.16);
  b.body(shape, mix(tone, '#d8d0bc', rng() * 0.25), 0.72);
  b.tint(shape.map((p) => pt(c.x + (p.x - c.x) * 0.5 - r * 0.2, c.y + (p.y - c.y) * 0.45 - r * 0.25)), '#fffaf0', 0.3);
  b.line([shape[1]!, pt(c.x + r * 0.1, c.y - r * 0.05), shape[5]!], 0.5, 0.45);
  b.shade(shape, r * 0.5, ROCK_DEEP, 0.5);
  b.hatchShade(shape, r * 0.3, 0.25, 3);
  b.edge(shape, 0.9, 0.8);
}

/** A limestone crag from above: an angular block of pale rock, its cliff face on the shadow side dark and ruled, fissures across its top. */
export function crag(b: Brush, c: Pt, r: number, rng: Rng): void {
  const n = 7 + Math.floor(rng() * 3);
  const turn = rng() * TAU;
  const top = Array.from({ length: n }, (_, i) => polar(c, turn + (i / n) * TAU + (rng() - 0.5) * 0.5, r * (0.6 + rng() * 0.45))).map((p) => pt(p.x, c.y + (p.y - c.y) * 0.75));
  const drop = pt(r * 0.22, r * 0.34);
  // The cliff: the top's outline swept down-right, as a solid face.
  const faces: Pt[][] = [];
  for (let i = 0; i < n; i++) {
    const p = top[i]!;
    const q = top[(i + 1) % n]!;
    // Only edges facing away from the light show their face.
    const nx = q.y - p.y;
    const ny = -(q.x - p.x);
    if (nx * 0.55 + ny * 0.84 <= 0) continue;
    faces.push([p, q, pt(q.x + drop.x, q.y + drop.y), pt(p.x + drop.x, p.y + drop.y)]);
  }
  b.cast(top.map((p) => pt(p.x + drop.x, p.y + drop.y)), r * 0.45, 0.18);
  for (const f of faces) {
    b.body(f, mix(LIMESTONE, ROCK_DEEP, 0.7), 0.8);
    const [p, q] = [f[0]!, f[1]!];
    for (let t = 0.1; t < 1; t += 0.14) {
      const a0 = pt(p.x + (q.x - p.x) * t, p.y + (q.y - p.y) * t);
      b.line([a0, pt(a0.x + drop.x, a0.y + drop.y)], 0.5, 0.6);
    }
    b.line(closed(f), 0.6, 0.75);
  }
  b.body(top, LIMESTONE, 0.75);
  if (!b.draft) b.pen.stipple(top, Math.round(r * 3), () => 0.7, 0.5, ROCK_DEEP);
  // Clints and grikes: the pavement's fissures.
  for (let i = 0; i < 3; i++) {
    const a0 = top[Math.floor(rng() * n)]!;
    b.line([a0, pt(c.x + (rng() - 0.5) * r * 0.5, c.y + (rng() - 0.5) * r * 0.4), top[Math.floor(rng() * n)]!], 0.7, 0.6);
  }
  b.tint(top.map((p) => pt(c.x + (p.x - c.x) * 0.5 - r * 0.15, c.y + (p.y - c.y) * 0.5 - r * 0.15)), '#fffaf0', 0.35);
  b.edge(top, 1.2, 0.9);
  for (let i = 0; i < 3; i++) b.dot(c.x + (rng() - 0.5) * r, c.y + (rng() - 0.5) * r * 0.5, 2 + rng() * 2, '#a8b06a', 0.6);
}

/** Scree: a fan of loose stones spilling down-slope from `c` in direction `a`. */
export function scree(b: Brush, c: Pt, len: number, a: number, rng: Rng): void {
  for (let i = 0; i < 26; i++) {
    const t = rng();
    const p = polar(polar(c, a, len * t), a + Math.PI / 2, (rng() - 0.5) * len * 0.6 * (0.3 + t));
    const s = 2 + rng() * 4 * (0.4 + t);
    const shape = Array.from({ length: 5 }, (_, k) => polar(p, (k / 5) * TAU + rng() * 0.5, s * (0.7 + rng() * 0.4)));
    b.cast(shape, s * 0.6, 0.14);
    b.body(shape, mix(GRANITE, '#d8d0bc', rng()), 0.55);
    b.line(closed(shape), 0.45, 0.65);
  }
}

/** A granite tor from above: rounded slabs piled on a low knoll, each slab's shadow side dark. */
export function tor(b: Brush, c: Pt, r: number, rng: Rng): void {
  b.cast(blob(c, r * 1.1, r * 0.8, rng, 0.2, 20), r * 0.5, 0.12);
  b.tint(blob(c, r * 1.25, r * 0.95, rng, 0.2, 24), '#8a8a5a', 0.22);
  const slabs = Array.from({ length: 6 }, (_, i) => ({ p: polar(c, (i / 6) * TAU + rng(), r * 0.45 * rng()), w: r * (0.45 + rng() * 0.3), h: r * (0.3 + rng() * 0.15), rot: (rng() - 0.5) * 0.6 }));
  slabs.sort((p, q) => p.p.y - q.p.y);
  for (const s of slabs) {
    const shape = turnedBox(s.p, s.w, s.h, s.rot, 6).map((q, i, all) => {
      const n = all.length;
      const m = all[(i + 1) % n]!;
      return pt((q.x * 3 + m.x) / 4, (q.y * 3 + m.y) / 4);
    });
    b.cast(shape, 6, 0.15);
    b.body(shape, mix(GRANITE, '#cfc8b4', rng() * 0.5), 0.72);
    if (!b.draft) b.pen.stipple(shape, 40, () => 0.7, 0.5, ROCK_DEEP);
    b.shade(shape, 6, ROCK_DEEP, 0.55);
    b.line([frame(s.p, s.w, s.h, s.rot)(-0.3, 0), frame(s.p, s.w, s.h, s.rot)(0.3, 0.1)], 0.5, 0.4);
    b.edge(shape, 0.9, 0.85);
  }
}

/** A cairn, drawn from the front: rounded stones stacked smaller to the top. */
export function cairn(b: Brush, c: Pt, h: number, rng: Rng): void {
  b.cast(oval(c.x + h * 0.1, c.y - 2, h * 0.4, h * 0.14, 14).map((p) => pt(p.x + h * 0.35, p.y + h * 0.15)), 0, 0.15);
  let y = c.y;
  let w = h * 0.55;
  while (w > h * 0.12) {
    const sh = w * 0.42;
    const stone = blob(pt(c.x + (rng() - 0.5) * w * 0.15, y - sh / 2), w / 2, sh / 2, rng, 0.12, 14);
    b.body(stone, mix(GRANITE, '#d8d0bc', rng()), 0.6);
    b.pen.crescent(stone, pt(-w * 0.12, -sh * 0.25), () => (b.draft ? b.hatch(stone, 2.4, 0.9, 0.35) : b.pen.fill(stone, ROCK_DEEP, 0.4)));
    b.edge(stone, 0.8, 0.85);
    y -= sh * 0.85;
    w *= 0.74;
  }
}

/** A termite mound, drawn from the front: a fluted earth spire, lit at its left, its shadow on the ground. */
export function termiteMound(b: Brush, c: Pt, h: number, rng: Rng): void {
  const w = h * 0.42;
  const earth = '#b8784a';
  const spire = [pt(c.x - w / 2, c.y), ...bezier(pt(c.x - w / 2, c.y), pt(c.x - w * 0.3, c.y - h * 0.6), pt(c.x - w * 0.05, c.y - h), 8).slice(1), ...bezier(pt(c.x + w * 0.08, c.y - h), pt(c.x + w * 0.35, c.y - h * 0.5), pt(c.x + w / 2, c.y), 8)];
  b.cast([pt(c.x - w / 2, c.y), pt(c.x + h * 0.5, c.y + h * 0.42), pt(c.x + h * 0.5 + w * 0.3, c.y + h * 0.4), pt(c.x + w / 2, c.y)], 0, 0.15);
  b.body(spire, earth, 0.62);
  b.pen.crescent(spire, pt(-w * 0.35, 0), () => (b.draft ? b.hatch(spire, 2.4, 1.2, 0.42) : b.pen.fill(spire, mix(earth, '#3a2418', 0.5), 0.45)));
  for (let k = 0; k < 4; k++) b.line(bezier(pt(c.x - w * 0.3 + k * w * 0.2, c.y - 1), pt(c.x - w * 0.2 + k * w * 0.12, c.y - h * 0.5), pt(c.x - w * 0.03 + k * 0.02, c.y - h * (0.85 + rng() * 0.1)), 6), 0.45, 0.45);
  b.edge(spire, 1, 0.85);
  // A side turret, often.
  if (rng() < 0.6) {
    const t = pt(c.x + w * 0.42, c.y);
    const turret = [pt(t.x - w * 0.2, t.y), pt(t.x - w * 0.05, t.y - h * 0.45), pt(t.x + w * 0.05, t.y - h * 0.45), pt(t.x + w * 0.2, t.y)];
    b.body(turret, mix(earth, '#d0a070', 0.3), 0.6);
    b.edge(turret, 0.8, 0.8);
  }
}

/** A ruined temple's platform from above: stepped terraces of dressed stone, a shrine at the top, blocks fallen, roots over it. */
export function templeRuin(b: Brush, c: Pt, s: number, rng: Rng): void {
  const stone = '#b9b29a';
  b.cast(turnedBox(c, s * 2, s * 2, 0.08, 12), s * 0.25, 0.16);
  for (const k of [1, 0.74, 0.5]) {
    const tier = turnedBox(c, s * 2 * k, s * 2 * k, 0.08, 12);
    b.body(tier, mix(stone, '#e2dcc6', 1 - k), 0.6);
    b.shade(tier, s * 0.12, mix(stone, '#3a3a30', 0.5), 0.35);
    const at = frame(c, s * 2 * k, s * 2 * k, 0.08);
    for (let u = -0.45; u < 0.5; u += 0.12) b.line([at(u, -0.5), at(u, -0.42)], 0.4, 0.4);
    for (let v = -0.45; v < 0.5; v += 0.12) b.line([at(-0.5, v), at(-0.42, v)], 0.4, 0.4);
    b.edge(tier, 1, 0.85);
  }
  const shrine = turnedBox(c, s * 0.5, s * 0.5, 0.08, 6);
  b.body(shrine, '#8a8470', 0.7);
  b.hatch(shrine, 2.6, 0.9, 0.35);
  b.edge(shrine, 1.1, 0.9);
  // Stairs up the near side, blocks tumbled, moss.
  const at = frame(c, s * 2, s * 2, 0.08);
  for (let k = 0; k < 6; k++) b.line([at(-0.08, 0.5 - k * 0.05), at(0.08, 0.5 - k * 0.05)], 0.6, 0.6);
  for (let i = 0; i < 6; i++) {
    const p = polar(c, rng() * TAU, s * (1.1 + rng() * 0.4));
    const blk = turnedBox(p, 9 + rng() * 8, 7 + rng() * 5, rng() * 2, 4);
    b.cast(blk, 4, 0.15);
    b.body(blk, stone, 0.6);
    b.edge(blk, 0.7, 0.8);
  }
  for (let i = 0; i < 18; i++) {
    const p = polar(c, rng() * TAU, s * rng() * 1.1);
    b.dot(p.x, p.y, 2 + rng() * 2.5, rng() < 0.6 ? '#7f9a52' : '#a8b06a', 0.55);
  }
}

/** Brain coral from above: a dome furrowed with meanders. */
export function brainCoral(b: Brush, c: Pt, r: number, rng: Rng): void {
  const shape = blob(c, r, r * 0.85, rng, 0.12, 22);
  b.body(shape, '#d9b27a', 0.6);
  b.pen.clipped(shape, () => {
    for (let k = -r; k < r; k += 4.5) {
      const line: Pt[] = [];
      for (let t = -r; t <= r; t += 3) line.push(pt(c.x + t, c.y + k + Math.sin(t / 4 + k + rng() * 0.3) * 2.2));
      b.line(line, 0.45, 0.5);
    }
  });
  b.shade(shape, r * 0.4, '#8a5a3a', 0.3);
  b.edge(shape, 0.8, 0.8);
}

/** Staghorn coral from above: forking antlers spreading from a base. */
export function staghorn(b: Brush, c: Pt, r: number, rng: Rng, tone = '#c98a6a'): void {
  const branch = (p: Pt, a: number, l: number, depth: number): void => {
    const q = polar(p, a, l);
    const limb = [p, polar(p, a + (rng() - 0.5) * 0.3, l * 0.5), q];
    b.stroke(limb, 3.2 * (depth + 1) * 0.6, 0.9, b.draft ? undefined : mix(tone, '#5a3a2a', 0.45));
    if (!b.draft) b.pen.hair(limb, 1.6 * (depth + 1) * 0.6, tone, 0.9);
    if (depth > 0) for (const s of [-1, 1]) branch(q, a + s * (0.35 + rng() * 0.3), l * 0.7, depth - 1);
    else b.dot(q.x, q.y, 1.4, '#f3e2c8', 0.9);
  };
  for (let i = 0; i < 5; i++) branch(c, (i / 5) * TAU + rng() * 0.4, r * 0.45, 2);
}

/** A sea fan from above: a lacy fan of fine branching lines. */
export function seaFan(b: Brush, c: Pt, r: number, rng: Rng): void {
  const a0 = rng() * TAU;
  for (let i = 0; i < 12; i++) {
    const a = a0 + (i / 11 - 0.5) * 1.6;
    b.line(bezier(c, polar(c, a + 0.1, r * 0.5), polar(c, a, r), 8), 0.6, 0.6, '#8a3f6a');
  }
  for (let k = 0.3; k < 1; k += 0.14) {
    const arc = Array.from({ length: 9 }, (_, i) => polar(c, a0 + (i / 8 - 0.5) * 1.6, r * k));
    b.line(arc, 0.4, 0.5, '#8a3f6a');
  }
  if (!b.draft) b.pen.fill([c, ...Array.from({ length: 9 }, (_, i) => polar(c, a0 + (i / 8 - 0.5) * 1.6, r))], '#b0608a', 0.2);
}

/** A dressed block of stone or a slab, w × h, turned; for walls and ruins. */
export function block(b: Brush, c: Pt, w: number, h: number, rot: number, tone: string): void {
  const s = turnedBox(c, w, h, rot, 5);
  b.cast(s, 4, 0.15);
  b.body(s, tone, 0.6);
  b.shade(s, 3, ROCK_DEEP, 0.35);
  b.edge(s, 0.7, 0.8);
}

/** A ploughed or planted strip's outline, for fields. */
export const strip = (x0: number, y0: number, x1: number, y1: number): Pt[] => boxPts(x0, y0, x1, y1, 16);
