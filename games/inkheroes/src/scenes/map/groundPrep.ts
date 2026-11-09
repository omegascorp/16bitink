import Phaser from 'phaser';
import type { MapDef } from '../../level/types';
import { gridOf } from '../../logic/adventure';
import type { Terrain } from '../../logic/map';
import { PixelBuffer } from '../battle/pixelRaster';
import type { Pixels } from '../battle/pixelScenery';
import { putBuffer, texturePixels } from '../battle/pixelUi';
import { MAP_TEX } from './pixelMapArt';
import { composeGround, groundSteps } from './pixelGround';

/** The ground is cut into textures this many pixels square. */
export const CHUNK_PX = 768;
/** Milliseconds of painting a frame while the loading screen shows: the rest of the frame draws the bar and the clouds. */
const BUDGET_MS = 12;

/** A ground chunk's texture and where it lies in the ground. */
export interface GroundChunk {
  readonly key: string;
  readonly x: number;
  readonly y: number;
}

/** Ground made ahead by prepareGround, waiting for its map to be built (by map id). */
const ready = new Map<string, readonly GroundChunk[]>();

/** The terrain swatches the ground is painted from, from their loaded textures. */
function swatchesOf(scene: Phaser.Scene): Partial<Record<Terrain, Pixels>> {
  const swatches: Partial<Record<Terrain, Pixels>> = {};
  for (const t of ['grass', 'dirt', 'rough', 'sand', 'swamp', 'snow'] as const) {
    const key = MAP_TEX.ground(t);
    if (scene.textures.exists(key)) swatches[t] = texturePixels(scene, key);
  }
  return swatches;
}

/** The ground's piece n as a texture (its key: MAP_TEX.chunk). */
function chunkTexture(scene: Phaser.Scene, def: MapDef, ground: Pixels, n: number, x0: number, y0: number): GroundChunk {
  const w = Math.min(CHUNK_PX, ground.w - x0);
  const h = Math.min(CHUNK_PX, ground.h - y0);
  const piece = new PixelBuffer(w, h);
  for (let y = 0; y < h; y++) piece.data.set(ground.data.subarray(((y0 + y) * ground.w + x0) * 4, ((y0 + y) * ground.w + x0 + w) * 4), y * w * 4);
  return { key: putBuffer(scene, piece, MAP_TEX.chunk(def.id, n)), x: x0, y: y0 };
}

/** Where each chunk starts, in order. */
function chunkOrigins(ground: Pixels): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let y = 0; y < ground.h; y += CHUNK_PX) for (let x = 0; x < ground.w; x += CHUNK_PX) out.push({ x, y });
  return out;
}

/** The map's ground as chunk textures, all at once (a scene built without a loading screen). */
export function groundNow(scene: Phaser.Scene, def: MapDef): readonly GroundChunk[] {
  const made = ready.get(def.id);
  ready.delete(def.id);
  if (made && made.every((c) => scene.textures.exists(c.key))) return made;
  const ground = composeGround({ grid: gridOf(def), swatches: swatchesOf(scene), seed: def.seed });
  return chunkOrigins(ground).map((o, n) => chunkTexture(scene, def, ground, n, o.x, o.y));
}

/** Resolves after the game has drawn its next frame. */
const nextFrame = (scene: Phaser.Scene): Promise<void> => new Promise((resolve) => scene.game.events.once(Phaser.Core.Events.POST_RENDER, () => resolve()));

/**
 * Paints the map's ground and makes its textures a little each frame, so
 * the loading screen keeps drawing (its bar filling, its clouds drifting)
 * instead of the whole page freezing at the end of the load. `progress`
 * gets how far it has got (0..1). groundNow then takes the result.
 */
export async function prepareGround(scene: Phaser.Scene, def: MapDef, progress: (f: number) => void): Promise<void> {
  const steps = groundSteps({ grid: gridOf(def), swatches: swatchesOf(scene), seed: def.seed });
  let start = performance.now();
  let step = steps.next();
  for (; !step.done; step = steps.next()) {
    if (performance.now() - start < BUDGET_MS) continue;
    progress(step.value * 0.8);
    await nextFrame(scene);
    if (!scene.sys.isActive()) return;
    start = performance.now();
  }
  const ground = step.value;
  const origins = chunkOrigins(ground);
  const chunks: GroundChunk[] = [];
  for (const [n, o] of origins.entries()) {
    chunks.push(chunkTexture(scene, def, ground, n, o.x, o.y));
    progress(0.8 + ((n + 1) / origins.length) * 0.2);
    await nextFrame(scene);
    if (!scene.sys.isActive()) return;
  }
  ready.set(def.id, chunks);
}
