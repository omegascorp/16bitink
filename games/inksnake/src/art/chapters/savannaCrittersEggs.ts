import { createRng } from '../../logic/rng';
import { bezier, closed, type Draw, pt, shade } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import type { SpriteArt } from '../types';
import { mix, rgba } from '../wash';
import { castShadow, ellipseAt, glaze } from '../critters/preyKit';

/**
 * The Savanna's eggs, seen from above, blunt end back (−x), after the
 * farm's hen's egg: a shell washed and rounded by light from the upper
 * left, its markings fixed so they hold still while the line boils, a
 * glossy window and a bounce light along the shadowed rim.
 *
 * - weaver-egg: a small village weaver's egg, about 12 × 9, pale
 *   blue-green and finely freckled rust-brown, densest round the blunt end.
 * - guinea-egg: a helmeted guineafowl's, about 32 × 25: thick-shelled,
 *   cream-buff, pointed at the narrow end, finely pitted all over with a
 *   few darker pores and a dull, chalky sheen.
 */
interface Shell {
  readonly rx: number;
  readonly ry: number;
  /** How much broader the blunt end is than the narrow one. */
  readonly swell: number;
  /** How far the narrow end is drawn out to a point. */
  readonly point: number;
  readonly base: string;
  readonly warm: string;
  readonly deep: string;
  readonly speck: string;
  readonly specks: number;
  /** Freckles bunch at the blunt end (0 even, 1 all there). */
  readonly cap: number;
  readonly speckR: readonly [number, number];
  /** Pores: fine pits in a thick shell. */
  readonly pits: number;
  readonly gloss: number;
  readonly line: number;
  readonly seed: number;
}

function outline(s: Shell, n = 40): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const t = (i / n) * Math.PI * 2;
    const c = Math.cos(t);
    // Broader at −x, drawn out a little to a point at +x.
    return pt(s.rx * c * (1 + s.point * Math.max(0, c) ** 2), s.ry * Math.sin(t) * (1 - s.swell * c));
  });
}

function roundShade(d: Draw, s: Shell, shape: readonly Pt[]): void {
  const { ctx } = d.pen;
  d.pen.clipped(shape, () => {
    const g = ctx.createRadialGradient(-s.rx * 0.35, -s.ry * 0.4, s.rx * 0.08, -s.rx * 0.1, -s.ry * 0.12, s.rx * 1.25);
    g.addColorStop(0, rgba(PAPER_FILL, 0.6 * s.gloss + 0.15));
    g.addColorStop(0.42, rgba(PAPER_FILL, 0));
    g.addColorStop(0.72, rgba(s.warm, 0.35));
    g.addColorStop(1, rgba(s.deep, 0.78));
    ctx.fillStyle = g;
    ctx.fillRect(-s.rx * 1.6, -s.rx * 1.6, s.rx * 3.2, s.rx * 3.2);
  });
}

/** Freckles and pits, fewer where the light falls. */
function markings(d: Draw, s: Shell, shape: readonly Pt[]): void {
  const { pen } = d;
  const { ctx } = pen;
  const rng = createRng(s.seed);
  pen.clipped(shape, () => {
    for (let i = 0; i < s.specks; i++) {
      const x = (rng() * 2 - 1) * s.rx;
      const y = (rng() * 2 - 1) * s.ry;
      const capped = Math.max(0, -x / s.rx);
      if (rng() > 1 - s.cap + s.cap * capped) continue;
      const lit = Math.max(0, 0.45 - (x / s.rx) * 0.35 - (y / s.ry) * 0.55);
      if (rng() < lit) continue;
      const r = s.speckR[0] + rng() * (s.speckR[1] - s.speckR[0]);
      ctx.fillStyle = rng() < 0.3 ? mix(s.speck, s.deep, 0.5) : s.speck;
      ctx.globalAlpha = 0.35 + rng() * 0.45;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * (0.6 + rng() * 0.4), rng() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Pits: a dark dot with a pale lip on its lit side.
    for (let i = 0; i < s.pits; i++) {
      const x = (rng() * 2 - 1) * s.rx;
      const y = (rng() * 2 - 1) * s.ry;
      const r = 0.18 + rng() * 0.28;
      pen.dot(x, y, r, s.deep, 0.35 + rng() * 0.3);
      pen.dot(x - r * 0.6, y - r * 0.7, r * 0.6, PAPER_FILL, 0.4);
    }
    // A few soft blooms of colour in the wash.
    for (let i = 0; i < 6; i++) {
      const x = (rng() * 1.6 - 0.8) * s.rx;
      const y = (rng() * 1.6 - 0.8) * s.ry;
      glaze(d, x, y, s.rx * 0.22, s.ry * 0.2, rng() * 3, i % 2 ? s.warm : s.speck, 0.12);
    }
  });
}

function paintShell(d: Draw, s: Shell): void {
  const { pen } = d;
  const shape = outline(s);
  castShadow(d, shape.map((p) => pt(p.x * 1.02, p.y * 1.05)), pt(s.rx * 0.14, s.ry * 0.26), 0.2);
  castShadow(d, shape.map((p) => pt(p.x * 0.9, p.y * 0.9)), pt(s.rx * 0.08, s.ry * 0.15), 0.12);
  pen.fill(shape, PAPER_FILL, 1);
  pen.clipped(shape, () => {
    pen.ctx.translate(s.rx * 0.04, s.ry * 0.04);
    pen.fill(shape, s.base, 0.95);
    pen.ctx.translate(-s.rx * 0.04, -s.ry * 0.04);
  });
  glaze(d, s.rx * 0.05, s.ry * 0.06, s.rx * 0.7, s.ry * 0.6, 0, s.warm, 0.25);
  roundShade(d, s, shape);
  markings(d, s, shape);
  shade(d, shape, 0.16);
  const rim = outline(s, 40).map((p) => pt(p.x * 0.86 + s.rx * 0.03, p.y * 0.84 + s.ry * 0.04));
  pen.hair(rim.slice(2, 16), Math.max(0.35, s.rx * 0.05), mix(s.base, PAPER_FILL, 0.4), 0.45);
  // The window: glossy on a weaver's egg, a soft chalky bloom on a guineafowl's.
  pen.fill(ellipseAt(-s.rx * 0.36, -s.ry * 0.42, s.rx * 0.3, s.ry * 0.17, -0.45, 16), PAPER_FILL, 0.35 + 0.25 * s.gloss);
  if (s.gloss > 0.5) pen.dot(-s.rx * 0.42, -s.ry * 0.46, Math.max(0.45, s.rx * 0.07), PAPER_FILL, 0.95);
  pen.hair(bezier(pt(-s.rx * 0.8, -s.ry * 0.05), pt(-s.rx * 0.74, -s.ry * 0.7), pt(-s.rx * 0.2, -s.ry * 0.82), 8), Math.max(0.35, s.rx * 0.05), PAPER_FILL, 0.55);
  pen.stroke(closed(shape), s.line, d.ink, 0.9);
}

const WEAVER_SHELL: Shell = {
  rx: 6, ry: 4.5, swell: 0.1, point: 0.04,
  base: '#b5dccf', warm: '#86bfae', deep: '#4f8a7c', speck: '#8a5a3a',
  specks: 70, cap: 0.55, speckR: [0.1, 0.32], pits: 0, gloss: 0.9, line: 0.42, seed: 4411,
};

const GUINEA_SHELL: Shell = {
  rx: 15.5, ry: 12.5, swell: 0.2, point: 0.1,
  base: '#e9d3a2', warm: '#d4b073', deep: '#9a7a4a', speck: '#b08a55',
  specks: 120, cap: 0.1, speckR: [0.15, 0.45], pits: 150, gloss: 0.35, line: 0.75, seed: 4471,
};

export const WEAVER_EGG_ART: SpriteArt<'egg'> = { frame: 20, res: 3, poses: ['egg'], draw: (d) => paintShell(d, WEAVER_SHELL) };
export const GUINEA_EGG_ART: SpriteArt<'egg'> = { frame: 52, res: 3, poses: ['egg'], draw: (d) => paintShell(d, GUINEA_SHELL) };
