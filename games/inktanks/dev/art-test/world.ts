import Phaser from 'phaser';
import { ART } from './art';
import terrain from './assets/terrain.json';

/** Draw order: ground, track marks, baked shadows, tank shadows, then everything standing sorted by its foot. */
export const DEPTH = { ground: 0, marks: 1, shadow: 2, tankShadow: 3, sorted: 100, shots: 9000, fx: 9500, over: 10000 } as const;
export const WORLD = { w: terrain.cols * terrain.tile, h: terrain.rows * terrain.tile };

export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  tag?: 'wall' | 'water';
}

export interface Circle {
  x: number;
  y: number;
  r: number;
}

type PropKey = keyof typeof ART.props;

interface Piece {
  img: Phaser.GameObjects.Image;
  /** Its world rect, for fading. */
  rect: Phaser.Geom.Rectangle;
  sortY: number;
  /** Canopies and roofs fade a lot when a tank is under or behind them; tall walls a little when a tank is behind them. */
  fade: 'over' | 'behind';
}

const prop = (key: string): (typeof ART.props)[PropKey] => ART.props[key as PropKey];

/** The map patch: where everything stands (native px, the middle of each footprint on the ground). */
const LAYOUT = {
  house: { x: 300, y: 196 },
  wall: { x: 770, y: 250 },
  corner: { x: 190, y: 440 },
  crate: { x: 452, y: 368 },
  oaks: [[120, 110], [212, 66], [470, 104], [880, 170], [968, 300], [84, 520], [392, 520], [700, 470]],
  pines: [[56, 196], [722, 56], [520, 454], [984, 108], [262, 556], [826, 30], [36, 420]],
  rocks: [['rockA', 560, 420], ['rockB', 420, 430], ['rockC', 850, 332], ['rockA', 60, 368], ['rockB', 668, 520], ['rockC', 312, 420], ['rockB', 900, 410]] as const,
  start: { x: 96, y: 300, angle: 0 },
};

export class World {
  readonly boxes: Box[] = [];
  readonly circles: Circle[] = [];
  readonly start = LAYOUT.start;
  private readonly pieces: Piece[] = [];
  private wallState = 2;
  private wallHp = 0;
  private wallImg!: Phaser.GameObjects.Image;
  private wallShadow!: Phaser.GameObjects.Image;
  private readonly wallBoxes: Box[] = [];
  crate!: Phaser.GameObjects.Image;
  readonly cratePos = LAYOUT.crate;

  constructor(private readonly scene: Phaser.Scene) {}

  build(wallState = 2): void {
    const s = this.scene;
    s.add.image(0, 0, 'ground').setOrigin(0).setDepth(DEPTH.ground);
    const { house, wall, corner } = LAYOUT;
    const H = ART.house;
    const [doorA, doorB] = H.door as [number, number];
    this.place('houseBack', house.x, house.y, 'behind', 'house');
    this.place('houseFront', house.x, house.y, 'behind');
    this.place('houseRoof', house.x, house.y, 'over');
    const x0 = house.x - H.w / 2;
    const x1 = house.x + H.w / 2;
    const y0 = house.y - H.d / 2;
    const y1 = house.y + H.d / 2;
    const t = H.t / 2 + 0.5;
    this.boxes.push({ x0, y0: y0 - t, x1, y1: y0 + t }, { x0: x0 - t, y0, x1: x0 + t, y1 }, { x0: x1 - t, y0, x1: x1 + t, y1 });
    this.boxes.push({ x0, y0: y1 - t, x1: x0 + doorA, y1: y1 + t }, { x0: x0 + doorB, y0: y1 - t, x1, y1: y1 + t });
    this.place('corner', corner.x, corner.y, 'behind', 'corner');
    this.boxes.push({ x0: corner.x - 21.6, y0: corner.y + 6.4, x1: corner.x + 16, y1: corner.y + 9.6 }, { x0: corner.x - 21.6, y0: corner.y - 14, x1: corner.x - 18.4, y1: corner.y + 6.4 });
    for (const [x, y] of LAYOUT.oaks) this.tree('oak', x!, y!);
    for (const [x, y] of LAYOUT.pines) this.tree('pine', x!, y!);
    for (const [key, x, y] of LAYOUT.rocks) {
      if (x === undefined || y === undefined) continue;
      this.place(key, x, y, 'behind', key);
      this.circles.push({ x, y, r: prop(key).w * 0.42 });
    }
    // The breakable wall: its state is its sprite, and a breach opens a gap in its collider.
    this.wallShadow = s.add.image(0, 0, 'shadow:wall-2').setOrigin(0).setDepth(DEPTH.shadow);
    this.wallImg = s.add.image(0, 0, 'prop:wall-2').setOrigin(0);
    this.setWall(wallState);
    // The crate is a pickup: flat, straight down, under the tanks that drive over it.
    this.crate = s.add.image(LAYOUT.crate.x, LAYOUT.crate.y, 'free:crate').setDepth(DEPTH.tankShadow - 0.5);
    // Water stops tanks.
    const T = terrain.tile;
    terrain.corners.forEach((row, j) => row.forEach((k, i) => {
      if (k === 3) this.boxes.push({ x0: i * T - T / 2 + 6, y0: j * T - T / 2 + 6, x1: i * T + T / 2 - 6, y1: j * T + T / 2 - 6, tag: 'water' });
    }));
  }

  private place(key: string, x: number, y: number, fade: Piece['fade'], shadow?: string): Phaser.GameObjects.Image {
    const p = prop(key);
    if (shadow && shadow in ART.shadows) {
      const sh = ART.shadows[shadow as keyof typeof ART.shadows];
      this.scene.add.image(x + sh.x, y + sh.y, `shadow:${shadow}`).setOrigin(0).setDepth(DEPTH.shadow);
    }
    const sortY = y + p.sort;
    const img = this.scene.add.image(x + p.x, y + p.y, `prop:${key}`).setOrigin(0).setDepth(fade === 'over' && p.sort > 900 ? DEPTH.over : DEPTH.sorted + sortY);
    this.pieces.push({ img, rect: new Phaser.Geom.Rectangle(x + p.x, y + p.y, p.w, p.h), sortY, fade: p.sort > 900 ? 'over' : fade });
    return img;
  }

  private tree(kind: 'oak' | 'pine', x: number, y: number): void {
    this.place(`${kind}Trunk`, x, y, 'behind', kind);
    this.place(`${kind}Canopy`, x, y, 'over');
    this.circles.push({ x, y, r: kind === 'oak' ? 3 : 2 });
  }

  setWall(state: number): void {
    const { x, y } = LAYOUT.wall;
    this.wallState = state;
    this.wallHp = WALL_HP;
    const p = prop(`wall-${state}`);
    this.wallImg.setTexture(`prop:wall-${state}`).setPosition(x + p.x, y + p.y).setDepth(DEPTH.sorted + y + p.sort);
    const sh = ART.shadows[`wall-${state}` as keyof typeof ART.shadows];
    this.wallShadow.setTexture(`shadow:wall-${state}`).setPosition(x + sh.x, y + sh.y);
    for (const b of this.wallBoxes) this.boxes.splice(this.boxes.indexOf(b), 1);
    this.wallBoxes.length = 0;
    const half = ART.wall.l / 2;
    const t = ART.wall.t / 2 + 0.5;
    // The breach is about 36 px wide at the ground: a heavy tank fits through.
    const spans = state === 0 ? [[-half, -18], [18, half]] : [[-half, half]];
    for (const [a, b] of spans) this.wallBoxes.push({ x0: x + a!, y0: y - t, x1: x + b!, y1: y + t, tag: 'wall' });
    this.boxes.push(...this.wallBoxes);
  }

  /** A shot hit the wall: enough damage takes it a state down. */
  hitWall(damage: number): void {
    if (this.wallState === 0) return;
    this.wallHp -= damage;
    if (this.wallHp <= 0) this.setWall(this.wallState - 1);
  }

  get wallStateNow(): number {
    return this.wallState;
  }

  /** Roofs and canopies go see-through when the tank is under or behind them; tall walls fade a little when it's behind them. */
  updateFades(tx: number, ty: number, r: number, dt: number): void {
    const near = new Phaser.Geom.Rectangle(tx - r, ty - r - 8, r * 2, r * 2 + 8);
    for (const p of this.pieces) {
      const hit = Phaser.Geom.Intersects.RectangleToRectangle(near, p.rect);
      const target = p.fade === 'over' ? (hit ? 0.4 : 1) : hit && ty < p.sortY ? 0.55 : 1;
      const a = p.img.alpha + (target - p.img.alpha) * Math.min(1, dt * 8);
      p.img.setAlpha(Math.abs(a - target) < 0.01 ? target : a);
    }
  }

  /** The ground's kind under a point: grass, dirt, sand or water. */
  groundAt(x: number, y: number): string {
    const T = terrain.tile;
    const row = terrain.corners[Math.round(y / T)];
    const k = row?.[Math.round(x / T)] ?? 0;
    return terrain.kinds[String(k) as keyof typeof terrain.kinds];
  }
}

/** Damage per wall state: twelve machinegun bullets, three cannon shells, two rockets. */
const WALL_HP = 12;
