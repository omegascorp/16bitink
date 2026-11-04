import Phaser from 'phaser';
import { MAP_COVER } from '../../art/pixel/map';
import { BACKDROP } from '../../art/palette';
import type { MapDef } from '../../level/types';
import { gridOf, isSeen, liveObjects, type Adventure } from '../../logic/adventure';
import type { Town } from '../../logic/town';
import type { Terrain } from '../../logic/map';
import type { MapObject, Owner } from '../../logic/objects';
import type { PathStep } from '../../logic/path';
import { heroArt, PX_TEX, unitArt } from '../battle/pixelAssets';
import { FIGURE_DEPTH, PixelFigure } from '../battle/pixelFigure';
import { PixelBuffer, type Rgba } from '../battle/pixelRaster';
import type { Pixels } from '../battle/pixelScenery';
import { putBuffer, texturePixels } from '../battle/pixelUi';
import { coverPlacements } from './mapCover';
import type { BuildingId } from '../../logic/buildings';
import { renderMapTown, type CityArt } from '../town/cityRender';
import { TOWN_TEX } from '../town/townTex';
import { MAP_TEX, siteArtOf, siteSprite } from './pixelMapArt';
import { composeFog, composeGround, GROUND_BORDER, groundSize, MAP_TILE } from './pixelGround';

/** Ground chunks are cut this many pixels square (a texture each). */
const CHUNK_PX = 768;
/** Feet stand this far down a tile. */
const FOOT_Y = 44;
/** Over every figure and site: the planned path, then the fog. */
const PATH_DEPTH = 1e6;
/** The fog lies on the ground, under every figure: what stands on a seen tile shows whole (a tree's crown over the fog too), the rest is hidden until seen. */
const FOG_DEPTH = FIGURE_DEPTH - 0.5;
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

/**
 * Everything drawn on the adventure map, as pixel art on the battle's grid:
 * the composed ground, cover (forests, mountain ranges, boulders, the
 * bridge), sites with their flags, monsters and the hero as their battle
 * figures (idle loops; the hero's walk while riding), the planned path and
 * a dithered fog. It only draws: the scene owns the state and calls sync()
 * after every change. World coordinates are map pixels from tile (0, 0).
 */
export class PixelMapWorld {
  readonly layer: Phaser.GameObjects.Layer;
  private readonly sprites = new Map<string, Phaser.GameObjects.GameObject & { setVisible(v: boolean): unknown }>();
  private readonly flags = new Map<string, Phaser.GameObjects.Image>();
  private readonly figures: PixelFigure[] = [];
  private readonly hero: PixelFigure;
  /** The rival lord's figure, on a map that has one; shown only on tiles the player has seen. */
  private readonly rival: PixelFigure | null;
  private rivalRiding = false;
  private readonly pathMarks: Phaser.GameObjects.Image[] = [];
  private readonly markKeys: Record<string, string>;
  private readonly fogTex: Phaser.Textures.CanvasTexture;
  private readonly chunkKeys: string[] = [];
  private flagKeys: Partial<Record<Owner, string>> = {};
  private walking = false;
  /** Pictures that stand on a tile and wait in the fog until it is seen: trees, rocks and towns with their flags. */
  private readonly shrouded: { readonly obj: { setVisible(v: boolean): unknown }; readonly x: number; readonly y: number }[] = [];
  /** Each town's picture and the buildings it was drawn with (it is redrawn as the town grows). */
  private readonly townImgs = new Map<string, { img: Phaser.GameObjects.Image; built: string }>();

  constructor(private readonly scene: Phaser.Scene, private readonly def: MapDef, adv: Adventure) {
    this.layer = scene.add.layer();
    const g = gridOf(def);
    this.drawGround();
    for (const p of coverPlacements(g, def.seed)) {
      const list = MAP_COVER[p.kind];
      if (!list.length) continue;
      const i = p.pick % list.length;
      const s = list[i]!;
      // The bridge lies flat under whoever crosses it.
      const depth = p.kind === 'bridge' ? FIGURE_DEPTH - 1 : FIGURE_DEPTH + p.y;
      const img = this.place(MAP_TEX.cover(p.kind, i), s, p.x, p.y, depth, p.flip);
      // A bridge lies under the fog with the ground; everything else waits to be seen.
      if (p.kind !== 'bridge') this.shrouded.push({ obj: img, x: Math.floor(p.x / MAP_TILE), y: Math.floor(p.y / MAP_TILE) });
    }
    for (const t of adv.towns) this.addTown(t);
    for (const o of def.objects) this.addObject(o);
    const h = heroArt();
    const feet = tileFeet(adv.hero.x, adv.hero.y);
    this.hero = new PixelFigure(scene, this.layer, h.art, (pose) => PX_TEX.hero(h.id, pose), feet, false);
    this.figures.push(this.hero);
    const r = adv.rival?.hero;
    const ra = heroArt('rival');
    this.rival = r ? new PixelFigure(scene, this.layer, ra.art, (pose) => PX_TEX.hero(ra.id, pose), tileFeet(r.x, r.y), true) : null;
    if (this.rival) this.figures.push(this.rival);
    this.markKeys = {
      dot: putBuffer(scene, drawMark('dot', PATH_TODAY)), ring: putBuffer(scene, drawMark('ring', PATH_LATER)),
      crossToday: putBuffer(scene, drawMark('cross', PATH_TODAY)), crossLater: putBuffer(scene, drawMark('cross', PATH_LATER)),
    };
    const size = groundSize(g);
    const key = MAP_TEX.fog(def.id);
    if (scene.textures.exists(key)) scene.textures.remove(key);
    this.fogTex = scene.textures.createCanvas(key, size.w, size.h)!;
    this.fogTex.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.layer.add(scene.add.image(-GROUND_BORDER * MAP_TILE, -GROUND_BORDER * MAP_TILE, key).setOrigin(0).setDepth(FOG_DEPTH));
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
    this.sync(adv);
  }

  /** The map's ground, composed once and cut into chunk textures. */
  private drawGround(): void {
    const g = gridOf(this.def);
    const swatches: Partial<Record<Terrain, Pixels>> = {};
    for (const t of ['grass', 'dirt', 'rough', 'sand', 'swamp', 'snow'] as const) {
      const key = MAP_TEX.ground(t);
      if (this.scene.textures.exists(key)) swatches[t] = texturePixels(this.scene, key);
    }
    const ground = composeGround({ grid: g, swatches, seed: this.def.seed });
    const off = -GROUND_BORDER * MAP_TILE;
    let n = 0;
    for (let y0 = 0; y0 < ground.h; y0 += CHUNK_PX) {
      for (let x0 = 0; x0 < ground.w; x0 += CHUNK_PX) {
        const w = Math.min(CHUNK_PX, ground.w - x0);
        const h = Math.min(CHUNK_PX, ground.h - y0);
        const piece = new PixelBuffer(w, h);
        for (let y = 0; y < h; y++) piece.data.set(ground.data.subarray(((y0 + y) * ground.w + x0) * 4, ((y0 + y) * ground.w + x0 + w) * 4), y * w * 4);
        const key = putBuffer(this.scene, piece, MAP_TEX.chunk(this.def.id, n++));
        this.chunkKeys.push(key);
        this.layer.add(this.scene.add.image(off + x0, off + y0, key).setOrigin(0).setDepth(0));
      }
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
  private townSprite(id: string, built: readonly BuildingId[]): { key: string; sprite: { w: number; h: number; footX: number; footY: number } } {
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
    const s = this.townSprite(t.id, t.built);
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
      this.sprites.set(o.id, fig.sprite);
      return;
    }
    const art = siteArtOf(o);
    const s = art ? siteSprite(art) : null;
    if (!s) return;
    const img = this.place(s.key, s.sprite, feet.x, feet.y + 2, FIGURE_DEPTH + feet.y - 1);
    this.sprites.set(o.id, img);
    if (o.kind === 'mine') this.addFlag(o.id, 'neutral', feet.x + Math.floor(s.sprite.w * 0.25), feet.y - s.sprite.h + 12, FIGURE_DEPTH + feet.y);
  }

  /** Brings every drawing in line with the state. */
  sync(adv: Adventure): void {
    const live = new Set(liveObjects(adv).map((o) => o.id));
    const seen = (x: number, y: number): boolean => isSeen(adv, this.def, x, y);
    for (const o of adv.objects) {
      this.sprites.get(o.id)?.setVisible(live.has(o.id) && seen(o.x, o.y));
      const flag = this.flags.get(o.id);
      if (flag) flag.setTexture(this.flagKey(o.owner === 'player' ? 'player' : o.owner === 'rival' ? 'rival' : 'neutral')).setVisible(seen(o.x, o.y));
    }
    for (const s of this.shrouded) s.obj.setVisible(seen(s.x, s.y));
    if (!this.walking) this.placeHero(adv.hero.x, adv.hero.y);
    if (!this.rivalRiding) this.placeRival(adv);
    for (const t of adv.towns) {
      this.flags.get(`town-${t.id}`)?.setTexture(this.flagKey(t.owner));
      const drawn = this.townImgs.get(t.id);
      if (!drawn || drawn.built === t.built.join()) continue;
      // Built in town: the map's town grows with it.
      drawn.built = t.built.join();
      const s = this.townSprite(t.id, t.built);
      const feet = tileFeet(t.x, t.y);
      drawn.img.setTexture(s.key).setDisplayOrigin(s.sprite.footX, s.sprite.footY).setPosition(feet.x, feet.y);
    }
    this.drawFog(adv);
  }

  /** The rival lord where `adv` has him: shown if he rides and the player has seen his tile. */
  placeRival(adv: Adventure): void {
    const r = adv.rival?.hero;
    if (!this.rival) return;
    if (r) this.rival.setFeet(tileFeet(r.x, r.y).x, tileFeet(r.x, r.y).y);
    this.rival.sprite.setVisible(!!r && isSeen(adv, this.def, r.x, r.y));
  }

  hideRival(): void {
    this.rival?.sprite.setVisible(false);
  }

  /** Slides the rival lord one step into sight, riding; resolves when he gets there. */
  walkRival(x: number, y: number, ms: number): Promise<void> {
    const fig = this.rival;
    if (!fig) return Promise.resolve();
    const to = tileFeet(x, y);
    // Out of the fog: he appears on the tile he comes from.
    if (!fig.sprite.visible) {
      fig.sprite.setVisible(true);
      return Promise.resolve(fig.setFeet(to.x, to.y));
    }
    const from = { ...fig.feet };
    if (to.x !== from.x) fig.face(to.x < from.x);
    fig.walk();
    this.rivalRiding = true;
    const at = { t: 0 };
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: at, t: 1, duration: ms, ease: 'Linear',
        onUpdate: () => fig.setFeet(from.x + (to.x - from.x) * at.t, from.y + (to.y - from.y) * at.t),
        onComplete: () => {
          fig.setFeet(to.x, to.y);
          fig.idle();
          this.rivalRiding = false;
          resolve();
        },
      });
    });
  }

  /** The hero's feet, map pixels. */
  get heroFeet(): { x: number; y: number } {
    return this.hero.feet;
  }

  placeHero(x: number, y: number): void {
    const f = tileFeet(x, y);
    this.hero.setFeet(f.x, f.y);
  }

  startRide(): void {
    this.hero.walk();
  }

  stopRide(_now = false): void {
    this.hero.idle();
  }

  /** Turns the hero towards tile column `x`. */
  faceHero(x: number): void {
    const cx = tileFeet(x, 0).x;
    if (Math.abs(cx - this.hero.feet.x) > 1) this.hero.face(cx < this.hero.feet.x);
  }

  /** Slides the hero one step, on whole pixels; resolves when it gets there. */
  walkHero(x: number, y: number, ms: number): Promise<void> {
    const to = tileFeet(x, y);
    const from = { ...this.hero.feet };
    if (to.x !== from.x) this.hero.face(to.x < from.x);
    const at = { t: 0 };
    this.walking = true;
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: at, t: 1, duration: ms, ease: 'Linear',
        onUpdate: () => this.hero.setFeet(from.x + (to.x - from.x) * at.t, from.y + (to.y - from.y) * at.t),
        onComplete: () => {
          this.hero.setFeet(to.x, to.y);
          this.walking = false;
          resolve();
        },
      });
    });
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

  private drawFog(adv: Adventure): void {
    const fog = composeFog(gridOf(this.def), adv.explored, hexRgb(BACKDROP));
    this.fogTex.context.putImageData(new ImageData(fog.data as Uint8ClampedArray<ArrayBuffer>, fog.w, fog.h), 0, 0);
    this.fogTex.refresh();
  }

  update(delta: number): void {
    for (const f of this.figures) f.update(delta);
  }

  private destroy(): void {
    for (const k of [...this.chunkKeys, ...Object.values(this.markKeys), ...Object.values(this.flagKeys)]) if (k && this.scene.textures.exists(k)) this.scene.textures.remove(k);
  }
}

function hexRgb(c: string): [number, number, number] {
  const v = parseInt(c.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}
