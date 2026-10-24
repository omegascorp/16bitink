import { INK, makeCanvas } from '../../../../src/art/pen';
import { BOIL_FPS, BOIL_FRAMES } from '../../../../src/art/textures';
import { createRng } from '../../../../src/logic/rng';
import type { KitEntry } from '../kit';
import { COPE_BOX, COPE_EYE, type CopeState, EYE_MIN_PX, paintCopepod } from './plankton/copepod';
import { CENTRIC_BOX, CENTRIC_PERIOD, foldRoll, paintCentric, paintPennate, PENNATE_BOX } from './plankton/diatom';
import { type Box, clamp01, frac, LEN, Plate, SHINE, TAU } from './plankton/ink';
import { KRILL_BOX, type KrillState, paintKrill } from './plankton/krill';
import { paintPaperclip } from './plankton/paperclip';

/**
 * The food-chain video's plankton, in the game's pen and ink but painted like
 * a scientific plate: thin paper under a wash laid a little off the outline,
 * shading lines that follow the form, a glassy sheen, line boil.
 *
 * - Diatom: a centric diatom, a glass pillbox seen at three quarters (the lid
 *   valve overlapping the base), its face etched with radial rows of pores
 *   and golden-brown chloroplasts glowing through; or a pennate one, a glass
 *   boat with a central slit (raphe) and rows of pores across. `spin` turns it
 *   about its own axis.
 * - Copepod: a calanoid (Calanus), side-on from a little above: a translucent
 *   amber teardrop with an orange oil sac, a narrow segmented tail ending in
 *   two forked rami with long setae, the first antennae swept out nearly a
 *   body length each, five pairs of swimming legs under it, feathery
 *   mouthparts, and its one red eye at the front. `kick` snaps the legs and
 *   antennae back (the escape jump); `chew` works the mouthparts.
 * - Krill: Antarctic krill side-on: pinkish-orange glass with red pigment
 *   stars, big black eyes on stalks, a basket of feathery legs, a green gut
 *   full of diatoms, a segmented abdomen ending in a tail fan, and blue-green
 *   photophores. `kick` is the phase of the paddling swimmerets; `flex` curls
 *   the abdomen under.
 * - Paperclip: a plain steel Gem clip, for scale beside a krill.
 *
 * Every drawing is made in "units", a body length being 100 of them, and
 * painted at its screen size, so line widths and detail suit it. Swarms blit
 * sprites baked at a few sizes, per line-boil frame and per pose step; above
 * LIVE_FROM px a drawing is painted straight onto the frame with its exact pose.
 * The painters live in ./plankton/ (one file per animal plus the shared ink).
 *
 * The kit preview shows every drawing big and in small swarms; from t = 20 s
 * it shows close-ups at the video's largest sizes (diatom, copepod, krill).
 */

/** Sprite sizes (body length in px) baked per boil frame; the smallest one at least the asked size is used. */
const TIERS = [16, 48, 128, 256] as const;
/** Above this many px the drawing is painted live, not blitted. */
const LIVE_FROM = 300;
/** Smallest drawn size in px; anything smaller is skipped. */
const MIN_SIZE = 2;
/** Transparent margin round each sprite, px. */
const PAD = 3;
type Tier = (typeof TIERS)[number];

// ---------------------------------------------------------------- sprites and drawing

/** A kind of drawing: its sprite box, how its pose is stepped for baking, and its painter. */
interface Kind<P> {
  readonly id: string;
  readonly box: Box;
  readonly seed: number;
  /** Number of pose steps baked at a tier. */
  steps(tier: Tier): number;
  /** The baked step nearest a pose. */
  step(pose: P, tier: Tier): number;
  /** The pose a baked step stands for. */
  poseOf(step: number, tier: Tier): P;
  paint(pl: Plate, pose: P): void;
}

const tierSteps = (counts: readonly number[]) => (tier: Tier): number => counts[TIERS.indexOf(tier)]!;

const CENTRIC_KIND: Kind<number> = {
  id: 'centric',
  box: CENTRIC_BOX,
  seed: 3301,
  steps: tierSteps([1, 2, 4, 6]),
  step(spin, tier) {
    const n = this.steps(tier);
    return Math.round(frac(spin / CENTRIC_PERIOD) * n) % n;
  },
  poseOf(step, tier) {
    return (step / this.steps(tier)) * CENTRIC_PERIOD;
  },
  paint: paintCentric,
};


const PENNATE_KIND: Kind<number> = {
  id: 'pennate',
  box: PENNATE_BOX,
  seed: 3407,
  steps: tierSteps([1, 3, 4, 6]),
  step(spin, tier) {
    const n = this.steps(tier);
    return n === 1 ? 0 : Math.round((foldRoll(spin) / (Math.PI / 2)) * (n - 1));
  },
  poseOf(step, tier) {
    const n = this.steps(tier);
    return n === 1 ? 0 : (step / (n - 1)) * (Math.PI / 2);
  },
  paint: (pl, roll) => paintPennate(pl, foldRoll(roll)),
};

const COPE_KICKS = [2, 3, 4, 4] as const;
const COPE_BITES = [1, 1, 1, 2] as const;
const COPEPOD_KIND: Kind<CopeState> = {
  id: 'copepod',
  box: COPE_BOX,
  seed: 5501,
  steps: (tier) => COPE_KICKS[TIERS.indexOf(tier)]! * COPE_BITES[TIERS.indexOf(tier)]!,
  step(pose, tier) {
    const kicks = COPE_KICKS[TIERS.indexOf(tier)]!;
    const bites = COPE_BITES[TIERS.indexOf(tier)]!;
    return Math.round(clamp01(pose.kick) * (kicks - 1)) * bites + Math.round(clamp01(pose.bite) * (bites - 1));
  },
  poseOf(step, tier) {
    const kicks = COPE_KICKS[TIERS.indexOf(tier)]!;
    const bites = COPE_BITES[TIERS.indexOf(tier)]!;
    return { kick: Math.floor(step / bites) / (kicks - 1), bite: bites === 1 ? 0 : (step % bites) / (bites - 1) };
  },
  paint: paintCopepod,
};

const KRILL_KICKS = [2, 4, 4, 4] as const;
const KRILL_FLEXES = [2, 3, 3, 3] as const;
const KRILL_KIND: Kind<KrillState> = {
  id: 'krill',
  box: KRILL_BOX,
  seed: 6607,
  steps: (tier) => KRILL_KICKS[TIERS.indexOf(tier)]! * KRILL_FLEXES[TIERS.indexOf(tier)]!,
  step(pose, tier) {
    const kicks = KRILL_KICKS[TIERS.indexOf(tier)]!;
    const flexes = KRILL_FLEXES[TIERS.indexOf(tier)]!;
    return (Math.round(frac(pose.kick) * kicks) % kicks) * flexes + Math.round(clamp01(pose.flex) * (flexes - 1));
  },
  poseOf(step, tier) {
    const kicks = KRILL_KICKS[TIERS.indexOf(tier)]!;
    const flexes = KRILL_FLEXES[TIERS.indexOf(tier)]!;
    return { kick: Math.floor(step / flexes) / kicks, flex: (step % flexes) / (flexes - 1) };
  },
  paint: paintKrill,
};

const sheets = new Map<string, HTMLCanvasElement>();
const boilAt = (t: number): number => ((Math.floor(t * BOIL_FPS) % BOIL_FRAMES) + BOIL_FRAMES) % BOIL_FRAMES;
const seedOf = <P>(kind: Kind<P>, boil: number): number => kind.seed + boil * 977;

function bake<P>(kind: Kind<P>, tier: Tier, boil: number, step: number): HTMLCanvasElement {
  const k = tier / LEN;
  const { box } = kind;
  const { canvas, ctx } = makeCanvas(Math.ceil((box.x1 - box.x0) * k) + 2 * PAD, Math.ceil((box.y1 - box.y0) * k) + 2 * PAD);
  ctx.translate(-box.x0 * k + PAD, -box.y0 * k + PAD);
  kind.paint(new Plate(ctx, tier, seedOf(kind, boil)), kind.poseOf(step, tier));
  return canvas;
}

function sheetFor<P>(kind: Kind<P>, tier: Tier, boil: number, step: number): HTMLCanvasElement {
  const key = `${kind.id}|${tier}|${boil}|${step}`;
  const found = sheets.get(key);
  if (found) return found;
  const made = bake(kind, tier, boil, step);
  sheets.set(key, made);
  return made;
}

/** Draws a kind at (x, y), `size` px a body length: blitted from the nearest baked sprite, or painted live when big. */
function drawKind<P>(ctx: CanvasRenderingContext2D, kind: Kind<P>, x: number, y: number, size: number, angle: number, t: number, pose: P): void {
  if (size < MIN_SIZE) return;
  const boil = boilAt(t);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  if (size > LIVE_FROM) {
    kind.paint(new Plate(ctx, size, seedOf(kind, boil)), pose);
    ctx.restore();
    return;
  }
  const tier = TIERS.find((s) => s >= size) ?? TIERS[TIERS.length - 1]!;
  const sheet = sheetFor(kind, tier, boil, kind.step(pose, tier));
  const k = tier / LEN;
  const scale = size / tier;
  ctx.scale(scale, scale);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(sheet, kind.box.x0 * k - PAD, kind.box.y0 * k - PAD);
  ctx.restore();
}

/** Bakes every sprite (all tiers, boil frames and pose steps) up front, yielding now and then. */
export async function prepare(): Promise<void> {
  await bakeAll(CENTRIC_KIND);
  await bakeAll(PENNATE_KIND);
  await bakeAll(COPEPOD_KIND);
  await bakeAll(KRILL_KIND);
}

/** Every tier, boil frame and pose step of one kind, yielding to the page between tiers. */
async function bakeAll<P>(kind: Kind<P>): Promise<void> {
  for (const tier of TIERS) {
    for (let boil = 0; boil < BOIL_FRAMES; boil++) {
      for (let step = 0; step < kind.steps(tier); step++) sheetFor(kind, tier, boil, step);
    }
    await new Promise<void>((done) => setTimeout(done, 0));
  }
}

/** Bytes held by the baked sprites (RGBA), for checking the memory budget. */
export function spriteBytes(): number {
  let total = 0;
  for (const c of sheets.values()) total += c.width * c.height * 4;
  return total;
}

export interface DiatomPose {
  /** Turn about its own axis, radians (the centric face pattern wheels round; the pennate rolls). */
  readonly spin?: number;
  readonly kind?: 'centric' | 'pennate';
}

export interface CopepodPose {
  /** 0 at rest .. 1 legs and antennae snapped back (the escape jump). */
  readonly kick?: number;
  /** Phase of one chewing stroke, 0..1: 0 and 1 at rest, 0.5 mouthparts fully swept in. Loop it to chew. */
  readonly chew?: number;
}

export interface KrillPose {
  /** Phase of the swimmerets' paddling, 0..1 (loops). */
  readonly kick?: number;
  /** 0 abdomen straight .. 1 curled right under (a tail flip). */
  readonly flex?: number;
}

/** Centre (x, y) in screen px, `size` = diameter (pennate: length) in px, `angle` radians, `t` seconds. */
export function drawDiatom(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, angle: number, t: number, pose: DiatomPose = {}): void {
  const kind = pose.kind === 'pennate' ? PENNATE_KIND : CENTRIC_KIND;
  drawKind(ctx, kind, x, y, size, angle, t, pose.spin ?? 0);
}

/** Centre (x, y) in screen px, `size` = body length (head to tail rami) in px, head towards `angle`. */
export function drawCopepod(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, angle: number, t: number, pose: CopepodPose = {}): void {
  drawKind(ctx, COPEPOD_KIND, x, y, size, angle, t, { kick: pose.kick ?? 0, bite: Math.sin(Math.PI * frac(pose.chew ?? 0)) });
}

/** Centre (x, y) in screen px, `size` = body length (rostrum to telson) in px, head towards `angle`. */
export function drawKrill(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, angle: number, t: number, pose: KrillPose = {}): void {
  drawKind(ctx, KRILL_KIND, x, y, size, angle, t, { kick: pose.kick ?? 0, flex: pose.flex ?? 0 });
}

/** A steel paperclip, `size` = its length in px. Always painted live (there is only ever one). */
export function drawPaperclip(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, angle: number, t: number): void {
  if (size < MIN_SIZE) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  paintPaperclip(new Plate(ctx, size, 8801 + boilAt(t) * 977));
  ctx.restore();
}

/** Where the copepod's eye is in screen px (for the "1 eye" ring). */
export function copepodEye(x: number, y: number, size: number, angle: number): { x: number; y: number; radius: number } {
  const k = size / LEN;
  const [ex, ey] = [COPE_EYE.x * k, COPE_EYE.y * k];
  return {
    x: x + ex * Math.cos(angle) - ey * Math.sin(angle),
    y: y + ex * Math.sin(angle) + ey * Math.cos(angle),
    radius: Math.max(COPE_EYE.r * k, EYE_MIN_PX),
  };
}

// ---------------------------------------------------------------- kit preview

function sunlitWater(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#dcefe4');
  g.addColorStop(1, '#a6d2cf');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.globalAlpha = 0.09;
  ctx.fillStyle = SHINE;
  for (let i = 0; i < 5; i++) {
    const x = w * (0.1 + i * 0.22);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + w * 0.06, 0);
    ctx.lineTo(x + w * 0.2, h);
    ctx.lineTo(x + w * 0.11, h);
    ctx.fill();
  }
  ctx.restore();
}

function swarms(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
  const rng = createRng(99);
  const box = { x: w * 0.02, y: h * 0.62, w: w * 0.4, h: h * 0.36 };
  for (let i = 0; i < 40; i++) {
    drawDiatom(ctx, box.x + rng() * box.w * 0.45, box.y + rng() * box.h * 0.45, 10 + rng() * 20, rng() * TAU, t, { kind: rng() < 0.35 ? 'pennate' : 'centric', spin: rng() * 6 + t * 0.4 });
  }
  for (let i = 0; i < 14; i++) {
    drawCopepod(ctx, box.x + box.w * 0.5 + rng() * box.w * 0.5, box.y + rng() * box.h * 0.45, 18 + rng() * 26, rng() * TAU, t, { kick: rng() < 0.3 ? 1 : 0, chew: frac(t * 2 + rng()) });
  }
  for (let i = 0; i < 50; i++) {
    const s = 8 + rng() * 22;
    drawKrill(ctx, box.x + rng() * box.w, box.y + box.h * 0.52 + rng() * box.h * 0.45, s, -0.3 + rng() * 0.6, t, { kick: frac(t * 2 + rng()), flex: rng() * 0.3 });
  }
  // A few in between, to judge the middle sprite sizes.
  drawCopepod(ctx, w * 0.33, h * 0.55, 110, -0.4, t, { kick: 0.3 });
  drawKrill(ctx, w * 0.47, h * 0.9, 120, 0.1, t, { kick: frac(t * 2) });
  drawDiatom(ctx, w * 0.46, h * 0.62, 60, 0.3, t, { spin: t * 0.4 });
}

/** Close-ups at the video's biggest sizes, for t from CLOSE_UPS on: the diatom, then the copepod, then the krill (10 s each). */
const CLOSE_UPS = 20;

function closeUp(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, u: number): void {
  const shot = Math.floor((t - CLOSE_UPS) / 10);
  if (shot === 0) {
    drawDiatom(ctx, w * 0.36, h * 0.5, 900 * u, 0, t, { spin: t * 0.4 });
    drawDiatom(ctx, w * 0.83, h * 0.5, 520 * u, 1.3, t, { kind: 'pennate', spin: t * 0.6 });
  } else if (shot === 1) {
    const kick = 0.5 - 0.5 * Math.cos(Math.PI * t);
    drawCopepod(ctx, w * 0.45, h * 0.55, 1500 * u, 0, t, { kick, chew: frac(t * 1.5) });
    const eye = copepodEye(w * 0.45, h * 0.55, 1500 * u, 0);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(eye.x, eye.y, eye.radius * 2.4, 0, TAU);
    ctx.stroke();
  } else {
    drawKrill(ctx, w * 0.52, h * 0.42, 1000 * u, 0, t, { kick: frac(t * 2), flex: 0.5 - 0.5 * Math.cos(Math.PI * t * 0.7) });
    drawPaperclip(ctx, w * 0.5, h * 0.88, 660 * u, 0, t);
  }
}

export const KIT: KitEntry = {
  name: 'plankton',
  draw(ctx, w, h, t) {
    sunlitWater(ctx, w, h);
    const u = Math.min(w / 1920, h / 1080);
    if (t >= CLOSE_UPS) {
      closeUp(ctx, w, h, t, u);
      return;
    }
    drawDiatom(ctx, w * 0.17, h * 0.27, 470 * u, 0, t, { spin: t * 0.4 });
    drawDiatom(ctx, w * 0.35, h * 0.12, 230 * u, 0.25, t, { kind: 'pennate', spin: 0.5 + t * 0.6 });
    const kick = 0.5 - 0.5 * Math.cos(Math.PI * t);
    drawCopepod(ctx, w * 0.56, h * 0.33, 380 * u, -0.08, t, { kick, chew: frac(t * 1.5) });
    drawKrill(ctx, w * 0.8, h * 0.62, 480 * u, 0, t, { kick: frac(t * 2), flex: 0.5 - 0.5 * Math.cos(Math.PI * t * 0.7) });
    drawPaperclip(ctx, w * 0.78, h * 0.9, 330 * u, 0.04, t);
    swarms(ctx, w, h, t);
  },
};
