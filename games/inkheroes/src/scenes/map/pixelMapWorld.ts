import Phaser from 'phaser';
import { MAP_COVER, TOWN_LOOKS, type MapCover } from '../../art/pixel/map';
import { BACKDROP } from '../../art/palette';
import type { MapDef } from '../../level/types';
import { gridOf, isSeen, liveObjects, ourHeroes, rivalHeroes, type Adventure } from '../../logic/adventure';
import type { RivalRide } from './rivalRides';
import { isEmptyArmy } from '../../logic/army';
import type { Hero } from '../../logic/hero';
import type { Town } from '../../logic/town';
import type { MapObject, Owner } from '../../logic/objects';
import type { PathStep } from '../../logic/path';
import { heroArt, PX_TEX, unitArt } from '../battle/pixelAssets';
import { FIGURE_DEPTH, PixelFigure } from '../battle/pixelFigure';
import { PixelBuffer, type Rgba } from '../battle/pixelRaster';
import type { Pixels } from '../battle/pixelScenery';
import { putBuffer, texturePixels, UI_TEX } from '../battle/pixelUi';
import { coverPlacements } from './mapCover';
import { factionOf } from '../../logic/factions';
import type { BuildingId } from '../../logic/buildings';
import type { TownFaction } from '../../logic/creatures';
import { renderMapTown, type CityArt } from '../town/cityRender';
import { TOWN_TEX } from '../town/townTex';
import { isNorseMap, landmarkSprite, landmarksOf, landmarkTiles, type MapLandmark, MAP_TEX, peopleTownOf, siteArtOf, siteSprite } from './pixelMapArt';
import { composeFog, fogPieces, GROUND_BORDER, MAP_TILE, touchedPieces, type PixelRect } from './pixelGround';
import { groundNow } from './groundPrep';
import { Ride, RIDE_FPS } from './ride';

/** The sand an Egyptian town's stand-in picture wears on the map. */

/** The fog is cut into squares this many pixels wide (a texture each): a step redraws only those it touches. */
const FOG_PIECE_PX = 480;
/** Feet stand this far down a tile. */
const FOOT_Y = 44;
/** Over every figure and site: the planned path, then the fog. */
const PATH_DEPTH = 1e6;
/** The fog lies on the ground, under every figure: what stands on a seen tile shows whole (a tree's crown over the fog too), the rest is hidden until seen. */
const FOG_DEPTH = FIGURE_DEPTH - 0.5;
/** Gear on the ground: its 64 px icon at half size, about a tile. */
const LYING_SCALE = 0.5;
/** The planned path: reachable today (green, as in H3) and on later days (red). */
const PATH_TODAY: Rgba = [143, 216, 96, 255];
const PATH_LATER: Rgba = [224, 87, 74, 255];
const PATH_EDGE: Rgba = [20, 13, 8, 255];
/** Flag colours by owner. */
const FLAG: Readonly<Record<Owner, { cloth: Rgba; light: Rgba }>> = {
  player: { cloth: [54, 84, 170, 255], light: [120, 160, 240, 255] },
  rival: { cloth: [170, 44, 40, 255], light: [236, 110, 96, 255] },
  neutral: { cloth: [196, 186, 160, 255], light: [240, 234, 214, 255] },
};

export const tileFeet = (x: number, y: number): { x: number; y: number } => ({ x: x * MAP_TILE + MAP_TILE / 2, y: y * MAP_TILE + FOOT_Y });

/** A small pennant on a pole, outlined: 11 × 16 px. */
function drawFlag(owner: Owner): PixelBuffer {
  const b = new PixelBuffer(11, 16);
  const { cloth, light } = FLAG[owner];
  for (let y = 0; y < 16; y++) b.put(1, y, [70, 52, 34, 255]);
  for (let y = 0; y < 16; y++) b.put(0, y, PATH_EDGE);
  b.put(2, 15, PATH_EDGE);
  // A swallow-tailed pennant from the pole's top.
  for (let y = 1; y <= 7; y++) {
    const len = y === 4 ? 6 : 9;
    for (let x = 2; x < 2 + len; x++) b.put(x, y, y === 1 ? light : cloth);
    b.put(2 + len, y, PATH_EDGE);
  }
  for (let x = 2; x <= 11; x++) {
    b.put(x, 0, PATH_EDGE);
    b.put(x, 8, PATH_EDGE);
  }
  return b;
}

/** A path dot (today: filled, later: a ring), or the end cross, outlined. */
function drawMark(kind: 'dot' | 'ring' | 'cross', ink: Rgba): PixelBuffer {
  if (kind === 'cross') {
    const n = 15;
    const b = new PixelBuffer(n, n);
    const on = (x: number, y: number): boolean => x >= 1 && y >= 1 && x < n - 1 && y < n - 1 && (Math.abs(x - y) <= 1 || Math.abs(x + y - (n - 1)) <= 1);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (on(x, y)) b.put(x, y, ink);
        else if (on(x + 1, y) || on(x - 1, y) || on(x, y + 1) || on(x, y - 1)) b.put(x, y, PATH_EDGE);
      }
    }
    return b;
  }
  const n = 9;
  const b = new PixelBuffer(n, n);
  const c = (n - 1) / 2;
  const disc = (x: number, y: number, r: number): boolean => (x - c) ** 2 + (y - c) ** 2 <= r * r;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (!disc(x, y, 4.2)) continue;
      const inner = disc(x, y, 3.1);
      b.put(x, y, !inner || (kind === 'ring' && disc(x, y, 1.6)) ? PATH_EDGE : ink);
    }
  }
  return b;
}

/** Mountain and peak pictures by ground: the first four mountains and two peaks stand on every ground but snow and ice (the red desert range among them); snow and ice get the blue-grey snowy ones. */
const MOUNTAINS: Readonly<Partial<Record<MapCover, { readonly plain: number; readonly snowy: readonly number[] }>>> = {
  mountain: { plain: 4, snowy: [3, 4, 5] },
  peak: { plain: 2, snowy: [2, 3] },
};

/** Which sprite of a cover kind a placement takes. */
/** The grid as its cover is drawn: a landmark's own tiles bare (the fells that block them stand under the picture, unseen). */
function underLandmarks(g: ReturnType<typeof gridOf>, landmarks: readonly MapLandmark[]): ReturnType<typeof gridOf> {
  if (!landmarks.length) return g;
  const bare = new Set(landmarks.flatMap((l) => landmarkTiles(l).filter((t) => t.x >= 0 && t.y >= 0 && t.x < g.w && t.y < g.h).map((t) => t.x + t.y * g.w)));
  return { ...g, cover: g.cover.map((c, i) => (bare.has(i) ? 'none' : c)) };
}

function coverPick(g: ReturnType<typeof gridOf>, p: { kind: MapCover; pick: number; x: number; y: number }, n: number): number {
  const m = MOUNTAINS[p.kind];
  if (!m) return p.pick % n;
  const ground = g.terrain[Math.floor(p.x / MAP_TILE) + Math.floor((p.y - 1) / MAP_TILE) * g.w];
  return ground === 'snow' || ground === 'ice' ? m.snowy[p.pick % m.snowy.length]! : p.pick % m.plain;
}

/**
 * Everything drawn on the adventure map, as pixel art on the battle's grid:
 * the composed ground, cover (forests, mountain ranges, boulders, the
 * bridge), sites with their flags, monsters and the hero as their battle
 * figures (idle loops; the picked hero's walk while riding; the player's
 * other heroes stand idle where they wait), the planned path and a dithered
 * fog. It only draws: the scene owns the state and calls sync()
 * after every change. World coordinates are map pixels from tile (0, 0).
 */
export class PixelMapWorld {
  readonly layer: Phaser.GameObjects.Layer;
  private readonly sprites = new Map<string, Phaser.GameObjects.GameObject & { setVisible(v: boolean): unknown }>();
  private readonly flags = new Map<string, Phaser.GameObjects.Image>();
  private readonly figures: PixelFigure[] = [];
  /** Each monster's figure, by its object id: one beaten with the hero's bag full gives way to the piece it left. */
  private readonly monsters = new Map<string, PixelFigure>();
  /** A figure for each hero of ours, by id: the picked one rides, the rest stand. */
  private readonly ours = new Map<string, PixelFigure>();
  /** The picked hero's id: the figure the ride moves (it only changes between rides). */
  private picked: string;
  /** The rival's heroes' figures, by hero id (a lord rides with several); shown only on tiles the player has seen. */
  private readonly rivals = new Map<string, PixelFigure>();
  /** The rival figure riding tonight's path, one at a time. */
  private riding: PixelFigure | null = null;
  private readonly heroRide: Ride;
  private readonly rivalRide: Ride;
  private readonly pathMarks: Phaser.GameObjects.Image[] = [];
  private readonly markKeys: Record<string, string>;
  private readonly fog = new Map<PixelRect, Phaser.Textures.CanvasTexture>();
  /** What the fog was last drawn for. */
  private fogDrawn = '';
  private readonly chunkKeys: string[] = [];
  private flagKeys: Partial<Record<Owner, string>> = {};
  /** Pictures that stand on a tile and wait in the fog until it is seen: trees, rocks and towns with their flags. */
  private readonly shrouded: { readonly obj: { setVisible(v: boolean): unknown }; readonly x: number; readonly y: number }[] = [];
  /** Each town's picture and the buildings it was drawn with (it is redrawn as the town grows). */
  private readonly townImgs = new Map<string, { img: Phaser.GameObjects.Image; built: string }>();

  /** A Norse map's borrowed sites (altar, shrine, lair) wear the Norse looks. */
  private readonly norse: boolean;

  constructor(private readonly scene: Phaser.Scene, private readonly def: MapDef, adv: Adventure) {
    this.layer = scene.add.layer();
    this.norse = isNorseMap(def);
    const g = underLandmarks(gridOf(def), landmarksOf(def));
    this.drawGround();
    for (const p of coverPlacements(g, def.seed)) {
      const list = MAP_COVER[p.kind];
      if (!list.length) continue;
      const i = coverPick(g, p, list.length);
      const s = list[i]!;
      // The bridge lies flat under whoever crosses it.
      const depth = p.kind === 'bridge' ? FIGURE_DEPTH - 1 : FIGURE_DEPTH + p.y;
      const img = this.place(MAP_TEX.cover(p.kind, i), s, p.x, p.y, depth, p.flip);
      // A bridge lies under the fog with the ground; everything else waits to be seen.
      if (p.kind !== 'bridge') this.shrouded.push({ obj: img, x: Math.floor(p.x / MAP_TILE), y: Math.floor(p.y / MAP_TILE) });
    }
    for (const t of adv.towns) this.addTown(t);
    for (const o of def.objects) this.addObject(o);
    for (const l of landmarksOf(def)) this.addLandmark(l);
    this.picked = adv.hero.id;
    for (const h of ourHeroes(adv)) this.addHero(h);
    for (const r of rivalHeroes(adv)) this.addRival(r);
    this.heroRide = new Ride((x, y) => this.hero.setFeet(x, y));
    this.rivalRide = new Ride((x, y) => this.riding?.setFeet(x, y));
    this.markKeys = {
      dot: putBuffer(scene, drawMark('dot', PATH_TODAY)), ring: putBuffer(scene, drawMark('ring', PATH_LATER)),
      crossToday: putBuffer(scene, drawMark('cross', PATH_TODAY)), crossLater: putBuffer(scene, drawMark('cross', PATH_LATER)),
    };
    this.addFog();
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
    this.sync(adv);
  }

  /** The fog's pieces, empty until the first sync draws them. */
  private addFog(): void {
    const off = -GROUND_BORDER * MAP_TILE;
    fogPieces(gridOf(this.def), FOG_PIECE_PX).forEach((rect, i) => {
      const key = `${MAP_TEX.fog(this.def.id)}-${i}`;
      if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
      const tex = this.scene.textures.createCanvas(key, rect.w, rect.h)!;
      tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.layer.add(this.scene.add.image(off + rect.x, off + rect.y, key).setOrigin(0).setDepth(FOG_DEPTH));
      this.fog.set(rect, tex);
    });
  }

  /** The map's ground, composed once and cut into chunk textures (made ahead under the loading screen when it could be: groundPrep.ts). */
  private drawGround(): void {
    const off = -GROUND_BORDER * MAP_TILE;
    for (const c of groundNow(this.scene, this.def)) {
      this.chunkKeys.push(c.key);
      this.layer.add(this.scene.add.image(off + c.x, off + c.y, c.key).setOrigin(0).setDepth(0));
    }
  }

  /** A still sprite with its feet on (x, y). */
  private place(key: string, s: { w: number; h: number; footX: number; footY: number }, x: number, y: number, depth: number, flip = false): Phaser.GameObjects.Image {
    const img = this.scene.add.image(Math.round(x), Math.round(y), key).setFlipX(flip)
      .setDisplayOrigin(flip ? s.w - 1 - s.footX : s.footX, s.footY).setDepth(depth);
    this.layer.add(img);
    return img;
  }

  /** The town as its own screen shows it: the city for what is built, shrunk to a map sprite (redrawn as it grows). */
  private townSprite(id: string, built: readonly BuildingId[], faction?: TownFaction): { key: string; sprite: { w: number; h: number; footX: number; footY: number } } {
    // A town with a picture of its own (Nubt's red banners), drawn whole.
    const look = this.def.towns?.find((t) => t.id === id)?.look;
    if (look && TOWN_LOOKS[look]) return { key: MAP_TEX.townLook(look), sprite: TOWN_LOOKS[look]! };
    // Egypt's town and the Norse ring fort are drawn whole; they do not grow with the buildings.
    const people = peopleTownOf({ faction });
    if (people) return people;
    const px = (key: string): Pixels => texturePixels(this.scene, key);
    const art: CityArt = {
      piece: (a) => px(TOWN_TEX.piece(a)),
      tree: (k, i) => px(MAP_TEX.cover(k, i)),
      swatches: { paving: px(TOWN_TEX.paving), grass: px(MAP_TEX.ground('grass')) },
    };
    const { city, door } = renderMapTown(built, art);
    const key = putBuffer(this.scene, city, MAP_TEX.town(`${this.def.id}-${id}`));
    return { key, sprite: { w: city.w, h: city.h, footX: door.x, footY: door.y } };
  }

  private addTown(t: Town): void {
    const s = this.townSprite(t.id, t.built, factionOf(t));
    const feet = tileFeet(t.x, t.y);
    // The gatehouse's doorstep stands on the gate tile, so the roads that end there lead to the door.
    const img = this.place(s.key, s.sprite, feet.x, feet.y, FIGURE_DEPTH + feet.y);
    this.townImgs.set(t.id, { img, built: t.built.join() });
    // The flag flies from the keep at the back of the walled city.
    this.addFlag(`town-${t.id}`, t.owner, feet.x - s.sprite.footX + Math.floor(s.sprite.w / 2) + 2, feet.y - s.sprite.footY + 8, FIGURE_DEPTH + feet.y + 1);
    this.shrouded.push({ obj: img, x: t.x, y: t.y }, { obj: this.flags.get(`town-${t.id}`)!, x: t.x, y: t.y });
  }

  private flagKey(owner: Owner): string {
    return (this.flagKeys[owner] ??= putBuffer(this.scene, drawFlag(owner)));
  }

  private addFlag(id: string, owner: Owner, x: number, y: number, depth: number): void {
    const img = this.scene.add.image(Math.round(x), Math.round(y), this.flagKey(owner)).setOrigin(0, 1).setDepth(depth);
    this.layer.add(img);
    this.flags.set(id, img);
  }

  private addObject(o: MapObject): void {
    const feet = tileFeet(o.x, o.y);
    if (o.kind === 'monster') {
      const id = o.creature!;
      // Monsters face whichever way their id says, so a map doesn't look stamped.
      const fig = new PixelFigure(this.scene, this.layer, unitArt(id), () => PX_TEX.unit(id, 'idle'), feet, o.id.length % 2 === 0);
      this.figures.push(fig);
      this.monsters.set(o.id, fig);
      this.sprites.set(o.id, fig.sprite);
      return;
    }
    if (o.kind === 'item') {
      this.addLyingItem(o);
      return;
    }
    const art = siteArtOf(o, this.norse);
    const s = art ? siteSprite(art) : null;
    if (!s) return;
    const img = this.place(s.key, s.sprite, feet.x, feet.y + 2, FIGURE_DEPTH + feet.y - 1);
    this.sprites.set(o.id, img);
    // Mines and outer dwellings fly their holder's flag.
    if (o.kind === 'mine' || o.kind === 'dwelling') this.addFlag(o.id, 'neutral', feet.x + Math.floor(s.sprite.w * 0.25), feet.y - s.sprite.h + 12, FIGURE_DEPTH + feet.y);
  }

  /** A landmark: a picture with its feet on the tile (the great temple), waiting in the fog until it is seen. */
  private addLandmark(l: MapLandmark): void {
    const s = landmarkSprite(l.art);
    if (!s) return;
    const feet = tileFeet(l.x, l.y);
    const img = this.place(s.key, s.sprite, feet.x, feet.y + 2, FIGURE_DEPTH + feet.y - 1);
    this.shrouded.push({ obj: img, x: l.x, y: l.y });
  }

  /** A piece of gear on the ground, in its own icon at half size, where the monster that left it stood. */
  private addLyingItem(o: MapObject): void {
    const fig = this.monsters.get(o.id);
    if (fig) {
      fig.destroy();
      this.monsters.delete(o.id);
      this.figures.splice(this.figures.indexOf(fig), 1);
    }
    const feet = tileFeet(o.x, o.y);
    const shadow = this.scene.add.ellipse(0, 0, 26, 8, 0x000000, 0.3);
    const icon = this.scene.add.image(0, 2, UI_TEX.item(o.item!)).setOrigin(0.5, 1).setScale(LYING_SCALE);
    const piece = this.scene.add.container(feet.x, feet.y, [shadow, icon]).setDepth(FIGURE_DEPTH + feet.y - 1);
    this.layer.add(piece);
    this.sprites.set(o.id, piece);
  }

  /** A figure for hero `h` of ours, in their own art when drawn (else Rowan's), standing on their tile. */
  private addHero(h: Hero): PixelFigure {
    const art = heroArt('player', h.id);
    const feet = tileFeet(h.x, h.y);
    const fig = new PixelFigure(this.scene, this.layer, art.art, (pose) => PX_TEX.hero(art.id, pose), feet, false);
    this.figures.push(fig);
    this.ours.set(h.id, fig);
    return fig;
  }

  /** The picked hero's figure (made if it's new: just hired). */
  private get hero(): PixelFigure {
    return this.ours.get(this.picked)!;
  }

  /** One figure for each hero of ours, each on their tile: a new hire gets one, a fallen hero's goes. The rider is left where the ride has them. */
  private syncHeroes(adv: Adventure): void {
    const heroes = ourHeroes(adv);
    const ids = new Set(heroes.map((h) => h.id));
    for (const [id, fig] of this.ours) {
      if (ids.has(id)) continue;
      fig.destroy();
      this.ours.delete(id);
      this.figures.splice(this.figures.indexOf(fig), 1);
    }
    const riding = this.heroRide.moving;
    if (!riding) this.picked = adv.hero.id;
    for (const h of heroes) {
      const fig = this.ours.get(h.id) ?? this.addHero(h);
      // A hero in a town's garrison is inside its walls, out of sight.
      fig.sprite.setVisible(!(isEmptyArmy(h.army) && adv.towns.some((t) => t.x === h.x && t.y === h.y)));
      if (riding && h.id === this.picked) continue;
      const f = tileFeet(h.x, h.y);
      fig.setFeet(f.x, f.y);
    }
  }

  /** Brings every drawing in line with the state. */
  sync(adv: Adventure): void {
    const live = new Set(liveObjects(adv).map((o) => o.id));
    const seen = (x: number, y: number): boolean => isSeen(adv, this.def, x, y);
    for (const o of adv.objects) {
      // A piece newly on the ground: a beaten monster's drop where it stood, or a beaten hero's spoils (new objects) laid near the battle.
      if (o.kind === 'item' && (this.monsters.has(o.id) || !this.sprites.has(o.id))) this.addLyingItem(o);
      this.sprites.get(o.id)?.setVisible(live.has(o.id) && seen(o.x, o.y));
      const flag = this.flags.get(o.id);
      if (flag) flag.setTexture(this.flagKey(o.owner === 'player' ? 'player' : o.owner === 'rival' ? 'rival' : 'neutral')).setVisible(seen(o.x, o.y));
    }
    for (const s of this.shrouded) s.obj.setVisible(seen(s.x, s.y));
    this.syncHeroes(adv);
    if (!this.rivalRide.moving) this.placeRival(adv);
    for (const t of adv.towns) {
      this.flags.get(`town-${t.id}`)?.setTexture(this.flagKey(t.owner));
      const drawn = this.townImgs.get(t.id);
      if (!drawn || drawn.built === t.built.join()) continue;
      // Built in town: the map's town grows with it.
      drawn.built = t.built.join();
      const s = this.townSprite(t.id, t.built, factionOf(t));
      const feet = tileFeet(t.x, t.y);
      drawn.img.setTexture(s.key).setDisplayOrigin(s.sprite.footX, s.sprite.footY).setPosition(feet.x, feet.y);
    }
    this.drawFog(adv);
  }

  /** A figure for the rival's hero `h`, in his own art when drawn (else the rival's), hidden until placed. */
  private addRival(h: Hero): PixelFigure {
    const art = heroArt('rival', h.id);
    const fig = new PixelFigure(this.scene, this.layer, art.art, (pose) => PX_TEX.hero(art.id, pose), tileFeet(h.x, h.y), true);
    fig.sprite.setVisible(false);
    this.figures.push(fig);
    this.rivals.set(h.id, fig);
    return fig;
  }

  /**
   * The rival's heroes where `adv` has them: a figure for each (a new hire
   * gets one, a beaten hero's goes), shown on tiles the player has seen.
   * A hero in his own town's garrison is inside its walls, out of sight.
   */
  placeRival(adv: Adventure, heroes: readonly Hero[] = rivalHeroes(adv)): void {
    const ids = new Set(heroes.map((h) => h.id));
    for (const [id, fig] of this.rivals) {
      if (ids.has(id)) continue;
      fig.destroy();
      this.rivals.delete(id);
      this.figures.splice(this.figures.indexOf(fig), 1);
    }
    for (const h of heroes) {
      const fig = this.rivals.get(h.id) ?? this.addRival(h);
      const f = tileFeet(h.x, h.y);
      fig.setFeet(f.x, f.y);
      const inside = isEmptyArmy(h.army) && adv.towns.some((t) => t.x === h.x && t.y === h.y);
      fig.sprite.setVisible(!inside && isSeen(adv, this.def, h.x, h.y));
    }
  }

  /**
   * Rides the rival's heroes along tonight's `rides`, one after another,
   * each on his own figure: seen, he gallops; unseen, he slips through the
   * fog. Resolves at the end of the last.
   */
  async rideRivals(rides: readonly RivalRide[], seen: (x: number, y: number) => boolean): Promise<void> {
    for (const r of rides) {
      const fig = this.rivals.get(r.id);
      if (fig) await this.rideOne(fig, r.tiles, seen);
    }
    this.riding = null;
  }

  private rideOne(fig: PixelFigure, tiles: readonly { x: number; y: number }[], seen: (x: number, y: number) => boolean): Promise<void> {
    this.riding = fig;
    fig.walk(RIDE_FPS);
    return new Promise((resolve) => {
      const next = (i: number): void => {
        const t = tiles[i];
        if (!t) {
          fig.idle();
          resolve();
          return;
        }
        const to = tileFeet(t.x, t.y);
        const sees = seen(t.x, t.y);
        // Coming out of the fog he simply appears on the tile.
        if (!sees || !fig.sprite.visible) {
          fig.sprite.setVisible(sees);
          fig.setFeet(to.x, to.y);
          next(i + 1);
          return;
        }
        if (to.x !== fig.feet.x) fig.face(to.x < fig.feet.x);
        this.rivalRide.go(fig.feet, to, () => next(i + 1));
      };
      next(0);
    });
  }

  /** The hero's feet, map pixels. */
  get heroFeet(): { x: number; y: number } {
    return this.hero.feet;
  }

  /** Whether the hero is between two tiles. */
  get heroRiding(): boolean {
    return this.heroRide.moving;
  }

  startRide(): void {
    this.hero.walk(RIDE_FPS);
  }

  stopRide(_now = false): void {
    this.hero.idle();
  }

  /** Turns the hero towards tile column `x`. */
  faceHero(x: number): void {
    const cx = tileFeet(x, 0).x;
    if (Math.abs(cx - this.hero.feet.x) > 1) this.hero.face(cx < this.hero.feet.x);
  }

  /** Rides the hero one tile and calls `arrive` there, within the same frame, so the next tile follows without a pause. */
  walkHero(x: number, y: number, arrive: () => void): void {
    const to = tileFeet(x, y);
    const from = this.hero.feet;
    if (to.x !== from.x) this.hero.face(to.x < from.x);
    this.heroRide.go(from, to, arrive);
  }

  /** The planned path: green dots for today, red rings for later days, a cross at its end. */
  showPath(path: readonly PathStep[] | null): void {
    for (const m of this.pathMarks) m.destroy();
    this.pathMarks.length = 0;
    if (!path?.length) return;
    path.forEach((s, i) => {
      const last = i === path.length - 1;
      const today = s.day === 0;
      const key = last ? (today ? this.markKeys.crossToday! : this.markKeys.crossLater!) : today ? this.markKeys.dot! : this.markKeys.ring!;
      const at = tileFeet(s.x, s.y);
      const img = this.scene.add.image(0, 0, key).setOrigin(0).setDepth(PATH_DEPTH);
      img.setPosition(at.x - Math.floor(img.width / 2), at.y - 6 - Math.floor(img.height / 2));
      this.layer.add(img);
      this.pathMarks.push(img);
    });
  }

  /** Redraws the parts of the fog that what was just explored reaches. */
  private drawFog(adv: Adventure): void {
    const g = gridOf(this.def);
    const touched = touchedPieces(g, [...this.fog.keys()], this.fogDrawn, adv.explored);
    this.fogDrawn = adv.explored;
    for (const { piece, part } of touched) {
      const fog = composeFog(g, adv.explored, hexRgb(BACKDROP), part);
      const tex = this.fog.get(piece)!;
      tex.context.putImageData(new ImageData(fog.data as Uint8ClampedArray<ArrayBuffer>, fog.w, fog.h), part.x - piece.x, part.y - piece.y);
      tex.refresh();
    }
  }

  update(delta: number): void {
    this.heroRide.update(delta);
    this.rivalRide.update(delta);
    for (const f of this.figures) f.update(delta);
  }

  private destroy(): void {
    for (const k of [...this.chunkKeys, ...Object.values(this.markKeys), ...Object.values(this.flagKeys), ...[...this.fog.values()].map((t) => t.key)]) if (k && this.scene.textures.exists(k)) this.scene.textures.remove(k);
  }
}

function hexRgb(c: string): [number, number, number] {
  const v = parseInt(c.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}
