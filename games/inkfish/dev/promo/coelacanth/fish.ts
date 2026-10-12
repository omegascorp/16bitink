import { halo } from '../../../src/art/glowArt';
import { Pen } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import {
  ANAL, BODY, BOTTOM, caudal, cubic, DORSAL2, dorsal1, EYE, GILL, JAW, type Lobe, lobeShape, middleLobe, MOUTH, PECTORAL, PELVIC, type Pt, pt, TOP,
} from './shape';
import type { FishPose } from './story';

/**
 * The coelacanth, drawn as ink paths so it stays crisp at any size and its
 * fins can move: deep steel-blue with white blotches, heavy scales, four
 * fleshy lobed fins that paddle in alternating diagonal pairs (near
 * pectoral with far pelvic, like a walking animal), the second dorsal and
 * anal fins sculling together, and the three-lobed tail. The same drawing
 * in stone colours is the fossil (skeleton.ts adds its bones).
 */
export interface Palette {
  readonly body: string;
  readonly back: string;
  readonly belly: string;
  readonly fin: string;
  readonly membrane: string;
  readonly blotch: string;
  readonly blotchAlpha: number;
  readonly ink: string;
  readonly rim: string;
  readonly rimAlpha: number;
  readonly iris: string;
  readonly scaleAlpha: number;
  /** The light on its upper flank. */
  readonly sheen: number;
}

export const LIVING: Palette = {
  body: '#2c5d92', back: '#1a375c', belly: '#3b6da2', fin: '#2d6097', membrane: '#4f82b8', blotch: '#eef3f2', blotchAlpha: 0.92,
  ink: '#081120', rim: '#cfe4f7', rimAlpha: 0.6, iris: '#d6e57c', scaleAlpha: 0.5, sheen: 0.3,
};
export const STONE: Palette = {
  body: '#7a6f5f', back: '#5e5446', belly: '#857a69', fin: '#776c5c', membrane: '#93876f', blotch: '#958a77', blotchAlpha: 0.45,
  ink: '#2b241c', rim: '#b9ad95', rimAlpha: 0.3, iris: '#4a4136', scaleAlpha: 0.4, sheen: 0.08,
};
export const FOSSIL_INK: Palette = {
  body: '#51483b', back: '#463e33', belly: '#584e40', fin: '#51483b', membrane: '#5e5345', blotch: '#5c5244', blotchAlpha: 0.3,
  ink: '#1e1914', rim: '#8a7f6b', rimAlpha: 0.22, iris: '#2e2822', scaleAlpha: 0.32, sheen: 0,
};
export const SHADOW: Palette = {
  body: '#142a46', back: '#0b1830', belly: '#1a3354', fin: '#142c4a', membrane: '#24446a', blotch: '#7890aa', blotchAlpha: 0.55,
  ink: '#02050b', rim: '#5a7aa2', rimAlpha: 0.45, iris: '#e6f29a', scaleAlpha: 0.25, sheen: 0.1,
};

const hex = (c: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) as [number, number, number];
const toHex = (v: readonly number[]): string => `#${v.map((x) => Math.round(x).toString(16).padStart(2, '0')).join('')}`;
export const mixColour = (a: string, b: string, u: number): string => toHex(hex(a).map((x, i) => x + (hex(b)[i]! - x) * u));

/** Palette a blended towards b. */
export function mixPalette(a: Palette, b: Palette, u: number): Palette {
  const out: Record<string, string | number> = {};
  for (const key of Object.keys(a) as (keyof Palette)[]) {
    const [x, y] = [a[key], b[key]];
    out[key] = typeof x === 'number' ? x + ((y as number) - x) * u : mixColour(x, y as string, u);
  }
  return out as unknown as Palette;
}

export interface FishLook {
  readonly palette: Palette;
  readonly boil: number;
  /** Which fish: each has its own line wobble. */
  readonly seed: number;
  readonly facing?: 1 | -1;
  /** Its eyes catching the light in the dark, 0 .. 1. */
  readonly eyeGlow?: number;
}

/** White blotches, fixed for the species, in fish units. */
const BLOTCHES = (() => {
  const rng = createRng(1938);
  return Array.from({ length: 30 }, () => {
    const x = -400 + rng() * 760;
    const top = TOP.find((p) => p.x <= x)?.y ?? -100;
    const bottom = BOTTOM.find((p) => p.x <= x)?.y ?? 100;
    const y = top + 22 + rng() * (bottom - top - 44);
    const r = 9 + rng() * 17;
    const wob = Array.from({ length: 9 }, () => 0.7 + rng() * 0.5);
    return wob.map((k, i) => pt(x + Math.cos((i / 9) * Math.PI * 2) * r * 1.35 * k, y + Math.sin((i / 9) * Math.PI * 2) * r * k));
  });
})();

/** Bends a point with the body: the tail end swings up (bend > 0) or down. */
const bender = (bend: number) => (p: Pt): Pt => {
  const back = Math.max(0, Math.min(1, (60 - p.x) / 580));
  return pt(p.x, p.y - bend * 300 * back * back);
};

function fillPath(ctx: CanvasRenderingContext2D, pts: readonly Pt[], colour: string | CanvasGradient, alpha = 1): void {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = colour;
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function clipTo(ctx: CanvasRenderingContext2D, pts: readonly Pt[]): void {
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();
}

/** Runs `draw` in the fish's own units, placed by its pose. */
export function inFishSpace(ctx: CanvasRenderingContext2D, pose: FishPose, facing: 1 | -1, draw: () => void): void {
  const s = pose.length / 1000;
  ctx.save();
  ctx.translate(pose.x, pose.y);
  ctx.rotate(pose.angle * facing);
  ctx.scale(s * facing, s);
  draw();
  ctx.restore();
}

/** A fan of rays with a membrane between them. */
function drawFan(ctx: CanvasRenderingContext2D, pen: Pen, shape: readonly Pt[], rays: readonly [Pt, Pt][], p: Palette, far: boolean): void {
  fillPath(ctx, shape, far ? mixColour(p.membrane, p.back, 0.5) : p.membrane, 0.88);
  for (const [a, b] of rays) pen.hair([a, pt((a.x + b.x) / 2, (a.y + b.y) / 2), b], 2.2, p.ink, far ? 0.4 : 0.6);
  pen.stroke([...shape, shape[0]!], 3.4, p.ink, 1, false);
}

/** A lobed fin: its fan, then its fleshy stalk with a couple of scale rows. */
function drawLobe(ctx: CanvasRenderingContext2D, pen: Pen, lobe: Lobe, angle: number, curl: number, p: Palette, warp: (q: Pt) => Pt, far: boolean): void {
  const s = lobeShape({ ...lobe, angle }, curl);
  drawFan(ctx, pen, s.fan.map(warp), s.rays.map(([a, b]): [Pt, Pt] => [warp(a), warp(b)]), p, far);
  const stalk = s.stalk.map(warp);
  fillPath(ctx, stalk, far ? mixColour(p.fin, p.back, 0.6) : p.fin);
  ctx.save();
  clipTo(ctx, stalk);
  const d = pt(Math.cos(angle), Math.sin(angle));
  for (const f of [0.3, 0.55, 0.8]) {
    const c = pt(lobe.root.x + d.x * lobe.stalk * f, lobe.root.y + d.y * lobe.stalk * f);
    const n = pt(-d.y, d.x);
    pen.hair(cubic(pt(c.x + n.x * lobe.width, c.y + n.y * lobe.width), pt(c.x + d.x * 14, c.y + d.y * 14), pt(c.x + d.x * 14, c.y + d.y * 14), pt(c.x - n.x * lobe.width, c.y - n.y * lobe.width), 6).map(warp), 1.6, p.ink, 0.3);
  }
  if (!far) {
    for (const [f, side, r] of [[0.3, 0.3, 8], [0.62, -0.25, 6]] as const) {
      const n = pt(-d.y, d.x);
      const c = pt(lobe.root.x + d.x * lobe.stalk * f + n.x * lobe.width * side, lobe.root.y + d.y * lobe.stalk * f + n.y * lobe.width * side);
      fillPath(ctx, [0, 1, 2, 3, 4, 5, 6].map((i) => warp(pt(c.x + Math.cos(i * 0.9) * r * 1.2, c.y + Math.sin(i * 0.9) * r))), p.blotch, p.blotchAlpha * 0.85);
    }
  }
  ctx.restore();
  pen.stroke([...stalk, stalk[0]!], 4, p.ink, 1, false);
}

/** Heavy scales in staggered rows: each one's exposed back edge, with the bumps of its armour. */
function drawScales(ctx: CanvasRenderingContext2D, pen: Pen, p: Palette, warp: (q: Pt) => Pt): void {
  const r = 21;
  for (let row = 0, y = -175; y <= 175; y += 29, row++) {
    for (let x = 262 - (row % 2) * 17; x > -450; x -= 34) {
      const arc = [0, 1, 2, 3, 4, 5, 6].map((i) => {
        const a = Math.PI / 2 + (i / 6) * Math.PI;
        return warp(pt(x + Math.cos(a) * r * 0.75, y + Math.sin(a) * r * 0.8));
      });
      pen.hair(arc, 2, p.ink, p.scaleAlpha);
      pen.hair(arc.slice(1, 6).map((q) => pt(q.x + 3, q.y)), 1.6, p.rim, p.scaleAlpha * 0.35);
      ctx.fillStyle = p.ink;
      ctx.globalAlpha = p.scaleAlpha * 0.6;
      const c = warp(pt(x - 4, y - 3));
      ctx.fillRect(c.x, c.y, 2.6, 2.6);
      ctx.globalAlpha = 1;
    }
  }
}

function drawEye(ctx: CanvasRenderingContext2D, pen: Pen, p: Palette, glow: number): void {
  const { x, y, r } = EYE;
  fillPath(ctx, cubic(pt(x + r * 1.3, y), pt(x + r * 1.3, y - r * 1.4), pt(x - r * 1.3, y - r * 1.4), pt(x - r * 1.3, y), 8)
    .concat(cubic(pt(x - r * 1.3, y), pt(x - r * 1.3, y + r * 1.4), pt(x + r * 1.3, y + r * 1.4), pt(x + r * 1.3, y), 8)), p.back);
  const iris = ctx.createRadialGradient(x - 6, y - 6, 2, x, y, r);
  iris.addColorStop(0, mixColour(p.iris, '#ffffff', 0.35));
  iris.addColorStop(1, mixColour(p.iris, p.back, 0.5));
  ctx.fillStyle = iris;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = p.ink;
  ctx.beginPath();
  ctx.arc(x + 3, y + 1, r * 0.5, 0, Math.PI * 2);
  ctx.fill();
  pen.circle(x, y, r, 3.2, p.ink);
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.arc(x - r * 0.35, y - r * 0.4, r * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  if (glow > 0) {
    halo(ctx, x + 2, y, r * 4.5, p.iris, 0.5 * glow);
    halo(ctx, x + 2, y, r * 1.6, '#f4ffd0', 0.8 * glow);
  }
}

/** The fish at its pose (on screen), paddling. */
export function drawCoelacanth(ctx: CanvasRenderingContext2D, pose: FishPose, look: FishLook): void {
  const p = look.palette;
  const facing = look.facing ?? 1;
  const pen = (k: number): Pen => new Pen(ctx, look.seed * 7919 + look.boil * 977 + k * 131, 2.4);
  const warp = bender(pose.bend);
  const e = pose.effort;
  const ph = pose.paddle;
  const sweep = 0.5 * e * Math.sin(ph * 0.5 + 0.6);
  inFishSpace(ctx, pose, facing, () => {
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    // Far side: the other pectoral and pelvic fins, half hidden, a stroke apart from the near ones.
    drawLobe(ctx, pen(1), { ...PECTORAL, root: pt(PECTORAL.root.x + 14, PECTORAL.root.y - 16) }, PECTORAL.angle + 0.5 * e * Math.sin(ph + Math.PI) - 0.15, -0.4 * e * Math.cos(ph + Math.PI), p, warp, true);
    drawLobe(ctx, pen(2), { ...PELVIC, root: pt(PELVIC.root.x + 14, PELVIC.root.y - 14) }, PELVIC.angle + 0.45 * e * Math.sin(ph) - 0.15, -0.4 * e * Math.cos(ph), p, warp, true);
    // The fins along the middle line.
    const scull = Math.sin(ph + Math.PI / 2);
    drawLobe(ctx, pen(3), DORSAL2, DORSAL2.angle + 0.38 * e * scull, 0.35 * e * Math.cos(ph + Math.PI / 2), p, warp, false);
    drawLobe(ctx, pen(4), ANAL, ANAL.angle - 0.38 * e * scull, -0.35 * e * Math.cos(ph + Math.PI / 2), p, warp, false);
    const d1 = dorsal1(6 * e * Math.sin(ph * 0.5));
    drawFan(ctx, pen(5), d1.shape.map(warp), d1.rays.map(([a, b]): [Pt, Pt] => [warp(a), warp(b)]), p, false);
    for (const side of [-1, 1] as const) {
      const lobe = caudal(side, sweep * side);
      drawFan(ctx, pen(6 + side), lobe.shape.map(warp), lobe.rays.map(([a, b]): [Pt, Pt] => [warp(a), warp(b)]), p, false);
    }
    const mid = middleLobe(sweep);
    drawFan(ctx, pen(9), mid.shape.map(warp), mid.rays.map(([a, b]): [Pt, Pt] => [warp(a), warp(b)]), p, false);

    // The body: dark back, lit flank, a hatched belly in shadow.
    const body = BODY.map(warp);
    const shade = ctx.createLinearGradient(0, -170, 0, 170);
    shade.addColorStop(0, p.back);
    shade.addColorStop(0.45, p.body);
    shade.addColorStop(1, p.belly);
    fillPath(ctx, body, shade);
    ctx.save();
    clipTo(ctx, body);
    if (p.sheen > 0) {
      const sheen = ctx.createRadialGradient(170, -90, 10, 170, -90, 420);
      sheen.addColorStop(0, `rgba(170,215,255,${p.sheen})`);
      sheen.addColorStop(1, 'rgba(170,215,255,0)');
      ctx.fillStyle = sheen;
      ctx.fillRect(-500, -200, 1000, 400);
    }
    const pb = pen(10);
    for (const blob of BLOTCHES) {
      const b = blob.map(warp);
      fillPath(ctx, b, p.blotch, p.blotchAlpha);
      pb.hair([...b, b[0]!], 1.6, p.ink, 0.35);
    }
    drawScales(ctx, pen(11), p, warp);
    pen(12).hatch(BOTTOM.map(warp).concat([pt(-440, 60), pt(400, 60)].map(warp)), 13, 0.9, 1.6, { color: p.ink, alpha: 0.28 });
    // The lateral line, and the shadow behind the gill cover.
    pen(13).hair(cubic(pt(256, -46), pt(100, -54), pt(-200, -32), pt(-436, -4), 16).map(warp), 2.4, p.rim, 0.4);
    fillPath(ctx, [...GILL, ...cubic(pt(296, 128), pt(250, 100), pt(214, 40), pt(230, -70), 8), pt(262, -140)].map(warp), p.back, 0.55);
    // The head's bony plates.
    const ph2 = pen(14);
    ph2.hair(cubic(pt(450, -66), pt(400, -88), pt(340, -110), pt(282, -132), 8), 2, p.ink, 0.5);
    ph2.hair(cubic(pt(432, 8), pt(392, 12), pt(338, 4), pt(300, -30), 8), 2, p.ink, 0.45);
    ph2.hair(cubic(pt(330, 16), pt(326, 50), pt(310, 84), pt(290, 110), 8), 2, p.ink, 0.45);
    ctx.restore();
    const po = pen(15);
    po.stroke(GILL.map(warp), 4.2, p.ink, 1, false);
    po.stroke(MOUTH.map(warp), 4.6, p.ink, 1, false);
    po.hair(JAW.map(warp), 2.6, p.ink, 0.8);
    drawEye(ctx, pen(16), p, look.eyeGlow ?? 0);
    // Outline, and the light catching its back.
    pen(17).stroke([...body, body[0]!], 6.5, p.ink, 1, true);
    pen(18).hair(TOP.slice(2, -4).map((q) => warp(pt(q.x, q.y + 9))), 3.2, p.rim, p.rimAlpha);

    // Near side: pelvic and pectoral, in front of the body.
    drawLobe(ctx, pen(19), PELVIC, PELVIC.angle + 0.45 * e * Math.sin(ph + Math.PI), -0.4 * e * Math.cos(ph + Math.PI), p, warp, false);
    drawLobe(ctx, pen(20), PECTORAL, PECTORAL.angle + 0.5 * e * Math.sin(ph), -0.4 * e * Math.cos(ph), p, warp, false);
  });
}

/** The body outline on screen, for clipping the fossil's rock round it. */
export function bodyOnScreen(pose: FishPose, facing: 1 | -1 = 1): Pt[] {
  const s = pose.length / 1000;
  const [c, sn] = [Math.cos(pose.angle * facing), Math.sin(pose.angle * facing)];
  return BODY.map(bender(pose.bend)).map((q) => {
    const x = q.x * s * facing;
    const y = q.y * s;
    return pt(pose.x + x * c - y * sn, pose.y + x * sn + y * c);
  });
}
