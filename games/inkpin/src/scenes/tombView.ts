import Phaser from 'phaser';
import { ART_RES } from '../art/palette';
import { FLAME_FRAME } from '../art/props';
import { STONE_PAD, TOMB_GREEN } from '../art/tomb';
import type { SoundBoard } from '../audio/sfx';
import { FLAME_UP } from '../logic/fire';
import { GAS } from '../logic/particles';
import { doorSeg } from '../logic/tomb';
import type { World } from '../logic/world';
import type { Effects } from './effects';

const S = 1 / ART_RES;
const GREEN = Phaser.Display.Color.HexStringToColor(TOMB_GREEN).color;
const FIRE = 0xffa040;
const FIRE_CORE = 0xfff0a0;
/** How long a blast's flash lasts (ms). */
const FLASH_MS = 260;

export const plateKey = (w: number, down: boolean): string => `plate-${Math.round(w)}-${down ? 'down' : 'up'}`;
export const doorKey = (len: number, t: number): string => `door-${Math.round(len)}-${t}`;
export const rubbleKey = (len: number, t: number): string => `rubble-${Math.round(len)}-${t}`;

/**
 * The Desert Tomb's things on the board: the plates (they sink and their
 * sun lights when weighed), the stone doors (they slide), the fire bowls
 * (lit, or doused and smoking), the rubble of a broken wall, the gas (a
 * translucent green glow over each grain, orange while it burns) and a
 * blast's flash. Drawn over the liquids.
 */
export class TombView {
  private readonly plates: Phaser.GameObjects.Image[];
  private readonly doors: Phaser.GameObjects.Image[];
  private readonly bowls: Phaser.GameObjects.Image[];
  private readonly flames: Phaser.GameObjects.Image[];
  private readonly rubble = new Map<number, Phaser.GameObjects.Image>();
  private readonly gas: Phaser.GameObjects.Graphics;
  private lastSmoke = 0;

  constructor(private readonly scene: Phaser.Scene, private readonly layer: Phaser.GameObjects.Layer, private readonly world: World, private readonly fx: Effects, private readonly sfx: () => SoundBoard) {
    this.plates = world.plates.map((p) => scene.add.image(p.def.x0 - 4, p.def.y - 6, plateKey(p.def.x1 - p.def.x0, false)).setOrigin(0).setScale(S));
    this.doors = world.doors.map((d) => scene.add.image(0, 0, doorKey(d.len, d.def.t)).setScale(S).setRotation(Math.atan2(d.def.by - d.def.ay, d.def.bx - d.def.ax)));
    this.bowls = world.bowls.map((b) => scene.add.image(b.x, b.y, 'bowl-lit').setOrigin(0.5, 30 / 34).setScale(S));
    this.flames = world.bowls.map((b) => scene.add.image(b.x, b.y - FLAME_UP + 8, 'flame-0').setOrigin(FLAME_FRAME.ox / FLAME_FRAME.w, FLAME_FRAME.oy / FLAME_FRAME.h).setScale(S * 1.1));
    for (const i of world.level.cracked ?? []) {
      const s = world.level.walls[i];
      if (!s) continue;
      const len = Math.hypot(s.bx - s.ax, s.by - s.ay);
      const img = scene.add.image((s.ax + s.bx) / 2, (s.ay + s.by) / 2, rubbleKey(len, s.t)).setScale(S).setRotation(Math.atan2(s.by - s.ay, s.bx - s.ax)).setVisible(false);
      this.rubble.set(i, img);
    }
    this.gas = scene.add.graphics();
    layer.add([...this.plates, ...this.bowls, ...this.flames, ...this.rubble.values(), ...this.doors, this.gas]);
    this.resync();
  }

  /** Follows the world each frame. */
  update(time: number): void {
    const w = this.world;
    w.plates.forEach((p, i) => this.plates[i]?.setTexture(plateKey(p.def.x1 - p.def.x0, p.down)));
    w.doors.forEach((d, i) => {
      const img = this.doors[i];
      if (!img) return;
      const s = doorSeg(d);
      img.setPosition((s.ax + s.bx) / 2, (s.ay + s.by) / 2).setVisible(d.open < d.len);
    });
    const frame = Math.floor(time / 110) % 3;
    const smoke = time - this.lastSmoke > 700;
    if (smoke) this.lastSmoke = time;
    w.bowls.forEach((b, i) => {
      this.flames[i]?.setVisible(b.lit).setTexture(`flame-${(frame + i) % 3}`);
      if (!b.lit && smoke) this.fx.puff('smoke', b.x, b.y - 26);
    });
    this.paintGas();
  }

  /** The gas: a soft green glow over each grain; orange and bright while it burns. */
  private paintGas(): void {
    const g = this.world.grains;
    const gfx = this.gas.clear();
    for (let i = 0; i < g.count; i++) {
      if (g.kind[i] !== GAS) continue;
      const x = g.x[i]!;
      const y = g.y[i]!;
      if (g.burn[i]! > 0) {
        gfx.fillStyle(FIRE, 0.35).fillCircle(x, y, 16);
        gfx.fillStyle(FIRE_CORE, 0.7).fillCircle(x, y, 7);
      } else {
        gfx.fillStyle(GREEN, 0.14).fillCircle(x, y, 13);
        gfx.fillStyle(GREEN, 0.22).fillCircle(x, y, 7);
      }
    }
  }

  /** A pocket lights: a flash and a bang. */
  blast(x: number, y: number): void {
    this.sfx().play('sizzle');
    const flash = this.scene.add.circle(x, y, 30, FIRE, 0.55);
    this.layer.add(flash);
    this.scene.tweens.add({ targets: flash, scale: 4, alpha: 0, duration: FLASH_MS, ease: 'Quad.out', onComplete: () => flash.destroy() });
  }

  /** A cracked wall breaks: rubble where it stood, and dust. */
  broken(index: number, x: number, y: number): void {
    this.rubble.get(index)?.setVisible(true);
    for (let k = 0; k < 5; k++) this.fx.puff('dust', x + (k - 2) * 6, y + (k - 2) * 14);
    this.sfx().play('blocked');
  }

  /** A bowl doused: it goes dark and steams. */
  doused(x: number, y: number): void {
    this.world.bowls.forEach((b, i) => {
      if (!b.lit && Math.abs(b.x - x) < 1) this.bowls[i]?.setTexture('bowl-out');
    });
    for (let k = 0; k < 3; k++) this.fx.puff('steam', x + (k - 1) * 6, y - 6);
    this.sfx().play('sizzle');
  }

  /** After a rewind. */
  resync(): void {
    const w = this.world;
    w.bowls.forEach((b, i) => this.bowls[i]?.setTexture(b.lit ? 'bowl-lit' : 'bowl-out'));
    for (const [i, img] of this.rubble) img.setVisible(w.broken[i] ?? false);
    this.update(0);
  }
}

/** Board px a door or rubble picture is padded by (for textures.ts). */
export const TOMB_PAD = STONE_PAD;
