import Phaser from 'phaser';
import { MAP_COVER, MAP_GROUND, MAP_SITES, MAP_VIGNETTES, type MapCover, type MapSprite } from '../../art/pixel/map';
import { UNIT_ART } from '../../art/pixel/manifest';
import type { SiteArt } from '../../art/sites/types';
import type { MapObject } from '../../logic/objects';
import { heroArt, nearest, POSES, PX_TEX, unitArt } from '../battle/pixelAssets';
import { loadUiFont } from '../battle/pixelFont';
import { loadUiArt } from '../battle/pixelUi';
import { queueTownArt } from '../town/townTex';

/**
 * The adventure map's textures: the ground swatches, site and cover
 * sprites, the figures' strips (the battle's own, at the same pixel size)
 * and the pixel UI's icons and font. Loaded on demand, kept between maps,
 * every one filtered NEAREST.
 */

export const MAP_TEX = {
  ground: (t: string) => `pxm-ground-${t}`,
  site: (a: SiteArt) => `pxm-site-${a}`,
  cover: (k: MapCover, i: number) => `pxm-${k}-${i}`,
  chunk: (map: string, i: number) => `pxm-chunk-${map}-${i}`,
  fog: (map: string) => `pxm-fog-${map}`,
  vignette: (id: string) => `pxm-vignette-${id}`,
  town: (map: string) => `pxm-town-${map}`,
} as const;

/** The art a map object is drawn with (monsters and the town are drawn apart). */
export function siteArtOf(o: MapObject): SiteArt | null {
  if (o.kind === 'mine' || o.kind === 'pile') return `${o.kind}-${o.resource!}` as SiteArt;
  if (o.kind === 'monster' || o.kind === 'town') return null;
  return o.kind;
}

/** A site's sprite: its own, or (a mine drawn later) the gold mine's. */
export function siteSprite(art: SiteArt): { key: string; sprite: MapSprite } | null {
  const own = MAP_SITES[art];
  if (own) return { key: MAP_TEX.site(art), sprite: own };
  if (art.startsWith('mine-') && MAP_SITES['mine-gold']) return { key: MAP_TEX.site('mine-gold'), sprite: MAP_SITES['mine-gold'] };
  return null;
}

/** Loads the campaign menu's map pictures, every creature's idle strip and the hero's (for the muster), and the UI's art and font. */
export function loadMenuArt(scene: Phaser.Scene): Promise<void> {
  for (const [id, url] of Object.entries(MAP_VIGNETTES)) if (!scene.textures.exists(MAP_TEX.vignette(id))) scene.load.image(MAP_TEX.vignette(id), url);
  return loadMapArt(scene, [], false).then(() => Object.keys(MAP_VIGNETTES).forEach((id) => nearest(scene, MAP_TEX.vignette(id))));
}

/** Queues and loads everything a map needs; resolves once it is all in. */
export function loadMapArt(scene: Phaser.Scene, creatures: readonly string[], world = true): Promise<void> {
  const keys: string[] = [];
  const image = (key: string, url: string): void => {
    keys.push(key);
    if (!scene.textures.exists(key)) scene.load.image(key, url);
  };
  if (world) {
    for (const [t, url] of Object.entries(MAP_GROUND)) if (url) image(MAP_TEX.ground(t), url);
    for (const [art, s] of Object.entries(MAP_SITES) as [SiteArt, MapSprite][]) image(MAP_TEX.site(art), s.url);
    for (const [kind, list] of Object.entries(MAP_COVER) as [MapCover, readonly MapSprite[]][]) list.forEach((s, i) => image(MAP_TEX.cover(kind, i), s.url));
    // The town's own sprites: the map draws its town from the city the town screen shows.
    keys.push(...queueTownArt(scene));
  }
  const sheet = (key: string, url: string, w: number, h: number): void => {
    keys.push(key);
    if (!scene.textures.exists(key)) scene.load.spritesheet(key, url, { frameWidth: w, frameHeight: h });
  };
  // Every creature's idle strip: the map's monsters stand in it, the army's faces are cut from it.
  for (const id of new Set([...creatures, ...Object.keys(UNIT_ART)])) {
    const art = unitArt(id);
    sheet(PX_TEX.unit(id, 'idle'), art.url.idle, art.w, art.h);
  }
  const hero = heroArt();
  for (const pose of POSES) sheet(PX_TEX.hero(hero.id, pose), hero.art.url[pose], hero.art.w, hero.art.h);
  keys.push(...loadUiArt(scene));
  const font = loadUiFont().catch((e: unknown) => console.warn('map UI font failed to load', e));
  const done = (): void => keys.forEach((k) => nearest(scene, k));
  if (!scene.load.list.size) {
    done();
    return font;
  }
  const art = new Promise<void>((resolve) => {
    scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
      done();
      resolve();
    });
    scene.load.start();
  });
  return Promise.all([art, font]).then(() => undefined);
}
