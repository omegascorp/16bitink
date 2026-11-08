import { DECOR_SIZE, drawDecor, type DecorId } from '../../../src/art/decorArt';
import { INK, makeCanvas, PAPER } from '../../../src/art/pen';
import { ART_RES, drawPaper, drawRock, drawWeed, type WeedKind } from '../../../src/art/propArt';
import { BOIL_FPS, BOIL_FRAMES } from '../../../src/art/textures';
import type { FishShape } from '../../../src/art/fishArt';
import { createRng } from '../../../src/logic/rng';
import { drawTextLine } from '../captions';
import { FRAME } from '../descent/frame';
import type { GameCard } from '../foodchain/inserts';
import { clamp01, smooth } from '../short';
import { makeSprite, type Sprite } from '../sprites';
import { drawSwimmer } from '../swimmer';

/**
 * The InkFish advert inside the bite-force video, set the way the game looks
 * near the bottom of a shallow level: the game's paper water with its depth
 * wash, a hazy reef far off, the sand with its ink floor line and stipple,
 * the game's own rocks, weeds and corals (decorArt, propArt), current marks
 * and drifting specks, a sardine shoal and reef fish going about their day,
 * and the inkling in the middle eating three minnows and growing each time.
 * The camera drifts slowly right, each layer at its own speed.
 */

const W = FRAME.width;
const H = FRAME.height;
type Rgb = readonly [number, number, number];
const PAPER_RGB: Rgb = [244, 237, 220];
/** The game's shallow wash colour (world.ts: 0x2c4f86 laid over the paper). */
const WATER_RGB: Rgb = [44, 79, 134];
const mix = (a: Rgb, b: Rgb, k: number): Rgb => [0, 1, 2].map((i) => Math.round(a[i]! + (b[i]! - a[i]!) * k)) as unknown as Rgb;
const css = (c: Rgb, a = 1): string => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

/** Where the sand meets the water, screen y, at world x (mid layer). */
const floorY = (x: number): number => 852 + 16 * Math.sin(x / 330 + 0.6) + 8 * Math.sin(x / 120 + 2.1);
const MID_W = W + 640;
const FAR_W = W + 320;

const wrap = (v: number, span: number): number => ((v % span) + span) % span;
const boilOf = (t: number): number => Math.floor(t * BOIL_FPS) % BOIL_FRAMES;

/** The camera's world x at `u` seconds into the card: a slow drift right with a little swell. */
const camAt = (u: number): number => 180 + 34 * u + 24 * Math.sin(u * 0.45);

// ---------------------------------------------------------------- pieces drawn once

const canvasOf = (w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement => {
  const { canvas, ctx } = makeCanvas(Math.ceil(w), Math.ceil(h));
  draw(ctx);
  return canvas;
};

const decorCanvas = (kind: DecorId, seed: number): HTMLCanvasElement =>
  canvasOf(DECOR_SIZE[kind].w * ART_RES, DECOR_SIZE[kind].h * ART_RES, (c) => drawDecor(c, kind, seed));

/** Stands a canvas on the ground at x (its bottom centre sunk `sink` px into the sand), scaled. */
function standOn(ctx: CanvasRenderingContext2D, img: HTMLCanvasElement, x: number, ground: number, scale: number, sink: number, flip = false): void {
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.save();
  ctx.translate(x, ground + sink);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(img, -w / 2, -h, w, h);
  ctx.restore();
}

/** The sand: a pale band under the inked floor line, stippled denser as it goes down, as in the game. */
function drawSand(ctx: CanvasRenderingContext2D, width: number, ground: (x: number) => number, seed: number, dots: number): void {
  const rng = createRng(seed);
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= width; x += 16) ctx.lineTo(x, ground(x));
  ctx.lineTo(width, H);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, 800, 0, H);
  g.addColorStop(0, 'rgba(230,216,184,0.78)');
  g.addColorStop(1, 'rgba(222,205,168,0.9)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 2.6;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let x = 0; x <= width; x += 14) {
    const y = ground(x) + (x === 0 ? 0 : (rng() - 0.5) * 2.4);
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  for (let i = 0; i < dots; i++) {
    const x = rng() * width;
    const d = rng();
    ctx.globalAlpha = 0.22 + d * 0.38;
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(x, ground(x) + 6 + d * d * (H - ground(x)), 0.6 + rng() * 1.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** The reef far off: a ridge of sand, rocks, kelp and fans, washed over by the water so it sits back. */
function makeFarLayer(): HTMLCanvasElement {
  const ground = (x: number): number => 742 + 22 * Math.sin(x / 260) + 12 * Math.sin(x / 97 + 1);
  return canvasOf(FAR_W, H, (ctx) => {
    const kelp = canvasOf(220, 1100, (c) => drawWeed(c, 7, 0, 0, 220, 1100));
    const fern = canvasOf(256, 512, (c) => drawWeed(c, 9, 2, 0, 256, 512));
    const rock = canvasOf(620, 300, (c) => drawRock(c, 21, 620, 300));
    const rock2 = canvasOf(460, 240, (c) => drawRock(c, 23, 460, 240));
    for (const [x, s] of [[120, 0.62], [300, 0.5], [1540, 0.66], [1720, 0.52], [2100, 0.6]] as const) standOn(ctx, kelp, x, ground(x), s, 30);
    standOn(ctx, rock, 520, ground(520), 0.8, 12);
    standOn(ctx, rock2, 1360, ground(1360), 0.75, 10, true);
    standOn(ctx, rock, 1960, ground(1960), 0.7, 10, true);
    const pieces: readonly (readonly [DecorId, number, number])[] = [
      ['seafan', 760, 0.75], ['staghorn', 900, 0.7], ['tubesponge', 1080, 0.7], ['braincoral', 1180, 0.6], ['seafan', 2220, 0.7], ['staghorn', 40, 0.6],
    ];
    pieces.forEach(([kind, x, s], i) => standOn(ctx, decorCanvas(kind, 140 + i), x, ground(x), s, 6, i % 2 === 1));
    for (const x of [640, 1000, 1640]) standOn(ctx, fern, x, ground(x), 0.55, 12, x > 900);
    drawSand(ctx, FAR_W, ground, 31, 1500);
    // Haze: the water between here and there, over everything just drawn.
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = css(mix(PAPER_RGB, WATER_RGB, 0.2), 0.62);
    ctx.fillRect(0, 0, FAR_W, H);
    ctx.globalCompositeOperation = 'source-over';
  });
}

/** The seabed the inkling swims over: sand, two boulders, corals, shells and a giant clam (weeds sway apart). */
function makeMidLayer(): HTMLCanvasElement {
  return canvasOf(MID_W, H, (ctx) => {
    const big = canvasOf(760, 360, (c) => drawRock(c, 5, 760, 360));
    const small = canvasOf(480, 240, (c) => drawRock(c, 8, 480, 240));
    standOn(ctx, big, 1720, floorY(1720), 1, 22);
    standOn(ctx, small, 380, floorY(380), 1, 16, true);
    standOn(ctx, small, 2440, floorY(2440), 0.85, 14);
    drawSand(ctx, MID_W, floorY, 17, 7000);
    const pieces: readonly (readonly [DecorId, number, number, boolean])[] = [
      ['staghorn', 700, 1.1, false], ['braincoral', 900, 0.95, true], ['seafan', 1960, 1.15, false], ['tubesponge', 2120, 1.05, true],
      ['giantclam', 1500, 0.95, false], ['anemone', 1270, 1.0, false], ['mussels', 1090, 1.0, true], ['starfish', 1660, 1.0, false],
      ['scallops', 2280, 1.0, true], ['sanddollar', 560, 1.0, false], ['pebbles', 1850, 1.0, false], ['starfish', 160, 0.9, true],
      ['anemone', 2560, 0.9, true], ['pebbles', 1180, 0.8, true],
    ];
    pieces.forEach(([kind, x, s, flip], i) => {
      const sink = Math.min(10, DECOR_SIZE[kind].h * 0.08) * 2;
      standOn(ctx, decorCanvas(kind, 60 + i), x, floorY(x), s, sink, flip);
    });
  });
}

interface Weed {
  readonly frames: readonly HTMLCanvasElement[];
  readonly x: number;
  readonly scale: number;
  readonly phase: number;
  readonly flip: boolean;
}

function makeWeed(kind: WeedKind, seed: number, x: number, w: number, h: number, scale: number): Weed {
  const frames = Array.from({ length: BOIL_FRAMES }, (_, f) => canvasOf(w, h, (c) => drawWeed(c, seed, kind, f, w, h)));
  return { frames, x, scale, phase: (seed * 1.7) % (Math.PI * 2), flip: seed % 2 === 0 };
}

/** Weeds rooted along the mid seabed, and two big ones close to the lens. */
function makeWeeds(): { readonly mid: readonly Weed[]; readonly near: readonly Weed[] } {
  const mid = [
    makeWeed(2, 3, 300, 256, 512, 1.1), makeWeed(1, 4, 610, 256, 512, 1.0), makeWeed(1, 5, 1000, 256, 512, 0.95),
    makeWeed(1, 6, 1340, 256, 512, 1.05), makeWeed(2, 11, 1880, 256, 512, 1.2), makeWeed(1, 12, 2240, 256, 512, 1.0),
    makeWeed(0, 13, 120, 240, 1200, 0.8), makeWeed(0, 14, 2380, 240, 1200, 0.85), makeWeed(2, 15, 2620, 256, 512, 1.1),
  ];
  const near = [makeWeed(2, 21, 70, 256, 512, 1.75), makeWeed(1, 22, 2080, 256, 512, 1.9)];
  return { mid, near };
}

/** Sways a weed about its root, the game's calm sway plus a gentle lean with the current. */
function drawWeedAt(ctx: CanvasRenderingContext2D, weed: Weed, x: number, ground: number, t: number, alpha = 1): void {
  const img = weed.frames[boilOf(t)]!;
  const w = img.width * weed.scale;
  const h = img.height * weed.scale;
  if (x + w < -40 || x - w > W + 40) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, ground + 16);
  ctx.rotate(0.05 * Math.sin(t * 0.9 + weed.phase) + 0.035 * (0.75 + 0.25 * Math.sin(t * 0.7 - x / 260)));
  if (weed.flip) ctx.scale(-1, 1);
  ctx.drawImage(img, -w / 2, -h, w, h);
  ctx.restore();
}

// ---------------------------------------------------------------- the water

/** The game's paper, washed with the shallow sea: paler up top where the light comes in, bluer down by the sand. */
function makeWater(): HTMLCanvasElement {
  return canvasOf(W, H, (ctx) => {
    const tile = canvasOf(512, 512, (c) => drawPaper(c, 512));
    ctx.fillStyle = ctx.createPattern(tile, 'repeat')!;
    ctx.fillRect(0, 0, W, H);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, css(WATER_RGB, 0.05));
    g.addColorStop(0.55, css(WATER_RGB, 0.16));
    g.addColorStop(1, css(WATER_RGB, 0.24));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // Sunlight from the surface, brightest over the title.
    const sun = ctx.createRadialGradient(W * 0.5, -120, 60, W * 0.5, -120, 1100);
    sun.addColorStop(0, 'rgba(255,252,240,0.75)');
    sun.addColorStop(1, 'rgba(255,252,240,0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, W, H);
  });
}

/** One shaft of light: soft at both edges, fading out on its way down. */
function makeShaft(): HTMLCanvasElement {
  return canvasOf(320, 920, (ctx) => {
    const across = ctx.createLinearGradient(0, 0, 320, 0);
    across.addColorStop(0, 'rgba(255,250,232,0)');
    across.addColorStop(0.5, 'rgba(255,250,232,1)');
    across.addColorStop(1, 'rgba(255,250,232,0)');
    ctx.fillStyle = across;
    ctx.fillRect(0, 0, 320, 920);
    const down = ctx.createLinearGradient(0, 0, 0, 920);
    down.addColorStop(0, 'rgba(0,0,0,1)');
    down.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = down;
    ctx.fillRect(0, 0, 320, 920);
  });
}

/** Soft shafts of light slanting down from the surface, swaying and breathing slowly. */
function drawShafts(ctx: CanvasRenderingContext2D, shaft: HTMLCanvasElement, t: number, cam: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 7; i++) {
    const x = wrap(i * 331 + 90 - cam * 0.15 + 50 * Math.sin(t * 0.25 + i * 1.9), W + 500) - 350;
    ctx.globalAlpha = 0.07 + 0.04 * Math.sin(t * 0.45 + i * 2.3);
    ctx.setTransform(0.6 + ((i * 37) % 50) / 60, 0, 0.36, 1, x, 0);
    ctx.drawImage(shaft, 0, 0);
  }
  ctx.restore();
}

/** Dappled light rippling over the sand. */
function drawDapples(ctx: CanvasRenderingContext2D, t: number, cam: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 16; i++) {
    const x = wrap(i * 173 - cam + 30 * Math.sin(t * 0.8 + i), W + 300) - 150;
    const y = 880 + ((i * 61) % 170);
    const r = 60 + ((i * 29) % 70);
    ctx.globalAlpha = 0.07 + 0.05 * Math.sin(t * 1.3 + i * 1.7);
    ctx.setTransform(1, 0, 0, 0.24, x, y);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, 'rgba(255,248,225,1)');
    g.addColorStop(1, 'rgba(255,248,225,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-r, -r, r * 2, r * 2);
  }
  ctx.restore();
}

/** The game's "~" current mark, at the video's scale. */
function makeMark(): HTMLCanvasElement {
  return canvasOf(116, 20, (ctx) => {
    ctx.strokeStyle = INK;
    ctx.globalAlpha = 0.2;
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let k = 0; k < 7; k++) {
      const x = 4 + k * 18;
      const y = 10 + Math.sin(k * 1.4) * 6;
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  });
}

interface Speck {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly depth: number;
  readonly phase: number;
}

const SPECKS: readonly Speck[] = (() => {
  const rng = createRng(77);
  return Array.from({ length: 150 }, () => ({ x: rng() * (W + 200), y: rng() * H, r: 0.8 + rng() * 1.8, depth: 0.4 + rng() * 0.8, phase: rng() * 6.3 }));
})();

const MARKS: readonly Pt2[] = (() => {
  const rng = createRng(78);
  return Array.from({ length: 34 }, () => ({ x: rng() * (W + 300), y: 110 + rng() * 640 }));
})();

interface Pt2 {
  readonly x: number;
  readonly y: number;
}

/** Current marks drifting with the water, and marine snow sinking through it, nearer specks bigger and quicker. */
function drawDrift(ctx: CanvasRenderingContext2D, mark: HTMLCanvasElement, t: number, cam: number): void {
  for (const m of MARKS) ctx.drawImage(mark, wrap(m.x + 14 * t - cam * 0.8, W + 300) - 150, m.y);
  ctx.save();
  ctx.fillStyle = INK;
  for (const s of SPECKS) {
    const x = wrap(s.x - cam * s.depth + 10 * Math.sin(t * 0.6 + s.phase), W + 200) - 100;
    const y = wrap(s.y + 14 * s.depth * t, H);
    ctx.globalAlpha = 0.1 + 0.16 * s.depth;
    ctx.beginPath();
    ctx.arc(x, y, s.r * s.depth, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- life

interface Swimmer {
  readonly sprite: Sprite;
  readonly shape: FishShape;
  /** Screen x at the card's start (before the camera), y, length, speed in px/s (sign = heading), parallax, haze. */
  readonly x: number;
  readonly y: number;
  readonly length: number;
  readonly speed: number;
  readonly par: number;
  readonly alpha: number;
  readonly phase: number;
}

function makeShoal(sprite: Sprite, shape: FishShape, n: number, seed: number, c: Pt2, spread: Pt2, length: number, speed: number, par: number, alpha: number): Swimmer[] {
  const rng = createRng(seed);
  return Array.from({ length: n }, () => {
    const a = rng() * Math.PI * 2;
    const r = Math.sqrt(rng());
    return {
      sprite, shape, x: c.x + Math.cos(a) * r * spread.x, y: c.y + Math.sin(a) * r * spread.y,
      length: length * (0.85 + rng() * 0.3), speed: speed * (0.95 + rng() * 0.1), par, alpha, phase: rng() * 6.3,
    };
  });
}

function makeLife(): { readonly back: readonly Swimmer[]; readonly front: readonly Swimmer[] } {
  const sardine = makeSprite('sardine', 0.5);
  const anchovy = makeSprite('anchovy', 0.5);
  const one = (shape: FishShape, res: number, s: Omit<Swimmer, 'sprite' | 'shape'>): Swimmer => ({ sprite: makeSprite(shape, res), shape, ...s });
  const back = [
    ...makeShoal(anchovy, 'anchovy', 22, 3, { x: 260, y: 600 }, { x: 260, y: 70 }, 26, 55, 0.4, 0.4),
    one('mullet', 1, { x: 2350, y: 470, length: 230, speed: -95, par: 0.8, alpha: 0.7, phase: 0 }),
    ...makeShoal(sardine, 'sardine', 34, 4, { x: 2050, y: 360 }, { x: 330, y: 95 }, 48, -175, 0.75, 0.85),
  ];
  const front = [
    one('wrasse', 1, { x: 60, y: 600, length: 125, speed: 175, par: 1, alpha: 1, phase: 1 }),
    one('garibaldi', 1, { x: 2150, y: 770, length: 140, speed: -80, par: 1, alpha: 1, phase: 2 }),
    ...makeShoal(makeSprite('chromis', 0.5), 'chromis', 4, 5, { x: 560, y: 690 }, { x: 70, y: 40 }, 52, 8, 1, 1),
    one('blenny', 1, { x: 1240, y: 840, length: 78, speed: 0, par: 1, alpha: 1, phase: 3 }),
  ];
  return { back, front };
}

function drawSwimmers(ctx: CanvasRenderingContext2D, fish: readonly Swimmer[], t: number, u: number, cam: number): void {
  for (const f of fish) {
    const hover = f.speed === 0 || Math.abs(f.speed) < 20;
    const x = f.x + f.speed * u - cam * f.par + (hover ? 30 * Math.sin(u * 0.7 + f.phase) : 0);
    if (x < -f.length || x > W + f.length) continue;
    const y = f.y + (hover ? 12 : 8) * Math.sin(u * 1.3 + f.phase);
    const facing: 1 | -1 = f.speed < 0 || (hover && Math.cos(u * 0.7 + f.phase) < 0) ? -1 : 1;
    const pose = { j: 0, shape: f.shape, age: 0, x, y, length: f.length, facing, tilt: 0.05 * Math.sin(u * 1.3 + f.phase), beat: t * 11 + f.phase, effort: hover ? 0.25 : 0.55 };
    drawSwimmer(ctx, f.sprite, pose, boilOf(t + f.phase), { alpha: f.alpha });
  }
}

// ---------------------------------------------------------------- the card

/** A soft paper glow behind a line of text, so it reads over the busy sea. */
function calmPatch(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, a: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(rx / ry, 1);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, ry);
  g.addColorStop(0, css(PAPER_RGB, a));
  g.addColorStop(0.6, css(PAPER_RGB, a * 0.6));
  g.addColorStop(1, css(PAPER_RGB, 0));
  ctx.fillStyle = g;
  ctx.fillRect(-ry, -ry, ry * 2, ry * 2);
  ctx.restore();
}

function makeVignette(): HTMLCanvasElement {
  return canvasOf(W, H, (ctx) => {
    const g = ctx.createRadialGradient(W / 2, H * 0.45, H * 0.45, W / 2, H * 0.45, W * 0.68);
    g.addColorStop(0, css(mix(PAPER_RGB, WATER_RGB, 0.5), 0));
    g.addColorStop(1, css(mix(PAPER_RGB, WATER_RGB, 0.55), 0.32));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  });
}

interface Kit {
  readonly water: HTMLCanvasElement;
  readonly far: HTMLCanvasElement;
  readonly mid: HTMLCanvasElement;
  readonly weeds: ReturnType<typeof makeWeeds>;
  readonly life: ReturnType<typeof makeLife>;
  readonly mark: HTMLCanvasElement;
  readonly shaft: HTMLCanvasElement;
  readonly vignette: HTMLCanvasElement;
  readonly inkling: Sprite;
  readonly minnow: Sprite;
  readonly off: CanvasRenderingContext2D;
}

function makeKit(): Kit {
  return {
    water: makeWater(), far: makeFarLayer(), mid: makeMidLayer(), weeds: makeWeeds(), life: makeLife(), mark: makeMark(), shaft: makeShaft(),
    vignette: makeVignette(), inkling: makeSprite('inkling', 4), minnow: makeSprite('minnow', 1), off: makeCanvas(W, H).ctx,
  };
}

/** The inkling centre stage, and the three minnows it eats on the beats (each comes in from ahead, to its mouth). */
function drawPlayer(ctx: CanvasRenderingContext2D, k: Kit, t: number, u: number, eatUp: number): void {
  const meals = [eatUp - 0.4, eatUp + 0.5, eatUp + 1.3];
  const eaten = meals.filter((m) => t > m).length;
  const size = 170 * 1.35 ** eaten;
  const x = W * 0.48 + 60 * Math.sin(u * 0.6);
  const y = H * 0.5 + 20 * Math.sin(u * 1.1);
  meals.forEach((m, i) => {
    const left = clamp01((m - t) / 2.2);
    if (left <= 0 || t < m - 2.2) return;
    const ease = smooth(left);
    const mouthX = x + 0.42 * size;
    const fromY = [-90, 70, -30][i]!;
    const mx = mouthX + (240 + 160 * i) * ease;
    const my = y + fromY * ease + 10 * Math.sin(t * 3 + i);
    const shrink = clamp01((m - t) / 0.12);
    drawSwimmer(ctx, k.minnow, { j: 0, shape: 'minnow', age: 0, x: mx + 30 * shrink, y: my, length: 78 * Math.min(1, shrink + 0.2), facing: -1, tilt: 0, beat: t * 14 + i, effort: 0.6 }, boilOf(t));
  });
  const gulping = meals.some((m) => t > m - 0.35 && t < m + 0.1);
  drawSwimmer(ctx, k.inkling, { j: 0, shape: 'inkling', age: 0, x, y, length: size, facing: 1, tilt: 0.04 * Math.sin(u * 1.1), beat: t * 10, effort: 0.5 }, boilOf(t), { jaw: gulping ? 0.8 : 0 });
}

function drawScene(ctx: CanvasRenderingContext2D, k: Kit, t: number, from: number, eatUp: number, free: number): void {
  const u = t - from;
  const cam = camAt(u);
  ctx.drawImage(k.water, 0, 0);
  drawShafts(ctx, k.shaft, t, cam);
  ctx.drawImage(k.far, -cam * 0.4, 0);
  drawSwimmers(ctx, k.life.back, t, u, cam);
  drawDrift(ctx, k.mark, t, cam);
  ctx.drawImage(k.mid, -cam, 0);
  drawDapples(ctx, t, cam);
  for (const w of k.weeds.mid) drawWeedAt(ctx, w, w.x - cam, floorY(w.x), t);
  drawSwimmers(ctx, k.life.front, t, u, cam);
  drawPlayer(ctx, k, t, u, eatUp);
  for (const w of k.weeds.near) drawWeedAt(ctx, w, w.x - (cam - camAt(0)) * 1.4, H + 40, t);
  ctx.drawImage(k.vignette, 0, 0);
  calmPatch(ctx, W / 2, 150, 520, 130, 0.7);
  drawTextLine(ctx, 'InkFish', W / 2, 190, 150, 700, 1);
  const f = smooth((t - free) / 0.4);
  calmPatch(ctx, W / 2, H - 140, 640, 95, 0.55 * f);
  drawTextLine(ctx, 'free in your browser · 16bit.ink', W / 2, H - 120, 72, 700, f);
}

/** Same interface as foodchain's game card; the scenery is drawn once, on first use. */
export function createGameCard(): GameCard {
  let kit: Kit | null = null;
  return {
    draw(ctx, t, from, eatUp, free, alpha) {
      if (alpha <= 0) return;
      kit ??= makeKit();
      if (alpha >= 1) {
        drawScene(ctx, kit, t, from, eatUp, free);
        return;
      }
      kit.off.clearRect(0, 0, W, H);
      drawScene(kit.off, kit, t, from, eatUp, free);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.drawImage(kit.off.canvas, 0, 0);
      ctx.restore();
    },
  };
}
