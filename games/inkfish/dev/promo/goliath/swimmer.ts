import { bodyProportions, FISH_TEX, type FishShape } from '../../../src/art/fishArt';
import { C, heightAt, xAt } from '../../../src/art/fish/kit';
import { ANATOMY } from '../../../src/art/fish/registry';
import { INK, PAPER } from '../../../src/art/pen';
import type { Pose } from '../chain';
import type { Sprite } from '../sprites';

/**
 * The gape short's swimmer (../gape/swimmer.ts), copied for the goliath
 * grouper swallowing a shark, without the viperfish's fangs:
 * - the swelling is a long, round belly (a whole shark), not a little lump;
 * - closed eyes take an explicit lid colour (the grouper's mottled skin);
 * - `clipToGape` limits drawing to the open mouth and the water in front of
 *   it, so the shark half way in is seen going in, never poking out of the
 *   back of the head;
 * - `pointOn` maps a point of the drawing to the screen, bend, gape and
 *   swelling included (where the line goes in at the lips).
 *
 * As in the shared one, the game's drawing is cut into thin columns: the
 * tail half bends with a travelling wave; to open the mouth, each head
 * column is split at the mouth line and the halves pushed apart.
 */

interface Pt { readonly x: number; readonly y: number }

/** Where the mouth opens, in fish-texture px (fish facing right), and how far each jaw moves (in half-heights). */
interface MouthSpec {
  readonly tip: Pt;
  readonly hinge: Pt;
  readonly lower: number;
  readonly upper: number;
  readonly ink: string;
}

function mouthSpec(shape: FishShape): MouthSpec {
  const a = ANATOMY[shape];
  return {
    tip: { x: xAt(a, 0) + 1, y: C + 0.5 },
    // Hinged well back under the eye, so the whole front of the head opens.
    hinge: { x: xAt(a, 0.3), y: C + heightAt(a, 0.3) * 0.12 },
    lower: 0.95,
    upper: 0.32,
    ink: a.ink ?? INK,
  };
}

const specs = new Map<FishShape, MouthSpec>();
const specOf = (shape: FishShape): MouthSpec => specs.get(shape) ?? specs.set(shape, mouthSpec(shape)).get(shape)!;

export interface SwimLook {
  /** Height and length multipliers (squash and stretch). */
  readonly squash?: number;
  readonly stretch?: number;
  readonly alpha?: number;
  /** Jaw opening, 0 shut .. 1 the shared swimmer's widest. */
  readonly jaw?: number;
  /** A swallowed meal: how much it swells the body there (0 none, 1 twice as deep), where (0 nose .. 1 tail base) and how long a stretch (body lengths). */
  readonly belly?: { readonly size: number; readonly at: number; readonly width: number };
  /** Eyes closed: squeezed tight, or curved shut in contentment. */
  readonly eyes?: 'squeeze' | 'happy' | null;
  /** The lid's colour when the eyes are closed. */
  readonly lid?: string;
  /** 'mouth' draws only the inside of the open mouth, 'body' everything else; a meal drawn between them is seen going in. */
  readonly part?: 'all' | 'mouth' | 'body';
}

/** The mouth line's height at texture x, and how far the upper and lower jaw move there (texture px). */
interface Gape { readonly line: number; readonly up: number; readonly down: number }

function gapeAt(spec: MouthSpec, hh: number, open: number, x: number): Gape | null {
  if (open <= 0 || x <= spec.hinge.x) return null;
  const f = Math.min(1, (x - spec.hinge.x) / (spec.tip.x - spec.hinge.x));
  // A rounded gape: tight at the corner, opening quickly, near its widest well before the front.
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

/** Texture px to sprite px at resolution R, centred. */
const toSprite = (p: Pt, R: number): Pt => ({ x: (p.x - FISH_TEX / 2) * R, y: (p.y - FISH_TEX / 2) * R });

function tracePath(ctx: CanvasRenderingContext2D, pts: readonly Pt[], R: number, moveFirst = true): void {
  pts.forEach((p, i) => {
    const q = toSprite(p, R);
    if (i === 0 && moveFirst) ctx.moveTo(q.x, q.y);
    else ctx.lineTo(q.x, q.y);
  });
}

/** The open mouth: along the upper lip, round the front in a curve that dips inwards, and back along the lower lip. */
function mouthPath(ctx: CanvasRenderingContext2D, upper: readonly Pt[], lower: readonly Pt[], R: number): void {
  const top = toSprite(upper[upper.length - 1]!, R);
  const bottom = toSprite(lower[lower.length - 1]!, R);
  const inward = (bottom.y - top.y) * 0.35;
  ctx.beginPath();
  tracePath(ctx, upper, R);
  ctx.quadraticCurveTo(top.x - inward, (top.y + bottom.y) / 2, bottom.x, bottom.y);
  tracePath(ctx, [...lower].reverse(), R, false);
  ctx.closePath();
}

/** The fish's frame: origin at its centre, x towards its nose, in sprite px. */
function enterFrame(ctx: CanvasRenderingContext2D, sprite: Sprite, pose: Pose, look: SwimLook): void {
  const scale = pose.length / sprite.bodyPx;
  ctx.translate(pose.x, pose.y);
  ctx.scale(pose.facing, 1);
  ctx.rotate(-pose.tilt);
  ctx.scale(scale * (look.stretch ?? 1), scale * (look.squash ?? 1));
}

/** How much the body is swollen at `along` (0 nose .. 1 tail base): 1 is not at all. A round belly with soft ends. */
function swellAt(look: SwimLook, along: number): number {
  const b = look.belly;
  if (!b || b.size <= 0) return 1;
  const u = (along - b.at) / (b.width / 2);
  if (Math.abs(u) >= 1) return 1;
  return 1 + b.size * Math.cos((Math.PI / 2) * u) ** 1.3;
}

interface Column {
  /** Vertical shift of the whole column (tail wave), the swelling (scale about the middle) and the belly's sag, sprite px. */
  readonly dy: number;
  readonly swell: number;
  readonly sag: number;
}

function columnAt(sprite: Sprite, pose: Pose, look: SwimLook, sx: number): Column {
  const R = sprite.res;
  const { hl, hh } = bodyProportions(pose.shape);
  const head = (FISH_TEX / 2 + hl) * R;
  const along = (head - sx) / (2 * hl * R);
  const bend = Math.max(0, (along - 0.3) / 0.7);
  const amp = hh * R * (0.12 + 0.14 * pose.effort);
  const dy = amp * bend * bend * Math.sin(pose.beat - 2.4 * along);
  const swell = swellAt(look, along);
  // The belly sags: most of the swelling goes down.
  const sag = (swell - 1) * hh * R * 0.5;
  return { dy, swell, sag };
}

export function drawSwimmer(ctx: CanvasRenderingContext2D, sprite: Sprite, pose: Pose, boil: number, look: SwimLook = {}): void {
  const canvas = sprite.frames[boil % sprite.frames.length]!;
  const side = canvas.width;
  const half = side / 2;
  const R = sprite.res;
  const scale = pose.length / sprite.bodyPx;
  const { hh } = bodyProportions(pose.shape);
  const open = Math.max(0, look.jaw ?? 0);
  const spec = specOf(pose.shape);
  const part = look.part ?? 'all';
  const step = Math.max(4, Math.min(48, Math.ceil(2 / scale)));
  const mouth = open > 0.01 ? mouthOutline(spec, hh, open) : null;

  ctx.save();
  ctx.globalAlpha = look.alpha ?? 1;
  enterFrame(ctx, sprite, pose, look);

  if (mouth && part !== 'body') drawMouthInside(ctx, mouth.upper, mouth.lower, hh, R);
  if (part === 'mouth') {
    ctx.restore();
    return;
  }
  if (mouth) drawThroatShadow(ctx, spec, mouth.upper, mouth.lower, R);

  for (let sx = 0; sx < side; sx += step) {
    const col = columnAt(sprite, pose, look, sx + step / 2);
    const w = step + 0.75 / scale;
    const gape = gapeAt(spec, hh, open, (sx + step / 2) / R);
    const piece = (from: number, to: number, shift: number): void => {
      ctx.drawImage(canvas, sx, from, step, to - from, sx - half, (from - half) * col.swell + shift + col.dy + col.sag, w, (to - from) * col.swell);
    };
    if (!gape) {
      piece(0, side, 0);
      continue;
    }
    const cut = gape.line * R;
    piece(0, cut, -gape.up * R);
    piece(cut, side, gape.down * R);
  }

  if (mouth) drawLips(ctx, spec, mouth.upper, mouth.lower, R);
  if (look.eyes) drawClosedEye(ctx, sprite, pose.shape, spec, hh, open, look.eyes, look.lid ?? PAPER);
  ctx.restore();
}

/**
 * Clips to the open mouth and everything in front of the lips, in the fish's
 * frame. Call inside save/restore; the clip outlives the transform.
 */
export function clipToGape(ctx: CanvasRenderingContext2D, sprite: Sprite, pose: Pose, look: SwimLook): void {
  const open = Math.max(0, look.jaw ?? 0);
  const R = sprite.res;
  const spec = specOf(pose.shape);
  const { hh } = bodyProportions(pose.shape);
  const before = ctx.getTransform();
  enterFrame(ctx, sprite, pose, look);
  const far = FISH_TEX * R * 4;
  // The open mouth from the corner along the upper lip, out round the water in front, and back along the lower lip.
  const m = mouthOutline(spec, hh, Math.max(open, 0.001));
  const top = toSprite(m.upper[m.upper.length - 1]!, R);
  const bottom = toSprite(m.lower[m.lower.length - 1]!, R);
  ctx.beginPath();
  tracePath(ctx, m.upper, R);
  ctx.lineTo(top.x, -far);
  ctx.lineTo(far, -far);
  ctx.lineTo(far, far);
  ctx.lineTo(bottom.x, far);
  tracePath(ctx, [...m.lower].reverse(), R, false);
  ctx.closePath();
  ctx.setTransform(before);
  ctx.clip('nonzero');
}

/** A point of the fish's drawing (texture px, facing right) where it is on screen, bent, gaping and swollen as drawn. */
export function pointOn(sprite: Sprite, pose: Pose, look: SwimLook, tex: Pt): Pt {
  const R = sprite.res;
  const { hh } = bodyProportions(pose.shape);
  const half = (FISH_TEX * R) / 2;
  const sx = tex.x * R;
  const col = columnAt(sprite, pose, look, sx);
  const gape = gapeAt(specOf(pose.shape), hh, Math.max(0, look.jaw ?? 0), tex.x);
  const shift = gape ? (tex.y < gape.line ? -gape.up : gape.down) * R : 0;
  const local = { x: sx - half, y: (tex.y * R - half) * col.swell + shift + col.dy + col.sag };
  const scale = pose.length / sprite.bodyPx;
  const lx = local.x * scale * (look.stretch ?? 1);
  const ly = local.y * scale * (look.squash ?? 1);
  const c = Math.cos(-pose.tilt);
  const s = Math.sin(-pose.tilt);
  return { x: pose.x + pose.facing * (lx * c - ly * s), y: pose.y + lx * s + ly * c };
}

/** Paints a lid over the eye and inks it shut: a tight crease, or a happy upturned arc. */
function drawClosedEye(
  ctx: CanvasRenderingContext2D, sprite: Sprite, shape: FishShape, spec: MouthSpec, hh: number, open: number, how: 'squeeze' | 'happy', lid: string,
): void {
  const a = ANATOMY[shape];
  const R = sprite.res;
  const ex = xAt(a, a.eye.t);
  // The eye rides up with the upper jaw when the mouth is open.
  const ey = C - heightAt(a, a.eye.t) * 0.3 - (gapeAt(spec, hh, open, ex)?.up ?? 0);
  const r = a.eye.r * 1.15;
  const c = toSprite({ x: ex, y: ey }, R);
  ctx.save();
  ctx.beginPath();
  ctx.arc(c.x, c.y, r * R, 0, Math.PI * 2);
  ctx.fillStyle = lid;
  ctx.fill();
  ctx.strokeStyle = spec.ink;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1.3, r * 0.2) * R;
  ctx.beginPath();
  if (how === 'happy') {
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

/** The inside of the open mouth: dark, with a little tongue. */
function drawMouthInside(ctx: CanvasRenderingContext2D, upper: readonly Pt[], lower: readonly Pt[], hh: number, R: number): void {
  ctx.save();
  mouthPath(ctx, upper, lower, R);
  ctx.fillStyle = '#2a1418';
  ctx.fill();
  ctx.clip();
  const mid = lower[Math.round(lower.length * 0.45)]!;
  const tongue = toSprite({ x: mid.x, y: mid.y - hh * 0.08 }, R);
  ctx.fillStyle = '#8a3b44';
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.ellipse(tongue.x, tongue.y, hh * 0.5 * R, hh * 0.16 * R, -0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Darkness deepening towards the corner of the mouth, over whatever is being swallowed. */
function drawThroatShadow(ctx: CanvasRenderingContext2D, spec: MouthSpec, upper: readonly Pt[], lower: readonly Pt[], R: number): void {
  const back = toSprite(spec.hinge, R);
  const lipUp = upper[upper.length - 1]!;
  const lipDown = lower[lower.length - 1]!;
  const front = toSprite({ x: (lipUp.x + lipDown.x) / 2, y: (lipUp.y + lipDown.y) / 2 }, R);
  ctx.save();
  mouthPath(ctx, upper, lower, R);
  const shade = ctx.createLinearGradient(back.x, back.y, front.x, front.y);
  shade.addColorStop(0, 'rgba(20,8,10,1)');
  shade.addColorStop(0.5, 'rgba(30,12,16,0.8)');
  shade.addColorStop(1, 'rgba(42,20,24,0)');
  ctx.fillStyle = shade;
  ctx.fill();
  ctx.restore();
}

/** Inked lips over the cut edges, in the fish's own ink. */
function drawLips(ctx: CanvasRenderingContext2D, spec: MouthSpec, upper: readonly Pt[], lower: readonly Pt[], R: number): void {
  ctx.save();
  ctx.strokeStyle = spec.ink;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 2.1 * R;
  for (const lip of [upper, lower]) {
    ctx.beginPath();
    tracePath(ctx, lip, R);
    ctx.stroke();
    const end = toSprite(lip[lip.length - 1]!, R);
    ctx.beginPath();
    ctx.arc(end.x, end.y, 1.7 * R, 0, Math.PI * 2);
    ctx.fillStyle = spec.ink;
    ctx.fill();
  }
  ctx.restore();
}

/** Where the open mouth's lips meet the water, texture px (facing right): the middle of the opening, and how tall it is. */
export function lipsOf(shape: FishShape, open: number): { readonly mid: Pt; readonly height: number; readonly hinge: Pt } {
  const spec = specOf(shape);
  const { hh } = bodyProportions(shape);
  const g = gapeAt(spec, hh, open, spec.tip.x) ?? { line: spec.tip.y, up: 0, down: 0 };
  return { mid: { x: spec.tip.x, y: g.line + (g.down - g.up) / 2 }, height: g.up + g.down, hinge: spec.hinge };
}
