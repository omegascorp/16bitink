import Phaser from 'phaser';
import { CREATURE_RES, FRAME_H, FRAME_W, GROUND_Y } from '../../art/creatures/types';
import { INK_HEX, PAPER } from '../../art/palette';
import { frameFor, SITE_RES, type SiteArt } from '../../art/sites/types';
import { CHUNK, TILE } from '../../art/terrain';
import { TEX } from '../../art/textures';
import type { MapDef } from '../../level/types';
import { gridOf, liveObjects, type Adventure } from '../../logic/adventure';
import type { MapObject } from '../../logic/objects';
import type { PathStep } from '../../logic/path';

/** How big creatures and the hero stand on the map, in units per frame unit. */
const MAP_FIGURE = 0.62;
/** Line-boil frames a second. */
const BOIL_FPS = 5;

export const tileCentre = (x: number, y: number): { x: number; y: number } => ({ x: (x + 0.5) * TILE, y: (y + 0.5) * TILE });
const tileFoot = (x: number, y: number): { x: number; y: number } => ({ x: (x + 0.5) * TILE, y: (y + 0.92) * TILE });

export function siteArtOf(o: MapObject): SiteArt | null {
  if (o.kind === 'mine' || o.kind === 'pile') return `${o.kind}-${o.resource!}` as SiteArt;
  if (o.kind === 'monster' || o.kind === 'town') return null;
  return o.kind;
}

/**
 * Everything drawn on the adventure map: ground chunks, sites, monsters,
 * flags, the hero, the planned path and the fog. It only draws: the
 * scene owns the state and calls sync() after every change.
 */
export class MapWorld {
  readonly hero: Phaser.GameObjects.Image;
  private readonly sprites = new Map<string, Phaser.GameObjects.Image>();
  private readonly flags = new Map<string, Phaser.GameObjects.Image>();
  private readonly figures: { img: Phaser.GameObjects.Image; key: (f: number) => string }[] = [];
  private readonly path: Phaser.GameObjects.Graphics;
  private readonly fog: Phaser.Textures.CanvasTexture;
  private boil = 0;
  private boilClock = 0;

  constructor(private readonly scene: Phaser.Scene, private readonly def: MapDef, adv: Adventure) {
    const g = gridOf(def);
    for (let cy = 0; cy * CHUNK < g.h; cy++) {
      for (let cx = 0; cx * CHUNK < g.w; cx++) {
        scene.add.image(cx * CHUNK * TILE, cy * CHUNK * TILE, TEX.chunk(def.id, cx, cy)).setOrigin(0).setDisplaySize(CHUNK * TILE, CHUNK * TILE).setDepth(0);
      }
    }
    this.path = scene.add.graphics().setDepth(2);
    // The town: its gate tile is (x, y); the picture rises over the row behind.
    const t = adv.town;
    const tf = frameFor('town');
    const foot = tileFoot(t.x, t.y);
    scene.add.image(foot.x, foot.y + 4, TEX.site('town')).setOrigin(tf.ox / tf.w, tf.oy / tf.h).setScale(1 / SITE_RES).setDepth(10 + t.y);
    scene.add.image(foot.x + 30, foot.y - 96, TEX.flag('player', 0)).setOrigin(0.25, 0.9).setDepth(11 + t.y);
    for (const o of def.objects) this.addObject(o);
    this.hero = scene.add.image(0, 0, TEX.hero('player', 0)).setOrigin(0.5, GROUND_Y / FRAME_H).setScale(MAP_FIGURE / CREATURE_RES);
    this.figures.push({ img: this.hero, key: (f) => TEX.hero('player', f) });
    const key = `fog-${def.id}`;
    if (scene.textures.exists(key)) scene.textures.remove(key);
    this.fog = scene.textures.createCanvas(key, g.w + 2, g.h + 2)!;
    scene.add.image(-TILE, -TILE, key).setOrigin(0).setDisplaySize((g.w + 2) * TILE, (g.h + 2) * TILE).setDepth(1000);
    this.sync(adv);
  }

  private addObject(o: MapObject): void {
    const foot = tileFoot(o.x, o.y);
    if (o.kind === 'monster') {
      const id = o.creature!;
      const img = this.scene.add.image(foot.x, foot.y, TEX.creature(id, 0)).setOrigin(0.5, GROUND_Y / FRAME_H).setScale(MAP_FIGURE / CREATURE_RES).setDepth(10 + o.y + 0.5);
      // Monsters face whichever way their id says, so a map doesn't look stamped.
      img.setFlipX(o.id.length % 2 === 0);
      this.sprites.set(o.id, img);
      this.figures.push({ img, key: (f) => TEX.creature(id, f) });
      return;
    }
    const art = siteArtOf(o);
    if (!art) return;
    const fr = frameFor(art);
    // Pickups are drawn half a tile across; on the map they stand a little larger so they read beside creatures.
    const grow = o.kind === 'pile' || o.kind === 'chest' || o.kind === 'campfire' ? 1.3 : 1;
    const img = this.scene.add.image(foot.x, foot.y + 3, TEX.site(art)).setOrigin(fr.ox / fr.w, fr.oy / fr.h).setScale(grow / SITE_RES).setDepth(10 + o.y + 0.2);
    this.sprites.set(o.id, img);
    if (o.kind === 'mine') {
      const flag = this.scene.add.image(foot.x + 18, foot.y - 36, TEX.flag('neutral', 0)).setOrigin(0.25, 0.9).setDepth(10 + o.y + 0.3);
      this.flags.set(o.id, flag);
    }
  }

  /** Brings every drawing in line with the state. */
  sync(adv: Adventure): void {
    const live = new Set(liveObjects(adv).map((o) => o.id));
    for (const [id, img] of this.sprites) img.setVisible(live.has(id));
    for (const o of adv.objects) {
      const flag = this.flags.get(o.id);
      if (flag) flag.setTexture(TEX.flag(o.owner === 'player' ? 'player' : o.owner === 'rival' ? 'rival' : 'neutral', 0));
    }
    if (!this.scene.tweens.isTweening(this.hero)) this.placeHero(adv.hero.x, adv.hero.y);
    this.drawFog(adv);
  }

  placeHero(x: number, y: number): void {
    const foot = tileFoot(x, y);
    this.hero.setPosition(foot.x, foot.y).setDepth(10 + y + 0.6);
  }

  /** Slides the hero one step; resolves when it gets there. */
  walkHero(x: number, y: number, ms: number): Promise<void> {
    const foot = tileFoot(x, y);
    if (foot.x !== this.hero.x) this.hero.setFlipX(foot.x < this.hero.x);
    this.hero.setDepth(10 + Math.max(y, Math.round(this.hero.y / TILE - 0.92)) + 0.6);
    return new Promise((resolve) => {
      this.scene.tweens.add({ targets: this.hero, x: foot.x, y: foot.y, duration: ms, ease: 'Linear', onComplete: () => {
        this.hero.setDepth(10 + y + 0.6);
        resolve();
      } });
    });
  }

  /** The planned path: filled dots for today, rings for later days, a cross at its end. */
  showPath(path: readonly PathStep[] | null): void {
    const g = this.path.clear();
    if (!path || path.length === 0) return;
    path.forEach((s, i) => {
      const c = tileCentre(s.x, s.y);
      const last = i === path.length - 1;
      const today = s.day === 0;
      if (last) {
        g.lineStyle(3, today ? 0x2f6b3a : 0x9a3b2c, 0.9);
        g.lineBetween(c.x - 8, c.y - 8, c.x + 8, c.y + 8).lineBetween(c.x - 8, c.y + 8, c.x + 8, c.y - 8);
      } else if (today) {
        g.fillStyle(0x2f6b3a, 0.85).fillCircle(c.x, c.y, 4.5);
        g.lineStyle(1.2, INK_HEX, 0.6).strokeCircle(c.x, c.y, 4.5);
      } else {
        g.lineStyle(2, 0x9a3b2c, 0.75).strokeCircle(c.x, c.y, 4);
      }
    });
  }

  private drawFog(adv: Adventure): void {
    const g = gridOf(this.def);
    const ctx = this.fog.getContext();
    ctx.clearRect(0, 0, g.w + 2, g.h + 2);
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, g.w + 2, g.h + 2);
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (adv.explored[x + y * g.w] === '1') ctx.clearRect(x + 1, y + 1, 1, 1);
    this.fog.refresh();
  }

  /** Line boil: every figure redraws with the next pen frame a few times a second. */
  update(delta: number): void {
    this.boilClock += delta;
    if (this.boilClock < 1000 / BOIL_FPS) return;
    this.boilClock = 0;
    this.boil = (this.boil + 1) % 3;
    for (const f of this.figures) f.img.setTexture(f.key(this.boil));
  }

  /** The figure's frame width on the map, for hit-testing. */
  static readonly figureWidth = FRAME_W * MAP_FIGURE;
}
