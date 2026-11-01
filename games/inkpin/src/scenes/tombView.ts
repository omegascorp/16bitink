import Phaser from 'phaser';
import { ART_RES } from '../art/palette';
import { FLAME_FRAME } from '../art/props';
import { STONE_PAD, TOMB_GREEN } from '../art/tomb';
import { linkBox, plateDiscX, plateRoutes } from '../art/tombLinks';
import { frameOrigin, lintelOrigin, PLATE_DISC_DY, PLATE_DISC_R, PLATE_PT, PLATE_PX, plateMark } from '../art/tombMarks';
import type { SoundBoard } from '../audio/sfx';
import { FLAME_UP } from '../logic/fire';
import { GAS } from '../logic/particles';
import type { DoorDef, LevelDef } from '../logic/level';
import { doorSeg, PLATE_NEED } from '../logic/tomb';
import type { World } from '../logic/world';
import type { Effects } from './effects';

const S = 1 / ART_RES;
const GREEN = Phaser.Display.Color.HexStringToColor(TOMB_GREEN).color;
/** The curls drawn through the gas. */
const GAS_INK = 0x3f7a2a;
const FIRE = 0xffa040;
const FIRE_CORE = 0xfff0a0;
/** How long a blast's flash lasts (ms). */
const FLASH_MS = 260;

export const plateKey = (w: number, mark: number, down: boolean, discX: number): string => `plate-${Math.round(w)}-${mark}-${Math.round(discX)}-${down ? 'down' : 'up'}`;
/** The angle a door lies at, from its ring end A to its shut end B. */
export const doorTurn = (d: { ax: number; ay: number; bx: number; by: number }): number => Math.atan2(d.by - d.ay, d.bx - d.ax);
export const doorKey = (len: number, t: number, mark: number, inverse: boolean, turn: number, lit: boolean): string =>
  `door-${Math.round(len)}-${t}-${mark}-${inverse ? 'inv' : 'n'}-${Math.round((turn * 180) / Math.PI)}${lit ? '-lit' : ''}`;
export const frameKey = (len: number, t: number): string => `door-frame-${Math.round(len)}-${t}`;
export const lintelKey = (t: number, mark: number): string => `door-lintel-${t}-${mark}`;
export const linkKey = (levelId: string, plate: number, lit: boolean): string => `links-${levelId}-${plate}-${lit ? 'lit' : 'dark'}`;
/** The mark (index into PLATE_MARKS) of the plate a door answers to. */
export const doorMark = (level: LevelDef, plate: string): number => Math.max(0, (level.plates ?? []).findIndex((p) => p.id === plate));
export const rubbleKey = (len: number, t: number): string => `rubble-${Math.round(len)}-${t}`;

/** How fast a groove's glow follows its plate (share of the gap per frame). */
const GLOW_EASE = 0.18;
const hex = (c: string): number => Phaser.Display.Color.HexStringToColor(c).color;

/**
 * The Desert Tomb's things on the board: the plates (stone tiles that sink
 * and light their symbol when weighed, and fill toward it as weight builds),
 * the grooves from each plate to its doors (lit while it is down), the stone
 * doors (they slide in their frames, under a lintel), the fire bowls (lit,
 * or doused and smoking), the rubble of a broken wall, the gas (a
 * translucent green glow over each grain, orange while it burns) and a
 * blast's flash. Drawn over the liquids, except the grooves: those are cut
 * in the wall behind everything.
 */
export class TombView {
  private readonly plates: Phaser.GameObjects.Image[];
  private readonly discs: number[];
  private readonly gauge: Phaser.GameObjects.Graphics;
  private readonly links: (Phaser.GameObjects.Image | null)[];
  private readonly frames: Phaser.GameObjects.Image[];
  private readonly doors: Phaser.GameObjects.Image[];
  private readonly lintels: Phaser.GameObjects.Image[];
  private readonly bowls: Phaser.GameObjects.Image[];
  private readonly flames: Phaser.GameObjects.Image[];
  private readonly rubble = new Map<number, Phaser.GameObjects.Image>();
  private readonly gas: Phaser.GameObjects.Graphics;
  private lastSmoke = 0;

  constructor(private readonly scene: Phaser.Scene, private readonly layer: Phaser.GameObjects.Layer, private readonly world: World, private readonly fx: Effects, private readonly sfx: () => SoundBoard) {
    const level = world.level;
    this.discs = world.plates.map((_, i) => plateDiscX(level, i, PLATE_DISC_R, PLATE_DISC_DY));
    this.plates = world.plates.map((p, i) => scene.add.image(p.def.x0 - PLATE_PX, p.def.y - PLATE_PT, plateKey(p.def.x1 - p.def.x0, i, false, this.discs[i]!)).setOrigin(0).setScale(S));
    this.gauge = scene.add.graphics();
    // The grooves: carved, and a lit copy over them; both behind everything but the board.
    const behind: Phaser.GameObjects.Image[] = [];
    this.links = world.plates.map((_, i) => {
      if (!plateRoutes(level, i).length) return null;
      const box = linkBox(level, i);
      behind.push(scene.add.image(box.x, box.y, linkKey(level.id, i, false)).setOrigin(0).setScale(S));
      const lit = scene.add.image(box.x, box.y, linkKey(level.id, i, true)).setOrigin(0).setScale(S).setAlpha(0);
      behind.push(lit);
      return lit;
    });
    this.frames = world.doors.map((d) => {
      const o = frameOrigin(d.len, d.def.t);
      return scene.add.image(d.def.ax, d.def.ay, frameKey(d.len, d.def.t)).setOrigin(o.x, o.y).setScale(S).setRotation(doorTurn(d.def));
    });
    this.doors = world.doors.map((d) => scene.add.image(0, 0, this.doorTexture(d.def, d.len, false)).setScale(S).setRotation(doorTurn(d.def)));
    this.lintels = world.doors.map((d) => {
      const o = lintelOrigin(d.def.t);
      return scene.add.image(d.def.ax, d.def.ay, lintelKey(d.def.t, doorMark(level, d.def.plate))).setOrigin(o.x, o.y).setScale(S).setRotation(doorTurn(d.def));
    });
    this.bowls = world.bowls.map((b) => scene.add.image(b.x, b.y, 'bowl-lit').setOrigin(0.5, 30 / 34).setScale(S));
    this.flames = world.bowls.map((b) => scene.add.image(b.x, b.y - FLAME_UP + 8, 'flame-0').setOrigin(FLAME_FRAME.ox / FLAME_FRAME.w, FLAME_FRAME.oy / FLAME_FRAME.h).setScale(S * 1.1));
    for (const i of level.cracked ?? []) {
      const s = level.walls[i];
      if (!s) continue;
      const len = Math.hypot(s.bx - s.ax, s.by - s.ay);
      const img = scene.add.image((s.ax + s.bx) / 2, (s.ay + s.by) / 2, rubbleKey(len, s.t)).setScale(S).setRotation(Math.atan2(s.by - s.ay, s.bx - s.ax)).setVisible(false);
      this.rubble.set(i, img);
    }
    this.gas = scene.add.graphics();
    if (behind.length) layer.addAt(behind, this.behindIndex());
    layer.add([...this.plates, this.gauge, ...this.bowls, ...this.flames, ...this.rubble.values(), ...this.frames, ...this.doors, ...this.lintels, this.gas]);
    this.resync();
  }

  private doorTexture(def: DoorDef, len: number, lit: boolean): string {
    return doorKey(len, def.t, doorMark(this.world.level, def.plate), def.invert ?? false, doorTurn(def), lit);
  }

  /** Just over the board's tiles in the layer: the grooves go there. */
  private behindIndex(): number {
    const kids = this.layer.getChildren();
    let at = 0;
    kids.forEach((k, i) => {
      if (k instanceof Phaser.GameObjects.Image && k.texture.key.startsWith('board-')) at = i + 1;
    });
    return at;
  }

  /** Follows the world each frame. */
  update(time: number): void {
    const w = this.world;
    this.gauge.clear();
    w.plates.forEach((p, i) => {
      const width = p.def.x1 - p.def.x0;
      const discX = this.discs[i] ?? width / 2;
      this.plates[i]?.setTexture(plateKey(width, i, p.down, discX));
      // Weight building toward `need`: the disc fills like a dial, so "almost" shows.
      const need = p.def.need ?? PLATE_NEED;
      const f = Math.min(1, p.weight / need);
      if (!p.down && f > 0.02) {
        const mark = plateMark(i);
        const cx = p.def.x0 + discX;
        const cy = p.def.y + PLATE_DISC_DY;
        this.gauge.fillStyle(hex(mark.glow), 0.65).beginPath().slice(cx, cy, PLATE_DISC_R - 0.6, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2, false).closePath().fillPath();
        this.gauge.lineStyle(1, hex(mark.tint), 0.9).strokeCircle(cx, cy, PLATE_DISC_R);
      }
      const lit = this.links[i];
      if (lit) {
        const target = p.down ? 0.85 + 0.15 * Math.sin(time / 260) : 0;
        lit.setAlpha(time === 0 ? target : lit.alpha + (target - lit.alpha) * GLOW_EASE);
      }
    });
    w.doors.forEach((d, i) => {
      const img = this.doors[i];
      if (!img) return;
      // Its symbol lights with its plate.
      const lit = w.plates.find((p) => p.def.id === d.def.plate)?.down ?? false;
      img.setTexture(this.doorTexture(d.def, d.len, lit));
      const s = doorSeg(d);
      img.setPosition((s.ax + s.bx) / 2, (s.ay + s.by) / 2).setVisible(d.open < d.len);
      // The part slid back past the lintel is in the rock: hidden.
      const cut = Math.max(0, d.open) * ART_RES;
      img.setCrop(cut, 0, Math.max(1, img.frame.width - cut), img.frame.height);
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
        gfx.fillStyle(GREEN, 0.16).fillCircle(x, y, 13);
        gfx.fillStyle(GREEN, 0.24).fillCircle(x, y, 7);
        // A haze of little curls through it, so it reads as gas, not water.
        if (i % 3 === 0) gfx.lineStyle(1.2, GAS_INK, 0.45).beginPath().arc(x, y, 4, i, i + 4.2).strokePath();
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

/** Board px a rubble picture is padded by (for textures.ts). */
export const TOMB_PAD = STONE_PAD;
