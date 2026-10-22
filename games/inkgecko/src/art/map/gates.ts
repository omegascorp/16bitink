import { createRng, type Rng } from '../../logic/rng';
import { MAP } from '../../scenes/map/layout';
import { bezier, closed, type Draw, oval, pt, ribbon } from '../kit';
import { LEAF, MOSS, PAPER_FILL, STONE, STONE_DARK } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { PENCIL } from './common';
import { castShadow, scalloped } from './flora';
import { chamfer } from './paving';

/**
 * What stands across the groove at a chapter's foot, and the board that
 * names it: the garden wall with its picket gate, the rustic rose arch at
 * the pond, a pencilled gate for the drafts; and a blank wooden name board
 * (painted or pencilled) for the scene's lettering.
 */

/** The name board's face, world px, centred on the region's `sign` point. Text goes on it. */
export const SIGN_BOARD = { w: 300, h: 64 } as const;

const WOOD = '#c49a66';
const BRICK = '#b9765a';
const GATE_PAINT = '#7f9c7a';
const ROSE = '#c23f56';
/** Half the gateway's opening, and a pier's width. */
const OPEN = 42;
const PIER = 26;
/** Wall courses: the coping's depth and the face's height (seen a little from the front). */
const COPING = 18;
const FACE = 26;

/** A cornered outline filled in with points every 2 px, so the pen's smoothing keeps its corners and points. */
const sharp = (pts: readonly Pt[]): Pt[] =>
  pts.flatMap((p, i) => {
    const q = pts[(i + 1) % pts.length]!;
    const n = Math.max(1, Math.ceil(Math.hypot(q.x - p.x, q.y - p.y) / 2));
    return Array.from({ length: n }, (_, k) => pt(p.x + ((q.x - p.x) * k) / n, p.y + ((q.y - p.y) * k) / n));
  });

const box = (x0: number, y0: number, x1: number, y1: number, step = 12): Pt[] => {
  const out: Pt[] = [];
  const edge = (a: Pt, b: Pt): void => {
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / step));
    for (let k = 0; k < n; k++) out.push(pt(a.x + ((b.x - a.x) * k) / n, a.y + ((b.y - a.y) * k) / n));
  };
  edge(pt(x0, y0), pt(x1, y0));
  edge(pt(x1, y0), pt(x1, y1));
  edge(pt(x1, y1), pt(x0, y1));
  edge(pt(x0, y1), pt(x0, y0));
  return out;
};

/** A stretch of old brick wall x0..x1 with stone coping, its top at y - COPING and its foot at y + FACE. */
function wallStretch(d: Draw, x0: number, x1: number, y: number, rng: Rng): void {
  const { pen } = d;
  const top = box(x0, y - COPING, x1, y, 20);
  const face = box(x0, y, x1, y + FACE, 20);
  pen.fill(box(x0 + 4, y + FACE - 2, x1 + 6, y + FACE + 9, 40), d.ink, 0.1);
  pen.fill(face, PAPER_FILL, 1);
  pen.fill(face, BRICK, 0.55);
  pen.fill(face, d.ink, 0.08);
  pen.hatch(face, 3.6, 0.9, 0.4, { color: d.ink, alpha: 0.16 });
  pen.fill(top, PAPER_FILL, 1);
  pen.fill(top, mix(STONE, '#cfc2a6', rng()), 0.5);
  pen.crescent(top, pt(-2, -3), () => pen.fill(top, STONE_DARK, 0.3));
  // Brick courses and their staggered joints; the coping's joints.
  for (const k of [1, 2]) pen.hair([pt(x0 + 2, y + (FACE * k) / 3), pt(x1 - 2, y + (FACE * k) / 3)], 0.4, d.ink, 0.3);
  for (let x = x0 + rng() * 20; x < x1 - 6; x += 22) {
    for (let r = 0; r < 3; r++) {
      const xx = x + (r % 2) * 11;
      if (xx < x1 - 3) pen.hair([pt(xx, y + (FACE * r) / 3 + 1), pt(xx, y + (FACE * (r + 1)) / 3 - 1)], 0.4, d.ink, 0.3);
    }
  }
  for (let x = x0 + 30 + rng() * 20; x < x1 - 10; x += 38 + rng() * 16) pen.hair([pt(x, y - COPING + 1), pt(x + 1, y - 1)], 0.5, d.ink, 0.45);
  pen.stroke([pt(x0, y - COPING), pt((x0 + x1) / 2, y - COPING + 0.5), pt(x1, y - COPING)], 1, d.ink, 0.8, false);
  pen.stroke([pt(x0, y), pt(x1, y)], 0.8, d.ink, 0.6, false);
  pen.stroke([pt(x0, y + FACE), pt((x0 + x1) / 2, y + FACE + 0.6), pt(x1, y + FACE)], 1.2, d.ink, 0.8, false);
  // Ivy and moss.
  for (let i = 0; i < 2; i++) {
    const cx = x0 + rng() * (x1 - x0);
    for (let k = 0; k < 9; k++) {
      const p = pt(cx + (rng() - 0.5) * 34, y - COPING + rng() * (COPING + FACE));
      const leaf = scalloped(p, 3 + rng() * 2, 3, rng, 0.3);
      pen.fill(leaf, rng() < 0.5 ? LEAF : MOSS, 0.75);
      pen.hair(closed(leaf), 0.35, d.ink, 0.45);
    }
  }
}

/** A square stone pier with a ball finial, beside the gateway. */
function pier(d: Draw, x0: number, y: number): void {
  const { pen } = d;
  const top = box(x0, y - COPING - 6, x0 + PIER, y + 2, 8);
  const face = box(x0, y + 2, x0 + PIER, y + FACE + 6, 8);
  pen.fill(box(x0 + 4, y + FACE + 4, x0 + PIER + 8, y + FACE + 12, 8), d.ink, 0.12);
  pen.fill(face, PAPER_FILL, 1);
  pen.fill(face, STONE_DARK, 0.45);
  pen.fill(top, PAPER_FILL, 1);
  pen.fill(top, STONE, 0.6);
  pen.stroke(closed(face), 0.9, d.ink, 0.75, false);
  pen.stroke(closed(top), 1.1, d.ink, 0.85, false);
  const c = pt(x0 + PIER / 2, y - COPING / 2 - 2);
  const ball = oval(c.x, c.y, 8, 8, 18);
  castShadow(d, ball, 6, 0.15);
  pen.fill(ball, PAPER_FILL, 1);
  pen.fill(ball, STONE, 0.55);
  pen.crescent(ball, pt(-3, -4.5), () => pen.fill(ball, STONE_DARK, 0.5));
  pen.dot(c.x - 2.5, c.y - 3, 1.4, PAPER_FILL, 0.9);
  pen.stroke(closed(ball), 0.9, d.ink, 0.85);
}

/**
 * The picket gate, swung right open and standing against the wall's face
 * left of the gateway (drawn a little from the front, like the wall):
 * rails and a brace behind spaced pickets, strap hinges, its shadow on the wall.
 */
function picketGate(d: Draw, x1: number, base: number): void {
  const { pen } = d;
  const w = 2 * OPEN + 4;
  const h = 60;
  const x0 = x1 - w;
  const paint = GATE_PAINT;
  const rails = [box(x0, base - 17, x1, base - 10, 10), box(x0, base - h + 16, x1, base - h + 23, 10)];
  const brace = ribbon([pt(x1 - 6, base - 14), pt(x0 + 6, base - h + 20)], () => 6).shape;
  const pickets: Pt[][] = [];
  for (let x = x0 + 2; x <= x1 - 8; x += (w - 10) / 5) pickets.push(sharp([pt(x, base), pt(x, base - h + 9), pt(x + 3.5, base - h), pt(x + 7, base - h + 9), pt(x + 7, base)]));
  // Its shadow falls on the wall behind and the paving at its foot.
  for (const p of pickets) pen.fill(p.map((q) => pt(q.x + 7, q.y + 5)), d.ink, 0.14);
  pen.fill(box(x0 + 4, base - 2, x1 + 10, base + 6, 12), d.ink, 0.12);
  for (const sh of [...rails, brace]) {
    pen.fill(sh, PAPER_FILL, 1);
    pen.fill(sh, mix(paint, d.ink, 0.35), 0.75);
    pen.stroke(closed(sh), 0.7, d.ink, 0.85, false);
  }
  for (const p of pickets) {
    pen.fill(p, PAPER_FILL, 1);
    pen.fill(p, paint, 0.7);
    pen.crescent(p, pt(-3, 0), () => pen.fill(p, d.ink, 0.22));
    pen.stroke(closed(p), 0.9, d.ink, 0.9, false);
  }
  for (const y of [base - 13.5, base - h + 19.5]) {
    pen.stroke([pt(x1 + 6, y), pt(x1 - 26, y + 0.5)], 2.4, d.ink, 0.85, false);
    pen.dot(x1 - 26, y + 0.5, 2, d.ink, 0.9);
  }
}

/** The garden wall across the whole width at gate.y, its gateway on the groove, the gate standing open. */
export function gardenWall(d: Draw, gate: Pt): void {
  const rng = createRng(d.pen.rng() * 1e9);
  const left = gate.x - OPEN - PIER;
  const right = gate.x + OPEN + PIER;
  for (let x = -20; x < left; x += 200) wallStretch(d, x, Math.min(left, x + 200), gate.y, rng);
  for (let x = right; x < MAP.width + 20; x += 200) wallStretch(d, x, Math.min(MAP.width + 20, x + 200), gate.y, rng);
  pier(d, left, gate.y);
  pier(d, gate.x + OPEN, gate.y);
  picketGate(d, left - 4, gate.y + FACE + 8);
}

/** A rustic rose arch over the groove at the pond's foot, its shadow thrown on the grass. */
export function roseArch(d: Draw, gate: Pt): void {
  const { pen } = d;
  const rng = createRng(d.pen.rng() * 1e9);
  const base = gate.y + 22;
  const half = 58;
  const spine = [pt(gate.x - half, base), ...bezier(pt(gate.x - half, base - 70), pt(gate.x, base - 165), pt(gate.x + half, base - 70), 18), pt(gate.x + half, base)];
  const shadow = spine.map((p) => pt(p.x + (base - p.y) * 0.42, base + (base - p.y) * 0.3));
  pen.stroke(shadow, 7, d.ink, 0.1, false);
  const pole = ribbon(spine, () => 8).shape;
  pen.fill(pole, PAPER_FILL, 1);
  pen.fill(pole, '#9a7650', 0.6);
  pen.crescent(pole, pt(-2, 0), () => pen.fill(pole, d.ink, 0.2));
  pen.stroke(closed(pole), 0.8, d.ink, 0.85, false);
  // The rose scrambling up both legs and over the top.
  for (let i = 0; i < 46; i++) {
    const p = spine[Math.floor(rng() * spine.length)]!;
    const c = pt(p.x + (rng() - 0.5) * 20, p.y + (rng() - 0.5) * 14);
    const leaf = scalloped(c, 4.5 + rng() * 3.5, 4, rng, 0.3);
    pen.fill(leaf, PAPER_FILL, 1);
    pen.fill(leaf, rng() < 0.6 ? LEAF : MOSS, 0.7);
    pen.hair(closed(leaf), 0.4, d.ink, 0.55);
  }
  for (let i = 0; i < 13; i++) {
    const p = spine[2 + Math.floor(rng() * (spine.length - 4))]!;
    const c = pt(p.x + (rng() - 0.5) * 14, p.y + (rng() - 0.5) * 12);
    const bloom = oval(c.x, c.y, 5, 5, 12);
    pen.fill(bloom, ROSE, 0.85);
    pen.hair(Array.from({ length: 10 }, (_, k) => pt(c.x + Math.cos(k * 0.9) * k * 0.32, c.y + Math.sin(k * 0.9) * k * 0.32)), 0.4, d.ink, 0.55);
    pen.dot(c.x - 1, c.y - 1.4, 0.8, PAPER_FILL, 0.7);
  }
}

/** A gate across the groove, sketched: posts, a leaf half drawn, a hedge line begun either side, a ruled construction line. */
export function pencilGate(d: Draw, gate: Pt): void {
  const { pen } = d;
  const rng = createRng(d.pen.rng() * 1e9);
  pen.hair([pt(-10, gate.y + 1), pt(MAP.width + 10, gate.y - 1)], 0.5, PENCIL, 0.16);
  for (const side of [-1, 1]) {
    const x = gate.x + side * (OPEN + PIER / 2);
    const post = box(x - PIER / 2, gate.y - PIER / 2, x + PIER / 2, gate.y + PIER / 2, 8);
    pen.fill(post, PAPER_FILL, 0.8);
    pen.stroke(closed(post), 0.8, PENCIL, 0.75);
    pen.hatch(post, 3, 0.9, 0.4, { color: PENCIL, alpha: 0.35 });
    // The hedge, scribbled outwards for a while, then only its edges ruled, then nothing.
    const reach = 260 + rng() * 380;
    const x0 = x + side * PIER * 0.6;
    for (const dy of [-10, 10]) pen.hair([pt(x0, gate.y + dy), pt(x0 + side * reach, gate.y + dy + (rng() - 0.5) * 3)], 0.6, PENCIL, 0.5);
    const loops: Pt[] = [];
    for (let t = 0; t < reach * 0.55; t += 3) loops.push(pt(x0 + side * (t + Math.cos(t / 3) * 5), gate.y + Math.sin(t / 3) * 8 + (rng() - 0.5) * 2));
    if (loops.length > 2) pen.hair(loops, 0.5, PENCIL, 0.42);
  }
  const hinge = gate.x - OPEN;
  const leaf = [pt(hinge, gate.y + 4), pt(hinge - 70, gate.y - 26), pt(hinge - 70, gate.y - 54), pt(hinge, gate.y - 26)];
  pen.stroke(leaf.slice(0, 3), 0.7, PENCIL, 0.6);
  pen.hair([leaf[0]!, leaf[3]!, leaf[2]!], 0.5, PENCIL, 0.4);
  for (let k = 1; k < 5; k++) pen.hair([pt(hinge - k * 14, gate.y + 4 - k * 6), pt(hinge - k * 14, gate.y - 26 - k * 6)], 0.4, PENCIL, 0.3);
}

/** The board's outline: two planks with clipped corners. */
function boardShape(c: Pt): Pt[] {
  const { w, h } = SIGN_BOARD;
  return chamfer(box(c.x - w / 2, c.y - h / 2, c.x + w / 2, c.y + h / 2, 14), 5);
}

/** A painted wooden name board on two short posts, its face left plain for the chapter's name. */
export function signBoard(d: Draw, c: Pt): void {
  const { pen } = d;
  const { w, h } = SIGN_BOARD;
  const rng = createRng(d.pen.rng() * 1e9);
  const shape = boardShape(c);
  for (const side of [-1, 1]) {
    const x = c.x + side * (w / 2 - 46);
    const post = box(x - 6, c.y - h / 2 - 12, x + 6, c.y + h / 2 + 22, 8);
    pen.fill(box(x - 3, c.y + h / 2 + 18, x + 16, c.y + h / 2 + 26, 6), d.ink, 0.14);
    pen.fill(post, PAPER_FILL, 1);
    pen.fill(post, mix(WOOD, d.ink, 0.25), 0.6);
    pen.crescent(post, pt(-3, 0), () => pen.fill(post, d.ink, 0.2));
    pen.stroke(closed(post), 0.8, d.ink, 0.8, false);
    const cap = box(x - 8, c.y - h / 2 - 16, x + 8, c.y - h / 2 - 11, 8);
    pen.fill(cap, mix(WOOD, d.ink, 0.4), 0.7);
    pen.stroke(closed(cap), 0.7, d.ink, 0.8, false);
  }
  castShadow(d, shape, 9, 0.12);
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, WOOD, 0.4);
  // Grain near the top and bottom edges only, so the middle stays plain for the lettering.
  for (const [y0, y1] of [[c.y - h / 2 + 4, c.y - h / 2 + 12], [c.y + h / 2 - 12, c.y + h / 2 - 4]] as const) {
    for (let i = 0; i < 3; i++) {
      const y = y0 + rng() * (y1 - y0);
      const x0 = c.x - w / 2 + 10 + rng() * 60;
      const x1 = c.x + w / 2 - 10 - rng() * 60;
      pen.hair([pt(x0, y), pt((x0 + x1) / 2, y + (rng() - 0.5) * 2), pt(x1, y + (rng() - 0.5) * 2)], 0.4, mix(WOOD, d.ink, 0.5), 0.35);
    }
  }
  pen.fill(chamfer(box(c.x - w / 2 + 16, c.y - h / 2 + 12, c.x + w / 2 - 16, c.y + h / 2 - 12, 20), 8), PAPER_FILL, 0.3);
  pen.hair([pt(c.x - w / 2 + 3, c.y), pt(c.x + w / 2 - 3, c.y + 0.5)], 0.5, mix(WOOD, d.ink, 0.5), 0.3);
  pen.crescent(shape, pt(-4, -6), () => pen.fill(shape, mix(WOOD, d.ink, 0.45), 0.4));
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) pen.dot(c.x + sx * (w / 2 - 9), c.y + sy * (h / 2 - 9), 1.5, d.ink, 0.75);
  pen.stroke(closed(shape), 1.3, d.ink, 0.9);
}

/** The name board, pencilled: its face blank paper, its edges traced and lightly hatched. */
export function pencilSign(d: Draw, c: Pt): void {
  const { pen } = d;
  const { w, h } = SIGN_BOARD;
  const shape = boardShape(c);
  for (const side of [-1, 1]) {
    const x = c.x + side * (w / 2 - 46);
    pen.hair(closed(box(x - 6, c.y - h / 2 - 12, x + 6, c.y + h / 2 + 22, 8)), 0.6, PENCIL, 0.55);
  }
  pen.fill(shape, PAPER_FILL, 0.9);
  pen.stroke(closed(shape), 0.9, PENCIL, 0.75);
  pen.hair(closed(shape.map((p) => pt(p.x + 1.2, p.y - 0.8))), 0.5, PENCIL, 0.35);
  pen.crescent(shape, pt(-5, -7), () => pen.hatch(shape, 3.2, 0.9, 0.4, { color: PENCIL, alpha: 0.4 }));
  pen.dot(c.x - w / 2 + 9, c.y - h / 2 + 9, 1.2, PENCIL, 0.6);
  pen.dot(c.x + w / 2 - 9, c.y - h / 2 + 9, 1.2, PENCIL, 0.6);
}
