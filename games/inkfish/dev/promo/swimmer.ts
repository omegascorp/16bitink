import { bodyProportions, FISH_TEX, type FishShape } from '../../src/art/fishArt';
import { bottomAt, C, heightAt, xAt } from '../../src/art/fish/kit';
import { ANATOMY } from '../../src/art/fish/registry';
import { INK } from '../../src/art/pen';
import type { Pose } from './chain';
import { SPRITE_RES, type Sprite } from './sprites';

/**
 * Draws a chain fish as it swims and eats, from the game's drawing cut into
 * thin columns:
 * - the tail half bends with a travelling wave, as the game's eels swim;
 * - to open the mouth, each head column is split at the mouth line and the
 *   halves pushed apart, a little up and a lot down, more towards the nose.
 *   The head flexes open like rubber, with stripes and fins unbroken, and the
 *   gap is painted as the inside of a mouth with inked lips;
 * - a swallowed meal swells the columns it is passing through.
 */

interface Pt { readonly x: number; readonly y: number }

/** Where the mouth opens, in fish-texture px (fish facing right), and how far each jaw moves (in half-heights). */
interface MouthSpec {
  readonly tip: Pt;
  readonly hinge: Pt;
  readonly lower: number;
  readonly upper: number;
  readonly teeth: boolean;
  readonly ink: string;
}

function mouthSpec(shape: FishShape): MouthSpec {
  const a = ANATOMY[shape];
  const ink = a.ink ?? INK;
  if (shape === 'shark') {
    // Underslung: the jaw drops from under the snout, hinged behind the lip (giants.ts draws it at t = 0.12).
    return {
      tip: { x: xAt(a, 0.03), y: C + heightAt(a, 0.03) * 0.4 },
      hinge: { x: xAt(a, 0.17), y: bottomAt(a, 0.17) - 6 },
      lower: 1.25,
      upper: 0.35,
      teeth: true,
      ink,
    };
  }
  return {
    tip: { x: xAt(a, 0) + 1, y: C + 0.5 },
    // Hinged well back under the eye, so the whole front of the head opens.
    hinge: { x: xAt(a, 0.3), y: C + heightAt(a, 0.3) * 0.12 },
    lower: 0.95,
    upper: 0.32,
    teeth: false,
    ink,
  };
}

const specs = new Map<FishShape, MouthSpec>();
const specOf = (shape: FishShape): MouthSpec => specs.get(shape) ?? specs.set(shape, mouthSpec(shape)).get(shape)!;

export interface SwimLook {
  /** Height and length multipliers (squash and stretch). */
  readonly squash?: number;
  readonly stretch?: number;
  readonly alpha?: number;
  /** Jaw opening, 0 shut .. 1 gaping. */
  readonly jaw?: number;
  /** A swallowed meal: how big the swelling is (0..1) and where, 0 nose .. 1 tail base. */
  readonly lump?: { readonly size: number; readonly at: number };
  /** Eyes closed: squeezed tight, or curved shut in contentment. */
  readonly eyes?: 'squeeze' | 'happy' | null;
  /**
   * 'mouth' draws only the inside of the open mouth, 'body' everything else
   * (the throat's shadow, the fish, the lips). Drawn apart, a prey drawn
   * between them is seen going in, darkening as it goes down the throat.
   */
  readonly part?: 'all' | 'mouth' | 'body';
}

/** The mouth line's height at texture x, and how far the upper and lower jaw move there (texture px). */
interface Gape { readonly line: number; readonly up: number; readonly down: number }

function gapeAt(spec: MouthSpec, hh: number, open: number, x: number): Gape | null {
  if (open <= 0 || x <= spec.hinge.x) return null;
  const f = Math.min(1, (x - spec.hinge.x) / (spec.tip.x - spec.hinge.x));
  // A rounded gape: tight at the corner, opening quickly, near its widest
  // well before the front, so the lips curve like a mouth rather than a beak.
  const ease = Math.sin((Math.PI / 2) * f) ** 0.85;
  const line = spec.hinge.y + (spec.tip.y - spec.hinge.y) * f;
  return { line, up: spec.upper * hh * open * ease, down: spec.lower * hh * open * ease };
}

/** The open mouth's outline, texture px: upper lip from the corner to the front, and the lower lip likewise. */
function mouthOutline(spec: MouthSpec, hh: number, open: number): { readonly upper: Pt[]; readonly lower: Pt[] } {
  const upper: Pt[] = [];
  const lower: Pt[] = [];
  for (let i = 0; i <= 16; i++) {
    const x = spec.hinge.x + ((spec.tip.x - spec.hinge.x) * i) / 16;
    const g = gapeAt(spec, hh, open, x + 1e-6) ?? { line: spec.hinge.y, up: 0, down: 0 };
    upper.push({ x, y: g.line - g.up });
    lower.push({ x, y: g.line + g.down });
  }
  return { upper, lower };
}

const toSprite = (p: Pt): Pt => ({ x: (p.x - FISH_TEX / 2) * SPRITE_RES, y: (p.y - FISH_TEX / 2) * SPRITE_RES });

function tracePath(ctx: CanvasRenderingContext2D, pts: readonly Pt[], moveFirst = true): void {
  pts.forEach((p, i) => {
    const q = toSprite(p);
    if (i === 0 && moveFirst) ctx.moveTo(q.x, q.y);
    else ctx.lineTo(q.x, q.y);
  });
}

/** The open mouth: along the upper lip, round the front in a curve that dips inwards (the opening), and back along the lower lip. */
function mouthPath(ctx: CanvasRenderingContext2D, upper: readonly Pt[], lower: readonly Pt[]): void {
  const top = toSprite(upper[upper.length - 1]!);
  const bottom = toSprite(lower[lower.length - 1]!);
  const inward = (bottom.y - top.y) * 0.35;
  ctx.beginPath();
  tracePath(ctx, upper);
  ctx.quadraticCurveTo(top.x - inward, (top.y + bottom.y) / 2, bottom.x, bottom.y);
  tracePath(ctx, [...lower].reverse(), false);
  ctx.closePath();
}

export function drawSwimmer(ctx: CanvasRenderingContext2D, sprite: Sprite, pose: Pose, boil: number, look: SwimLook = {}): void {
  const canvas = sprite.frames[boil % sprite.frames.length]!;
  const side = canvas.width;
  const half = side / 2;
  const R = SPRITE_RES;
  const scale = pose.length / sprite.bodyPx;
  const { hl, hh } = bodyProportions(pose.shape);
  const head = (FISH_TEX / 2 + hl) * R;
  const span = 2 * hl * R;
  const amp = hh * R * (0.12 + 0.14 * pose.effort);
  const open = Math.max(0, look.jaw ?? 0);
  const spec = specOf(pose.shape);
  const part = look.part ?? 'all';
  const lump = look.lump;
  // About two screen px per column; never fewer than needed for a smooth bend.
  const step = Math.max(4, Math.min(48, Math.ceil(2 / scale)));
  const mouth = open > 0.01 ? mouthOutline(spec, hh, open) : null;

  ctx.save();
  ctx.globalAlpha = look.alpha ?? 1;
  ctx.translate(pose.x, pose.y);
  ctx.scale(pose.facing, 1);
  ctx.rotate(-pose.tilt);
  ctx.scale(scale * (look.stretch ?? 1), scale * (look.squash ?? 1));

  if (mouth && part !== 'body') drawMouthInside(ctx, spec, mouth.upper, mouth.lower, hh);
  if (part === 'mouth') {
    ctx.restore();
    return;
  }
  if (mouth) drawThroatShadow(ctx, spec, mouth.upper, mouth.lower);

  for (let sx = 0; sx < side; sx += step) {
    const along = (head - (sx + step / 2)) / span;
    const bend = Math.max(0, (along - 0.3) / 0.7);
    const dy = amp * bend * bend * Math.sin(pose.beat - 2.4 * along);
    // A swallowed meal swells the body where it is, sagging the belly.
    const swell = lump ? 1 + 0.3 * lump.size * Math.exp(-(((along - lump.at) / 0.13) ** 2)) : 1;
    const sag = (swell - 1) * hh * R * 0.55;
    const w = step + 0.75 / scale;
    const gape = gapeAt(spec, hh, open, (sx + step / 2) / R);
    const piece = (from: number, to: number, shift: number): void => {
      ctx.drawImage(canvas, sx, from, step, to - from, sx - half, (from - half) * swell + shift + dy + sag, w, (to - from) * swell);
    };
    if (!gape) {
      piece(0, side, 0);
      continue;
    }
    const cut = gape.line * R;
    piece(0, cut, -gape.up * R);
    piece(cut, side, gape.down * R);
  }

  if (mouth) drawLips(ctx, spec, mouth.upper, mouth.lower);
  if (look.eyes) drawClosedEye(ctx, sprite, pose.shape, spec, hh, open, look.eyes);
  ctx.restore();
}

const lids = new Map<FishShape, string>();

/** The skin colour around the eye, read off the drawing just above and below it (so a clownfish's lid is its white band). */
function lidColour(sprite: Sprite, shape: FishShape): string {
  const known = lids.get(shape);
  if (known) return known;
  const a = ANATOMY[shape];
  const x = xAt(a, a.eye.t);
  const y = C - heightAt(a, a.eye.t) * 0.3;
  const r = a.eye.r;
  const ctx = sprite.frames[0]!.getContext('2d')!;
  const samples = [y - r * 1.9, y + r * 1.9, y + r * 2.4].map((sy) => ctx.getImageData(Math.round(x * SPRITE_RES), Math.round(sy * SPRITE_RES), 1, 1).data);
  // Median per channel: one sample may land on an ink line.
  const channel = (i: number): number => samples.map((d) => d[i]!).sort((p, q) => p - q)[1]!;
  const colour = `rgb(${channel(0)},${channel(1)},${channel(2)})`;
  lids.set(shape, colour);
  return colour;
}

/** Paints a lid in the body's colour over the eye and inks it shut: a tight crease, or a happy upturned arc. */
function drawClosedEye(ctx: CanvasRenderingContext2D, sprite: Sprite, shape: FishShape, spec: MouthSpec, hh: number, open: number, how: 'squeeze' | 'happy'): void {
  const a = ANATOMY[shape];
  const R = SPRITE_RES;
  const ex = xAt(a, a.eye.t);
  // The eye rides up with the upper jaw when the mouth is open.
  const ey = C - heightAt(a, a.eye.t) * 0.3 - (gapeAt(spec, hh, open, ex)?.up ?? 0);
  const r = a.eye.r * (shape === 'shark' ? 0.95 : 1.12);
  const c = toSprite({ x: ex, y: ey });
  ctx.save();
  ctx.beginPath();
  ctx.arc(c.x, c.y, r * R, 0, Math.PI * 2);
  ctx.fillStyle = lidColour(sprite, shape);
  ctx.fill();
  ctx.strokeStyle = spec.ink;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1.3, r * 0.22) * R;
  ctx.beginPath();
  if (how === 'happy') {
    // "^": eyes smiling shut.
    ctx.moveTo(c.x - r * 0.75 * R, c.y + r * 0.25 * R);
    ctx.quadraticCurveTo(c.x, c.y - r * 0.75 * R, c.x + r * 0.75 * R, c.y + r * 0.25 * R);
  } else {
    // Squeezed tight: a crease with crow's feet.
    ctx.moveTo(c.x - r * 0.8 * R, c.y - r * 0.1 * R);
    ctx.quadraticCurveTo(c.x, c.y + r * 0.3 * R, c.x + r * 0.8 * R, c.y - r * 0.1 * R);
    for (const k of [-1, 0, 1]) {
      ctx.moveTo(c.x - r * 0.95 * R, c.y + k * r * 0.25 * R);
      ctx.lineTo(c.x - r * 1.35 * R, c.y + k * r * 0.45 * R);
    }
  }
  ctx.stroke();
  ctx.restore();
}

/** The inside of the open mouth: dark, a little tongue, and shark teeth. */
function drawMouthInside(ctx: CanvasRenderingContext2D, spec: MouthSpec, upper: readonly Pt[], lower: readonly Pt[], hh: number): void {
  const R = SPRITE_RES;
  ctx.save();
  mouthPath(ctx, upper, lower);
  ctx.fillStyle = '#2a1418';
  ctx.fill();
  ctx.clip();
  // The tongue: a soft red mound on the floor of the mouth.
  const mid = lower[Math.round(lower.length * 0.45)]!;
  const tongue = toSprite({ x: mid.x, y: mid.y - hh * 0.08 });
  ctx.fillStyle = '#8a3b44';
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.ellipse(tongue.x, tongue.y, hh * 0.5 * R, hh * 0.16 * R, -0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  if (spec.teeth) {
    for (const [lip, dir] of [[upper, 1], [lower, -1]] as const) {
      for (let i = 2; i < lip.length - 1; i += 2) {
        const p = toSprite(lip[i]!);
        const size = (2.2 + (i / lip.length) * 1.8) * R;
        ctx.beginPath();
        ctx.moveTo(p.x - size * 0.45, p.y);
        ctx.lineTo(p.x, p.y + dir * size * 1.5);
        ctx.lineTo(p.x + size * 0.45, p.y);
        ctx.closePath();
        ctx.fillStyle = '#fffaf0';
        ctx.fill();
        ctx.lineWidth = 0.5 * R;
        ctx.strokeStyle = INK;
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

/** Darkness deepening towards the corner of the mouth, over whatever is being swallowed. */
function drawThroatShadow(ctx: CanvasRenderingContext2D, spec: MouthSpec, upper: readonly Pt[], lower: readonly Pt[]): void {
  const back = toSprite(spec.hinge);
  const lipUp = upper[upper.length - 1]!;
  const lipDown = lower[lower.length - 1]!;
  const front = toSprite({ x: (lipUp.x + lipDown.x) / 2, y: (lipUp.y + lipDown.y) / 2 });
  ctx.save();
  mouthPath(ctx, upper, lower);
  const shade = ctx.createLinearGradient(back.x, back.y, front.x, front.y);
  shade.addColorStop(0, 'rgba(20,8,10,1)');
  shade.addColorStop(0.45, 'rgba(30,12,16,0.85)');
  shade.addColorStop(1, 'rgba(42,20,24,0)');
  ctx.fillStyle = shade;
  ctx.fill();
  ctx.restore();
}

/** Inked lips over the cut edges, in the fish's own ink. */
function drawLips(ctx: CanvasRenderingContext2D, spec: MouthSpec, upper: readonly Pt[], lower: readonly Pt[]): void {
  ctx.save();
  ctx.strokeStyle = spec.ink;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 2.1 * SPRITE_RES;
  for (const lip of [upper, lower]) {
    ctx.beginPath();
    tracePath(ctx, lip);
    ctx.stroke();
    // A plump, rounded lip end.
    const end = toSprite(lip[lip.length - 1]!);
    ctx.beginPath();
    ctx.arc(end.x, end.y, 1.7 * SPRITE_RES, 0, Math.PI * 2);
    ctx.fillStyle = spec.ink;
    ctx.fill();
  }
  ctx.restore();
}
