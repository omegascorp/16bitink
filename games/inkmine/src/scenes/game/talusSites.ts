import type Phaser from 'phaser';
import type { GroundStyle } from '../../art/palette';
import { ART_RES, BOIL } from '../../art/palette';
import { makeDraw } from '../../art/kit';
import { drawSearchHatch, drawSearchShip, SEARCH_HATCH, SEARCH_SHIP } from '../../art/searchShipArt';
import { LANDER_FINISH, render } from '../../art/textures';
import { surfaceAt, type CarveSpec } from '../../level/carve';
import type { Mine } from '../../logic/mine';
import { ringDelta, TILE, tileAt } from '../../logic/terrain';
import type { Ring } from './ring';

/** Line-boil frames a second. */
const BOIL_MS = 160;
/** How near the hatch counts as reaching it: tiles across from its middle, and rows up or down. */
const HATCH_REACH = { cols: 1.3, rows: 1.5 } as const;

const TEX = {
  ship: (f: number) => `search-ship-${f}`,
  hatch: 'search-hatch',
} as const;

/**
 * The search party's ship on Talus (spec, "Talus: The story"), lying
 * nose-first in the loose rock at the big mesa's foot. Its hatch is buried:
 * dig the rock out from in front of it and it shows, and reaching it finds
 * the ship. The picture is cut off along the ground as it was carved, so
 * the ship goes into the rock where the slope is.
 */
export class SearchShipSite {
  /** The hatch's middle, px along the ground, and its tile. */
  readonly x: number;
  private readonly hatchTile: readonly [number, number];
  private readonly floor: number;
  private readonly ship: Phaser.GameObjects.Image;
  private readonly hatch: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, site: CarveSpec, at: { readonly col: number; readonly row: number }, private readonly tile: number, style: GroundStyle) {
    const T = tile;
    this.x = (at.col + 0.5) * T;
    this.floor = (at.row + 1) * T;
    this.hatchTile = [at.col, at.row];
    // The ground as carved, in the picture's units (px from the hatch's foot).
    const ground = (x: number): number => surfaceAt(site, Math.floor((this.x + x) / T)) * T - this.floor;
    const S = SEARCH_SHIP;
    for (let f = 0; f < BOIL; f++) {
      if (!scene.textures.exists(TEX.ship(f))) scene.textures.addCanvas(TEX.ship(f), render(S.w, S.h, S.ox, S.oy, ART_RES, (ctx) => drawSearchShip(makeDraw(ctx, 4200 + f, f, 0), ground, style), LANDER_FINISH));
    }
    const H = SEARCH_HATCH;
    if (!scene.textures.exists(TEX.hatch)) scene.textures.addCanvas(TEX.hatch, render(H.w, H.h, H.ox, H.oy, ART_RES, (ctx) => drawSearchHatch(makeDraw(ctx, 4250, 0, 0)), LANDER_FINISH));
    this.ship = scene.add.image(this.x, this.floor, TEX.ship(0)).setOrigin(S.ox / S.w, S.oy / S.h).setScale(1 / ART_RES).setDepth(1.8);
    this.hatch = scene.add.image(this.x, this.floor, TEX.hatch).setOrigin(H.ox / H.w, H.oy / H.h).setScale(1 / ART_RES).setDepth(1.85).setVisible(false);
  }

  /** Where the beacon points: the hatch. */
  get point(): { x: number; y: number } {
    return { x: this.x, y: this.floor - this.tile / 2 };
  }

  /** Whether the prospector has reached the hatch: it's in the rock, so only by digging to it. */
  reached(mine: Mine): boolean {
    const p = mine.player;
    const T = this.tile;
    const across = Math.abs(ringDelta(mine.terrain, p.x + p.w / 2, this.x, T)) / T;
    const up = Math.abs(p.y + p.h / 2 - (this.floor - T / 2)) / T;
    return across <= HATCH_REACH.cols && up <= HATCH_REACH.rows;
  }

  update(ring: Ring, now: number, mine: Mine): void {
    const f = Math.floor(now / BOIL_MS) % BOIL;
    const x = ring.near(this.x);
    this.ship.setTexture(TEX.ship(f)).setX(x);
    // The hatch shows once the rock in front of it is dug out.
    this.hatch.setX(x).setVisible(tileAt(mine.terrain, this.hatchTile[0], this.hatchTile[1]) === TILE.air);
  }
}
