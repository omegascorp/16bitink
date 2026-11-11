import Phaser from 'phaser';
import { KEMET_TOWN, MAP_COVER, MAP_GROUND, MAP_SITES, MAP_VIGNETTES, NORSE_SITES, NORSE_TOWN, TOWN_LOOKS, type MapCover, type MapSprite } from '../../art/pixel/map';
import { HERO_ART, UNIT_ART } from '../../art/pixel/manifest';
import type { SiteArt } from '../../art/sites/types';
import { CREATURE_IDS, type TownFaction } from '../../logic/creatures';
import { factionOf } from '../../logic/factions';
import type { Town } from '../../logic/town';
import type { MapDef } from '../../level/types';
import type { MapObject } from '../../logic/objects';
import { HERO_IDS, nearest, POSES, PX_TEX, unitArt } from '../battle/pixelAssets';
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
  /** A people's town drawn whole (Egypt's, the Norse ring fort). */
  peopleTown: (f: TownFaction) => `pxm-town-${f}`,
  townLook: (look: string) => `pxm-town-look-${look}`,
  norseSite: (art: string) => `pxm-norse-${art}`,
} as const;

/** Each people's town drawn whole, by faction: it does not grow with the buildings. The Greeks' (none here) is built from the city the town screen shows. */
export const PEOPLE_TOWNS: Readonly<Partial<Record<TownFaction, MapSprite>>> = { kemet: KEMET_TOWN, norse: NORSE_TOWN };

/** A town's people's picture drawn whole, if its people have one. */
export function peopleTownOf(t: { readonly faction?: TownFaction }): { key: string; sprite: MapSprite } | null {
  const f = factionOf(t);
  const sprite = PEOPLE_TOWNS[f];
  return sprite ? { key: MAP_TEX.peopleTown(f), sprite } : null;
}

/** The texture a town is drawn with on the map (and shrunk for the town list): its own look, its people's town, or the city as built. */
export function townTexOf(def: MapDef, t: Town): string {
  const look = def.towns?.find((d) => d.id === t.id)?.look;
  if (look && TOWN_LOOKS[look]) return MAP_TEX.townLook(look);
  return peopleTownOf(t)?.key ?? MAP_TEX.town(`${def.id}-${t.id}`);
}

/** The new sites' sprite keys (Othrys's, then the Delta's), and what each borrows while its own isn't drawn. */
const NEW_SITES: Readonly<Record<string, SiteArt>> = {
  learningStone: 'standingStone', cyclopsCave: 'mine-ore', griffinCliff: 'watchtower', titanForge: 'shrine', keep: 'mercCamp',
  // The Delta's, each borrowing the nearest of Othrys's: a marsh for a cave, rocks for a cave, the Benben's house for the forge, a tomb for the keep.
  crocodileMarsh: 'cyclopsCave', lionRocks: 'cyclopsCave', benbenHouse: 'titanForge', mastaba: 'keep',
  // The training sites (rarity): the Arena borrows the keep's ruin; the legendary sites, each chapter's forge or the Benben's house.
  arena: 'keep', hephaestusForge: 'titanForge', raTemple: 'benbenHouse',
};

/** True for a map with a Norse town or hero: its borrowed sites (altar, shrine, lair) wear the Norse looks. */
export function isNorseMap(def: Pick<MapDef, 'towns' | 'hero'>): boolean {
  return !!def.towns?.some((t) => t.faction === 'norse') || def.hero?.faction === 'norse';
}

/**
 * Part 4's own sites and the temple, by an object's `look` (any map, any kind) or, failing that, by its id or (a dwelling) its creature:
 * a look of `treasureBarrow`, `mimirsWell`, `angantyrBarrow`, `boarPen`, `dragonHoard` or `uppsalaTemple`.
 */
const NORSE_LOOK_ART: Readonly<Record<string, string>> = {
  treasureBarrow: 'treasureBarrow', mimirsWell: 'mimirWell', mimirWell: 'mimirWell', angantyrBarrow: 'angantyr', boarPen: 'boarPen', dragonHoard: 'dragonHoard', uppsalaTemple: 'uppsalaTemple',
};
const NORSE_CREATURE_ART: Readonly<Record<string, string>> = { warBoar: 'boarPen', warBoar2: 'boarPen', dragon: 'dragonHoard', dragon2: 'dragonHoard', dragon3: 'dragonHoard' };

function norseArtOf(o: MapObject, norseMap: boolean): string | null {
  const look = NORSE_LOOK_ART[String(o.look)];
  if (look) return look;
  if (!norseMap) return null;
  if (/angantyr/i.test(o.id)) return 'angantyr';
  if (/mimir/i.test(o.id)) return 'mimirWell';
  switch (o.kind) {
    case 'spellbook': return 'altar';
    case 'shrine': return 'runeShrine';
    case 'lair': return 'barrow';
    case 'bank': return 'treasureBarrow';
    case 'sanctum': return 'mimirWell';
    case 'dwelling': return NORSE_CREATURE_ART[o.creature ?? ''] ?? null;
    default: return null;
  }
}

/** A Greek-side art key for an object: a SiteArt or a new site's key. */
function greekArtOf(o: MapObject): string | null {
  if (o.kind === 'monster' || o.kind === 'town' || o.kind === 'item') return null;
  if (o.kind === 'mine' || o.kind === 'pile') return `${o.kind}-${o.resource!}`;
  if (o.kind === 'dwelling') return o.look ?? 'cyclopsCave';
  if (o.kind === 'bank') return o.look ?? 'keep';
  if (o.kind === 'lair') return o.look ?? 'den';
  if (o.kind === 'sanctum') return o.look ?? 'hephaestusForge';
  return o.kind;
}

/** The Greek sites that wear a Norse look on a Norse map (keys of NORSE_SITES): the mines, stables, camp, tower, mill, stones and the arena. */
const NORSE_REPAINTED: ReadonlySet<string> = new Set([
  'mine-gold', 'mine-wood', 'mine-ore', 'mine-gems', 'mine-mercury', 'mine-sulfur', 'mine-crystal',
  'stables', 'mercCamp', 'watchtower', 'windmill', 'standingStone', 'learningStone', 'arena',
]);

/** The art a map object is drawn with (monsters, towns and gear on the ground are drawn apart): a SiteArt, a new site's key, or (on a Norse map) a Norse look's `norse:` key. */
export function siteArtOf(o: MapObject, norseMap = false): string | null {
  if (o.kind === 'monster' || o.kind === 'town' || o.kind === 'item') return null;
  const norse = norseArtOf(o, norseMap);
  if (norse) return `norse:${norse}`;
  const art = greekArtOf(o);
  return norseMap && art && NORSE_REPAINTED.has(art) ? `norse:${art}` : art;
}

/**
 * A landmark: a picture the level places by tile, with no object behind it (the great temple at Uppsala: `art: 'uppsalaTemple'`).
 * The level lists them in an optional `landmarks` of its MapDef and blocks the tiles it stands on itself.
 */
export interface MapLandmark {
  readonly id: string;
  readonly art: string;
  readonly x: number;
  readonly y: number;
}

/** The landmarks a map lists (none until MapDef carries them). */
export const landmarksOf = (def: MapDef): readonly MapLandmark[] => (def as MapDef & { readonly landmarks?: readonly MapLandmark[] }).landmarks ?? [];

/** The tiles a landmark's picture stands on: 3 × 3, its feet at the front middle. The level blocks them; the map draws no cover (fells, pines) there. */
export function landmarkTiles(l: MapLandmark): readonly { readonly x: number; readonly y: number }[] {
  return [-2, -1, 0].flatMap((dy) => [-1, 0, 1].map((dx) => ({ x: l.x + dx, y: l.y + dy })));
}

/** A landmark's sprite, by its `art` (a Norse look's name). */
export function landmarkSprite(art: string): { key: string; sprite: MapSprite } | null {
  const n = NORSE_LOOK_ART[art];
  return n ? siteSprite(`norse:${n}`) : null;
}

/** A site's sprite: its own, or (a mine drawn later) the gold mine's, or (a new site drawn later) the one it borrows. */
export function siteSprite(art: string): { key: string; sprite: MapSprite } | null {
  if (art.startsWith('norse:')) {
    const n = NORSE_SITES[art.slice(6)];
    return n ? { key: MAP_TEX.norseSite(art.slice(6)), sprite: n } : null;
  }
  const sites = MAP_SITES as Readonly<Partial<Record<string, MapSprite>>>;
  const own = sites[art];
  if (own) return { key: MAP_TEX.site(art as SiteArt), sprite: own };
  if (art.startsWith('mine-') && MAP_SITES['mine-gold']) return { key: MAP_TEX.site('mine-gold'), sprite: MAP_SITES['mine-gold'] };
  const borrow = NEW_SITES[art];
  return borrow ? siteSprite(borrow) : null;
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
    for (const [art, s] of Object.entries(NORSE_SITES)) image(MAP_TEX.norseSite(art), s.url);
    // The signs on our towns (the cursors' own pictures).
    for (const [kind, list] of Object.entries(MAP_COVER) as [MapCover, readonly MapSprite[]][]) list.forEach((s, i) => image(MAP_TEX.cover(kind, i), s.url));
    for (const [f, s] of Object.entries(PEOPLE_TOWNS) as [TownFaction, MapSprite][]) image(MAP_TEX.peopleTown(f), s.url);
    for (const [look, s] of Object.entries(TOWN_LOOKS)) image(MAP_TEX.townLook(look), s.url);
    // The town's own sprites: the map draws its town from the city the town screen shows.
    keys.push(...queueTownArt(scene));
  }
  const sheet = (key: string, url: string, w: number, h: number): void => {
    keys.push(key);
    if (!scene.textures.exists(key)) scene.load.spritesheet(key, url, { frameWidth: w, frameHeight: h });
  };
  // Every creature's idle strip (an upgrade not drawn yet borrows its line's): the map's monsters stand in it, the army's faces are cut from it.
  for (const id of new Set([...creatures, ...Object.keys(UNIT_ART), ...CREATURE_IDS])) {
    const art = unitArt(id);
    sheet(PX_TEX.unit(id, 'idle'), art.url.idle, art.w, art.h);
  }
  // Every hero drawn: any of the player's may be hired or picked on this map.
  for (const id of HERO_IDS) {
    const art = HERO_ART[id]!;
    for (const pose of POSES) sheet(PX_TEX.hero(id, pose), art.url[pose], art.w, art.h);
  }
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
