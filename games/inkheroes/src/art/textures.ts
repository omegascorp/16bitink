import type { SliceJob } from '@16bitink/game-sdk';
import type Phaser from 'phaser';
import type { MapDef } from '../level/types';
import { gridOf } from '../logic/adventure';
import { CREATURE_IDS, type CreatureId } from '../logic/creatures';
import { RESOURCES, type Resource } from '../logic/resources';
import { CREATURE_ART } from './creatures';
import { CREATURE_RES, FRAME_H, FRAME_W, GROUND_Y } from './creatures/types';
import { drawHero } from './heroArt';
import { BANNER, BOIL } from './palette';
import { makeCanvas, releaseScratch, shrink } from './pen';
import { drawFlag, drawResourceIcon, SITE_ART, SITE_ARTS } from './sites';
import { frameFor, SITE_RES, type SiteArt } from './sites/types';
import { CHUNK, paintChunk, TILE } from './terrain';
import { drawTitle, drawVignette, drawVista, MENU_RES, TITLE, VIGNETTE, VIGNETTE_IDS, VISTA, type VignetteId } from './menu';
import { drawTownGround, TOWN_ART } from './townscape';
import { PIECE_SLOT, SLOTS, TOWN_PIECES, TOWN_RES, TOWN_VIEW, type TownPiece } from './townscape/types';

export type BannerKey = keyof typeof BANNER;

export const TEX = {
  creature: (id: CreatureId, f: number) => `cr-${id}-${f}`,
  hero: (banner: BannerKey, f: number) => `hero-${banner}-${f}`,
  site: (art: SiteArt) => `site-${art}`,
  chunk: (mapId: string, cx: number, cy: number) => `chunk-${mapId}-${cx}-${cy}`,
  icon: (r: Resource) => `res-${r}`,
  flag: (banner: BannerKey, f: number) => `flag-${banner}-${f}`,
  vista: 'menu-vista',
  title: 'menu-title',
  vignette: (id: VignetteId) => `menu-vignette-${id}`,
  townGround: 'town-ground',
  town: (piece: TownPiece) => `town-${piece}`,
} as const;

/** Texture px per unit for map chunks (the map is zoomed out more than the battle). */
export const CHUNK_RES = 1.5;
export const ICON_RES = 3;
export const ICON_SIZE = 28;

/** Bakes a canvas into a texture under `key` (a plain image texture: addCanvas would keep a second copy). */
function bake(scene: Phaser.Scene, key: string, w: number, h: number, res: number, paint: (ctx: CanvasRenderingContext2D) => void): void {
  if (scene.textures.exists(key)) return;
  const { canvas, ctx } = makeCanvas(Math.ceil(w * res), Math.ceil(h * res));
  ctx.scale(res, res);
  paint(ctx);
  scene.textures.addImage(key, canvas as unknown as HTMLImageElement);
}

export function freeTexture(scene: Phaser.Scene, key: string): void {
  if (!scene.textures.exists(key)) return;
  const source = scene.textures.get(key).getSourceImage();
  scene.textures.remove(key);
  if (source instanceof HTMLCanvasElement) shrink(source);
}

function creatureJob(scene: Phaser.Scene, id: CreatureId, f: number): SliceJob {
  return () => bake(scene, TEX.creature(id, f), FRAME_W, FRAME_H, CREATURE_RES, (ctx) => {
    ctx.translate(FRAME_W / 2, GROUND_Y);
    CREATURE_ART[id](ctx, 1000 + CREATURE_IDS.indexOf(id) * 17, f);
  });
}

function heroJob(scene: Phaser.Scene, banner: BannerKey, f: number): SliceJob {
  return () => bake(scene, TEX.hero(banner, f), FRAME_W, FRAME_H, CREATURE_RES, (ctx) => {
    ctx.translate(FRAME_W / 2, GROUND_Y);
    drawHero(ctx, 4242, f, BANNER[banner]);
  });
}

function siteJob(scene: Phaser.Scene, art: SiteArt): SliceJob {
  const fr = frameFor(art);
  return () => bake(scene, TEX.site(art), fr.w, fr.h, SITE_RES, (ctx) => {
    ctx.translate(fr.ox, fr.oy);
    SITE_ART[art](ctx, 300 + SITE_ARTS.indexOf(art) * 13, 0);
  });
}

/** Everything drawn once at boot: creatures, the hero, sites, icons and flags. */
export function textureJobs(scene: Phaser.Scene): SliceJob[] {
  const boil = Array.from({ length: BOIL }, (_, f) => f);
  return [
    ...CREATURE_IDS.flatMap((id) => boil.map((f) => creatureJob(scene, id, f))),
    ...(['player', 'rival'] as const).flatMap((b) => boil.map((f) => heroJob(scene, b, f))),
    ...SITE_ARTS.map((art) => siteJob(scene, art)),
    ...RESOURCES.map((r) => () => bake(scene, TEX.icon(r), ICON_SIZE, ICON_SIZE, ICON_RES, (ctx) => {
      ctx.translate(ICON_SIZE / 2, ICON_SIZE / 2);
      drawResourceIcon(ctx, r, 21);
    })),
    ...(Object.keys(BANNER) as BannerKey[]).flatMap((b) => boil.map((f) => () => bake(scene, TEX.flag(b, f), 24, 30, 2, (ctx) => {
      ctx.translate(6, 27);
      drawFlag(ctx, BANNER[b], 31, f);
    }))),
    ...menuJobs(scene),
    () => releaseScratch(),
  ];
}

/** Texture px per unit for the menu's vista: a soft painting, shown screen-wide. */
export const VISTA_RES = 1.5;

/** The campaign menu's paintings: its vista, the title banner and each map's vignette. */
function menuJobs(scene: Phaser.Scene): SliceJob[] {
  return [
    () => bake(scene, TEX.vista, VISTA.w, VISTA.h, VISTA_RES, (ctx) => drawVista(ctx, 11)),
    () => bake(scene, TEX.title, TITLE.w, TITLE.h, MENU_RES, (ctx) => drawTitle(ctx, 13)),
    ...VIGNETTE_IDS.map((id, i) => () => bake(scene, TEX.vignette(id), VIGNETTE.w, VIGNETTE.h, MENU_RES, (ctx) => drawVignette(ctx, id, 17 + i))),
  ];
}

/** The map's ground, a chunk a job (painted when a map opens, kept while it's played). */
export function chunkJobs(scene: Phaser.Scene, def: MapDef): SliceJob[] {
  const g = gridOf(def);
  const jobs: SliceJob[] = [];
  for (let cy = 0; cy * CHUNK < g.h; cy++) {
    for (let cx = 0; cx * CHUNK < g.w; cx++) {
      jobs.push(() => bake(scene, TEX.chunk(def.id, cx, cy), CHUNK * TILE, CHUNK * TILE, CHUNK_RES, (ctx) => {
        ctx.beginPath();
        ctx.rect(0, 0, CHUNK * TILE, CHUNK * TILE);
        ctx.clip();
        paintChunk(ctx, g, cx, cy);
      }));
    }
  }
  jobs.push(() => releaseScratch());
  return jobs;
}

/** The town screen's paintings not drawn yet: its ground, then each of `pieces` (painted the first time the town opens). */
export function townJobs(scene: Phaser.Scene, pieces: readonly TownPiece[]): SliceJob[] {
  const ground: SliceJob = () => bake(scene, TEX.townGround, TOWN_VIEW.w, TOWN_VIEW.h, TOWN_RES, (ctx) => drawTownGround(ctx, 7));
  const jobs = [
    ...(scene.textures.exists(TEX.townGround) ? [] : [ground]),
    ...pieces.filter((p) => !scene.textures.exists(TEX.town(p))).map((piece): SliceJob => () => {
      const fr = SLOTS[PIECE_SLOT[piece]].frame;
      bake(scene, TEX.town(piece), fr.w, fr.h, TOWN_RES, (ctx) => {
        ctx.translate(fr.ox, fr.oy);
        TOWN_ART[piece](ctx, 500 + TOWN_PIECES.indexOf(piece) * 11);
      });
    }),
  ];
  return jobs.length ? [...jobs, () => releaseScratch()] : [];
}

/** Frees another map's ground when a different map opens. */
export function dropChunks(scene: Phaser.Scene, keep: string): void {
  for (const key of scene.textures.getTextureKeys()) if (key.startsWith('chunk-') && !key.startsWith(`chunk-${keep}-`)) freeTexture(scene, key);
}
