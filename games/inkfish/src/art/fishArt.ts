import type { PlayerFishId, SpeciesId } from '../levels/types';
import { ANATOMY } from './fish/registry';
import {
  bezier, bottomAt, C, FISH_RADIUS, FISH_TEX, heightAt, outline, PAPER_FILL, topAt, xAt, type Anatomy, type Fin, type Kit, type Light,
} from './fish/kit';
import { CRITTER_BODY, drawCritter, isCritter } from './critterArt';
import { ellipse, INK, makeCanvas, Pen, type Pt } from './pen';
import { drawSquidPortrait, isSquid } from './squidArt';
import { SQUID_BODY } from './squidPose';

export { FISH_RADIUS, FISH_TEX };
export type FishShape = SpeciesId | PlayerFishId;
/** light = prey/peer look, heavy = predator look (engraved cross-hatching). */
export type InkVariant = 'light' | 'heavy';

// ---------------------------------------------------------------- fins

function drawTail(k: Kit): void {
  const { a, pen } = k;
  if (a.tail === 'point') return;
  const x0 = xAt(a, 1) + 3;
  const base = Math.max(3, heightAt(a, 1));
  const L = a.hh * a.tailSize;
  const S = a.hh * a.tailSize * 0.85;
  const top = { x: x0, y: C - base * 0.9 };
  const bot = { x: x0, y: C + base * 0.9 };
  const edge: Pt[] =
    a.tail === 'lunate'
      ? [
          ...bezier(top, { x: x0 - L * 0.35, y: C - S * 0.5 }, { x: x0 - L * 0.9, y: C - S * 1.15 }),
          ...bezier({ x: x0 - L * 0.9, y: C - S * 1.15 }, { x: x0 - L * 0.45, y: C }, { x: x0 - L * 0.9, y: C + S * 1.15 }),
          ...bezier({ x: x0 - L * 0.9, y: C + S * 1.15 }, { x: x0 - L * 0.35, y: C + S * 0.5 }, bot),
        ]
      : a.tail === 'shark'
      ? [
          ...bezier(top, { x: x0 - L * 0.5, y: C - S * 0.7 }, { x: x0 - L * 1.15, y: C - S * 1.25 }),
          ...bezier({ x: x0 - L * 1.15, y: C - S * 1.25 }, { x: x0 - L * 0.75, y: C - S * 0.2 }, { x: x0 - L * 0.5, y: C + S * 0.05 }),
          ...bezier({ x: x0 - L * 0.5, y: C + S * 0.05 }, { x: x0 - L * 0.6, y: C + S * 0.45 }, { x: x0 - L * 0.42, y: C + S * 0.62 }),
          ...bezier({ x: x0 - L * 0.42, y: C + S * 0.62 }, { x: x0 - L * 0.2, y: C + S * 0.4 }, bot),
        ]
      : a.tail === 'fork'
      ? [
          ...bezier(top, { x: x0 - L * 0.5, y: C - S * 0.55 }, { x: x0 - L, y: C - S }),
          ...bezier({ x: x0 - L, y: C - S }, { x: x0 - L * 0.62, y: C - S * 0.25 }, { x: x0 - L * 0.55, y: C }),
          ...bezier({ x: x0 - L * 0.55, y: C }, { x: x0 - L * 0.62, y: C + S * 0.25 }, { x: x0 - L, y: C + S }),
          ...bezier({ x: x0 - L, y: C + S }, { x: x0 - L * 0.5, y: C + S * 0.55 }, bot),
        ]
      : [
          ...bezier(top, { x: x0 - L * 0.55, y: C - S * 0.95 }, { x: x0 - L * 0.95, y: C - S * 0.35 }),
          ...bezier({ x: x0 - L * 0.95, y: C - S * 0.35 }, { x: x0 - L * 1.08, y: C }, { x: x0 - L * 0.95, y: C + S * 0.35 }),
          ...bezier({ x: x0 - L * 0.95, y: C + S * 0.35 }, { x: x0 - L * 0.55, y: C + S * 0.95 }, bot),
        ];
  membrane(k, edge, { x: x0 + 2, y: C }, 14);
}

/** Fin membrane: paper fill, faint wash, rays fanning from `root`, outlined. */
function membrane(k: Kit, shape: Pt[], root: Pt, rays: number): void {
  const { pen, a, heavy, ink } = k;
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, a.finWash ?? a.wash, a.finAlpha ?? (heavy ? 0.3 : 0.16));
  // Rays: from the root to evenly spaced points along the outer edge. Shark fins have none.
  for (let i = 1; i < (a.smoothFins ? 0 : rays); i++) {
    const p = shape[Math.round((i / rays) * (shape.length - 1))]!;
    pen.hair([root, { x: (root.x + p.x) / 2 + pen.jitter(0.6), y: (root.y + p.y) / 2 }, p], 0.55, ink, 0.6);
  }
  pen.stroke(shape, 1.25, ink, 1, false);
}

/** Dorsal (top) or anal (bottom) fin rising from the body edge. */
function drawEdgeFin(k: Kit, fin: Fin, side: 'top' | 'bottom'): void {
  const { a, pen, ink } = k;
  const dir = side === 'top' ? -1 : 1;
  const edgeY = (t: number): number => (side === 'top' ? topAt(a, t) : bottomAt(a, t));
  const n = Math.max(6, Math.round((fin.to - fin.from) * 40));
  const base: Pt[] = [];
  const tips: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const t = fin.from + (fin.to - fin.from) * f;
    // Spiny fins are tallest at the front; soft fins are rounded.
    const prof = fin.tri
      ? f < 0.3 ? f / 0.3 : Math.pow(1 - (f - 0.3) / 0.7, 0.8)
      : fin.spiny ? 0.35 + 0.65 * Math.pow(1 - f, 0.6) : Math.pow(Math.sin(Math.PI * Math.min(1, f * 1.15)), 0.7);
    const height = a.hh * fin.height * Math.max(0.12, prof);
    base.push({ x: xAt(a, t), y: edgeY(t) - dir * 2 });
    // Rays rake back towards the tail.
    tips.push({ x: xAt(a, t) - height * (fin.tri ? 0.8 : 0.45), y: edgeY(t) + dir * height });
  }
  const edge: Pt[] = fin.spiny
    ? tips.flatMap((p, i) => {
        // Membrane dips between spines.
        const next = tips[i + 1];
        if (!next) return [p];
        const b = base[i]!;
        return [p, { x: (p.x + next.x) / 2 + 1, y: (p.y + next.y) / 2 * 0.7 + b.y * 0.3 }];
      })
    : tips;
  const shape = [...base, ...[...edge].reverse()];
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, a.finWash ?? a.wash, a.finAlpha ?? 0.16);
  base.forEach((b, i) => {
    if (a.smoothFins || i % (fin.spiny ? 1 : 2)) return;
    pen.hair([b, tips[i]!], fin.spiny ? 0.9 : 0.5, ink, fin.spiny ? 0.9 : 0.6);
  });
  pen.stroke(edge, fin.spiny ? 0.8 : 1.1, ink, 1, false);
}

function drawPelvic(k: Kit): void {
  const { a } = k;
  const t = 0.42;
  const r = { x: xAt(a, t), y: bottomAt(a, t) - 3 };
  const s = a.hh * 0.42;
  const shape = [r, ...bezier({ x: r.x, y: r.y }, { x: r.x - s * 0.4, y: r.y + s * 0.9 }, { x: r.x - s * 1.1, y: r.y + s * 0.85 }, 8), { x: r.x - s * 0.5, y: r.y }];
  membrane(k, shape, r, 6);
}

function drawPectoral(k: Kit): void {
  const { a } = k;
  if (a.pectoral <= 0) return;
  const t = 0.3;
  const root = { x: xAt(a, t), y: C + heightAt(a, t) * 0.2 };
  const s = a.hh * a.pectoral;
  // A fan that sweeps back and down from just behind the gill cover.
  const upper = { x: root.x - s * 1.25, y: root.y + s * 0.02 };
  const lower = { x: root.x - s * 0.75, y: root.y + s * 0.72 };
  const shape = [
    { x: root.x, y: root.y - s * 0.12 },
    ...bezier({ x: root.x, y: root.y - s * 0.12 }, { x: root.x - s * 0.7, y: root.y - s * 0.22 }, upper, 8),
    ...bezier(upper, { x: root.x - s * 1.25, y: root.y + s * 0.6 }, lower, 8),
    ...bezier(lower, { x: root.x - s * 0.3, y: root.y + s * 0.45 }, { x: root.x, y: root.y + s * 0.1 }, 6),
  ];
  membrane(k, shape, root, 9);
}

// ---------------------------------------------------------------- surface

/** Shading lines that follow the belly curve, converging towards the tail. */
function contourHatch(k: Kit, rows: number, fromBottom: boolean, gap: number, alpha: number): void {
  const { a, pen, body, ink } = k;
  pen.clipped(body, () => {
    for (let r = 1; r <= rows; r++) {
      const start = 0.04 + r * 0.012 + pen.rng() * 0.05;
      const end = 0.96 - r * 0.015 - pen.rng() * 0.06;
      const pts: Pt[] = [];
      for (let t = start; t <= end; t += 0.03) {
        const scale = heightAt(a, t) / a.hh;
        const y = fromBottom ? bottomAt(a, t) - r * gap * scale : topAt(a, t) + r * gap * scale;
        pts.push({ x: xAt(a, t), y });
      }
      pen.hair(pts, 0.55, ink, alpha * (1 - (r / (rows + 2)) * 0.6));
    }
  });
}

/** Engraving-style cross contours: arcs from back to belly around the body. */
function crossHatch(k: Kit, step: number, alpha: number): void {
  const { a, pen, body, ink } = k;
  pen.clipped(body, () => {
    for (let t = 0.05; t < 1; t += step / (2 * a.hl)) {
      const x = xAt(a, t);
      const h = heightAt(a, t);
      const bulge = h * 0.18;
      pen.hair(bezier({ x, y: topAt(a, t) }, { x: x - bulge, y: C }, { x, y: bottomAt(a, t) }, 6), 0.5, ink, alpha);
    }
  });
}

/** Overlapping scale arcs in staggered rows, fading towards back and belly. */
function scaleRows(k: Kit): void {
  const { a, pen, body, ink } = k;
  const s = Math.max(2.6, a.hh * 0.11);
  pen.clipped(body, () => {
    let row = 0;
    for (let v = -0.7; v <= 0.7; v += (s * 1.5) / a.hh, row++) {
      for (let t = 0.32 + (row % 2) * (s / (2 * a.hl)); t < 0.92; t += (s * 1.7) / (2 * a.hl)) {
        if (pen.rng() < Math.abs(v) * 0.9 + 0.12) continue;
        const x = xAt(a, t);
        const y = C + heightAt(a, t) * v;
        const arc: Pt[] = [];
        for (let i = 0; i <= 6; i++) {
          const ang = -Math.PI / 2 + (i / 6) * Math.PI;
          arc.push({ x: x - Math.cos(ang) * s * 0.75, y: y + Math.sin(ang) * s });
        }
        pen.hair(arc, 0.45, ink, 0.5);
      }
    }
  });
}

function lateralLine(k: Kit): void {
  const { a, pen, ink } = k;
  for (let t = 0.3; t < 0.95; t += 0.028) {
    const y = C - heightAt(a, t) * 0.12;
    pen.hair([{ x: xAt(a, t), y }, { x: xAt(a, t + 0.012), y: C - heightAt(a, t + 0.012) * 0.12 }], 0.6, ink, 0.6);
  }
}

function gills(k: Kit): void {
  const { a, pen, ink } = k;
  const t = 0.27;
  const x = xAt(a, t);
  const h = heightAt(a, t);
  pen.stroke(bezier({ x: x + 2, y: C - h * 0.72 }, { x: x - h * 0.32, y: C }, { x: x + 3, y: C + h * 0.7 }), 1, ink, 1, false);
  pen.hair(bezier({ x: x + 6, y: C - h * 0.5 }, { x: x - h * 0.12, y: C + h * 0.05 }, { x: x + 6, y: C + h * 0.55 }), 0.55, ink, 0.6);
}

function eye(k: Kit): void {
  const { a, pen, ink } = k;
  const x = xAt(a, a.eye.t);
  const y = C - heightAt(a, a.eye.t) * 0.3;
  const r = a.eye.r;
  pen.fill(ellipse(x, y, r, r, 18), PAPER_FILL, 1);
  pen.stroke(ellipse(x, y, r, r, 18).concat([{ x: x + r, y }]), 0.9, ink, 1, false);
  pen.hair(ellipse(x, y, r * 0.68, r * 0.68, 16).concat([{ x: x + r * 0.68, y }]), 0.45, ink, 0.7);
  for (let i = 0; i < 10; i++) {
    const ang = (i / 10) * Math.PI * 2;
    pen.hair([{ x: x + Math.cos(ang) * r * 0.4, y: y + Math.sin(ang) * r * 0.4 }, { x: x + Math.cos(ang) * r * 0.66, y: y + Math.sin(ang) * r * 0.66 }], 0.35, ink, 0.55);
  }
  pen.dot(x + r * 0.08, y, r * 0.38, ink);
  pen.dot(x + r * 0.22, y - r * 0.2, Math.max(0.6, r * 0.13), PAPER_FILL);
  // Socket shadow above the eye.
  pen.hair(bezier({ x: x - r * 1.1, y: y - r * 0.6 }, { x, y: y - r * 1.6 }, { x: x + r * 1.15, y: y - r * 0.55 }), 0.5, ink, 0.55);
}

function mouth(k: Kit): void {
  const { a, pen, ink } = k;
  if (a.mouth === 'none') return;
  const nx = xAt(a, 0);
  const t = 0.07;
  const y = C + heightAt(a, t) * 0.18;
  if (a.mouth === 'small' || a.mouth === 'beak') {
    pen.stroke([{ x: nx - 1, y: C + 1 }, { x: xAt(a, t), y: y + 1 }, { x: xAt(a, t + 0.015), y: y - 1 }], 0.9, ink, 1, false);
    if (a.mouth === 'beak') pen.hair([{ x: nx - 2, y: C - 2 }, { x: nx - 2, y: C + 3 }], 0.7, ink, 0.9);
    return;
  }
  if (a.mouth === 'gape') {
    anglerMouth(k);
    return;
  }
  // Pike: a long toothy jaw line under the snout. It starts just inside the
  // tip, and each tooth is only as long as the head is tall there, so nothing
  // pokes out past the outline of a pointed snout.
  const back = xAt(a, 0.14);
  const jaw = bezier({ x: xAt(a, 0.015), y: C + 1 }, { x: (nx + back) / 2, y: C + 3 }, { x: back, y: C + 2.5 });
  pen.stroke(jaw, 1, ink, 1, false);
  for (let i = 1; i < 7; i++) {
    const p = jaw[Math.round((i / 7) * (jaw.length - 1))]!;
    const room = (p.y - topAt(a, (C + a.hl - p.x) / (2 * a.hl))) * 0.45;
    const length = Math.min(2.6, room);
    if (length < 1) continue;
    needle(pen, p, { x: p.x - 0.6, y: p.y - length }, 1.4, ink);
  }
}

/** A white needle tooth from `base` to `tip`, outlined in hairline ink. */
function needle(pen: Pen, base: Pt, tip: Pt, width: number, ink: string): void {
  const dx = tip.x - base.x;
  const dy = tip.y - base.y;
  const d = Math.hypot(dx, dy) || 1;
  const nx = (-dy / d) * (width / 2);
  const ny = (dx / d) * (width / 2);
  const tooth = [{ x: base.x + nx, y: base.y + ny }, tip, { x: base.x - nx, y: base.y - ny }];
  pen.fill(tooth, PAPER_FILL, 1);
  pen.hair(tooth, 0.4, ink, 0.9);
}

/**
 * Angler: a deep crescent mouth reaching far back along the head, an
 * under-bite chin, and long needle teeth pointing into the dark mouth.
 */
function anglerMouth(k: Kit): void {
  const { a, pen, ink } = k;
  const nx = xAt(a, 0);
  const corner = { x: xAt(a, 0.3), y: C + a.hh * 0.06 };
  // Lips meet the head's outline at the front; the opening reaches just past
  // it so the outline doesn't cross the open mouth.
  const snout = { x: nx + 1, y: C - a.hh * 0.06 };
  const chin = { x: nx + 1, y: C + a.hh * 0.42 };
  const upper = bezier(snout, { x: nx - 14, y: C + a.hh * 0.12 }, corner, 14);
  const lower = bezier(chin, { x: nx - 12, y: C + a.hh * 0.5 }, corner, 14);
  // Dark mouth interior, deepened with fine engraved hatching. Blank it first,
  // so the head's outline doesn't show through the open mouth.
  const mouthShape = [...upper, ...[...lower].reverse()];
  pen.fill(mouthShape, PAPER_FILL, 1);
  pen.fill(mouthShape, '#2a2228', 0.78);
  pen.clipped(mouthShape, () => {
    for (let x = corner.x; x < chin.x + 4; x += 2.2) pen.hair([{ x, y: C - a.hh * 0.2 }, { x: x - 6, y: C + a.hh * 0.6 }], 0.5, ink, 0.7);
  });
  // Interlocking fangs: upper and lower teeth alternate along the jaw, so they
  // can be long without crossing. Each is sized to the gap between the jaws
  // there, longest at the front where the mouth is widest.
  const at = (curve: Pt[], f: number): Pt => curve[Math.round(Math.min(1, f) * (curve.length - 1))]!;
  for (let i = 0; i < 6; i++) {
    for (const jaw of ['upper', 'lower'] as const) {
      const f = 0.05 + i * 0.13 + (jaw === 'lower' ? 0.065 : 0);
      const u = at(upper, f);
      const l = at(lower, f);
      const len = Math.min(12, Math.abs(l.y - u.y) * 0.62) * (0.9 + pen.rng() * 0.15);
      if (len < 2.5) continue;
      const width = Math.max(1.6, Math.min(3.4, len * 0.38));
      if (jaw === 'upper') needle(pen, u, { x: u.x - len * 0.2, y: u.y + len }, width, ink);
      else needle(pen, l, { x: l.x - len * 0.25, y: l.y - len }, width, ink);
    }
  }
  pen.stroke(upper, 1.3, ink, 1, false);
  pen.stroke(lower, 1.5, ink);
  // A little crease where the lips meet.
  pen.hair(bezier(corner, { x: corner.x - 4, y: corner.y + 3 }, { x: corner.x - 6, y: corner.y + 8 }, 4), 0.6, ink, 0.8);
}

/** Bends a finished drawing into a sine wave by shifting 1px columns (eels swim in S-curves). */
function undulate(ctx: CanvasRenderingContext2D, amplitude: number): void {
  const { canvas } = ctx;
  const copy = document.createElement('canvas');
  copy.width = canvas.width;
  copy.height = canvas.height;
  copy.getContext('2d')?.drawImage(canvas, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let x = 0; x < canvas.width; x++) {
    const dy = Math.sin((x / canvas.width) * Math.PI * 2.2 + 0.6) * amplitude * Math.min(1, (canvas.width - x) / 60 + 0.25);
    ctx.drawImage(copy, x, 0, 1, canvas.height, x, dy, 1, canvas.height);
  }
}

/** Draws one boil frame of a fish facing right, centred in a FISH_TEX square canvas. */
export function drawFish(ctx: CanvasRenderingContext2D, shape: FishShape, variant: InkVariant, seed: number, lights?: Light[]): void {
  const a: Anatomy = ANATOMY[shape];
  const pen = new Pen(ctx, seed, 0.55);
  const heavy = variant === 'heavy';
  const ink = a.ink ?? INK;
  const body = outline(a);
  const k: Kit = { pen, a, body, heavy, ink, x: (t) => xAt(a, t), h: (t) => heightAt(a, t), lights };

  a.under?.(k);
  // Fins behind the body.
  drawTail(k);
  if (a.dorsal) drawEdgeFin(k, a.dorsal, 'top');
  if (a.dorsal2) drawEdgeFin(k, a.dorsal2, 'top');
  if (a.anal) drawEdgeFin(k, a.anal, 'bottom');
  if (a.pelvic) drawPelvic(k);

  // Body: paper, then a slightly misregistered watercolour wash.
  pen.fill(body, PAPER_FILL, 1);
  pen.clipped(body, () => {
    ctx.translate(1.5, 1);
    pen.fill(body, a.wash, heavy ? 0.38 : 0.22);
    ctx.translate(-1.5, -1);
  });
  if (heavy) pen.fill(body, '#a3342b', 0.12);

  if (a.scales) scaleRows(k);
  a.extras?.(k);
  contourHatch(k, heavy ? Math.round((a.hh * 1.9) / 2.4) : 6, true, heavy ? 2.4 : 2.8, heavy ? 0.75 : 0.6);
  contourHatch(k, heavy ? 4 : 2, false, 2.6, 0.5);
  if (heavy) crossHatch(k, 3.2, 0.5);
  if (a.lateral !== false) lateralLine(k);
  if ((a.gills ?? 'bony') === 'bony') gills(k);
  drawPectoral(k);
  // Back and belly as two open strokes: no line across the tail stalk.
  const half = body.length / 2;
  pen.stroke(body.slice(0, half), heavy ? 2.6 : 2.1, ink);
  pen.stroke([...body.slice(half), body[0]!], heavy ? 2.6 : 2.1, ink);
  mouth(k);
  a.face?.(k);
  eye(k);
  if (heavy) {
    // Furrowed brow: predators read as predators at a glance.
    const ex = xAt(a, a.eye.t);
    const ey = C - heightAt(a, a.eye.t) * 0.3;
    pen.stroke([{ x: ex - a.eye.r * 1.3, y: ey - a.eye.r * 1.5 }, { x: ex + a.eye.r * 1.2, y: ey - a.eye.r * 0.9 }], 1.8, ink, 1, false);
  }
  if (a.wave) undulate(ctx, a.wave);
}

/** One boil frame of any swimmer or crawler: fish by anatomy, seabed critters by their own drawings. */
export function drawCreature(ctx: CanvasRenderingContext2D, shape: FishShape, variant: InkVariant, frame: number, seed: number): void {
  if (isCritter(shape)) drawCritter(ctx, shape, variant, frame, seed);
  else if (isSquid(shape)) drawSquidPortrait(ctx, variant, seed);
  else drawFish(ctx, shape, variant, seed);
}

/** Half length and half height of the solid body in texture px, for hit shapes and framing. */
export function bodyProportions(shape: FishShape): { readonly hl: number; readonly hh: number } {
  if (isSquid(shape)) return SQUID_BODY;
  return isCritter(shape) ? CRITTER_BODY[shape] : ANATOMY[shape];
}

const lightCache = new Map<FishShape, readonly Light[]>();

/** Where a fish's lights sit, in texture px (empty for fish that don't glow). Found by drawing it once. */
export function fishLights(shape: FishShape): readonly Light[] {
  const cached = lightCache.get(shape);
  if (cached) return cached;
  const lights: Light[] = [];
  if (!isCritter(shape) && !isSquid(shape)) drawFish(makeCanvas(FISH_TEX, FISH_TEX).ctx, shape, 'light', 101, lights);
  lightCache.set(shape, lights);
  return lights;
}
