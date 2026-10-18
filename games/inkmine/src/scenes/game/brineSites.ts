import type Phaser from 'phaser';
import { ASTER_CRAFT, type CraftState } from '../../art/asterCraftArt';
import { bakeBrine, BRINE_TEX, CRYSTAL_RES, DRIVE_CRYSTAL, TIDESINGER_RES } from '../../art/brineTextures';
import { ART_RES, BOIL } from '../../art/palette';
import { TIDESINGER } from '../../art/tidesinger/body';
import { AIR_BELL, REEF_HOME } from '../../art/tidesinger/reef';
import type { Mine } from '../../logic/mine';
import { ringDelta } from '../../logic/terrain';
import type { Ring } from './ring';

/** Line-boil frames a second. */
const BOIL_MS = 160;
/** How near the reef counts as there: tiles either side of its middle, and rows above its floor (the cave's height). */
const REEF_REACH = { cols: 10, rows: 8 } as const;
/** The Tidesingers swim slow loops round their door: how far, how high, how long a loop takes (ms). */
const LOOP = { w: 120, h: 34, ms: 9000 } as const;
/** The air bell is drawn a little smaller than its picture, to fit its corner of the cave. */
const BELL_SCALE = 0.8;
/** How near the craft counts as reaching it: tiles either side, and rows above its reef. */
const CRAFT_REACH = { cols: 5, rows: 6 } as const;
/** The raised craft rides this many px under the sea's surface (its lift bags under it). */
const FLOAT = 22;

/**
 * The Tidesingers' reef on Brine, deep under the seabed: their door in
 * the cave floor, two of them swimming slow loops in front of it (singing
 * once they've let you in), and in the cave's upper corner the air bell
 * they keep full for the Aster crew.
 */
export class ReefSite {
  /** The door's middle, px along the ground. */
  readonly x: number;
  private readonly floor: number;
  private readonly home: Phaser.GameObjects.Image;
  private readonly bell: Phaser.GameObjects.Image | null;
  /** The bell's middle, px along the ground. */
  private readonly bellX: number;
  private readonly singers: Phaser.GameObjects.Image[];

  constructor(scene: Phaser.Scene, private readonly at: { readonly col: number; readonly row: number }, private readonly tile: number, bell: { readonly col: number; readonly row: number } | null) {
    bakeBrine(scene);
    this.x = (at.col + 0.5) * tile;
    this.floor = (at.row + 1) * tile;
    const R = REEF_HOME;
    this.home = scene.add.image(this.x, this.floor, BRINE_TEX.reefHome(0)).setOrigin(R.ox / R.w, R.oy / R.h).setScale(1 / ART_RES).setDepth(1.75);
    const B = AIR_BELL;
    this.bellX = bell ? (bell.col + 0.5) * tile : 0;
    this.bell = bell ? scene.add.image((bell.col + 0.5) * tile, (bell.row + 1) * tile, BRINE_TEX.airBell(3, 0)).setOrigin(B.ox / B.w, B.oy / B.h).setScale(BELL_SCALE / ART_RES).setDepth(1.8) : null;
    const S = TIDESINGER;
    this.singers = [0, 1].map(() => scene.add.image(this.x, this.floor, BRINE_TEX.tidesinger('glide', 0)).setOrigin(S.ox / S.w, S.oy / S.h).setScale(1 / TIDESINGER_RES).setDepth(2.1));
  }

  /** Where the beacon points: their door. */
  get point(): { x: number; y: number } {
    return { x: this.x, y: this.floor - this.tile * 2 };
  }

  /** Whether the prospector is in the reef's cave, by their door. */
  holds(mine: Mine): boolean {
    const p = mine.player;
    const T = this.tile;
    const across = Math.abs(ringDelta(mine.terrain, p.x + p.w / 2, this.x, T)) / T;
    const feet = p.y + p.h;
    return across <= REEF_REACH.cols && feet <= this.floor + 4 && feet >= this.floor - REEF_REACH.rows * T;
  }

  /** `welcome`: they've let you in, and sing as they swim. */
  update(ring: Ring, now: number, welcome: boolean): void {
    const f = Math.floor(now / BOIL_MS) % BOIL;
    const x = ring.near(this.x);
    this.home.setTexture(BRINE_TEX.reefHome(f)).setX(x);
    this.bell?.setTexture(BRINE_TEX.airBell(3, f)).setX(ring.near(this.bellX));
    this.singers.forEach((s, i) => {
      const t = ((now / LOOP.ms + i * 0.5) % 1) * Math.PI * 2;
      const dx = Math.cos(t) * LOOP.w * (i ? 0.8 : 1);
      // Facing the way they swim: right on the near half of the loop, left on the far.
      const right = Math.sin(t) < 0;
      s.setTexture(BRINE_TEX.tidesinger(welcome && i === 0 ? 'sing' : 'glide', f))
        .setPosition(x + dx, this.floor - this.tile * 3 + Math.sin(t) * LOOP.h - i * 18)
        .setFlipX(!right);
    });
  }
}

/**
 * The Aster crew's craft: on Brine, sunk on the reef top under two metres
 * of water, then, once raised, riding at the surface on its lift bags, its
 * glass dark until its heart is mended, and gone once it flies home; on
 * Mycel, landed by their camp after that.
 */
export class CraftSite {
  readonly x: number;
  /** The ground under it, px (Brine's reef top). */
  private readonly reef: number;
  /** The sea's surface over it, px; null on dry ground. */
  private readonly sea: number | null;
  private readonly image: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, at: { readonly col: number; readonly row: number }, private readonly tile: number, seaRow: number | null) {
    bakeBrine(scene);
    this.x = (at.col + 0.5) * tile;
    this.reef = at.row * tile;
    this.sea = seaRow === null ? null : seaRow * tile;
    const C = ASTER_CRAFT;
    this.image = scene.add.image(this.x, this.reef, BRINE_TEX.asterCraft('sunk', 0)).setOrigin(C.ox / C.w, C.oy / C.h).setScale(1 / ART_RES).setDepth(1.8);
  }

  get point(): { x: number; y: number } {
    return { x: this.x, y: this.reef - this.tile };
  }

  /** Whether the prospector has reached it: beside it, anywhere from the surface down to the reef. */
  near(mine: Mine): boolean {
    const p = mine.player;
    const T = this.tile;
    const across = Math.abs(ringDelta(mine.terrain, p.x + p.w / 2, this.x, T)) / T;
    const feet = p.y + p.h;
    return across <= CRAFT_REACH.cols && feet <= this.reef + 4 && feet >= this.reef - CRAFT_REACH.rows * T;
  }

  /** `state` null: it isn't here (flown). */
  update(ring: Ring, now: number, state: CraftState | null): void {
    this.image.setVisible(state !== null);
    if (state === null) return;
    const f = Math.floor(now / BOIL_MS) % BOIL;
    // Raised, it bobs gently on the swell; landed or sunk, it rests on the ground.
    const afloat = this.sea !== null && (state === 'raised' || state === 'mended');
    const y = afloat ? this.sea! + FLOAT + Math.sin(now * 0.0016) * 2 : this.reef;
    this.image.setTexture(BRINE_TEX.asterCraft(state, f)).setPosition(ring.near(this.x), y);
  }
}

/** How near the drive crystal counts as touching it: tiles either side, and rows above its floor. */
const CRYSTAL_REACH = { cols: 1.5, rows: 2 } as const;

/**
 * The Aster craft's drive crystal, lying in the silt of the Leviathan's
 * cave: there once the crew have told you it's gone, glowing softly, until
 * you take it.
 */
export class CrystalSite {
  readonly x: number;
  private readonly floor: number;
  private readonly image: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, at: { readonly col: number; readonly row: number }, private readonly tile: number) {
    bakeBrine(scene);
    this.x = (at.col + 0.5) * tile;
    this.floor = (at.row + 1) * tile;
    const C = DRIVE_CRYSTAL;
    this.image = scene.add.image(this.x, this.floor, BRINE_TEX.driveCrystal(0)).setOrigin(C.ox / C.w, C.oy / C.h).setScale(1 / CRYSTAL_RES).setDepth(3.4).setVisible(false);
  }

  get point(): { x: number; y: number } {
    return { x: this.x, y: this.floor - this.tile / 2 };
  }

  /** Whether the prospector is touching it. */
  near(mine: Mine): boolean {
    const p = mine.player;
    const T = this.tile;
    const across = Math.abs(ringDelta(mine.terrain, p.x + p.w / 2, this.x, T)) / T;
    const feet = p.y + p.h;
    return across <= CRYSTAL_REACH.cols && feet <= this.floor + 4 && feet >= this.floor - CRYSTAL_REACH.rows * T;
  }

  update(ring: Ring, now: number, shown: boolean): void {
    this.image.setVisible(shown);
    if (shown) this.image.setTexture(BRINE_TEX.driveCrystal(Math.floor(now / BOIL_MS) % BOIL)).setX(ring.near(this.x));
  }
}
