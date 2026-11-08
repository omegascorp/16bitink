import { createRng } from '../../logic/rng';
import { bezier, closed, type Draw, edge, normals, pt, ribbon, shade, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { ellipseAt, glaze } from '../propsKit';
import { rgba } from '../wash';

/**
 * The Great Snail's soft parts, seen from above: the long grey-olive foot
 * (its pointed tail out behind the shell, the neck and head out in front),
 * cobbled with grooves and glistening wet, and its four tentacles. Local
 * units, the head towards +x.
 */
export const SKIN = {
  base: '#8f8c74',
  light: '#d6d0b4',
  deep: '#4b4a38',
  groove: '#3d4230',
  stalk: '#9c9884',
  eye: '#1e1a22',
  trail: '#dfe9ec',
} as const;

export interface SnailBody {
  readonly shape: Pt[];
  readonly spine: Pt[];
  readonly widths: number[];
  readonly headX: number;
  readonly tailX: number;
}

/** Smooth keyed widths along x. */
function keyed(keys: readonly (readonly [number, number])[], x: number): number {
  const first = keys[0]!;
  if (x <= first[0]) return first[1];
  for (let i = 1; i < keys.length; i++) {
    const [x1, w1] = keys[i]!;
    const [x0, w0] = keys[i - 1]!;
    if (x <= x1) {
      const t = (x - x0) / (x1 - x0);
      return w0 + (w1 - w0) * t * t * (3 - 2 * t);
    }
  }
  return keys[keys.length - 1]![1];
}

/**
 * The foot for a crawl phase: `stretch` 1 is reaching out long and slim, lower
 * is bunched up shorter and fatter; `sway` bends it a touch.
 */
export function snailBody(stretch: number, sway: number): SnailBody {
  const tailX = -40 - 23 * stretch;
  const headX = 20 + 31 * stretch;
  const fat = 1 + (1 - stretch) * 0.6;
  const keys = [[tailX, 1.2], [tailX + 7, 8], [tailX + 18, 16], [-28, 22], [-6, 24], [12, 21], [headX - 12, 19.5], [headX - 4, 17], [headX, 14.5]] as const;
  const n = 48;
  const spine = Array.from({ length: n + 1 }, (_, i) => {
    const x = tailX + ((headX - tailX) * i) / n;
    return pt(x, sway * Math.sin(((x - tailX) / (headX - tailX)) * Math.PI * 1.6));
  });
  const widths = spine.map((p) => keyed(keys, p.x) * fat);
  const { top, bot } = ribbon(spine, (u) => widths[Math.round(u * n)]!);
  // A round brow in front.
  const c = spine[n]!;
  const r = widths[n]! / 2;
  const cap = Array.from({ length: 11 }, (_, i) => {
    const a = -Math.PI / 2 + (i / 10) * Math.PI;
    return pt(c.x + Math.cos(a) * r * 1.35, c.y + Math.sin(a) * r);
  });
  const shape = [...top, ...cap.slice(1, -1), ...[...bot].reverse()];
  return { shape, spine, widths, headX, tailX };
}

/** Cobbled skin: grooves raked back from the midline to the rim, cross-grooves between them. */
function grooves(d: Draw, b: SnailBody): void {
  const { pen } = d;
  const nrm = normals(b.spine);
  const rng = createRng(5311);
  const at = (i: number, k: number): Pt => {
    const j = Math.max(0, Math.min(b.spine.length - 1, i));
    const p = b.spine[j]!;
    const w = b.widths[j]! / 2;
    return pt(p.x + nrm[j]!.x * w * k, p.y + nrm[j]!.y * w * k);
  };
  const rows: Pt[][][] = [[], []];
  for (let i = 3; i < b.spine.length - 3; i += 2) {
    for (const [si, s] of [[0, 1], [1, -1]] as const) {
      const line = [at(i, s * 0.12), at(i - 1, s * 0.55), at(i - 3, s * 0.98)];
      rows[si]!.push(line);
      pen.hair(line, 0.42, SKIN.groove, 0.42 + rng() * 0.2);
    }
  }
  const mid = (l: readonly Pt[], k: number): Pt => pt((l[k - 1]!.x + l[k]!.x) / 2, (l[k - 1]!.y + l[k]!.y) / 2);
  for (const row of rows) {
    for (let i = 0; i + 1 < row.length; i++) {
      for (const k of [1, 2]) pen.hair([mid(row[i]!, k), mid(row[i + 1]!, k)], 0.32, SKIN.groove, 0.3);
    }
  }
}

/** The foot: wash, lit back and shaded flanks, cobbles, a pale frill, wet glints and its contour. */
export function paintBody(d: Draw, b: SnailBody): void {
  const { pen } = d;
  const { shape, spine } = b;
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, SKIN.base, 0.92);
  pen.clipped(shape, () => {
    pen.hair(spine.slice(2, -2).map((p) => pt(p.x, p.y - 1.5)), 8, SKIN.light, 0.32);
    pen.crescent(shape, pt(-2.5, -4.5), () => pen.fill(shape, SKIN.deep, 0.42));
    const mrng = createRng(5314);
    for (let i = 0; i < 14; i++) {
      const p = spine[Math.floor(mrng() * spine.length)]!;
      glaze(d, p.x + (mrng() - 0.5) * 6, p.y + (mrng() - 0.5) * 12, 3 + mrng() * 4, 2 + mrng() * 2, mrng() * 3, mrng() < 0.5 ? SKIN.deep : SKIN.light, 0.25);
    }
    grooves(d, b);
    pen.stipple(shape, 700, () => 0.55, 0.36, SKIN.deep);
    const { top, bot } = ribbon(spine, (u) => b.widths[Math.round(u * (spine.length - 1))]! - 2.2);
    pen.hair(top.slice(3, -3), 1.4, SKIN.light, 0.4);
    pen.hair(bot.slice(3, -3), 1.2, SKIN.light, 0.25);
  });
  shade(d, shape, 0.26);
  // Wet glints along the lit side of the back.
  const rng = createRng(5312);
  for (let i = 3; i < spine.length - 3; i += 3) {
    const p = spine[i]!;
    const w = b.widths[i]! / 2;
    const y = p.y - w * (0.25 + rng() * 0.35);
    pen.hair([pt(p.x - 1.6, y + 0.3), pt(p.x + 1.4, y - 0.2)], 0.7, PAPER_FILL, 0.55 + rng() * 0.3);
  }
  edge(d, shape, 1.25);
}

/** A soft tentacle along a curling path, width w0 at the root to w1 near the tip, with a knob there. */
function tentaclePath(base: Pt, ang: number, len: number, curl: number): Pt[] {
  const n = 12;
  let p = base;
  const out = [p];
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const a = ang + curl * t ** 1.6;
    p = pt(p.x + Math.cos(a) * (len / n), p.y + Math.sin(a) * (len / n));
    out.push(p);
  }
  return out;
}

/** One tentacle; an eye-stalk carries a dark eye in its knob. */
export function tentacle(d: Draw, base: Pt, ang: number, len: number, w0: number, w1: number, curl: number, eye: boolean): void {
  const { pen } = d;
  const path = tentaclePath(base, ang, len, curl);
  const body = ribbon(path, (u) => w0 + (w1 - w0) * u).shape;
  const tip = path[path.length - 1]!;
  const prev = path[path.length - 2]!;
  const dir = Math.atan2(tip.y - prev.y, tip.x - prev.x);
  const knob = ellipseAt(tip.x + Math.cos(dir) * 0.4, tip.y + Math.sin(dir) * 0.4, w1 * 0.78, w1 * 0.68, dir, 16);
  for (const s of [body, knob]) {
    pen.fill(s, PAPER_FILL, 1);
    pen.fill(s, SKIN.stalk, 0.9);
  }
  pen.clipped(body, () => {
    pen.crescent(body, pt(-0.7, -1.1), () => pen.fill(body, SKIN.deep, 0.4));
    for (let i = 2; i < path.length - 1; i += 2) {
      const q = path[i]!;
      pen.hair([pt(q.x - 0.6, q.y - w0 * 0.4), pt(q.x + 0.3, q.y + w0 * 0.4)], 0.25, SKIN.groove, 0.35);
    }
  });
  pen.hair(path.slice(1, -2).map((q) => pt(q.x - 0.2, q.y - 0.5)), 0.5, PAPER_FILL, 0.5);
  pen.stroke(closed(body), 0.55, d.ink, 0.9, false);
  pen.stroke(closed(knob), 0.6, d.ink, 0.95, false);
  if (eye) {
    pen.dot(tip.x + Math.cos(dir) * 0.7, tip.y + Math.sin(dir) * 0.7, w1 * 0.42, SKIN.eye, 1);
    pen.dot(tip.x + Math.cos(dir) * 0.4 - 0.4, tip.y + Math.sin(dir) * 0.4 - 0.5, 0.42, PAPER_FILL, 0.95);
  }
}

/** The head's markings: two dark stripes running back from the stalks, a sheen on the brow. */
export function headMarks(d: Draw, b: SnailBody): void {
  const { pen } = d;
  const h = b.spine[b.spine.length - 1]!;
  pen.clipped(b.shape, () => {
    for (const s of [-1, 1]) {
      pen.hair(bezier(pt(h.x - 1.5, h.y + s * 3.6), pt(h.x - 8, h.y + s * 4.6), pt(h.x - 17, h.y + s * 4.2), 6), 1.8, SKIN.deep, 0.42);
    }
    glaze(d, h.x - 1, h.y - 2.5, 5, 2.6, 0, PAPER_FILL, 0.4);
  });
}

/** The wet sheen it leaves behind: a pale glossy smear trailing off past the tail, fading out. */
export function trail(d: Draw, b: SnailBody): void {
  const { pen } = d;
  const { ctx } = pen;
  const from = -70;
  const to = b.tailX + 16;
  const spine = Array.from({ length: 14 }, (_, i) => pt(from + ((to - from) * i) / 13, 0));
  const { shape, top, bot } = ribbon(spine, (u) => 14 + 7 * u);
  const fade = (color: string, a: number): CanvasGradient => {
    const g = ctx.createLinearGradient(from, 0, b.tailX, 0);
    g.addColorStop(0, rgba(color, 0));
    g.addColorStop(0.6, rgba(color, a));
    g.addColorStop(1, rgba(color, a));
    return g;
  };
  pen.clipped(shape, () => {
    ctx.fillStyle = fade(SKIN.trail, 0.32);
    ctx.fillRect(from, -12, to - from, 24);
    ctx.fillStyle = fade('#6f8a94', 0.16);
    ctx.fillRect(from, 2, to - from, 10);
    const rng = createRng(5313);
    for (let i = 0; i < 9; i++) {
      const x = from + 8 + rng() * (b.tailX - from);
      const y = (rng() - 0.5) * 13;
      pen.hair([pt(x, y), pt(x + 3 + rng() * 4, y + (rng() - 0.5))], 0.6 + rng() * 0.4, PAPER_FILL, 0.3 + 0.5 * ((x - from) / (b.tailX - from)));
    }
  });
  const cut = Math.floor(top.length * 0.35);
  pen.hair(top.slice(cut), 0.4, '#6f8a94', 0.35);
  pen.hair(bot.slice(cut), 0.4, '#6f8a94', 0.3);
}

/** Dizzy marks: little inked swirls and stars round its head, haloed in paper so they show on any ground. */
export function dizzy(d: Draw, c: Pt): void {
  const { pen } = d;
  const swirl = (x: number, y: number, r: number, turns: number): Pt[] =>
    Array.from({ length: 22 }, (_, i) => {
      const t = i / 21;
      const a = t * TAU * turns;
      return pt(x + Math.cos(a) * r * (0.25 + 0.75 * t), y + Math.sin(a) * r * (0.25 + 0.75 * t) * 0.8);
    });
  const marks = [swirl(c.x - 4, c.y - 21, 5, 1.7), swirl(c.x + 9, c.y + 18, 4.4, 1.6)];
  for (const m of marks) {
    pen.hair(m, 2.6, PAPER_FILL, 0.75);
    pen.hair(m, 0.95, d.ink, 1);
  }
  for (const [x, y, r] of [[c.x + 10, c.y - 16, 3], [c.x - 9, c.y + 18, 2.6], [c.x + 17, c.y + 3, 2.2]] as const) {
    for (const a of [0, Math.PI / 2]) {
      const seg = [pt(x - Math.cos(a) * r, y - Math.sin(a) * r), pt(x + Math.cos(a) * r, y + Math.sin(a) * r)];
      pen.hair(seg, 2.4, PAPER_FILL, 0.75);
      pen.hair(seg, 0.9, d.ink, 1);
    }
  }
}
