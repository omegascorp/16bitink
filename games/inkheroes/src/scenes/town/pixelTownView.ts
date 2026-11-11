import Phaser from 'phaser';
import { MAP_COVER } from '../../art/pixel/map';
import { SCENERY, type SceneryArt } from '../../art/pixel/scenery';
import { BUILDINGS, type BuildingId } from '../../logic/buildings';
import type { TownPeople } from './townKit';
import { nearest, PX_TEX } from '../battle/pixelAssets';
import { DriftingScenery } from '../battle/driftingScenery';
import { HORIZON_Y, type Pixels } from '../battle/pixelScenery';
import { putBuffer, TextLabel, texturePixels } from '../battle/pixelUi';
import { loadMapArt, MAP_TEX } from '../map/pixelMapArt';
import { CITY_SEED } from './cityRender';
import { paintCity } from './townGround';
import { flagTextures, FlyingFlags } from './flyingFlags';
import { chimneyOf, ChimneySmoke } from './townSmoke';
import { flagsOf } from './townFlags';
import { spriteOf, townKit, type TownKit } from './townKit';
import { cityWalls, CORNER_TOWERS, wallPieces } from './townWalls';
import { queueTownArt, TOWN_TEX } from './townTex';
import { cityTrees, emptyPlots, STAGE, STAGE_HORIZON, STAGE_SHOWN, stagePieces, toGrid, type Plot, type StagePiece } from './townStage';

export { TOWN_TEX };

const TERRAIN = 'grass';
/** The scenery the country behind a city is drawn from: the Greek one's grass, Egypt's desert. */
const terrainOf = (faction: TownPeople): string => townKit(faction).terrain;
const SEED = CITY_SEED;
/** A clear day over the town (the battle's grass sky is a sunset, too orange for half a screen of it). */
const TOWN_SKY: readonly (readonly [number, string])[] = [[420, '#4f82bd'], [220, '#6e9dcf'], [90, '#9dbfdc'], [24, '#cfd3c4']];
/** A building under the pointer brightens by this much (added to its colours). */
const LIFT = 0x262018;
/** How far a new building rises into place, and how long it takes. */
const RISE = { px: 10, ms: 700 } as const;

/** The grass scenery under the town's sky (the countryside and the pictures on the town's screens). */
export function townScenery(faction: TownPeople = 'crown'): SceneryArt {
  return { ...SCENERY[terrainOf(faction)]!, sky: TOWN_SKY };
}

/** Loads the grass scenery for the town's countryside and the map's art (the town's sprites and paving with it, grass and trees, faces, icons, font). */
export function loadTownArt(scene: Phaser.Scene, faction: TownPeople = 'crown'): Promise<void> {
  for (const t of new Set([TERRAIN, terrainOf(faction)])) {
    const atlas = PX_TEX.scenery(t);
    if (!scene.textures.exists(atlas)) scene.load.image(atlas, SCENERY[t]!.url);
  }
  return loadMapArt(scene, []).then(() => {
    nearest(scene, PX_TEX.scenery(TERRAIN));
    nearest(scene, PX_TEX.scenery(terrainOf(faction)));
    if (faction === 'crown') return;
    return new Promise<void>((done) => {
      const keys = queueTownArt(scene, faction);
      if (!scene.load.list.size) {
        for (const k of keys) nearest(scene, k);
        done();
        return;
      }
      scene.load.once('complete', () => {
        for (const k of keys) nearest(scene, k);
        done();
      });
      scene.load.start();
    });
  });
}

export interface TownViewOpts {
  /** A building, or the bare plot it would stand on, was tapped. */
  readonly onPick: (building: BuildingId, built: boolean) => void;
  /** Just built: rises into place. */
  readonly fresh?: BuildingId;
  /** How far the clouds have drifted already (the view before this one's `drift`). */
  readonly drift?: number;
  /** What the town's people call a building (none: BUILDINGS' Greek names). */
  readonly nameOf?: (building: BuildingId) => string;
  /** Whose city this is (none: the Greek one). */
  readonly faction?: TownPeople;
}

/**
 * The townscape: the grass country composed for the screen's width with
 * the city on it (see townStage), its buildings, houses and trees back to
 * front. A building lightens and names itself under the pointer; a tap on
 * it, or on a bare plot, picks it. The clouds drift and the chimneys
 * smoke, as in a battle (call update every frame). Pan it with setLeft
 * when the stage is wider than the screen.
 */
export class PixelTownView {
  readonly root: Phaser.GameObjects.Container;
  private readonly keys: string[] = [];
  private readonly label: TextLabel;
  private readonly bare: { plot: Plot; building: BuildingId }[];
  private readonly country: DriftingScenery;
  private readonly smoke: ChimneySmoke[] = [];
  private readonly flying: FlyingFlags;
  private readonly faction: TownPeople;
  private readonly kit: TownKit;

  constructor(private readonly scene: Phaser.Scene, built: readonly BuildingId[], area: { w: number; h: number }, private readonly opts: TownViewOpts) {
    this.faction = opts.faction ?? 'crown';
    this.kit = townKit(this.faction);
    this.bare = emptyPlots(built, this.faction);
    this.flying = new FlyingFlags(scene, this.faction);
    // The stage's top STAGE_SHOWN rows fill the area (more sky on a taller one); the countryside reaches to the sides.
    const top = area.h - STAGE_SHOWN;
    const span = Math.max(area.w, STAGE.w);
    const x0 = -Math.floor((span - STAGE.w) / 2);
    this.root = scene.add.container(0, top);
    // As the battle's backdrop: the sky, a looping strip of clouds drifting over it, and the countryside with the city painted on it.
    const stageArea = { x: x0, y: -top, w: span, h: area.h };
    this.country = new DriftingScenery(scene, {
      atlas: texturePixels(scene, PX_TEX.scenery(terrainOf(this.faction))),
      art: townScenery(this.faction),
      seed: SEED,
      area: { ...stageArea, y: stageArea.y - STAGE_HORIZON + HORIZON_Y },
      at: { x: x0, y: -top },
      into: this.root,
      paint: (front) => this.paintGround(front, stageArea),
      drift: opts.drift,
    });
    const ground = this.country.front.setInteractive();
    ground.on('pointerup', (p: Phaser.Input.Pointer) => this.tapGround(p));
    // The city's walls: the back ones behind everything in it, the front ones before it.
    // The towers are drawn still and their flags fly over them.
    const piece = (art: (typeof CORNER_TOWERS)[number]): string => TOWN_TEX.piece(art, this.faction);
    const still = new Map(CORNER_TOWERS.map((art) => [piece(art), flagTextures(scene, art, this.faction)?.still ?? piece(art)]));
    const walls = cityWalls((k) => texturePixels(scene, still.get(k) ?? k), this.faction);
    const backKey = putBuffer(scene, walls.back);
    const frontKey = putBuffer(scene, walls.front);
    this.keys.push(backKey, frontKey);
    this.root.add(scene.add.image(0, 0, backKey).setOrigin(0));
    const pieces = wallPieces();
    const flagsIn = (list: typeof pieces.back) => list.filter((w) => flagsOf(w.art, this.faction)).flatMap((w) => this.flying.fly(w.art, w.x, w.y).flags);
    for (const flag of flagsIn(pieces.back)) this.root.add(flag);
    this.label = new TextLabel(scene, { kind: 'title', outline: true, anchor: { x: 0.5, y: 1 } });
    const sprites: { y: number; obj: Phaser.GameObjects.Image | Phaser.GameObjects.Image[] }[] = stagePieces(built, this.faction).map((p) => ({ y: p.spot.y, obj: this.sprite(p) }));
    for (const t of cityTrees(this.bare.map((b) => b.plot), SEED, this.faction)) {
      if (t.piece) {
        const s = spriteOf(this.kit, t.piece);
        sprites.push({ y: t.y, obj: scene.add.image(t.x - Math.floor(s.w / 2), t.y - s.h, TOWN_TEX.piece(t.piece, this.faction)).setOrigin(0) });
        continue;
      }
      const s = MAP_COVER[t.kind][t.pick]!;
      sprites.push({ y: t.y, obj: scene.add.image(t.x - s.footX, t.y - s.footY, MAP_TEX.cover(t.kind, t.pick)).setOrigin(0) });
    }
    sprites.sort((a, b) => a.y - b.y);
    for (const s of sprites) this.root.add(s.obj);
    // Smoke rises over the roofs, behind the front walls.
    const air = scene.add.container(0, 0);
    this.root.add(air);
    for (const p of stagePieces(built, this.faction)) {
      const flue = chimneyOf(p.art, this.faction);
      if (!flue) continue;
      const s = spriteOf(this.kit, p.art);
      const left = p.spot.x - Math.floor(s.w / 2);
      const x = p.spot.flip ? left + s.w - 1 - flue.x : left + flue.x;
      this.smoke.push(new ChimneySmoke(scene, air, { x, y: p.spot.y - s.h + flue.y }));
    }
    this.root.add(scene.add.image(0, 0, frontKey).setOrigin(0));
    for (const flag of flagsIn(pieces.front)) this.root.add(flag);
    this.label.img.setVisible(false);
    this.root.add(this.label.img);
  }

  /** The city's ground (its square, streets and bare plots) painted over the countryside's `out` of `area`. */
  private paintGround(out: Pixels, area: { x: number; y: number; w: number; h: number }): void {
    paintCity(out, area, {
      paving: texturePixels(this.scene, TOWN_TEX.pavingOf(this.faction)),
      grass: texturePixels(this.scene, this.kit.groundUrl ? TOWN_TEX.groundOf(this.faction) : MAP_TEX.ground(this.kit.garden)),
    }, this.bare.map((b) => b.plot), this.faction);
  }

  /** Stage pixels the clouds have drifted (carry it into the next view). */
  get drift(): number {
    return this.country.drift;
  }

  /** A tap on the ground: a bare plot offers its building. */
  private tapGround(p: Phaser.Input.Pointer): void {
    const x = p.worldX - this.root.x;
    const y = p.worldY - this.root.y;
    const g = toGrid(x, y);
    const hit = this.bare.find(({ plot }) => g.i >= plot.a && g.j >= plot.b && g.i < plot.a + plot.n && g.j < plot.b + plot.n);
    if (hit) this.opts.onPick(hit.building, false);
  }

  /** A piece's sprite, and its flags flying over it. */
  private sprite(p: StagePiece): Phaser.GameObjects.Image[] {
    const s = spriteOf(this.kit, p.art);
    const x = p.spot.x - Math.floor(s.w / 2);
    const y = p.spot.y - s.h;
    const fly = this.flying.fly(p.art, x, y, !!p.spot.flip);
    const img = this.scene.add.image(x, y, fly.key).setOrigin(0).setFlipX(!!p.spot.flip);
    const building = p.building;
    if (!building) return [img, ...fly.flags];
    img.setInteractive({ pixelPerfect: true, alphaTolerance: 128, useHandCursor: true });
    img.on('pointerover', () => {
      img.setTint(LIFT).setTintMode(Phaser.TintModes.ADD);
      this.label.setText(this.opts.nameOf?.(building) ?? BUILDINGS[building].name).setPosition(p.spot.x, Math.max(this.label.height + 2 - this.root.y, y - 2));
      this.label.img.setVisible(true);
    });
    img.on('pointerout', () => {
      img.clearTint();
      this.label.img.setVisible(false);
    });
    img.on('pointerup', () => this.opts.onPick(building, true));
    if (building === this.opts.fresh) {
      img.setAlpha(0).setY(y + RISE.px);
      // Its flags are run up once it stands.
      for (const f of fly.flags) f.setVisible(false);
      this.scene.tweens.add({ targets: img, alpha: 1, y, duration: RISE.ms, ease: 'Cubic.easeOut', onUpdate: () => img.setY(Math.round(img.y)), onComplete: () => fly.flags.forEach((f) => f.setVisible(true)) });
    }
    return [img, ...fly.flags];
  }

  /** Drifts the clouds and the smoke (call every frame). */
  update(delta: number): void {
    this.country.update(delta);
    this.flying.update(delta);
    for (const s of this.smoke) s.update(delta);
  }

  /** Puts the stage's left edge at screen x `left` (whole pixels). */
  setLeft(left: number): void {
    this.root.setX(Math.round(left));
  }

  destroy(): void {
    for (const s of this.smoke) s.destroy();
    this.label.destroy();
    this.country.destroy();
    this.root.destroy();
    for (const k of this.keys) if (this.scene.textures.exists(k)) this.scene.textures.remove(k);
  }
}
