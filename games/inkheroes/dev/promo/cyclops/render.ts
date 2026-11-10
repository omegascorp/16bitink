import { BATTLE_BG } from '../../../src/art/pixel/manifest';
import { BOOK_FONT, drawCaptions, drawLabel, GILT } from '../captions';
import { drawCta } from '../cta';
import { drawBackdrop, drawDissolved, drawFrame, drawShotDissolved, loadImage, loadUnit, still, vignette, type Strip, type Unit } from '../pixel';
import { renderCyclopsAudio } from './audio';
import { type Short, VIDEO } from '../short';
import {
  battleFrame, battleHit, CTA, digDown, elephantBob, elephantWalk, giantIn, giantShake, heightBar, LOOP_S, PHRASES, returnAt, sceneAt,
  skullPose, TEXT, THROW_AT, throwFrame, wrap, yearLabel,
} from './story';

/** Draws "This Skull Might Be Where The Cyclops Came From" (story.ts has the beats). */

const { width: WV, height: HV } = VIDEO;
const DARK = '#130b06';

interface Cast {
  readonly skull: Strip;
  readonly head: Strip;
  readonly elephant: Strip;
  readonly scientist: Strip;
  readonly strata: HTMLImageElement;
  readonly rough: HTMLImageElement;
  readonly grass: HTMLImageElement;
  readonly cyclops: Unit;
  readonly hoplite: Unit;
}

async function loadCast(): Promise<Cast> {
  const art = (name: string): Promise<HTMLImageElement> => loadImage(new URL(`./art/${name}.png`, import.meta.url).href);
  const [skull, head, elephant, scientist, strata, rough, grass, cyclops, hoplite] = await Promise.all([
    art('skull'), art('elephant-head'), art('elephant'), art('scientist'), art('strata'),
    loadImage(BATTLE_BG.rough!), loadImage(BATTLE_BG.grass!), loadUnit('ogre'), loadUnit('spearman'),
  ]);
  return { skull: still(skull), head: still(head), elephant: still(elephant), scientist: still(scientist), strata, rough, grass, cyclops, hoplite };
}

/** The skull's hole (art px): it goes where the eye would. */
const HOLE = { x: 63, y: 59 } as const;
const SKULL_AT = { x: 540, y: 905 } as const;

/** A dark room lit from behind the subject. */
function darkRoom(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  ctx.fillStyle = DARK;
  ctx.fillRect(0, 0, WV, HV);
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, 'rgba(120,72,34,0.55)');
  g.addColorStop(1, 'rgba(120,72,34,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WV, HV);
}

function drawSkullShot(ctx: CanvasRenderingContext2D, cast: Cast, t: number): void {
  const p = skullPose(t);
  const y = SKULL_AT.y - p.lift;
  darkRoom(ctx, SKULL_AT.x, y, 760);
  const place = { x: SKULL_AT.x + p.shake, y, scale: p.scale, ax: HOLE.x, ay: HOLE.y };
  drawFrame(ctx, cast.skull, 0, place);
  if (p.glow > 0) {
    // Light in the hole: it reads as an eye before the reveal.
    const r = 26 * p.scale;
    const g = ctx.createRadialGradient(place.x, y, 0, place.x, y, r);
    g.addColorStop(0, `rgba(255,170,60,${0.55 * p.glow})`);
    g.addColorStop(1, 'rgba(255,170,60,0)');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.fillRect(place.x - r, y - r, r * 2, r * 2);
    ctx.restore();
  }
  drawDissolved(ctx, cast.head, 0, p.flesh, place);
  vignette(ctx, WV, HV, 0.6, SKULL_AT.x, y);
}

function drawSicily(ctx: CanvasRenderingContext2D, cast: Cast, t: number): void {
  drawBackdrop(ctx, cast.rough, 2, 0.5, 0.5, WV, HV);
  const scale = 6;
  const x = -420 + 900 * elephantWalk(t);
  const feet = 1190;
  drawFrame(ctx, cast.elephant, 0, { x, y: feet - elephantBob(t) * scale, scale, ax: 57, ay: 108 });
  const bar = heightBar(t);
  if (bar > 0) {
    // The size marker: ground to the top of the back.
    const top = feet - (108 - 34) * scale;
    const bx = x + (107 - 57) * scale + 46;
    ctx.save();
    ctx.globalAlpha = bar;
    ctx.fillStyle = '#120b05';
    ctx.fillRect(bx - 9, top - 4, 18, feet - top + 8);
    ctx.fillRect(bx - 30, top - 4, 60, 18);
    ctx.fillRect(bx - 30, feet - 14, 60, 18);
    ctx.fillStyle = GILT;
    ctx.fillRect(bx - 4, top, 8, feet - top);
    ctx.fillRect(bx - 24, top, 48, 8);
    ctx.fillRect(bx - 24, feet - 8, 48, 8);
    ctx.restore();
    drawLabel(ctx, '≈1 m', bx, top - 90, 84, bar, GILT, BOOK_FONT);
    drawLabel(ctx, '3 ft', bx, top - 22, 76, bar, undefined, BOOK_FONT);
  }
}

function drawRock(ctx: CanvasRenderingContext2D, cast: Cast, t: number): void {
  drawBackdrop(ctx, cast.strata, 10, 0.5, digDown(t), WV, HV);
  vignette(ctx, WV, HV, 0.5);
}

function drawScientist(ctx: CanvasRenderingContext2D, cast: Cast, t: number): void {
  darkRoom(ctx, 640, 760, 900);
  drawFrame(ctx, cast.scientist, 0, { x: 400, y: 1250, scale: 7, ax: 60, ay: 116 });
  vignette(ctx, WV, HV, 0.5, 520, 800);
  drawLabel(ctx, '1914', 830, 1060, 150, yearLabel(t), GILT);
}

function drawGreeks(ctx: CanvasRenderingContext2D, cast: Cast, t: number): void {
  drawBackdrop(ctx, cast.grass, 2, 0.5, 0.42, WV, HV);
  const u = wrap(t);
  const h = cast.hoplite;
  drawFrame(ctx, h.idle, Math.floor(u * 5), { x: 330, y: 1220, scale: 7, ax: h.art.footX, ay: h.art.footY });
  drawFrame(ctx, cast.skull, 0, { x: 790, y: 1216, scale: 2, ax: 64, ay: 118 });
}

/** The Cyclops's eye in his idle frame (art px): it lands where the skull's hole was. */
const EYE = { x: 56, y: 48 } as const;
/** Where the hole, then the eye, sits in the giant shot. */
const GIANT_EYE_AT = { x: 540, y: 985 } as const;

function drawGiant(ctx: CanvasRenderingContext2D, cast: Cast, t: number): void {
  const k = giantIn(t);
  const shake = giantShake(t);
  darkRoom(ctx, GIANT_EYE_AT.x, GIANT_EYE_AT.y, 860);
  ctx.save();
  ctx.translate(shake, Math.round(shake * 0.5));
  // The skull goes as the Cyclops comes, his eye on its hole; he fills the frame (cropped at the knees).
  drawDissolved(ctx, cast.skull, 0, 1 - k, { x: GIANT_EYE_AT.x, y: GIANT_EYE_AT.y, scale: 8, ax: HOLE.x, ay: HOLE.y });
  const c = cast.cyclops;
  const at = { x: GIANT_EYE_AT.x, y: GIANT_EYE_AT.y, scale: 12, ax: EYE.x, ay: EYE.y };
  if (wrap(t) >= THROW_AT) drawFrame(ctx, c.attack, throwFrame(t), at);
  else drawDissolved(ctx, c.idle, Math.floor(wrap(t) * 5), k, at);
  ctx.restore();
  vignette(ctx, WV, HV, 0.45, GIANT_EYE_AT.x, GIANT_EYE_AT.y);
}

function drawBattle(ctx: CanvasRenderingContext2D, cast: Cast, t: number): void {
  drawBackdrop(ctx, cast.grass, 2, 0.5, 0.46, WV, HV);
  const u = wrap(t);
  const c = cast.cyclops;
  const b = battleFrame(t);
  const flinch = Math.round(12 * battleHit(t));
  const h = cast.hoplite;
  [{ x: 900, y: 925 }, { x: 790, y: 1010 }, { x: 980, y: 1025 }].forEach((p, i) =>
    drawFrame(ctx, h.idle, Math.floor(u * 5) + i, { x: p.x + flinch, y: p.y, scale: 6, ax: h.art.footX, ay: h.art.footY, flip: true }),
  );
  drawFrame(ctx, b.kind === 'attack' ? c.attack : c.idle, b.frame, { x: 290, y: 1030, scale: 6, ax: c.art.footX, ay: c.art.footY });
  drawCta(ctx, u, CTA.big, CTA);
}

function drawShot(ctx: CanvasRenderingContext2D, cast: Cast, t: number): void {
  const scene = sceneAt(t);
  if (scene === 'skull') return drawSkullShot(ctx, cast, t);
  if (scene === 'sicily') return drawSicily(ctx, cast, t);
  if (scene === 'rock') return drawRock(ctx, cast, t);
  if (scene === 'scientist') return drawScientist(ctx, cast, t);
  if (scene === 'greeks') return drawGreeks(ctx, cast, t);
  if (scene === 'giant') return drawGiant(ctx, cast, t);
  drawBattle(ctx, cast, t);
  // The skull dissolving back in for frame 1, in cells of its own art pixels.
  const back = returnAt(t);
  if (back > 0) drawShotDissolved(ctx, back, 8, (g) => drawSkullShot(g, cast, t));
}

export async function createCyclops(ctx: CanvasRenderingContext2D): Promise<Short> {
  const cast = await loadCast();
  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    drawShot(ctx, cast, t);
    drawCaptions(ctx, PHRASES, TEXT, t);
    ctx.restore();
  };
  return { loopSeconds: LOOP_S, draw, audio: renderCyclopsAudio };
}
