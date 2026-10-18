import { contact, cub, type Draw, edge, glint, makeDraw, oval, pt, ribbon, shade, skin, tint, tube } from '../../../src/art/kit';
import type { Pt } from '../../../src/art/pen';
import { INK, PAPER_FILL } from '../../../src/art/palette';
import { bakeSprite, type Sprite } from '../sprites';

/**
 * The Portuguese man o' war, drawn with the game's pen kit: the gas float
 * (a translucent blue bladder flushed violet along the top, glossy, its tip
 * curled up), the frilled pink crest it sails by, the cluster of polyps under
 * it and its long blue tentacles, beaded with stinging cells. The float and
 * cluster are baked (3 boil frames); tentacles are drawn every frame along
 * whatever path a scene gives them, so they can trail, stretch and hang.
 */
export const BLADDER = '#93c3ee';
const BLADDER_TOP = '#b59be6';
const CREST = '#cfa3e8';
const CREST_RIM = '#d9619f';
const POLYPS = ['#3f3fa8', '#5a4fc0', '#6d5bd0', '#2f4fb8', '#8a6fd6', '#4566c8'] as const;
export const TENTACLE = '#4d86e6';
export const BEAD = '#2b3aa8';

/** The drawing's frame (local units, origin in the middle) and the ground line it rests on. */
const UNITS = 150;
const GROUND = 34;
const RES = 10;

/** The bladder's outline, from its blunt back (left) over the top to its upturned tip (right) and back under. */
function bladderTop(g: number): Pt[] {
  return [
    ...cub(pt(-60, g - 18), pt(-61, g - 44), pt(-26, g - 52), pt(6, g - 47), 14),
    ...cub(pt(6, g - 47), pt(32, g - 43), pt(50, g - 49), pt(61, g - 41), 12).slice(1),
    ...cub(pt(61, g - 41), pt(67, g - 36), pt(66, g - 29), pt(61, g - 27), 6).slice(1),
  ];
}
function bladderBottom(g: number): Pt[] {
  return [
    ...cub(pt(61, g - 27), pt(50, g - 13), pt(28, g - 3), pt(0, g - 2.5), 12),
    ...cub(pt(0, g - 2.5), pt(-30, g - 1.5), pt(-58, g - 4), pt(-60, g - 18), 12).slice(1),
  ];
}
const bladder = (g: number): Pt[] => [...bladderTop(g), ...bladderBottom(g).slice(1, -1)];

/** The bladder's top edge at x (for the crest's foot). */
function topAt(top: readonly Pt[], x: number): number {
  for (let i = 1; i < top.length; i++) {
    const a = top[i - 1]!;
    const b = top[i]!;
    if ((a.x - x) * (b.x - x) <= 0 && a.x !== b.x) return a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x);
  }
  return top[top.length - 1]!.y;
}

/** The crest: a frilled sail along the top, softly scalloped, ribbed, flushed pink to its rim; `lean` tilts it over towards +x. */
function crest(d: Draw, g: number, lean: number): void {
  const { pen } = d;
  const top = bladderTop(g);
  const x0 = -46;
  const x1 = 48;
  const rim: Pt[] = [];
  const foot: Pt[] = [];
  for (let x = x0; x <= x1; x += 2) {
    const u = (x - x0) / (x1 - x0);
    const swell = Math.sin(Math.PI * u) ** 0.7;
    const h = 25 * swell + (1.8 * Math.sin(x * 0.42) + 1.1 * Math.sin(x * 1.07 + 1)) * swell;
    const base = topAt(top, x) + 5;
    foot.push(pt(x, base));
    // Heeled over from its own foot, the way a sail leans: the ends stay put, the middle tips most.
    const tall = h * (1 + 0.25 * lean);
    rim.push(pt(x + Math.sin(lean * 0.45) * tall, base - Math.cos(lean * 0.45) * tall));
  }
  const shape = [...rim, ...[...foot].reverse()];
  skin(d, shape, CREST, 0.5);
  pen.clipped(shape, () => {
    // Pink deepening towards the rim, and the folds of the frill.
    for (let k = 0; k < 5; k++) pen.stroke(rim.map((p) => pt(p.x, p.y + 2 + k * 3)), 4, CREST_RIM, 0.24 - k * 0.04, false);
    rim.forEach((p, i) => {
      if (i % 3 !== 1) return;
      const f = foot[i]!;
      pen.hair([pt(f.x, f.y), pt((f.x + p.x) / 2 + 1.2, (f.y + p.y) / 2), pt(p.x, p.y + 1)], 0.5, d.ink, 0.35);
    });
    shade(d, shape, 0.2);
  });
  pen.stroke(rim, 1.8, CREST_RIM, 0.85, false);
  pen.stroke([rim[0]!, ...rim, rim[rim.length - 1]!], 1.1, d.ink, 0.75, false);
}

/** The bladder: translucent paper and a blue wash, violet along the top, a glow inside, gloss and a pink tip. */
function bladderBody(d: Draw, g: number): void {
  const { pen } = d;
  const shape = bladder(g);
  pen.fill(shape, PAPER_FILL, 0.72);
  pen.clipped(shape, () => {
    pen.ctx.translate(1.5, 1);
    pen.fill(shape, BLADDER, 0.62);
    pen.ctx.translate(-1.5, -1);
    tint(d, [...bladderTop(g), pt(61, g - 32), pt(-60, g - 30)], BLADDER_TOP, 0.42);
    tint(d, oval(-6, g - 26, 40, 11, 24), PAPER_FILL, 0.4);
    tint(d, oval(57, g - 34, 8, 6, 14), CREST_RIM, 0.14);
    // A few veins under the skin, and the shadow side hatched.
    for (const [x, y, w] of [[-40, -20, 26], [-12, -14, 30], [18, -18, 22]] as const) {
      pen.hair(cub(pt(x, g + y), pt(x + w * 0.3, g + y - 3), pt(x + w * 0.7, g + y + 2), pt(x + w, g + y - 1), 8), 0.45, d.ink, 0.25);
    }
    shade(d, shape, 0.32);
  });
  glint(d, cub(pt(-52, g - 30), pt(-46, g - 42), pt(-28, g - 48), pt(-10, g - 47), 10), 2.4, 0.85);
  glint(d, cub(pt(28, g - 41), pt(36, g - 43), pt(44, g - 44), pt(50, g - 45), 6), 1.4, 0.7);
  pen.dot(-40, g - 33, 1.4, PAPER_FILL, 0.9);
  edge(d, shape, 1.5, 0.9);
}

/** The polyps heaped on the sand under a stranded float, deep blue and violet, with curls of tentacle (`front`: the ones below its belly). */
function heap(d: Draw, g: number, front: boolean): void {
  const { pen } = d;
  const n = front ? 46 : 60;
  for (let i = 0; i < n; i++) {
    const x = -42 + pen.rng() * 78;
    const y = front ? g - 1.5 + pen.rng() * 5 : g - 8 + pen.rng() * 7;
    const r = 1.4 + pen.rng() * 2;
    const blob = oval(x, y, r * (1 + pen.rng() * 0.8), r * 0.75, 10);
    skin(d, blob, POLYPS[i % POLYPS.length]!, 0.88);
    tint(d, oval(x - r * 0.3, y - r * 0.3, r * 0.35, r * 0.25, 8), PAPER_FILL, 0.5);
    edge(d, blob, 0.5, 0.7);
  }
  if (!front) return;
  // Short curls of tentacle tangled in the heap.
  for (let i = 0; i < 14; i++) {
    const x = -40 + pen.rng() * 74;
    const y = g + pen.rng() * 3;
    const r = 1.5 + pen.rng() * 2.2;
    const curl: Pt[] = Array.from({ length: 10 }, (_, k) => pt(x + Math.cos(k * 0.75) * r * (1 + k * 0.12), y + Math.sin(k * 0.75) * r * 0.7));
    pen.hair(curl, 0.9, TENTACLE, 0.9);
  }
}

/** The polyps hanging under a float at sea: short tubes and grape-like clusters. */
function hanging(d: Draw, g: number): void {
  const { pen } = d;
  for (let i = 0; i < 22; i++) {
    const x = -38 + i * 3.3 + pen.jitter(1.2);
    const len = 5 + pen.rng() * 9;
    const tubeShape = [...oval(x, g - 3 + len / 2, 1.8 + pen.rng(), len / 2, 10)];
    skin(d, tubeShape, POLYPS[i % POLYPS.length]!, 0.75);
    edge(d, tubeShape, 0.55, 0.7);
  }
}

export interface FloatSprites {
  /** Stranded on the sand: a contact shadow, the polyps heaped under it. */
  readonly beached: Sprite;
  /** Afloat, its crest leaning towards +x (mirror it for the other hand). */
  readonly afloat: Sprite;
}

export function makeFloats(): FloatSprites {
  return {
    beached: bakeSprite(UNITS, RES, GROUND, 5300, (d) => {
      contact(d, 0, 62);
      d.pen.fill(oval(-4, d.g - 0.5, 56, 3.5, 24), d.ink, 0.18);
      heap(d, d.g, false);
      crest(d, d.g, 0);
      bladderBody(d, d.g);
      heap(d, d.g, true);
    }),
    afloat: bakeSprite(UNITS, 6, GROUND, 5310, (d) => {
      hanging(d, d.g);
      crest(d, d.g, 1);
      bladderBody(d, d.g);
    }),
  };
}

/** Where the polyps meet the float, in its local units from its ground point: tentacles start here. */
export const ROOT_SPAN = { x0: -36, x1: 30, y: -2 } as const;
/** The crest's top, in the float's local units (for labels). */
export const CREST_TOP = pt(0, -72);

/**
 * One tentacle along `path` (screen px): a blue string `w` px wide at its
 * root, tapering to a third of that, a darker core, and a bead of stinging
 * cells every `gap` px.
 */
export function drawTentacle(ctx: CanvasRenderingContext2D, path: readonly Pt[], w: number, boil: number, seed: number, alpha = 1, gap = 12): void {
  if (alpha <= 0 || path.length < 2) return;
  const d = makeDraw(ctx, seed * 7 + boil, boil, 0);
  const { pen } = d;
  const len: number[] = [0];
  for (let i = 1; i < path.length; i++) len.push(len[i - 1]! + Math.hypot(path[i]!.x - path[i - 1]!.x, path[i]!.y - path[i - 1]!.y));
  const total = len[len.length - 1]!;
  const body = tube(path, w, w * 0.35);
  pen.fill(body, TENTACLE, 0.85 * alpha);
  pen.hair(path, Math.max(0.8, w * 0.22), INK, 0.45 * alpha);
  pen.hair([...ribbon(path, (u) => w * (1 - 0.65 * u)).top], Math.max(0.6, w * 0.12), INK, 0.6 * alpha);
  let j = 0;
  for (let s = gap * 0.6; s < total; s += gap) {
    while (j < len.length - 2 && len[j + 1]! < s) j++;
    const a = path[j]!;
    const b = path[j + 1]!;
    const f = (s - len[j]!) / Math.max(1e-6, len[j + 1]! - len[j]!);
    const r = w * (0.55 + 0.22 * Math.sin(s * 0.37 + seed)) * (1 - 0.55 * (s / total));
    const x = a.x + (b.x - a.x) * f;
    const y = a.y + (b.y - a.y) * f;
    pen.dot(x, y, r, BEAD, 0.9 * alpha);
    pen.dot(x - r * 0.3, y - r * 0.35, Math.max(0.5, r * 0.3), PAPER_FILL, 0.75 * alpha);
  }
}

/** A path through a cubic from a to b with a little wave along it, `n` points. */
export function wavyPath(a: Pt, c0: Pt, c1: Pt, b: Pt, amp: number, waves: number, phase: number, n = 48): Pt[] {
  const base = cub(a, c0, c1, b, n);
  return base.map((p, i) => {
    const q = base[Math.min(n, i + 1)]!;
    const o = base[Math.max(0, i - 1)]!;
    const l = Math.hypot(q.x - o.x, q.y - o.y) || 1;
    const u = i / n;
    const off = amp * Math.sin(2 * Math.PI * waves * u + phase) * Math.min(1, u * 4);
    return pt(p.x - ((q.y - o.y) / l) * off, p.y + ((q.x - o.x) / l) * off);
  });
}
