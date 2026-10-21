import type { CharmId } from '../logic/charms';
import { COLOUR_WASH, COLOURS, type ColourId } from '../logic/colours';
import { createRng } from '../logic/rng';
import { bezier, capsule, closed, type Draw, oval, pt, TAU } from './kit';
import { INK, LEAF, PAPER_FILL } from './palette';
import type { Pt } from './pen';
import { mix, rgba } from './wash';

/** Marble radius in local units; marbles are drawn centred in a MARBLE_FRAME square. */
export const MARBLE_R = 16;
export const MARBLE_FRAME = 40;
/** Texture pixels per marble frame unit. */
export const MARBLE_RES = 4;

/** Each colour's pattern ink: a deep shade of its own wash, so it reads without colour. */
const PATTERN: Readonly<Record<ColourId, string>> = {
  red: '#7d1d18',
  yellow: '#8f5e0c',
  blue: '#182f72',
  green: '#2a5e23',
  purple: '#43205f',
  teal: '#0b5553',
};

/** A soft round shadow-and-gloss body that looks the same at any rotation. */
function body(d: Draw, colour: ColourId): void {
  const { pen } = d;
  const { ctx } = pen;
  const R = MARBLE_R;
  const wash = COLOUR_WASH[colour];
  const disc = oval(0, 0, R, R, 44);
  pen.fill(disc, PAPER_FILL, 1);
  // The wash, laid a touch off-register, pooling darker at its rim as watercolour does.
  pen.clipped(disc, () => {
    ctx.translate(0.6, 0.4);
    pen.fill(disc, wash, 0.88);
    ctx.translate(-0.6, -0.4);
    const rim = ctx.createRadialGradient(0, 0, R * 0.35, 0, 0, R);
    rim.addColorStop(0, rgba(mix(wash, '#ffffff', 0.35), 0.35));
    rim.addColorStop(0.65, rgba(wash, 0));
    rim.addColorStop(1, rgba(mix(wash, INK, 0.55), 0.55));
    ctx.fillStyle = rim;
    ctx.fillRect(-R, -R, R * 2, R * 2);
    // A faint core shadow low on the right, kept soft so it survives the sprite turning.
    const core = ctx.createRadialGradient(-5, -6, R * 0.6, -5, -6, R * 1.6);
    core.addColorStop(0, rgba(INK, 0));
    core.addColorStop(1, rgba(INK, 0.22));
    ctx.fillStyle = core;
    ctx.fillRect(-R, -R, R * 2, R * 2);
    // Pigment granulation.
    pen.stipple(disc, 26, () => 0.8, 0.45, mix(wash, INK, 0.4));
  });
}

/** The colour's own mark, set off-centre so a turning marble visibly rolls. */
function pattern(d: Draw, colour: ColourId): void {
  const { pen } = d;
  const ink = PATTERN[colour];
  const a = 0.9;
  const disc = oval(0, 0, MARBLE_R - 0.6, MARBLE_R - 0.6, 40);
  pen.clipped(disc, () => {
    switch (colour) {
      case 'red':
        // Polka dots in a loose cluster.
        for (const [x, y, r] of [[-5, -6, 3.3], [4.5, -3, 2.6], [-2.5, 4.5, 2.9], [7.5, 6, 2.1], [-10, 1.5, 1.9], [3, 11.5, 1.7]] as const) {
          pen.fill(oval(x, y, r, r, 14), ink, a);
        }
        break;
      case 'yellow':
        // Two broad bands bowed like lines of latitude.
        for (const off of [-6.5, 3.5]) pen.stroke(bezier(pt(-17, off - 1), pt(0, off + 5), pt(17, off - 3), 14), 3.2, ink, a, false);
        break;
      case 'blue':
        // A ring, off to one side.
        pen.stroke(closed(oval(3.5, -2.5, 6.4, 6.4, 22)), 2.8, ink, a, false);
        pen.fill(oval(3.5, -2.5, 1.6, 1.6, 10), ink, a);
        break;
      case 'green':
        // A plus, off-centre.
        pen.fill(capsule(pt(-3.4, -8), pt(-2.8, 7.5), 3.6, 3.6), ink, 1);
        pen.fill(capsule(pt(-11, 0.2), pt(4.6, -0.3), 3.6, 3.6), ink, 1);
        break;
      case 'purple': {
        // A sharp zigzag across.
        const zig: Pt[] = [];
        for (let i = 0; i <= 6; i++) zig.push(pt(-16 + i * 5.4, 2 + (i % 2 === 0 ? -4 : 4) + i * 0.4));
        pen.stroke(zig, 2.7, ink, a, false);
        break;
      }
      case 'teal':
        // Two soft waves.
        for (const [off, amp] of [[-4.5, 2.6], [5, 2.6]] as const) {
          const wave = Array.from({ length: 25 }, (_, i) => pt(-17 + i * (34 / 24), off + Math.sin(i * 0.55 + off) * amp));
          pen.stroke(wave, 2.4, ink, a, false);
        }
        break;
    }
  });
}

/**
 * A glossy painted marble of radius MARBLE_R centred at 0,0: paper, its
 * colour's wash, a soft rim shadow, the colour's own pen pattern (dots,
 * bands, ring, plus, zigzag or waves, for colour-blind players), a pen
 * contour and a small glint at the upper left. Shading is kept round and
 * soft so the sprite can be rotated as it rolls.
 */
export function drawMarble(d: Draw, colour: ColourId): void {
  const { pen } = d;
  body(d, colour);
  pattern(d, colour);
  const R = MARBLE_R;
  // Gloss: a soft window highlight and a crisp glint, then the faint bounce light on the far rim.
  pen.fill(oval(-6, -7.5, 4.6, 3.2, 16), PAPER_FILL, 0.35);
  pen.dot(-6.2, -7.8, 1.9, PAPER_FILL, 0.95);
  pen.hair(bezier(pt(-11.5, -2), pt(-11, -9), pt(-5, -12), 6), 1.1, PAPER_FILL, 0.7);
  pen.hair(bezier(pt(12.5, 3), pt(11, 9), pt(5, 12.5), 6), 0.9, PAPER_FILL, 0.3);
  pen.stroke(closed(oval(0, 0, R, R, 36)), 1.35, d.ink, 0.95);
}

interface Emblem {
  /** Open or closed polylines, drawn as even (untapered) strokes. */
  lines: Pt[][];
  /** Solid shapes: arrowheads, stars, dots. */
  fills: Pt[][];
}

/** A charm's emblem at scale s (1 fits within radius ~9.5). */
function emblem(charm: CharmId, s: number): Emblem {
  const P = (x: number, y: number): Pt => pt(x * s, y * s);
  const ring = (r: number, n: number): Pt[] => closed(Array.from({ length: n }, (_, i) => P(Math.cos((i / n) * TAU) * r, Math.sin((i / n) * TAU) * r)));
  switch (charm) {
    case 'slow': {
      // A snail-shell spiral.
      const spiral = Array.from({ length: 40 }, (_, i) => {
        const t = i / 39;
        const ang = -0.5 + t * TAU * 1.8;
        const r = 0.8 + t * 6.9;
        return P(Math.cos(ang) * r, Math.sin(ang) * r - 0.3);
      });
      return { lines: [spiral], fills: [] };
    }
    case 'reverse': {
      // A curved arrow turning back on itself, with a bold head.
      const a0 = -0.15;
      const a1 = a0 + TAU * 0.7;
      const arc = Array.from({ length: 24 }, (_, i) => {
        const ang = a0 + ((a1 - a0) * i) / 23;
        return P(Math.cos(ang) * 6, Math.sin(ang) * 6);
      });
      const tip = pt(Math.cos(a1 + 0.42) * 6 * s, Math.sin(a1 + 0.42) * 6 * s);
      const tan = pt(-Math.sin(a1), Math.cos(a1));
      const nrm = pt(Math.cos(a1), Math.sin(a1));
      const back = pt(Math.cos(a1) * 6 * s - tan.x * 0.6 * s, Math.sin(a1) * 6 * s - tan.y * 0.6 * s);
      const head = [tip, pt(back.x + nrm.x * 3.6 * s, back.y + nrm.y * 3.6 * s), pt(back.x - nrm.x * 3.6 * s, back.y - nrm.y * 3.6 * s)];
      return { lines: [arc], fills: [head] };
    }
    case 'burst': {
      // A starburst: eight points, long and short.
      const star = Array.from({ length: 16 }, (_, i) => {
        const ang = (i / 16) * TAU + 0.2;
        const r = i % 2 === 1 ? 2.6 : i % 4 === 0 ? 9.2 : 6.4;
        return P(Math.cos(ang) * r, Math.sin(ang) * r);
      });
      return { lines: [], fills: [star] };
    }
    case 'aim': {
      // A crosshair.
      const ticks = [[P(0, -9.2), P(0, -3.2)], [P(0, 3.2), P(0, 9.2)], [P(-9.2, 0), P(-3.2, 0)], [P(3.2, 0), P(9.2, 0)]];
      return { lines: [ring(5.8, 22), ...ticks], fills: [ring(1.5, 10)] };
    }
    case 'dragonfly': {
      // A dragonfly darting to the upper right: long body, four slim wings, round head.
      const turn = -Math.PI / 4;
      const D = (x: number, y: number): Pt => P((x + 1) * Math.cos(turn) - y * Math.sin(turn), (x + 1) * Math.sin(turn) + y * Math.cos(turn));
      const wing = (root: Pt, tip: Pt, wd: number): Pt[] => {
        const l = Math.hypot(tip.x - root.x, tip.y - root.y) || 1;
        const ux = (tip.x - root.x) / l;
        const uy = (tip.y - root.y) / l;
        return Array.from({ length: 14 }, (_, i) => {
          const t = (i / 14) * TAU;
          const along = (1 - Math.cos(t)) / 2;
          const across = Math.sin(t) * wd * (0.55 + 0.45 * along);
          return D(root.x + ux * along * l - uy * across, root.y + uy * along * l + ux * across);
        });
      };
      const wings = [1, -1].flatMap((side) => [wing(pt(2.6, side * 0.6), pt(4.2, side * 8.2), 1.9), wing(pt(1.3, side * 0.6), pt(-1.7, side * 7.8), 1.8)]);
      const thorax = Array.from({ length: 10 }, (_, i) => D(2.1 + Math.cos((i / 10) * TAU) * 2.1, Math.sin((i / 10) * TAU) * 1.6));
      const head = Array.from({ length: 10 }, (_, i) => D(5.4 + Math.cos((i / 10) * TAU) * 1.6, Math.sin((i / 10) * TAU) * 1.6));
      const abdomen = [D(-8.6, 0), D(-4, 0.15), D(0.5, 0)];
      return { lines: [abdomen], fills: [...wings, thorax, head] };
    }
    case 'inkpot': {
      // A squat ink bottle with a fat drop running off its lip.
      const bottle = closed([
        P(-2.4, -5.2), P(-2.4, -3.4), P(-5.6, -1.6), P(-6.6, 0.6), P(-6.6, 5.6), P(-5.8, 7.4), P(-4.2, 7.9),
        P(2.2, 7.9), P(3.8, 7.4), P(4.6, 5.6), P(4.6, 0.6), P(3.6, -1.6), P(0.4, -3.4), P(0.4, -5.2),
      ]);
      const lip = [P(-3.6, -6.6), P(1.6, -6.6)];
      // A teardrop, point up, round below.
      const drop = Array.from({ length: 16 }, (_, i) => {
        const t = (i / 16) * TAU;
        return P(7 + Math.sin(t) * Math.sin(t / 2) * 2.4, 3.6 - Math.cos(t) * 3);
      });
      return { lines: [lip], fills: [bottle, drop] };
    }
    case 'geode': {
      // A cut crystal: a flat table, a shallow crown and a long pointed pavilion, with its facet lines.
      const gem = closed([P(-8.4, -2.6), P(-4.6, -7), P(4.6, -7), P(8.4, -2.6), P(0, 8.6)]);
      const girdle = [P(-8.4, -2.6), P(8.4, -2.6)];
      const facets = [[P(-1.6, -7), P(-3.4, -2.6), P(0, 8.6)], [P(1.6, -7), P(3.4, -2.6), P(0, 8.6)]];
      return { lines: [gem, girdle, ...facets], fills: [] };
    }
  }
}

/** Even, round-capped strokes and fills, nudged by the pen so they boil with the drawing. */
function paintEmblem(d: Draw, e: Emblem, line: number, colour: string, outline = 0): void {
  const { ctx } = d.pen;
  const j = (p: Pt): Pt => pt(p.x + d.pen.jitter(0.2), p.y + d.pen.jitter(0.2));
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  for (const l of e.lines) {
    ctx.lineWidth = line;
    ctx.beginPath();
    l.map(j).forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
  }
  for (const f of e.fills) {
    ctx.beginPath();
    f.map(j).forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
    if (outline > 0) {
      ctx.lineWidth = outline;
      ctx.stroke();
    }
  }
  ctx.restore();
}

/**
 * The emblem of a charm, paper-white outlined in ink so it reads on any
 * marble colour; drawn over a marble that carries the charm, within radius ~10.
 */
export function drawCharmMark(d: Draw, charm: CharmId): void {
  const e = emblem(charm, 1);
  // A soft dark halo, the ink outline, then the white heart of each stroke.
  d.pen.ctx.save();
  d.pen.ctx.globalAlpha = 0.3;
  paintEmblem(d, e, 6.4, d.ink, 4.4);
  d.pen.ctx.restore();
  paintEmblem(d, e, 4.3, d.ink, 2.4);
  paintEmblem(d, e, 2.1, PAPER_FILL);
}

/** Token frame size: the falling charm on rail levels is drawn centred in it. */
export const TOKEN_FRAME = 48;

/**
 * A charm to catch: a round paper medallion with a gilded rim, wrapped in
 * two leaves, carrying the charm's emblem in ink. Radius ~16, leaves to ~23.
 */
export function drawCharmToken(d: Draw, charm: CharmId): void {
  const { pen } = d;
  const { ctx } = pen;
  const R = 16;
  const GOLD = '#d4a640';
  // Two leaves tucked behind it.
  for (const [ang, len] of [[-2.4, 23.5], [0.55, 23.5]] as const) {
    const dir = pt(Math.cos(ang), Math.sin(ang));
    const nrm = pt(-dir.y, dir.x);
    const at = (t: number, w: number): Pt => pt(dir.x * len * t + nrm.x * w, dir.y * len * t + nrm.y * w);
    const leaf = [...bezier(at(0.3, 0), at(0.62, 10), at(1, 0), 12), ...bezier(at(1, 0), at(0.62, -10), at(0.3, 0), 12).slice(1)];
    pen.fill(leaf, PAPER_FILL, 1);
    pen.fill(leaf, LEAF, 0.7);
    pen.crescent(leaf, pt(-1.5, -2), () => pen.fill(leaf, mix(LEAF, INK, 0.5), 0.45));
    pen.hair([at(0.4, 0), at(0.97, 0)], 0.6, d.ink, 0.7);
    pen.stroke(closed(leaf), 0.9, d.ink, 0.9);
  }
  // A soft drop shadow, the medallion, its gilded rim.
  pen.fill(oval(1.8, 2.6, R, R, 36), INK, 0.16);
  const disc = oval(0, 0, R, R, 40);
  pen.fill(disc, PAPER_FILL, 1);
  const inner = oval(0, 0, R - 3.6, R - 3.6, 36);
  pen.clipped(disc, () => {
    pen.fill(disc, GOLD, 0.55);
    pen.fill(inner, PAPER_FILL, 1);
    const g = ctx.createRadialGradient(-5, -6, 2, 0, 0, R);
    g.addColorStop(0, rgba(PAPER_FILL, 0));
    g.addColorStop(0.75, rgba('#e9d9b0', 0.25));
    g.addColorStop(1, rgba(mix(GOLD, INK, 0.5), 0.45));
    ctx.fillStyle = g;
    ctx.fillRect(-R, -R, R * 2, R * 2);
  });
  pen.crescent(disc, pt(-4, -6), () => pen.hatch(disc, 1.9, 0.9, 0.45, { color: d.ink, alpha: 0.45 }));
  // The emblem, large, in ink.
  paintEmblem(d, emblem(charm, 1.12), 2.3, d.ink);
  pen.hair(closed(inner), 0.7, d.ink, 0.6);
  pen.stroke(closed(oval(0, 0, R, R, 36)), 1.4, d.ink, 1);
  pen.hair(bezier(pt(-11.5, -4.5), pt(-10, -10), pt(-4.5, -12.5), 6), 1.2, PAPER_FILL, 0.85);
}

/** Splash frame size: a pop's splat is drawn centred in it. */
export const SPLASH_FRAME = 72;

/**
 * A splat of the marble's paint for a pop: a blot with flung arms and
 * droplets, radius ~28, its edge pooled darker as wet paint dries. The
 * shape is fixed per colour, so only the line boils between frames.
 */
export function drawSplash(d: Draw, colour: ColourId): void {
  const { pen } = d;
  const wash = COLOUR_WASH[colour];
  const deep = mix(wash, INK, 0.45);
  const rng = createRng(4100 + COLOURS.indexOf(colour) * 37);
  // The blot: a lumpy disc with a few arms flung out.
  const arms = Array.from({ length: 8 }, (_, i) => ({ at: ((i + rng() * 0.7) / 8) * TAU, reach: 2.5 + rng() * 7, width: 0.1 + rng() * 0.1 }));
  const n = 64;
  const blot = Array.from({ length: n }, (_, i) => {
    const ang = (i / n) * TAU;
    let r = 14 + Math.sin(ang * 3 + 1.3) * 1.4 + Math.sin(ang * 5 + 0.4) * 1.1 + Math.sin(ang * 11) * 0.5;
    for (const a of arms) {
      const da = Math.atan2(Math.sin(ang - a.at), Math.cos(ang - a.at));
      r += a.reach * Math.exp(-((da / a.width) ** 2));
    }
    return pt(Math.cos(ang) * r, Math.sin(ang) * r);
  });
  pen.fill(blot, wash, 0.85);
  pen.clipped(blot, () => {
    // A paler bloom in the middle, the pigment pooled at the edge.
    pen.fill(blot.map((p) => pt(p.x * 0.5 - 2, p.y * 0.5 - 2.5)), mix(wash, '#ffffff', 0.35), 0.4);
    pen.stroke(closed(blot), 3, deep, 0.45, false);
  });
  // Droplets: a bead at the end of each arm, and a scatter beyond.
  for (const a of arms) {
    const r = Math.min(30, 14 + a.reach + 3.5 + rng() * 3);
    const s = 1.4 + rng() * 1.8;
    const p = pt(Math.cos(a.at) * r, Math.sin(a.at) * r);
    pen.fill(oval(p.x, p.y, s, s, 12), wash, 0.9);
    pen.hair(closed(oval(p.x, p.y, s, s, 12)), 0.45, deep, 0.6);
  }
  for (let i = 0; i < 9; i++) {
    const ang = rng() * TAU;
    const r = 21 + rng() * 10;
    const s = 0.7 + rng() * 1.3;
    pen.fill(oval(Math.cos(ang) * r, Math.sin(ang) * r, s, s, 10), wash, 0.85);
  }
  pen.stroke(closed(blot), 0.9, d.ink, 0.7);
}
