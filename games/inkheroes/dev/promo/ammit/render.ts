import { BATTLE_BG } from '../../../src/art/pixel/manifest';
import { drawCaptions, drawLabel, GILT } from '../captions';
import { drawCta } from '../cta';
import { drawBackdrop, drawDissolved, drawFrame, drawShotDissolved, loadImage, loadUnit, still, vignette, wash, type Strip, type Unit } from '../pixel';
import { type Short, VIDEO } from '../short';
import { renderAmmitAudio } from './audio';
import {
  animalIn, at, battleFrame, battleHit, biteFrame, BITE_AT, chapterLabel, CTA, dimAt, GAPE_FRAME, featherDrop, heartDrop, heartLeft, hookPose, LOOP_S,
  mergeAt, nameLabel, partLabels, PHRASES, returnAt, sceneAt, TEXT, tiltAt, W, walkIn, wrap,
} from './story';

/** Draws "This Monster Ate Your Heart If It Was Too Heavy" (story.ts has the beats). */

const { width: WV, height: HV } = VIDEO;

interface Cast {
  readonly tomb: HTMLImageElement;
  readonly sand: HTMLImageElement;
  readonly scale: Strip;
  readonly heart: Strip;
  readonly feather: Strip;
  readonly hippo: Strip;
  /** Her PixelLab close-up (head and forequarters, facing left), jaws open, half shut, shut. */
  readonly closeUp: readonly [Strip, Strip, Strip];
  readonly ammit: Unit;
  readonly croc: Unit;
  readonly lion: Unit;
  readonly levy: Unit;
}

async function loadCast(): Promise<Cast> {
  const art = (name: string): Promise<HTMLImageElement> => loadImage(new URL(`./art/${name}.png`, import.meta.url).href);
  const [tomb, sand, scale, heart, feather, hippo, open, mid, shut, ammit, croc, lion, levy] = await Promise.all([
    art('tomb'), loadImage(BATTLE_BG.sand!), art('scale'), art('heart'), art('feather'), art('hippo'),
    art('closeup-open'), art('closeup-mid'), art('closeup-shut'),
    loadUnit('ammit'), loadUnit('crocodile'), loadUnit('lion'), loadUnit('levy'),
  ]);
  return {
    tomb, sand, scale: still(scale), heart: still(heart), feather: still(feather), hippo: still(hippo),
    closeUp: [still(open), still(mid), still(shut)], ammit, croc, lion, levy,
  };
}

// ---------------------------------------------------------------- the scale, in its parts (art px of scale.png)

const PIVOT = { x: 96, y: 45 } as const;
const BEAM = { x: 20, y: 37, w: 152, h: 16 } as const;
const POST_TOP = { x: 84, y: 10, w: 24, h: 44 } as const;
const POST = { x: 62, y: 53, w: 68, h: 124 } as const;
/** Each pan with its cords, and the point it hangs from on the beam. */
const PANS = [
  { crop: { x: 0, y: 49, w: 64, h: 84 }, hang: { x: 31, y: 51 }, plate: { x: 31, y: 118 } },
  { crop: { x: 128, y: 49, w: 64, h: 84 }, hang: { x: 159, y: 51 }, plate: { x: 159, y: 118 } },
] as const;

/** Where a point of the beam goes when it tilts by `tilt` about the pivot (art px). */
const tilted = (p: { readonly x: number; readonly y: number }, tilt: number): { x: number; y: number } => {
  const dx = p.x - PIVOT.x;
  const dy = p.y - PIVOT.y;
  return { x: PIVOT.x + dx * Math.cos(tilt) - dy * Math.sin(tilt), y: PIVOT.y + dx * Math.sin(tilt) + dy * Math.cos(tilt) };
};

interface ScaleLoad {
  readonly tilt: number;
  /** Things on each pan, drawn standing on its plate: [left, right]. */
  readonly on: readonly [((x: number, y: number) => void) | null, ((x: number, y: number) => void) | null];
}

/** The balance with its pivot at (x, y): the beam tilted, the pans hanging level from its ends. */
function drawScale(ctx: CanvasRenderingContext2D, cast: Cast, x: number, y: number, s: number, load: ScaleLoad): void {
  const img = cast.scale.img;
  const part = (crop: { x: number; y: number; w: number; h: number }, ox: number, oy: number): void =>
    drawFrame(ctx, cast.scale, 0, { x: x + ox * s, y: y + oy * s, scale: s, ax: PIVOT.x, ay: PIVOT.y, crop });
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(Math.round(x), Math.round(y));
  ctx.rotate(load.tilt);
  ctx.drawImage(img, BEAM.x, BEAM.y, BEAM.w, BEAM.h, (BEAM.x - PIVOT.x) * s, (BEAM.y - PIVOT.y) * s, BEAM.w * s, BEAM.h * s);
  ctx.restore();
  part(POST, 0, 0);
  PANS.forEach((pan, i) => {
    const end = tilted(pan.hang, load.tilt);
    const ox = Math.round(end.x - pan.hang.x);
    const oy = Math.round(end.y - pan.hang.y);
    part(pan.crop, ox, oy);
    load.on[i]?.(x + (pan.plate.x - PIVOT.x + ox) * s, y + (pan.plate.y - PIVOT.y + oy) * s);
  });
  part(POST_TOP, 0, 0);
}

// ---------------------------------------------------------------- the shots

function tomb(ctx: CanvasRenderingContext2D, cast: Cast, dim = 0): void {
  drawBackdrop(ctx, cast.tomb, 8, 0.5, 0.6, WV, HV);
  wash(ctx, WV, HV, '#0b0604', 0.25 + 0.55 * dim);
  vignette(ctx, WV, HV, 0.7 + 0.3 * dim);
}

/** The heart standing on a plate at (x, y). */
const heartOn = (ctx: CanvasRenderingContext2D, cast: Cast, s: number, alpha = 1) => (x: number, y: number): void =>
  drawDissolved(ctx, cast.heart, 0, alpha, { x, y: y + 2 * s, scale: s, ax: 31, ay: 60 });

/**
 * The close-up's scale: the same video pixels per art pixel as the heart and
 * its pan beside it, so the frame has one pixel density. Its art is
 * 256 × 256, the body running off the right edge.
 */
const CLOSE = 5;
/** Where her lower jaw's gape sits in the close-up (art px), for putting her jaws on the heart. */
const GAPE = { x: 74, y: 150 } as const;
/** Open (0), half shut (1) or shut (2) for a jaw angle given as her attack strip's frame and its strike frame. */
const jawsFor = (frame: number, strike: number): 0 | 1 | 2 => (frame < strike ? 0 : frame === strike ? 1 : 2);

function drawHook(ctx: CanvasRenderingContext2D, cast: Cast, t: number): void {
  const p = hookPose(t);
  tomb(ctx, cast);
  // Her close-up, jaws wide over the heart (her body runs off the right edge); the heart on its pan just under the lower jaw.
  const jaws = jawsFor(p.frame, GAPE_FRAME + 1);
  drawFrame(ctx, cast.closeUp[jaws], 0, { x: -p.dx + p.shake, y: 125 + p.dy, scale: CLOSE, ax: 0, ay: 0 });
  const plate = { x: 205, y: 1245 };
  const pan = PANS[0];
  drawFrame(ctx, cast.scale, 0, { x: plate.x + p.shake, y: plate.y, scale: 5, ax: pan.plate.x, ay: pan.plate.y, crop: pan.crop });
  heartOn(ctx, cast, 5, p.heart)(plate.x + p.shake, plate.y);
}

function drawMeet(ctx: CanvasRenderingContext2D, cast: Cast, t: number): void {
  tomb(ctx, cast);
  const a = cast.ammit;
  drawFrame(ctx, a.idle, Math.floor(wrap(t) * 5), { x: 520, y: 1180, scale: 5, ax: a.art.footX, ay: a.art.footY });
  drawLabel(ctx, 'AMMIT', WV / 2, 640, 120, nameLabel(t), GILT);
}

/** One of her three animals on its own, dissolving in as its line starts ("a crocodile's…", "a lion's…", "and a hippo's…"). */
function drawAnimal(ctx: CanvasRenderingContext2D, cast: Cast, t: number, which: 'croc' | 'lion' | 'hippo'): void {
  tomb(ctx, cast);
  const u = wrap(t);
  if (which === 'croc') {
    const c = cast.croc;
    drawDissolved(ctx, c.idle, Math.floor(u * 5), animalIn(t, at(W.a)), { x: 545, y: 1100, scale: 7, ax: c.art.footX, ay: c.art.footY });
    drawLabel(ctx, 'crocodile', WV / 2, 840, 80, animalIn(t, at(W.a)), GILT);
  } else if (which === 'lion') {
    const l = cast.lion;
    drawDissolved(ctx, l.idle, Math.floor(u * 5), animalIn(t, at(W.a2)), { x: 520, y: 1170, scale: 5, ax: l.art.footX, ay: l.art.footY });
    drawLabel(ctx, 'lion', WV / 2, 640, 80, animalIn(t, at(W.a2)), GILT);
  } else {
    drawDissolved(ctx, cast.hippo, 0, animalIn(t, at(W.and)), { x: 540, y: 1190, scale: 5, ax: 86, ay: 117 });
    drawLabel(ctx, 'hippo', WV / 2, 660, 80, animalIn(t, at(W.and)), GILT);
  }
}

function drawThree(ctx: CanvasRenderingContext2D, cast: Cast, t: number): void {
  tomb(ctx, cast);
  const u = wrap(t);
  const k = mergeAt(t);
  // Stacked big on a diagonal the way they sit in her: the head top right, the body in the middle, the backside low left.
  const toward = (p: { readonly x: number; readonly y: number }, to: { readonly x: number; readonly y: number }) => ({
    x: Math.round(p.x + (to.x - p.x) * k), y: Math.round(p.y + (to.y - p.y) * k),
  });
  const frame = Math.floor(u * 5);
  const hippo = toward({ x: 400, y: 1250 }, { x: 330, y: 1200 });
  const lion = toward({ x: 560, y: 960 }, { x: 560, y: 1150 });
  const croc = toward({ x: 640, y: 660 }, { x: 760, y: 900 });
  drawDissolved(ctx, cast.hippo, 0, 1 - k, { ...hippo, scale: 4, ax: 86, ay: 117 });
  drawDissolved(ctx, cast.lion.idle, frame, 1 - k, { ...lion, scale: 4, ax: cast.lion.art.footX, ay: cast.lion.art.footY });
  drawDissolved(ctx, cast.croc.idle, frame, 1 - k, { ...croc, scale: 5, ax: cast.croc.art.footX, ay: cast.croc.art.footY });
  // They become her close-up, each part labelled where it is: the head left, the mane above, the hippo body off to the right.
  drawDissolved(ctx, cast.closeUp[0], 0, k, { x: 64, y: 470, scale: 4, ax: 0, ay: 0 });
  const l = partLabels(t);
  drawLabel(ctx, 'crocodile', 270, 770, 66, l, GILT);
  drawLabel(ctx, 'lion', 560, 520, 66, l, GILT);
  drawLabel(ctx, 'hippo', 940, 640, 66, l, GILT);
}

function drawWeigh(ctx: CanvasRenderingContext2D, cast: Cast, t: number): void {
  const u = wrap(t);
  tomb(ctx, cast, dimAt(t));
  const s = 5;
  const drop = heartDrop(t);
  const feather = featherDrop(t);
  const heart = (x: number, y: number): void => {
    if (u < at(W.heart) - 0.05) return;
    heartOn(ctx, cast, 3, heartLeft(t))(x, y - Math.round((1 - drop) * 700));
  };
  const plume = (x: number, y: number): void => {
    if (u < at(W.feather) - 0.1) return;
    drawFrame(ctx, cast.feather, 0, { x: x + Math.round(30 * Math.sin(feather * 7) * (1 - feather)), y: y - Math.round((1 - feather) * 600) + 3 * 3, scale: 3, ax: 24, ay: 92 });
  };
  drawScale(ctx, cast, 540, 640, s, { tilt: tiltAt(t), on: [heart, plume] });
  if (u >= at(W.ammit2) - 0.3) {
    const a = cast.ammit;
    // Her close-up, at the scale's own pixel size, slides in big and low; her jaws snap shut on the heart's pan.
    const pan = PANS[0].plate;
    const at = { x: 540 + (pan.x - PIVOT.x) * s, y: 640 + (pan.y - PIVOT.y) * s - 40 };
    const x = Math.round(at.x - GAPE.x * CLOSE + 1150 * (1 - walkIn(t)));
    const bob = walkIn(t) < 1 ? Math.round(6 * Math.abs(Math.sin(u * 9))) : 0;
    const jaws = u >= BITE_AT ? jawsFor(biteFrame(t), a.art.strike) : 0;
    drawFrame(ctx, cast.closeUp[jaws], 0, { x, y: Math.round(at.y - GAPE.y * CLOSE) - bob, scale: CLOSE, ax: 0, ay: 0 });
  }
}

function drawBattle(ctx: CanvasRenderingContext2D, cast: Cast, t: number): void {
  drawBackdrop(ctx, cast.sand, 2, 0.5, 0.46, WV, HV);
  const u = wrap(t);
  const a = cast.ammit;
  const b = battleFrame(t);
  const flinch = Math.round(12 * battleHit(t));
  const v = cast.levy;
  [{ x: 960, y: 955 }, { x: 1030, y: 1025 }].forEach((p, i) =>
    drawFrame(ctx, v.idle, Math.floor(u * 5) + i, { x: p.x + flinch, y: p.y, scale: 6, ax: v.art.footX, ay: v.art.footY, flip: true }),
  );
  drawFrame(ctx, b.kind === 'attack' ? a.attack : a.idle, b.frame, { x: 460, y: 1035, scale: 5, ax: a.art.footX, ay: a.art.footY });
  // Where she is in the game, above her back: she is chapter 2 (paid), the call to action offers chapter 1.
  drawLabel(ctx, 'Ammit · chapter 2', 340, 585, 50, chapterLabel(t), GILT);
  drawCta(ctx, u, CTA.big, CTA);
}

function drawShot(ctx: CanvasRenderingContext2D, cast: Cast, t: number): void {
  const scene = sceneAt(t);
  if (scene === 'hook') return drawHook(ctx, cast, t);
  if (scene === 'meet') return drawMeet(ctx, cast, t);
  if (scene === 'croc' || scene === 'lion' || scene === 'hippo') return drawAnimal(ctx, cast, t, scene);
  if (scene === 'three') return drawThree(ctx, cast, t);
  if (scene === 'weigh') return drawWeigh(ctx, cast, t);
  drawBattle(ctx, cast, t);
  const back = returnAt(t);
  if (back > 0) drawShotDissolved(ctx, back, 11, (g) => drawHook(g, cast, t));
}

export async function createAmmit(ctx: CanvasRenderingContext2D): Promise<Short> {
  const cast = await loadCast();
  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    drawShot(ctx, cast, t);
    drawCaptions(ctx, PHRASES, TEXT, t);
    ctx.restore();
  };
  return { loopSeconds: LOOP_S, draw, audio: renderAmmitAudio };
}
