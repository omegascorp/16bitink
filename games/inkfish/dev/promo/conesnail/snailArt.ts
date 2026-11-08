import { ellipse, INK, makeCanvas, Pen, type Pt } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { createRng } from '../../../src/logic/rng';
import { EYE_R, EYE_ROOTS, GROUND_Y, SHELL, SIPHON_ROOT, SIPHON_TIP, STALK_LEN } from './shape';
import type { EyesNow } from './story';

/**
 * The geographic cone snail in the game's pen and ink, painted rather than
 * doodled: a cream shell washed with tan bands, covered in the brown
 * "map" net of little white tents and dark blotches, shaded and hatched on
 * its underside, with a low, knobbly spire; the pale mottled foot and the
 * banded siphon. Baked once per boil frame (everything that doesn't move);
 * the eyes on their stalks are drawn live, so they can narrow, stare and
 * follow things.
 *
 * Everything here is in snail px (sp); the caller sets up the transform.
 */

const RES = 2.4;
const BOX = { x0: -252, y0: -132, w: 524, h: 276 } as const;

const CREAM = '#f1e5ca';
const TAN = '#c79a68';
const BROWN = '#94532a';
const DARK_BROWN = '#5e2f15';
export const FLESH = '#d9c0b2';
const FLESH_DEEP = '#a7806f';
const MOTTLE = '#7d4c3a';
const HOLE = '#24101a';

const lerp = (a: number, b: number, u: number): number => a + (b - a) * u;
const quad = (a: Pt, c: Pt, b: Pt, n: number): Pt[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const u = i / n;
    return { x: (1 - u) ** 2 * a.x + 2 * u * (1 - u) * c.x + u * u * b.x, y: (1 - u) ** 2 * a.y + 2 * u * (1 - u) * c.y + u * u * b.y };
  });

/** A closed lumpy blob. */
function blob(cx: number, cy: number, rx: number, ry: number, rng: () => number, n = 20): Pt[] {
  const ph = [rng() * 6, rng() * 6];
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + 0.16 * Math.sin(a * 3 + ph[0]!) + 0.09 * Math.sin(a * 5 + ph[1]!);
    return { x: cx + Math.cos(a) * rx * k, y: cy + Math.sin(a) * ry * k };
  });
}

/** A tube round a centre line, `w0` wide at its start tapering to `w1`, as a closed outline. */
function tube(line: readonly Pt[], w0: number, w1: number): Pt[] {
  const left: Pt[] = [];
  const right: Pt[] = [];
  line.forEach((p, i) => {
    const a = line[Math.max(0, i - 1)]!;
    const b = line[Math.min(line.length - 1, i + 1)]!;
    const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const w = lerp(w0, w1, i / (line.length - 1)) / 2;
    left.push({ x: p.x - ((b.y - a.y) / d) * w, y: p.y + ((b.x - a.x) / d) * w });
    right.push({ x: p.x + ((b.y - a.y) / d) * w, y: p.y - ((b.x - a.x) / d) * w });
  });
  return [...left, ...right.reverse()];
}

// ---------------------------------------------------------------- the shell's outline

/** The body whorl's top and bottom edge at x (from the shoulder to the front). */
const whorlTop = (x: number): number => {
  const u = (x - SHELL.shoulder) / (SHELL.tip - SHELL.shoulder);
  return lerp(SHELL.top, SHELL.tipTop, u) - 9 * Math.sin(Math.PI * u);
};
const whorlBottom = (x: number): number => {
  const u = (x - SHELL.shoulder) / (SHELL.tip - SHELL.shoulder);
  return lerp(SHELL.bottom, SHELL.tipBottom, u) + 8 * Math.sin(Math.PI * u);
};
/** The spire's half-height at v (0 shoulder .. 1 apex): low, slightly concave, crowned with knobs. */
const spireHalf = (v: number, top: boolean): number => {
  const span = top ? SHELL.axis - SHELL.top : SHELL.bottom - SHELL.axis;
  const knobs = 5 * Math.abs(Math.sin(v * Math.PI * 4.5)) * (1 - v);
  return span * (1 - v) ** 1.35 + knobs;
};

export function shellOutline(): Pt[] {
  const n = 40;
  const top = Array.from({ length: n + 1 }, (_, i) => {
    const x = lerp(SHELL.shoulder, SHELL.tip, i / n);
    return { x, y: whorlTop(x) };
  });
  const midY = (SHELL.tipTop + SHELL.tipBottom) / 2;
  const half = (SHELL.tipBottom - SHELL.tipTop) / 2;
  const cap = Array.from({ length: 11 }, (_, i) => {
    const a = -Math.PI / 2 + (i / 10) * Math.PI;
    return { x: SHELL.tip + 14 * Math.cos(a), y: midY + half * Math.sin(a) };
  });
  const bottom = Array.from({ length: n + 1 }, (_, i) => {
    const x = lerp(SHELL.tip, SHELL.shoulder, i / n);
    return { x, y: whorlBottom(x) };
  });
  const spireLow = Array.from({ length: 21 }, (_, i) => {
    const v = i / 20;
    return { x: lerp(SHELL.shoulder, SHELL.apex, v), y: SHELL.axis + spireHalf(v, false) };
  });
  const spireHigh = Array.from({ length: 21 }, (_, i) => {
    const v = 1 - i / 20;
    return { x: lerp(SHELL.shoulder, SHELL.apex, v), y: SHELL.axis - spireHalf(v, true) };
  });
  return [...top, ...cap, ...bottom, ...spireLow, ...spireHigh];
}

/** The body whorl alone (shoulder to front), for its pattern. */
function whorlOutline(): Pt[] {
  return shellOutline().filter((p) => p.x >= SHELL.shoulder - 0.5);
}

// ---------------------------------------------------------------- the foot, head and siphon

const FOOT: readonly Pt[] = [
  { x: -150, y: 76 }, { x: -158, y: 100 }, { x: -150, y: GROUND_Y - 2 }, { x: -60, y: GROUND_Y }, { x: 60, y: GROUND_Y + 1 }, { x: 180, y: GROUND_Y },
  { x: 232, y: GROUND_Y - 2 }, { x: 256, y: 106 }, { x: 262, y: 90 }, { x: 252, y: 70 }, { x: 232, y: 56 }, { x: 204, y: 52 }, { x: 170, y: 40 }, { x: 60, y: 60 },
];

function drawFoot(pen: Pen, ctx: CanvasRenderingContext2D, rng: () => number): void {
  // Its shadow on the sand.
  const shade = ctx.createRadialGradient(40, GROUND_Y + 4, 20, 40, GROUND_Y + 4, 300);
  shade.addColorStop(0, 'rgba(20,12,16,0.5)');
  shade.addColorStop(1, 'rgba(20,12,16,0)');
  ctx.save();
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.ellipse(40, GROUND_Y + 6, 300, 24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  pen.fill(FOOT, FLESH, 1);
  pen.clipped(FOOT, () => {
    const g = ctx.createLinearGradient(0, 50, 0, GROUND_Y);
    g.addColorStop(0, 'rgba(255,240,232,0.35)');
    g.addColorStop(0.5, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(70,40,40,0.45)');
    ctx.fillStyle = g;
    ctx.fillRect(-200, 30, 500, 120);
    // Mottling: red-brown patches and specks.
    for (let i = 0; i < 46; i++) {
      const x = -150 + rng() * 410;
      const y = 50 + rng() * 70;
      pen.fill(blob(x, y, 4 + rng() * 9, 3 + rng() * 5, rng, 12), MOTTLE, 0.28 + rng() * 0.25);
    }
    pen.stipple(FOOT, 900, (_x, y) => 0.25 + 0.6 * ((y - 50) / 70), 0.7, MOTTLE);
  });
  // The sole's rippling lip.
  pen.hair(Array.from({ length: 30 }, (_, i) => ({ x: -146 + i * 13, y: GROUND_Y - 7 + 2 * Math.sin(i * 1.3) })), 0.9, FLESH_DEEP, 0.7);
  pen.closed([...FOOT], 2.1);
}

function drawSiphon(pen: Pen, ctx: CanvasRenderingContext2D): void {
  const line = quad(SIPHON_ROOT, { x: 184, y: -62 }, SIPHON_TIP, 16);
  const shape = tube(line, 26, 19);
  pen.fill(shape, FLESH, 1);
  pen.clipped(shape, () => {
    const g = ctx.createLinearGradient(170, -80, 220, -40);
    g.addColorStop(0, 'rgba(255,240,232,0.35)');
    g.addColorStop(1, 'rgba(70,40,40,0.4)');
    ctx.fillStyle = g;
    ctx.fillRect(140, -110, 120, 120);
    // Dark bands round the tube.
    for (const k of [3, 6, 9, 12]) {
      const p = line[k]!;
      const q = line[k + 1]!;
      const d = Math.hypot(q.x - p.x, q.y - p.y) || 1;
      const n = { x: -(q.y - p.y) / d, y: (q.x - p.x) / d };
      pen.stroke([{ x: p.x + n.x * 14, y: p.y + n.y * 14 }, { x: p.x - n.x * 14, y: p.y - n.y * 14 }], 3.2, MOTTLE, 0.55, false);
    }
  });
  pen.closed(shape, 1.8);
  // The open tip.
  const end = line[line.length - 1]!;
  const before = line[line.length - 3]!;
  const a = Math.atan2(end.y - before.y, end.x - before.x);
  ctx.save();
  ctx.translate(end.x, end.y);
  ctx.rotate(a);
  const lip = ellipse(0, 0, 4.5, 10, 16);
  pen.fill(lip, HOLE, 1);
  pen.closed(lip, 1.6);
  ctx.restore();
}

// ---------------------------------------------------------------- the shell

/** `count` tries at little cream tents edged in brown over the body whorl; `keep` is the chance one outside the bands stays. */
function tents(pen: Pen, rng: () => number, count: number, keep: number): void {
  for (let i = 0; i < count; i++) {
    const x = lerp(SHELL.shoulder + 4, SHELL.tip + 6, rng());
    const top = whorlTop(Math.min(x, SHELL.tip));
    const bottom = whorlBottom(Math.min(x, SHELL.tip));
    const v = rng() * 2 - 1;
    const inBand = Math.min(Math.abs(v + 0.42) / 0.3, Math.abs(v - 0.38) / 0.34) < 1;
    const size = rng();
    if (!inBand && rng() > keep) continue;
    const y = (top + bottom) / 2 + ((bottom - top) / 2) * v;
    const s = (4.5 + size * 6) * (0.55 + 0.45 * ((bottom - top) / 186));
    const tent = [{ x: x - s, y: y + s * 0.55 }, { x: x + s * 0.1, y: y - s * 0.75 }, { x: x + s, y: y + s * 0.5 }];
    pen.fill(tent, '#fbf2dc', 0.95);
    pen.hair([...tent, tent[0]!], 0.85, BROWN, 0.8);
  }
}

function drawShell(pen: Pen, ctx: CanvasRenderingContext2D, rng: () => number): void {
  const outline = shellOutline();
  const whorl = whorlOutline();
  // The mantle's fleshy edge, peeking out under the shell's lip.
  const lip = Array.from({ length: 24 }, (_, i) => {
    const x = lerp(SHELL.shoulder + 10, SHELL.tip - 6, i / 23);
    return { x, y: whorlBottom(x) + 3 };
  });
  pen.stroke(lip, 12, '#b88e7e', 1, false);
  pen.hair(lip.map((p) => ({ x: p.x, y: p.y + 6 })), 1, FLESH_DEEP, 0.8);
  pen.fill(outline, CREAM, 1);

  pen.clipped(whorl, () => {
    // Two broad tan bands, soft-edged, where the net is densest.
    for (const [v, w] of [[-0.42, 0.34], [0.38, 0.4]] as const) {
      for (let k = 0; k < 3; k++) {
        const band = Array.from({ length: 30 }, (_, i) => {
          const x = lerp(SHELL.shoulder - 10, SHELL.tip + 20, i / 29);
          const mid = (whorlTop(Math.min(x, SHELL.tip)) + whorlBottom(Math.min(x, SHELL.tip))) / 2;
          const half = (whorlBottom(Math.min(x, SHELL.tip)) - whorlTop(Math.min(x, SHELL.tip))) / 2;
          return { x, y: mid + half * (v - w * (0.55 + k * 0.2) / 2) + 4 * Math.sin(i * 0.9 + k) };
        });
        const back = band.map((p, i) => ({ x: p.x, y: p.y + ((whorlBottom(Math.min(p.x, SHELL.tip)) - whorlTop(Math.min(p.x, SHELL.tip))) / 2) * w * (0.55 + k * 0.2) + 3 * Math.cos(i * 1.1) }));
        pen.fill([...band, ...back.reverse()], TAN, 0.36);
      }
    }
    // The tented net: little cream triangles edged in brown, packed tighter in the bands.
    tents(pen, rng, 1100, 0.45);
    // Big brown blotches, darker at the heart, breaking up the net.
    for (let i = 0; i < 26; i++) {
      const x = lerp(SHELL.shoulder + 6, SHELL.tip - 4, rng() ** 0.85);
      const top = whorlTop(x);
      const bottom = whorlBottom(x);
      const scale = (bottom - top) / 186;
      const v = i % 2 ? -0.42 + (rng() - 0.5) * 0.5 : 0.38 + (rng() - 0.5) * 0.6;
      const y = (top + bottom) / 2 + ((bottom - top) / 2) * v;
      const rx = (16 + rng() * 22) * (0.5 + 0.5 * scale);
      const spot = blob(x, y, rx, rx * (0.55 + rng() * 0.4), rng);
      pen.fill(spot, BROWN, 0.86);
      pen.fill(blob(x + rx * 0.15, y + rx * 0.1, rx * 0.5, rx * 0.3, rng), DARK_BROWN, 0.45);
      pen.hair([...spot, spot[0]!], 0.7, DARK_BROWN, 0.55);
    }
    // A few tents showing through the blotches.
    tents(pen, rng, 260, 1);
    // Fine growth lines running round the shell.
    for (let x = SHELL.shoulder + 14; x < SHELL.tip; x += 15) {
      pen.hair(quad({ x, y: whorlTop(x) - 4 }, { x: x + 7, y: (whorlTop(x) + whorlBottom(x)) / 2 }, { x, y: whorlBottom(x) + 4 }, 8), 0.45, DARK_BROWN, 0.2);
    }
  });

  // Rounded: a sheen along the top, the underside in shadow and hatched.
  pen.clipped(outline, () => {
    const g = ctx.createLinearGradient(0, SHELL.top, 0, SHELL.bottom);
    g.addColorStop(0, 'rgba(255,250,236,0.1)');
    g.addColorStop(0.17, 'rgba(255,250,236,0.6)');
    g.addColorStop(0.32, 'rgba(255,250,236,0.08)');
    g.addColorStop(0.6, 'rgba(40,20,10,0)');
    g.addColorStop(1, 'rgba(40,20,10,0.62)');
    ctx.fillStyle = g;
    ctx.fillRect(BOX.x0, SHELL.top - 10, BOX.w, SHELL.bottom - SHELL.top + 20);
    pen.hatch(outline, 7, 0.95, 0.6, { onlyBelow: 30, alpha: 0.28 });
    pen.hatch(outline, 9, -0.6, 0.5, { onlyBelow: 60, alpha: 0.2 });
  });

  // The spire's whorls and the knobbly shoulder.
  const shoulder = quad({ x: SHELL.shoulder, y: SHELL.top + 2 }, { x: SHELL.shoulder + 16, y: SHELL.axis }, { x: SHELL.shoulder, y: SHELL.bottom - 2 }, 14);
  pen.stroke(shoulder, 1.4, DARK_BROWN, 0.75);
  for (let k = 0; k < 9; k++) {
    const p = shoulder[1 + k + Math.floor(k / 2)] ?? shoulder[k]!;
    pen.fill(ellipse(p.x + 2, p.y, 3.5, 5, 10), '#fff6e2', 0.85);
    pen.hair(Array.from({ length: 6 }, (_, i) => ({ x: p.x + 2 + 3.5 * Math.cos(-0.6 + i * 0.5), y: p.y + 5 * Math.sin(-0.6 + i * 0.5) })), 0.5, INK, 0.5);
  }
  for (const v of [0.24, 0.48, 0.7, 0.86]) {
    const x = lerp(SHELL.shoulder, SHELL.apex, v);
    const up = SHELL.axis - spireHalf(v, true);
    const down = SHELL.axis + spireHalf(v, false);
    pen.stroke(quad({ x, y: up }, { x: x + 10 * (1 - v), y: SHELL.axis }, { x, y: down }, 10), 0.9, DARK_BROWN, 0.6, false);
    for (let i = 0; i < 4; i++) pen.dot(x + 4, lerp(up, down, 0.2 + i * 0.2), 2.4, BROWN, 0.6);
  }
  pen.closed(outline, 2.5);
}

// ---------------------------------------------------------------- the baked snail

export interface SnailSprites {
  readonly frames: readonly HTMLCanvasElement[];
}

export function makeSnailSprites(): SnailSprites {
  const frames = Array.from({ length: BOIL_FRAMES }, (_, f) => {
    const { canvas, ctx } = makeCanvas(Math.ceil(BOX.w * RES), Math.ceil(BOX.h * RES));
    ctx.scale(RES, RES);
    ctx.translate(-BOX.x0, -BOX.y0);
    // The same pattern on every frame (fixed layout); only the pen's wobble boils.
    const pen = new Pen(ctx, 431 + f * 977, 0.5);
    drawFoot(pen, ctx, createRng(17));
    drawSiphon(pen, ctx);
    ctx.save();
    // The shell lies a little nose-down on the foot.
    ctx.rotate(0.04);
    drawShell(pen, ctx, createRng(29));
    ctx.restore();
    return canvas;
  });
  return { frames };
}

/** Draws the baked snail with its shell's middle at the origin. */
export function drawSnailBody(ctx: CanvasRenderingContext2D, sprites: SnailSprites, boil: number): void {
  ctx.drawImage(sprites.frames[boil % sprites.frames.length]!, BOX.x0, BOX.y0, BOX.w, BOX.h);
}

// ---------------------------------------------------------------- the eyes

/** Where an eye stalk's tip is (sp), for stalk `i` (0 far, 1 near). */
export function eyeTip(i: number, eyes: EyesNow, sway: number): Pt {
  const root = EYE_ROOTS[i]!;
  const a = -1.2 + i * 0.16 + sway;
  const len = STALK_LEN * eyes.stalk * (i === 0 ? 0.92 : 1);
  return { x: root.x + Math.cos(a) * len, y: root.y + Math.sin(a) * len };
}

/** One eye on its stalk: a tapering fleshy stalk, a round eye, a pupil that looks, a lid that narrows. */
export function drawEye(ctx: CanvasRenderingContext2D, i: number, eyes: EyesNow, sway: number, boil: number): void {
  const pen = new Pen(ctx, 71 + i * 13 + boil * 977, 0.35);
  const root = EYE_ROOTS[i]!;
  const tip = eyeTip(i, eyes, sway);
  const mid = { x: (root.x + tip.x) / 2 - 4, y: (root.y + tip.y) / 2 };
  const stalk = tube(quad(root, mid, tip, 8), 13, 8);
  const r = EYE_R * (i === 0 ? 0.9 : 1);
  pen.fill(stalk, i === 0 ? FLESH_DEEP : FLESH, 1);
  pen.stroke(stalk.slice(0, 9), 1.4);
  pen.stroke(stalk.slice(9), 1.4);
  ctx.save();
  ctx.translate(tip.x, tip.y);
  const ball = ellipse(0, 0, r, r, 22);
  pen.fill(ball, '#f7f0e2', 1);
  const pupil = { x: eyes.look.x * r * 0.42, y: eyes.look.y * r * 0.42 };
  pen.fill(ellipse(pupil.x, pupil.y, r * 0.5, r * 0.55, 14), INK, 1);
  pen.fill(ellipse(pupil.x - r * 0.18, pupil.y - r * 0.2, r * 0.15, r * 0.15, 8), '#ffffff', 0.9);
  if (eyes.lid > 0.01) {
    // The lid: flesh over the top of the eye, down to a line tilted by the slant.
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r + 0.6, 0, Math.PI * 2);
    ctx.clip();
    ctx.rotate(eyes.slant);
    const edge = -r + 2 * r * eyes.lid;
    pen.fill([{ x: -r * 1.6, y: -r * 1.6 }, { x: r * 1.6, y: -r * 1.6 }, { x: r * 1.6, y: edge }, { x: -r * 1.6, y: edge }], FLESH, 1);
    pen.stroke([{ x: -r * 1.2, y: edge }, { x: r * 1.2, y: edge }], 1.7);
    ctx.restore();
  }
  pen.closed(ball, 1.6);
  ctx.restore();
}
