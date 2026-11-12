import type { SliceJob } from '@16bitink/game-sdk';
import type Phaser from 'phaser';
import { BEACH_FINDS } from '../logic/finds';
import { FOOD_KINDS } from '../logic/items';
import { SHELL_KINDS, type ShellKind } from '../logic/shells';
import { SPECIES, type SpeciesId } from '../logic/species';
import { BACKDROP_W, BOAT_BOX, BOAT_DRAW, THEME_BOATS, THEME_MOVERS, THEMES, type ThemeId } from './backdrop';
import { BUTTON_ICONS, drawButtonIcon, ICON, ICON_RES } from './buttonArt';
import { drawCrabBack, drawCrabFront } from './crabArt';
import { brahminy } from './birds/brahminy';
import { gullFlight } from './birds/gullFlight';
import { hawk } from './birds/hawk';
import { kestrel } from './birds/kestrel';
import { kingfisher } from './birds/kingfisher';
import { osprey } from './birds/osprey';
import { snowyOwl } from './birds/snowyOwl';
import { CRITTER_FRAME, CRITTER_GROUND, CRITTER_RES, drawCritter, drawHeronStrike } from './critterArt';
import { FRAME, GROUND } from './frame';
import { drawFood, drawHighlight, drawPuff, FOOD_FRAME, FOOD_GROUND, FOOD_RES } from './itemArt';
import { drawFind } from './findArt';
import { measureShell, setShellMeasurer } from './shellFit';
import { makeDraw, type Draw } from './kit';
import { ART_RES, BOIL, PAPER, RED } from './palette';
import { makeCanvas } from './pen';
import { drawShell } from './shellArt';
import { TEX } from './texturePlan';

export { TEX } from './texturePlan';

type Textures = Phaser.Textures.TextureManager;
/** Draws one texture and adds it to the manager. */
type Baker = (textures: Textures) => void;

const PAPER_TILE = 256;
/** Frame px of the sand-puff drawing. */
export const PUFF = 64;

/**
 * Adds a drawing that never changes as a plain image texture. addCanvas
 * would make a CanvasTexture, whose constructor reads every pixel back
 * (getImageData) and keeps a second copy: a GPU readback per texture.
 */
export function addPainted(textures: Textures, key: string, canvas: HTMLCanvasElement): Phaser.Textures.Texture | null {
  return textures.addImage(key, canvas as unknown as HTMLImageElement);
}

/** Draws into a square canvas of `units`·`res` px with the origin at its centre. */
function square(key: string, units: number, res: number, draw: (ctx: CanvasRenderingContext2D) => void): Baker {
  return (textures) => {
    const { canvas, ctx } = makeCanvas(units * res, units * res);
    ctx.scale(res, res);
    ctx.translate(units / 2, units / 2);
    draw(ctx);
    addPainted(textures, key, canvas);
  };
}

function paper(textures: Textures): void {
  const { canvas, ctx } = makeCanvas(PAPER_TILE, PAPER_TILE);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, PAPER_TILE, PAPER_TILE);
  addPainted(textures, TEX.paper, canvas);
}

/** A theme's parallax layers, boats and movers, at texture resolution, origin top-left. */
function addBackdrops(add: (key: string, bake: Baker) => void, theme: ThemeId): void {
  THEMES[theme].forEach((layer, i) => {
    const key = TEX.backdrop(theme, layer.id);
    add(key, (textures) => {
      const { canvas, ctx } = makeCanvas(BACKDROP_W * ART_RES, Math.ceil(layer.height * ART_RES));
      ctx.scale(ART_RES, ART_RES);
      layer.draw(makeDraw(ctx, 900 + i, 0, 0));
      addPainted(textures, key, canvas);
    });
  });
  THEME_BOATS[theme].forEach((boat, i) => {
    const key = TEX.boat(theme, i);
    add(key, (textures) => {
      const box = BOAT_BOX[boat.kind];
      const { canvas, ctx } = makeCanvas(Math.ceil((box.right - box.left) * boat.s * ART_RES), Math.ceil((box.bottom - box.top) * boat.s * ART_RES));
      ctx.scale(ART_RES, ART_RES);
      BOAT_DRAW[boat.kind](makeDraw(ctx, 950 + i, 0, 0), -box.left * boat.s, -box.top * boat.s, boat.s);
      addPainted(textures, key, canvas);
    });
  });
  THEME_MOVERS[theme].forEach((m, i) => {
    for (let f = 0; f < m.frames; f++) {
      const key = TEX.mover(theme, i, f);
      add(key, (textures) => {
        const { canvas, ctx } = makeCanvas(Math.ceil((m.box.right - m.box.left) * ART_RES), Math.ceil((m.box.bottom - m.box.top) * ART_RES));
        ctx.scale(ART_RES, ART_RES);
        // The same seed every frame, so only what moves (wings, a rod) changes between them.
        m.draw(makeDraw(ctx, 970 + i, 0, 0), -m.box.left, -m.box.top, f);
        addPainted(textures, key, canvas);
      });
    }
  });
}

const HUNTERS = [
  ['kestrel', 850, kestrel], ['hawk', 860, hawk], ['kingfisher', 880, kingfisher],
  ['osprey', 890, osprey], ['brahminy', 900, brahminy], ['snowyowl', 920, snowyOwl],
] as const;

/** One boil frame of every sprite. Every sprite has BOIL slightly different frames (for the crab, also its leg poses). */
function addFrame(add: (key: string, bake: Baker) => void, f: number): void {
  const sq = (key: string, units: number, res: number, draw: (ctx: CanvasRenderingContext2D) => void): void => add(key, square(key, units, res, draw));
  const critter = (key: string, seed: number, draw: (d: Draw) => void, ink?: string): void =>
    sq(key, FRAME, 1, (ctx) => draw(makeDraw(ctx, seed, f, GROUND, ink)));
  critter(TEX.crabBack(f), 100 + f, (d) => drawCrabBack(d));
  critter(TEX.crabFront(f), 110 + f, (d) => drawCrabFront(d));
  critter(TEX.nakedBack(f), 120 + f, (d) => drawCrabBack(d, true), RED);
  critter(TEX.nakedFront(f), 130 + f, (d) => drawCrabFront(d, true), RED);
  for (const danger of [false, true]) {
    const ink = danger ? RED : undefined;
    for (const species of Object.keys(SPECIES) as SpeciesId[]) {
      sq(TEX.critter(species, danger, f), CRITTER_FRAME, CRITTER_RES, (ctx) => drawCritter(makeDraw(ctx, 800 + f, f, CRITTER_GROUND, ink), species));
    }
    sq(TEX.heronStrike(danger, f), CRITTER_FRAME, CRITTER_RES, (ctx) => drawHeronStrike(makeDraw(ctx, 800 + f, f, CRITTER_GROUND, ink)));
    for (const dive of [false, true]) {
      for (const [species, seed, draw] of HUNTERS) {
        sq(TEX.bird(species, dive, danger, f), CRITTER_FRAME, CRITTER_RES, (ctx) => draw(makeDraw(ctx, seed + f, f, 0, ink), dive));
      }
    }
    sq(TEX.bird('gull', false, danger, f), CRITTER_FRAME, CRITTER_RES, (ctx) => gullFlight(makeDraw(ctx, 870 + f, f, 0, ink)));
  }
  SHELL_KINDS.forEach((kind, i) => {
    const key = TEX.shell(kind, f);
    const bake = square(key, FRAME, 1, (ctx) => drawShell(makeDraw(ctx, 300 + i * 10 + f, f, GROUND), kind));
    // Each kind's drawing is measured once, as its first frame is baked, so every kind is drawn to its size (see shellFit.ts).
    add(key, f > 0 ? bake : (textures) => {
      bake(textures);
      measureShell(kind, textures.get(key).getSourceImage() as HTMLCanvasElement);
    });
  });
  FOOD_KINDS.forEach((kind, i) => sq(TEX.food(kind, f), FOOD_FRAME, FOOD_RES, (ctx) => drawFood(makeDraw(ctx, 500 + i * 10 + f, f, FOOD_GROUND), kind)));
  BEACH_FINDS.forEach((find, i) => sq(TEX.find(find, f), FOOD_FRAME, FOOD_RES, (ctx) => drawFind(makeDraw(ctx, 590 + i * 10 + f, f, FOOD_GROUND), find)));
  sq(TEX.puff(f), PUFF, 2, (ctx) => drawPuff(makeDraw(ctx, 700 + f, f, 0), PUFF * 0.36));
  sq(TEX.highlight(f), 32, 2, (ctx) => {
    ctx.translate(-16, -16);
    drawHighlight(makeDraw(ctx, 600 + f, f, 0), 32, 32);
  });
}

let catalog: ReadonlyMap<string, Baker> | null = null;

/** How to draw every texture the game has, by key; nothing is drawn until a key is baked. */
function bakers(): ReadonlyMap<string, Baker> {
  if (catalog) return catalog;
  const map = new Map<string, Baker>();
  const add = (key: string, bake: Baker): void => void map.set(key, bake);
  add(TEX.paper, paper);
  BUTTON_ICONS.forEach((icon, i) => add(TEX.button(icon), square(TEX.button(icon), ICON, ICON_RES, (ctx) => drawButtonIcon(makeDraw(ctx, 990 + i, 0, 0), icon))));
  for (const theme of Object.keys(THEMES) as ThemeId[]) addBackdrops(add, theme);
  for (let f = 0; f < BOIL; f++) addFrame(add, f);
  catalog = map;
  return map;
}

/** True for a key the game knows how to draw. */
export function isBakeable(key: string): boolean {
  return bakers().has(key);
}

/** Draws `key` now unless it's there already; false for a key nothing draws. */
export function bakeKey(textures: Textures, key: string): boolean {
  if (textures.exists(key)) return true;
  const bake = bakers().get(key);
  if (!bake) return false;
  bake(textures);
  return true;
}

/** One job per texture in `keys` not drawn yet, to run a slice at a time (runInSlices). */
export function bakeJobs(textures: Textures, keys: Iterable<string>): SliceJob[] {
  const jobs: SliceJob[] = [];
  for (const key of new Set(keys)) {
    if (!textures.exists(key) && isBakeable(key)) jobs.push(() => void bakeKey(textures, key));
  }
  return jobs;
}

const guarded = new WeakSet<Textures>();

/**
 * Textures are drawn as screens need them (see texturePlan.ts). In case a
 * screen asks for one it didn't plan for, this draws any known key on the
 * spot instead of showing Phaser's missing texture, and lets an unmeasured
 * shell kind (see shellFit.ts) be measured when its fit is asked for.
 */
export function installTextureGuard(textures: Textures): void {
  if (guarded.has(textures)) return;
  guarded.add(textures);
  const get = textures.get.bind(textures);
  const getFrame = textures.getFrame.bind(textures);
  textures.get = ((key: string | Phaser.Textures.Texture | Phaser.Textures.Frame) => {
    if (typeof key === 'string' && !textures.exists(key)) bakeKey(textures, key);
    return get(key);
  }) as Textures['get'];
  textures.getFrame = ((key: string, frame?: string | number) => {
    if (typeof key === 'string' && !textures.exists(key)) bakeKey(textures, key);
    return getFrame(key, frame);
  }) as Textures['getFrame'];
  setShellMeasurer((kind: ShellKind) => void bakeKey(textures, TEX.shell(kind, 0)));
}
