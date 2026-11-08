import { drawCritter } from '../../../src/art/critterArt';
import { FISH_TEX } from '../../../src/art/fish/kit';
import { INK, makeCanvas, pathOf, Pen, type Pt } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { createRng } from '../../../src/logic/rng';
import { CAPTION_FONT } from '../captions';
import { clamp01 } from '../short';
import { drawBarnacle } from './scene';
import { drawMouth, type Flaws } from './mouth';
import { PLACARD } from './labels';

/**
 * The things around the fish: what it crunches (a crab, an oyster, a clump
 * of barnacles) and the crumbs, the convict's cap and board, the dentist's
 * mirror and the sparkle, the heart bubbles, the ink hand, and the people's
 * grins.
 */

// ---------------------------------------------------------------- prey

/** The game's shore crab, baked big (one canvas per boil frame). */
const CRAB_SCALE = 3.1;
let crabFrames: HTMLCanvasElement[] | null = null;
function crabFrame(boil: number): HTMLCanvasElement {
  crabFrames ??= Array.from({ length: BOIL_FRAMES }, (_, f) => {
    const size = Math.ceil(FISH_TEX * CRAB_SCALE);
    const { canvas, ctx } = makeCanvas(size, size);
    ctx.scale(CRAB_SCALE, CRAB_SCALE);
    drawCritter(ctx, 'shorecrab', 'light', f, 40 + f);
    return canvas;
  });
  return crabFrames[boil % BOIL_FRAMES]!;
}

/** The crab clinging to the piling, until it's crunched (`gone` 0 .. 1 shrinks it into the mouth). */
export function drawCrab(ctx: CanvasRenderingContext2D, at: Pt, boil: number, gone: number, t: number): void {
  if (gone >= 1) return;
  const img = crabFrame(boil);
  const k = 1 - gone;
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(-0.5 + 0.05 * Math.sin(t * 9));
  ctx.scale(k, k);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);
  ctx.restore();
}

/** An oyster stuck to the piling: a rough, layered shell. */
export function drawOyster(ctx: CanvasRenderingContext2D, at: Pt, boil: number, gone: number): void {
  if (gone >= 1) return;
  const pen = new Pen(ctx, 810 + boil * 5, 1.2);
  const k = 1 - gone;
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(0.35);
  ctx.scale(1.5 * k, 1.5 * k);
  const rough = (rx: number, ry: number, seed: number): Pt[] =>
    Array.from({ length: 22 }, (_, i) => {
      const a = (i / 22) * Math.PI * 2;
      const wob = 1 + 0.1 * Math.sin(a * 5 + seed) + 0.06 * Math.sin(a * 11 + seed * 2);
      return { x: Math.cos(a) * rx * wob, y: Math.sin(a) * ry * wob };
    });
  const shell = rough(78, 52, 1);
  pen.fill(shell, '#8d877a', 1);
  for (const [s, c] of [[0.8, '#a8a192'], [0.6, '#bdb6a6'], [0.4, '#d3cdbd']] as const) {
    const ring = rough(78 * s, 52 * s, 1 + s);
    pen.fill(ring.map((p) => ({ x: p.x - 10 * (1 - s), y: p.y - 6 * (1 - s) })), c, 0.7);
    pen.hair([...ring, ring[0]!].map((p) => ({ x: p.x - 10 * (1 - s), y: p.y - 6 * (1 - s) })), 1.4, INK, 0.45);
  }
  pen.hair([{ x: -70, y: 10 }, { x: 0, y: 22 }, { x: 72, y: 6 }], 2.2, '#3a2d26', 0.8);
  pen.closed(shell, 3, INK);
  ctx.restore();
}

/** The clump of barnacles it scrapes off: two bites, half each. */
const CLUMP = (() => {
  const rng = createRng(3131);
  return Array.from({ length: 9 }, (_, i) => ({ x: (rng() - 0.6) * 90, y: (rng() - 0.5) * 120, r: 18 + rng() * 10, half: i % 2 }));
})();

export function drawClump(ctx: CanvasRenderingContext2D, at: Pt, boil: number, gone: readonly [number, number]): void {
  const pen = new Pen(ctx, 830 + boil * 5, 1.2);
  for (const b of CLUMP) {
    const k = 1 - gone[b.half]!;
    if (k <= 0) continue;
    drawBarnacle(pen, at.x + b.x * 1.3, at.y + b.y * 1.3, b.r * 1.4 * k, '#e2dac4');
  }
}

/** Crumbs from a crunch, flying out of the mouth and sinking: shell bits like broken crackers, never gore. */
export function drawCrumbs(ctx: CanvasRenderingContext2D, at: Pt, age: number, seed: number, colours: readonly string[], boil: number): void {
  if (age < 0 || age > 1.1) return;
  const rng = createRng(seed);
  const pen = new Pen(ctx, seed + boil * 3, 0.8);
  const fade = 1 - clamp01((age - 0.7) / 0.4);
  for (let i = 0; i < 18; i++) {
    // Out to the right and up and down, away from the piling, slowing in the water, sinking a little.
    const ang = -1.9 + rng() * 3.4;
    const speed = 380 + rng() * 520;
    const drag = 1 - Math.exp(-age * 3.2);
    const x = at.x + (Math.cos(ang) * speed * drag) / 3.2 + 60;
    const y = at.y + (Math.sin(ang) * speed * drag) / 3.2 + 120 * age * age;
    const s = 16 + rng() * 24;
    const spin = rng() * 6 + age * (rng() - 0.5) * 14;
    const corners = 4 + Math.floor(rng() * 2);
    const shape: Pt[] = Array.from({ length: corners }, (_, k) => {
      const a = spin + (k / corners) * Math.PI * 2;
      const r = s * (0.6 + rng() * 0.5);
      return { x: x + Math.cos(a) * r, y: y + Math.sin(a) * r };
    });
    ctx.save();
    ctx.globalAlpha = fade;
    pen.fill(shape, colours[i % colours.length]!, 1);
    pen.closed(shape, 1.8, INK);
    ctx.restore();
  }
  // A crunch burst: short ink strokes round the bite.
  if (age < 0.25) {
    const k = age / 0.25;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.3;
      const r0 = 70 + 70 * k;
      pen.stroke([{ x: at.x + Math.cos(a) * r0, y: at.y + Math.sin(a) * r0 }, { x: at.x + Math.cos(a) * (r0 + 40), y: at.y + Math.sin(a) * (r0 + 40) }], 4 * (1 - k) + 1, '#f4eddc', 1 - k);
    }
  }
}

export const CRAB_CRUMBS = ['#6b7a34', '#8c9a4a', '#c45a3a', '#e8dcb8'] as const;
export const OYSTER_CRUMBS = ['#8d877a', '#bdb6a6', '#e6e0d0', '#6f685c'] as const;
export const BARNACLE_CRUMBS = ['#e2dac4', '#cfc6b0', '#9a927e', '#f4eddc'] as const;

// ---------------------------------------------------------------- the convict

/** A striped convict's cap on its head (body px; `k` pops it on). */
export function drawCap(pen: Pen, k: number): void {
  if (k <= 0) return;
  const { ctx } = pen;
  const s = k * (1 + 0.25 * Math.sin(Math.PI * clamp01(k)));
  ctx.save();
  ctx.translate(310, -600);
  ctx.rotate(-0.36);
  ctx.scale(1.8 * s, 1.8 * s);
  const crown: Pt[] = [{ x: -110, y: 10 }, { x: -96, y: -70 }, { x: -40, y: -96 }, { x: 40, y: -96 }, { x: 96, y: -70 }, { x: 110, y: 10 }];
  pen.fill(crown, '#f2f0ea', 1);
  pen.clipped(crown, () => {
    for (let i = 0; i < 4; i++) pen.fill([{ x: -130, y: -96 + i * 28 }, { x: 130, y: -96 + i * 28 }, { x: 130, y: -82 + i * 28 }, { x: -130, y: -82 + i * 28 }], '#151517', 1);
  });
  pen.closed(crown, 3.4, INK);
  pen.fill([{ x: -124, y: 4 }, { x: 124, y: 4 }, { x: 118, y: 24 }, { x: -118, y: 24 }], '#151517', 1);
  pen.closed([{ x: -124, y: 4 }, { x: 124, y: 4 }, { x: 118, y: 24 }, { x: -118, y: 24 }], 3, INK);
  ctx.restore();
}

/** The mugshot board hanging on its chest: "CONVICT FISH" (body px). */
export function drawPlacard(pen: Pen, k: number): void {
  if (k <= 0) return;
  const { ctx } = pen;
  const drop = (1 - k) * -120;
  ctx.save();
  ctx.globalAlpha = clamp01(k * 2);
  ctx.translate(PLACARD.x, PLACARD.y + drop);
  ctx.rotate(-0.04);
  pen.stroke([{ x: -150, y: -70 }, { x: -60, y: -230 }], 3, '#e8e2d0', 0.9);
  pen.stroke([{ x: 150, y: -70 }, { x: 60, y: -240 }], 3, '#e8e2d0', 0.9);
  const board: Pt[] = [{ x: -210, y: -78 }, { x: 210, y: -78 }, { x: 210, y: 78 }, { x: -210, y: 78 }];
  pen.fill(board, '#1d1e21', 1);
  pen.closed(board, 4, '#0b0b0c');
  pen.stroke([{ x: -196, y: -64 }, { x: 196, y: -64 }, { x: 196, y: 64 }, { x: -196, y: 64 }, { x: -196, y: -64 }], 2, '#f4eddc', 0.5, false);
  ctx.fillStyle = '#f4eddc';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 74px ${CAPTION_FONT}`;
  ctx.fillText('CONVICT FISH', 0, 4);
  ctx.restore();
}

// ---------------------------------------------------------------- the dentist

/** A dentist's mouth mirror under its teeth, held from off the left edge (screen px). */
export function drawMirror(ctx: CanvasRenderingContext2D, at: Pt, k: number, zoom: number, boil: number): void {
  if (k <= 0) return;
  const pen = new Pen(ctx, 1500 + boil * 9, 1);
  const slide = (1 - k) * -700;
  const r = 60 * zoom;
  const c = { x: at.x + slide, y: at.y };
  const end = { x: c.x - 520, y: c.y + 150 };
  // The handle and the fingers round it.
  const nx = 0.28;
  const ny = -0.96;
  const rod = [{ x: c.x - r * 0.8, y: c.y + r * 0.2 }, end];
  pen.stroke(rod, 14, '#9aa0a6', 1, false);
  pen.stroke(rod.map((p) => ({ x: p.x + nx * 5, y: p.y + ny * 5 })), 2.5, INK, 0.9, false);
  pen.stroke(rod.map((p) => ({ x: p.x - nx * 5, y: p.y - ny * 5 })), 2.5, INK, 0.9, false);
  const grip = { x: c.x - 380, y: c.y + 108 };
  for (let i = 0; i < 3; i++) {
    const f = ellipseAt(grip.x - i * 46, grip.y + i * 12, 30, 22, 0.25);
    pen.fill(f, '#f4eddc', 1);
    pen.closed(f, 3, INK);
  }
  const thumb = ellipseAt(grip.x + 20, grip.y - 28, 40, 18, 0.28);
  pen.fill(thumb, '#f4eddc', 1);
  pen.closed(thumb, 3, INK);
  // The mirror: a steel rim, a bright face with the teeth reflected in it.
  const disc = ellipseAt(c.x, c.y, r, r * 0.8, -0.2);
  const g = ctx.createLinearGradient(c.x - r, c.y - r, c.x + r, c.y + r);
  g.addColorStop(0, '#f6fbff');
  g.addColorStop(0.5, '#a9b8c2');
  g.addColorStop(1, '#e4eef4');
  ctx.save();
  ctx.fillStyle = g;
  pathOf(ctx, disc);
  ctx.fill();
  ctx.restore();
  pen.clipped(disc, () => {
    for (let i = -1; i <= 1; i++) pen.fill(roundRect(c.x + i * r * 0.5 - r * 0.22, c.y - r * 0.5, r * 0.44, r * 0.7), '#fffdf4', 0.9);
  });
  // The steel rim.
  ctx.save();
  ctx.strokeStyle = '#7d868e';
  ctx.lineWidth = 9;
  pathOf(ctx, disc);
  ctx.stroke();
  ctx.restore();
  pen.closed(disc, 3.5, INK);
  pen.closed(ellipseAt(c.x, c.y, r + 6, r * 0.8 + 6, -0.2), 3, INK);
}

const ellipseAt = (cx: number, cy: number, rx: number, ry: number, rot: number, n = 18): Pt[] =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const x = Math.cos(a) * rx;
    const y = Math.sin(a) * ry;
    return { x: cx + x * Math.cos(rot) - y * Math.sin(rot), y: cy + x * Math.sin(rot) + y * Math.cos(rot) };
  });

const roundRect = (x: number, y: number, w: number, h: number): Pt[] => {
  const r = w * 0.3;
  const out: Pt[] = [{ x, y }, { x: x + w, y }];
  for (let i = 0; i <= 5; i++) out.push({ x: x + w - r + Math.cos((i / 5) * (Math.PI / 2)) * r, y: y + h - r + Math.sin((i / 5) * (Math.PI / 2)) * r });
  for (let i = 0; i <= 5; i++) out.push({ x: x + r - Math.sin((i / 5) * (Math.PI / 2)) * r, y: y + h - r + Math.cos((i / 5) * (Math.PI / 2)) * r });
  return out;
};

/** The sparkle on its teeth: a four-point star that flares and fades (screen px). */
export function drawSparkle(ctx: CanvasRenderingContext2D, at: Pt, k: number, size: number): void {
  if (k <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const glow = ctx.createRadialGradient(at.x, at.y, 0, at.x, at.y, size * 1.4 * k);
  glow.addColorStop(0, 'rgba(255,250,220,0.8)');
  glow.addColorStop(1, 'rgba(255,250,220,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(at.x - size * 2, at.y - size * 2, size * 4, size * 4);
  ctx.restore();
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(k * 0.6);
  ctx.scale(k, k);
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r = i % 2 === 0 ? size : size * 0.18;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fillStyle = '#fffbea';
  ctx.fill();
  ctx.strokeStyle = '#f5c84a';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------- the kiss

/** A heart-shaped bubble (screen px), `pop` 0 .. 1 bursting it at the end. */
export function drawHeart(ctx: CanvasRenderingContext2D, at: Pt, size: number, pop: number, alpha: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha * (1 - pop);
  ctx.translate(at.x, at.y);
  const s = size * (1 + 0.4 * pop);
  ctx.scale(s / 50, s / 50);
  ctx.beginPath();
  ctx.moveTo(0, 18);
  ctx.bezierCurveTo(-46, -12, -30, -48, 0, -28);
  ctx.bezierCurveTo(30, -48, 46, -12, 0, 18);
  ctx.closePath();
  ctx.fillStyle = 'rgba(244,138,160,0.55)';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#7a2a3a';
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(-14, -22, 7, 4, -0.6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fill();
  ctx.restore();
  if (pop > 0 && pop < 1) {
    ctx.save();
    ctx.strokeStyle = `rgba(255,220,230,${(1 - pop).toFixed(3)})`;
    ctx.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const r0 = size * (0.5 + pop);
      ctx.beginPath();
      ctx.moveTo(at.x + Math.cos(a) * r0, at.y + Math.sin(a) * r0);
      ctx.lineTo(at.x + Math.cos(a) * (r0 + 14), at.y + Math.sin(a) * (r0 + 14));
      ctx.stroke();
    }
    ctx.restore();
  }
}

type HP = readonly [number, number];
/** A hand, fingers up, thumb out to the left, wrist at y = 0 (cm). */
const HAND: readonly HP[] = [
  [3.4, 0], [3.7, 3.0], [4.0, 6.5], [4.25, 9.4],
  [4.9, 11.8], [5.3, 13.9], [5.0, 14.7], [4.3, 14.6], [3.8, 12.3], [3.15, 10.6],
  [3.1, 12.6], [3.0, 16.0], [2.4, 16.9], [1.7, 16.2], [1.55, 12.8], [1.15, 11.0],
  [1.0, 13.0], [0.85, 17.6], [0.15, 18.6], [-0.6, 17.7], [-0.65, 13.0], [-1.0, 10.9],
  [-1.25, 12.6], [-1.75, 16.2], [-2.45, 16.9], [-3.15, 16.2], [-3.2, 12.4], [-3.45, 9.9],
  [-3.9, 8.6], [-4.6, 8.4], [-5.4, 9.2], [-5.9, 10.0], [-6.3, 9.6], [-6.0, 8.3], [-5.2, 6.4], [-4.5, 3.8], [-4.0, 1.6],
  [-3.7, 0],
];

/** The ink hand, palm out, pushing from the left (screen px): `palm` is where the palm presses. */
export function drawPushHand(ctx: CanvasRenderingContext2D, palm: Pt, k: number, boil: number): void {
  if (k <= 0) return;
  const pen = new Pen(ctx, 1700 + boil * 13, 1.3);
  const scale = 26;
  const slide = (1 - Math.min(1, k)) * -760;
  ctx.save();
  ctx.translate(palm.x + slide, palm.y);
  ctx.rotate(0.5);
  // Palm middle (0, 7 cm) at the origin.
  const pts = HAND.map(([x, y]) => ({ x: x * scale, y: -(y - 7) * scale }));
  pen.fill(pts, '#f4eddc', 1);
  pen.hair([{ x: 4.1 * scale, y: -1.6 * scale }, { x: 0.4 * scale, y: -2 * scale }, { x: -1.6 * scale, y: -1.5 * scale }], 2.4, INK, 0.5);
  pen.hair([{ x: -3.7 * scale, y: 0 }, { x: -2 * scale, y: 4 * scale }, { x: -1.4 * scale, y: 6 * scale }], 2.4, INK, 0.5);
  pen.stroke([...pts, pts[0]!], 4, INK);
  // The sleeve's cuff.
  const cuff: Pt[] = [{ x: -4.6 * scale, y: 6.6 * scale }, { x: 4.4 * scale, y: 6.6 * scale }, { x: 4.8 * scale, y: 30 * scale }, { x: -5.2 * scale, y: 30 * scale }];
  pen.fill(cuff, '#3c4a6e', 1);
  pen.hatch(cuff, 14, 1.2, 1.4, { alpha: 0.3 });
  pen.closed(cuff, 4, INK);
  ctx.restore();
}

// ---------------------------------------------------------------- the people

const PEOPLE: readonly { readonly x: number; readonly y: number; readonly rot: number; readonly flaws: Flaws; readonly skin: string }[] = [
  { x: 150, y: 420, rot: -0.12, flaws: { gap: true }, skin: '#e3b993' },
  { x: 360, y: 372, rot: 0.06, flaws: { braces: true }, skin: '#b9825e' },
  { x: 570, y: 440, rot: 0.14, flaws: { crooked: true }, skin: '#f0c9a8' },
];

/** Three snapshots of people's grins, popping in one after the other (screen px). */
export function drawPeople(ctx: CanvasRenderingContext2D, k: number, boil: number): void {
  if (k <= 0) return;
  const pen = new Pen(ctx, 1900 + boil * 7, 1);
  PEOPLE.forEach((p, i) => {
    const local = clamp01(k * 1.6 - i * 0.3);
    if (local <= 0) return;
    const s = local * (1 + 0.2 * Math.sin(Math.PI * local));
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.scale(s, s);
    ctx.scale(1.25, 1.25);
    const card: Pt[] = [{ x: -86, y: -78 }, { x: 86, y: -78 }, { x: 86, y: 92 }, { x: -86, y: 92 }];
    pen.fill(card.map((q) => ({ x: q.x + 8, y: q.y + 10 })), '#000000', 0.35);
    pen.fill(card, '#f4eddc', 1);
    const photo: Pt[] = [{ x: -72, y: -64 }, { x: 72, y: -64 }, { x: 72, y: 56 }, { x: -72, y: 56 }];
    pen.fill(photo, p.skin, 1);
    pen.clipped(photo, () => {
      ctx.save();
      ctx.translate(0, -2);
      ctx.scale(0.5, 0.5);
      drawMouth(pen, { lips: 1, jaw: 0, smile: 0.9, pucker: 0, rows: 0 }, { lip: '#c27a6c', lipDark: '#8f4f45', enamel: i === 2 ? '#efe2bf' : '#f7f2e4', flaws: p.flaws });
      ctx.restore();
    });
    pen.closed(photo, 2.4, INK);
    pen.closed(card, 3, INK);
    ctx.restore();
  });
}
