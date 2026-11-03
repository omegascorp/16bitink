import Phaser from 'phaser';
import { MAP_COVER, type MapCover } from '../../art/pixel/map';
import { SCENERY, type SceneryArt } from '../../art/pixel/scenery';
import { TOWN_ART, TOWN_PAVING, type TownArt } from '../../art/pixel/town';
import { BUILDINGS, type BuildingId } from '../../logic/buildings';
import { nearest, PX_TEX } from '../battle/pixelAssets';
import { cellRandom, composeScenery, HORIZON_Y, type Pixels } from '../battle/pixelScenery';
import { putBuffer, TextLabel, texturePixels } from '../battle/pixelUi';
import { loadMapArt, MAP_TEX } from '../map/pixelMapArt';
import { paintCity } from './townGround';
import { CITY, emptyPlots, isGarden, STAGE, STAGE_HORIZON, STAGE_SHOWN, stagePieces, toGrid, toStage, type Plot, type StagePiece } from './townStage';

export const TOWN_TEX = {
  piece: (a: TownArt) => `pxt-${a}`,
  paving: 'pxt-paving',
} as const;

const TERRAIN = 'grass';
const SEED = 7717;
/** A clear day over the town (the battle's grass sky is a sunset, too orange for half a screen of it). */
const TOWN_SKY: readonly (readonly [number, string])[] = [[420, '#4f82bd'], [220, '#6e9dcf'], [90, '#9dbfdc'], [24, '#cfd3c4']];
/** A building under the pointer brightens by this much (added to its colours). */
const LIFT = 0x262018;
/** How far a new building rises into place, and how long it takes. */
const RISE = { px: 10, ms: 700 } as const;
/** Trees in the garden round the city's edge: how likely a tile grows one, and which kinds. */
const TREE_CHANCE = 0.45;
const PLOT_TREE_CHANCE = 0.16;
const TREE_KINDS: readonly MapCover[] = ['tree', 'olive', 'pine', 'olive'];

/** The grass scenery under the town's sky (the countryside and the pictures on the town's screens). */
export function townScenery(): SceneryArt {
  return { ...SCENERY[TERRAIN]!, sky: TOWN_SKY };
}

/** Loads the town's sprites and paving, the grass scenery for its countryside and the map's art (grass, earth and trees, faces, icons, font). */
export function loadTownArt(scene: Phaser.Scene): Promise<void> {
  const keys = (Object.keys(TOWN_ART) as TownArt[]).map((a) => {
    const key = TOWN_TEX.piece(a);
    if (!scene.textures.exists(key)) scene.load.image(key, TOWN_ART[a].url);
    return key;
  });
  if (!scene.textures.exists(TOWN_TEX.paving)) scene.load.image(TOWN_TEX.paving, TOWN_PAVING);
  const atlas = PX_TEX.scenery(TERRAIN);
  if (!scene.textures.exists(atlas)) scene.load.image(atlas, SCENERY[TERRAIN]!.url);
  return loadMapArt(scene, []).then(() => [...keys, TOWN_TEX.paving, atlas].forEach((k) => nearest(scene, k)));
}

export interface TownViewOpts {
  /** A building, or the bare plot it would stand on, was tapped. */
  readonly onPick: (building: BuildingId, built: boolean) => void;
  /** Just built: rises into place. */
  readonly fresh?: BuildingId;
}

interface Tree {
  readonly kind: MapCover;
  readonly pick: number;
  readonly x: number;
  readonly y: number;
}

/** The trees in the city's garden verge and on the plots not built on yet, the same every time. */
function cityTrees(bare: readonly Plot[]): Tree[] {
  const out: Tree[] = [];
  const onBare = (i: number, j: number): boolean => bare.some((p) => i > p.a && j > p.b && i < p.a + p.n - 1 && j < p.b + p.n - 1);
  for (let i = 0; i < CITY; i++) {
    for (let j = 0; j < CITY; j++) {
      const chance = isGarden(i, j) ? TREE_CHANCE : onBare(i, j) ? PLOT_TREE_CHANCE : 0;
      if (cellRandom(SEED, i, j, 1) >= chance) continue;
      const kind = TREE_KINDS[Math.floor(cellRandom(SEED, i, j, 2) * TREE_KINDS.length)]!;
      const at = toStage(i + 0.5, j + 1);
      out.push({ kind, pick: Math.floor(cellRandom(SEED, i, j, 3) * MAP_COVER[kind].length), x: Math.round(at.x), y: Math.round(at.y) });
    }
  }
  return out;
}

/**
 * The townscape: the grass country composed for the screen's width with
 * the city on it (see townStage), its buildings, houses and trees back to
 * front. A building lightens and names itself under the pointer; a tap on
 * it, or on a bare plot, picks it. Pan it with setLeft when the stage is
 * wider than the screen.
 */
export class PixelTownView {
  readonly root: Phaser.GameObjects.Container;
  private readonly keys: string[] = [];
  private readonly label: TextLabel;
  private readonly bare: { plot: Plot; building: BuildingId }[];

  constructor(private readonly scene: Phaser.Scene, built: readonly BuildingId[], area: { w: number; h: number }, private readonly opts: TownViewOpts) {
    this.bare = emptyPlots(built);
    // The stage's top STAGE_SHOWN rows fill the area (more sky on a taller one); the countryside reaches to the sides.
    const top = area.h - STAGE_SHOWN;
    const span = Math.max(area.w, STAGE.w);
    const x0 = -Math.floor((span - STAGE.w) / 2);
    this.root = scene.add.container(0, top);
    const key = putBuffer(scene, this.composeGround({ x: x0, y: -top, w: span, h: area.h }));
    this.keys.push(key);
    const ground = scene.add.image(x0, -top, key).setOrigin(0).setInteractive();
    ground.on('pointerup', (p: Phaser.Input.Pointer) => this.tapGround(p));
    this.root.add(ground);
    this.label = new TextLabel(scene, { kind: 'title', outline: true, anchor: { x: 0.5, y: 1 } });
    const sprites: { y: number; obj: Phaser.GameObjects.Image }[] = stagePieces(built).map((p) => ({ y: p.spot.y, obj: this.sprite(p) }));
    for (const t of cityTrees(this.bare.map((b) => b.plot))) {
      const s = MAP_COVER[t.kind][t.pick]!;
      sprites.push({ y: t.y, obj: scene.add.image(t.x - s.footX, t.y - s.footY, MAP_TEX.cover(t.kind, t.pick)).setOrigin(0) });
    }
    sprites.sort((a, b) => a.y - b.y);
    for (const s of sprites) this.root.add(s.obj);
    this.label.img.setVisible(false);
    this.root.add(this.label.img);
  }

  private composeGround(area: { x: number; y: number; w: number; h: number }): Pixels {
    const atlas = texturePixels(this.scene, PX_TEX.scenery(TERRAIN));
    const out = composeScenery(atlas, townScenery(), { ...area, y: area.y - STAGE_HORIZON + HORIZON_Y }, SEED);
    paintCity(out, area, {
      paving: texturePixels(this.scene, TOWN_TEX.paving),
      grass: texturePixels(this.scene, MAP_TEX.ground('grass')),
    }, this.bare.map((b) => b.plot));
    return out;
  }

  /** A tap on the ground: a bare plot offers its building. */
  private tapGround(p: Phaser.Input.Pointer): void {
    const x = p.worldX - this.root.x;
    const y = p.worldY - this.root.y;
    const g = toGrid(x, y);
    const hit = this.bare.find(({ plot }) => g.i >= plot.a && g.j >= plot.b && g.i < plot.a + plot.n && g.j < plot.b + plot.n);
    if (hit) this.opts.onPick(hit.building, false);
  }

  private sprite(p: StagePiece): Phaser.GameObjects.Image {
    const s = TOWN_ART[p.art];
    const x = p.spot.x - Math.floor(s.w / 2);
    const y = p.spot.y - s.h;
    const img = this.scene.add.image(x, y, TOWN_TEX.piece(p.art)).setOrigin(0).setFlipX(!!p.spot.flip);
    const building = p.building;
    if (!building) return img;
    img.setInteractive({ pixelPerfect: true, alphaTolerance: 128, useHandCursor: true });
    img.on('pointerover', () => {
      img.setTint(LIFT).setTintMode(Phaser.TintModes.ADD);
      this.label.setText(BUILDINGS[building].name).setPosition(p.spot.x, Math.max(this.label.height + 2 - this.root.y, y - 2));
      this.label.img.setVisible(true);
    });
    img.on('pointerout', () => {
      img.clearTint();
      this.label.img.setVisible(false);
    });
    img.on('pointerup', () => this.opts.onPick(building, true));
    if (building === this.opts.fresh) {
      img.setAlpha(0).setY(y + RISE.px);
      this.scene.tweens.add({ targets: img, alpha: 1, y, duration: RISE.ms, ease: 'Cubic.easeOut', onUpdate: () => img.setY(Math.round(img.y)) });
    }
    return img;
  }

  /** Puts the stage's left edge at screen x `left` (whole pixels). */
  setLeft(left: number): void {
    this.root.setX(Math.round(left));
  }

  destroy(): void {
    this.label.destroy();
    this.root.destroy();
    for (const k of this.keys) if (this.scene.textures.exists(k)) this.scene.textures.remove(k);
  }
}
