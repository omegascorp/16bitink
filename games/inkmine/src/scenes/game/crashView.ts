import type Phaser from 'phaser';
import { ASTER_WRECK, asterBeacon } from '../../art/asterWreckArt';
import { ART_RES, BOIL } from '../../art/palette';
import { bakeAsterWreck, TEX } from '../../art/textures';
import type { Ring } from './ring';

/** Ms the beacon takes to flash once: on for the first part, then dark. */
const FLASH_MS = 1400;
const ON = 0.3;

/**
 * A lost lander lying in the world (Mycel's Aster lander), drawn near the
 * camera with its lines boiling, and its distress beacon still flashing on
 * its crown: a teal light, on and off, that can be seen from far off.
 */
export class CrashView {
  private readonly wreck: Phaser.GameObjects.Image;
  private readonly beam: Phaser.GameObjects.Image;
  private readonly x: number;

  constructor(scene: Phaser.Scene, at: { readonly col: number; readonly row: number }, T: number) {
    bakeAsterWreck(scene);
    const A = ASTER_WRECK;
    this.x = (at.col + 0.5) * T;
    const y = at.row * T;
    this.wreck = scene.add.image(this.x, y, TEX.asterWreck(0)).setOrigin(A.ox / A.w, A.oy / A.h).setScale(1 / ART_RES).setDepth(1.8);
    const b = asterBeacon();
    this.beam = scene.add.image(this.x + b.x, y + b.y, TEX.asterBeam).setScale(1 / ART_RES).setDepth(1.85).setBlendMode('ADD');
  }

  update(ring: Ring, now: number): void {
    const x = ring.near(this.x);
    const b = asterBeacon();
    this.wreck.setTexture(TEX.asterWreck(Math.floor(now / 160) % BOIL)).setX(x);
    // A quick swell up and a slower fade, then dark until the next flash.
    const t = (now % FLASH_MS) / FLASH_MS;
    const lit = t < ON ? Math.sin((t / ON) * Math.PI) : 0;
    this.beam.setX(x + b.x).setAlpha(lit).setScale((0.8 + lit * 0.5) / ART_RES);
  }
}
