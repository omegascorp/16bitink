import type { MapCover } from '../../art/pixel/map';
import { TOWN_ART, type TownArt } from '../../art/pixel/town';
import type { BuildingId } from '../../logic/buildings';
import type { Pixels } from '../battle/pixelScenery';
import { paintCity, type GroundSwatches } from './townGround';
import { cropToInk, shrinkMode } from './townPictures';
import { cityTrees, emptyPlots, STAGE, stagePieces } from './townStage';
import { WALL_SHADE, wallPieces, type WallPiece } from './townWalls';


/** The seed the town screen grows its trees with (so the map's town has the same ones). */
export const CITY_SEED = 7717;
/** The map's town: the city's ground and positions shrink this many times, its buildings, houses, trees and walls only ART_SHRINK times, so it packs into a dense little city. */
export const MAP_TOWN_SHRINK = 4;
const ART_SHRINK = 2;

/** Copies `src`'s opaque pixels onto `out` with its top-left at (x, y), mirrored if asked. */
function stamp(out: Pixels, src: Pixels, x: number, y: number, flip = false, shade = 1): void {
  for (let sy = 0; sy < src.h; sy++) {
    const ty = y + sy;
    if (ty < 0 || ty >= out.h) continue;
    for (let sx = 0; sx < src.w; sx++) {
      const tx = x + sx;
      if (tx < 0 || tx >= out.w) continue;
      const s = (sy * src.w + (flip ? src.w - 1 - sx : sx)) * 4;
      if (src.data[s + 3]! < 128) continue;
      const d = (ty * out.w + tx) * 4;
      out.data[d] = Math.round(src.data[s]! * shade);
      out.data[d + 1] = Math.round(src.data[s + 1]! * shade);
      out.data[d + 2] = Math.round(src.data[s + 2]! * shade);
      out.data[d + 3] = 255;
    }
  }
}

/** What the city is drawn from: a building's sprite, a tree's, the wall pieces', the ground's swatches. */
export interface CityArt {
  readonly piece: (art: TownArt) => Pixels;
  readonly tree: (kind: MapCover, pick: number) => Pixels;
  readonly swatches: GroundSwatches;
}

/**
 * The map's town, from the city the town screen shows for `built`: its
 * ground and walls, then a small copy of each building standing (as built
 * so far), the houses and trees, each where it stands in the city. The
 * ground shrinks MAP_TOWN_SHRINK times and every sprite only ART_SHRINK
 * times, so the same city packs tight. No Phaser here, so it can be tested.
 */
export function renderMapTown(built: readonly BuildingId[], art: CityArt): Pixels {
  const full: Pixels = { data: new Uint8ClampedArray(STAGE.w * STAGE.h * 4), w: STAGE.w, h: STAGE.h };
  const bare = emptyPlots(built).map((b) => b.plot);
  paintCity(full, { x: 0, y: 0, w: STAGE.w, h: STAGE.h }, art.swatches, bare);
  const out = shrinkMode(full, MAP_TOWN_SHRINK);
  const small = new Map<string, Pixels>();
  const shrunk = (key: string, src: () => Pixels): Pixels => {
    let p = small.get(key);
    if (!p) {
      p = shrinkMode(src(), ART_SHRINK);
      small.set(key, p);
    }
    return p;
  };
  /** A sprite whose feet (bottom middle) are at stage (fx, fy). */
  const put = (p: Pixels, fx: number, fy: number, flip = false, shade = 1): void =>
    stamp(out, p, Math.round(fx / MAP_TOWN_SHRINK - p.w / 2), Math.round(fy / MAP_TOWN_SHRINK - p.h), flip, shade);
  const wall = (w: WallPiece): void => {
    const s = TOWN_ART[w.art];
    put(shrunk(w.art, () => art.piece(w.art)), w.x + s.w / 2, w.y + s.h, w.flip, w.shade ? WALL_SHADE : 1);
  };
  const walls = wallPieces();
  for (const w of walls.back) wall(w);
  const sprites: { y: number; draw: () => void }[] = stagePieces(built).map((p) => ({
    y: p.spot.y,
    draw: () => put(shrunk(p.art, () => art.piece(p.art)), p.spot.x, p.spot.y, p.spot.flip),
  }));
  for (const t of cityTrees(bare, CITY_SEED)) {
    sprites.push({ y: t.y, draw: () => put(shrunk(`${t.kind}-${t.pick}`, () => art.tree(t.kind, t.pick)), t.x, t.y) });
  }
  sprites.sort((a, b) => a.y - b.y);
  for (const s of sprites) s.draw();
  for (const w of walls.front) wall(w);
  return cropToInk(out);
}
