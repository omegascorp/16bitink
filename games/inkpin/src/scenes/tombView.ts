import Phaser from 'phaser';
import { ART_RES } from '../art/palette';
import { FLAME_FRAME } from '../art/props';
import { mix } from '../art/wash';
import type { Pt } from '../art/pen';
import { STONE_PAD, TOMB_GREEN } from '../art/tomb';
import { linkBox, plateDiscX, plateRoutes } from '../art/tombLinks';
import { frameOrigin, lintelOrigin, type PlateMark, NOTCH_H, NOTCH_W, PLATE_GIVE, PLATE_PT, PLATE_PX, PLATE_SINK, PLATE_SLAB, PLATE_TOP, plateMark, plateNotches, SLAB_PAD } from '../art/tombMarks';
import type { SoundBoard } from '../audio/sfx';
import { FLAME_UP } from '../logic/fire';
import { segDistance } from '../logic/geom';
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

/** A plate's slab: its width, mark, lit or not, and where its symbol sits. */
export const plateKey = (w: number, mark: number, lit: boolean, glyphX: number): string => `plate-${Math.round(w)}-${mark}-${Math.round(glyphX)}-${lit ? 'lit' : 'dim'}`;
export const socketKey = (w: number): string => `plate-socket-${Math.round(w)}`;
/** The bead of light that runs along a groove. */
export const pulseKey = (mark: number): string => `groove-pulse-${mark}`;
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
/** How fast a slab follows its weight down or up (share of the gap per frame). */
const SINK_EASE = 0.25;
/** A pulse's speed along its groove (px/ms), and its shortest and longest run (ms). */
const PULSE_SPEED = 0.7;
const PULSE_MIN = 350;
const PULSE_MAX = 1300;
/** A tapped plate or door: how long it wiggles (ms), how far (px), and how long its groove stays lit (ms). */
const WIGGLE_MS = 420;
const WIGGLE_PX = 2;
const POKE_GLOW_MS = 1100;
/** How far outside a plate or door a tap still finds it (px). */
const POKE_REACH = 8;
const hex = (c: string): number => Phaser.Display.Color.HexStringToColor(c).color;

/** A groove's polyline, with its length, for a pulse to run along. */
interface Route {
  readonly pts: readonly Pt[];
  readonly cum: readonly number[];
  readonly len: number;
}

function route(pts: readonly Pt[]): Route {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1]! + Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y));
  return { pts, cum, len: cum[cum.length - 1] ?? 0 };
}

/** The point `d` px along a route. */
function along(r: Route, d: number): Pt {
  for (let i = 1; i < r.pts.length; i++) {
    if (d <= r.cum[i]! || i === r.pts.length - 1) {
      const a = r.pts[i - 1]!;
      const b = r.pts[i]!;
      const seg = r.cum[i]! - r.cum[i - 1]! || 1;
      const u = Math.max(0, Math.min(1, (d - r.cum[i - 1]!) / seg));
      return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
    }
  }
  return r.pts[0] ?? { x: 0, y: 0 };
}

/** A wiggle's offset (px) `t` ms into it: a quick shake that dies away. */
const wiggle = (t: number): number => (t < 0 || t > WIGGLE_MS ? 0 : WIGGLE_PX * Math.sin(t * 0.075) * (1 - t / WIGGLE_MS));

/**
 * The Desert Tomb's things on the board: the plates (stone slabs set in
 * the floor, whose weight notches light as weight lands, and which sink
 * and light their symbol when full), the grooves from each plate to its
 * doors (lit while it is down, with a bead of light running along them
 * whenever it goes down or up), the stone doors (they slide in their
 * frames, under a lintel), the fire bowls (lit, or doused and smoking), the
 * rubble of a broken wall, the gas (a translucent green glow over each
 * grain, orange while it burns) and a blast's flash. Drawn over the
 * liquids, except the grooves: those are cut in the wall behind everything.
 * A tap on a plate or a door (`poke`) shakes it and lights its groove.
 */
export class TombView {
  private readonly sockets: Phaser.GameObjects.Image[];
  private readonly slabs: Phaser.GameObjects.Image[];
  private readonly glyphs: number[];
  private readonly notches: number[][];
  private readonly sinks: number[];
  private readonly wasDown: boolean[];
  private readonly gauge: Phaser.GameObjects.Graphics;
  private readonly links: (Phaser.GameObjects.Image | null)[];
  private readonly routes: Route[][];
  private readonly pulses: Phaser.GameObjects.Image[][];
  private readonly pulseAt: number[];
  private readonly glowUntil: number[];
  private readonly plateShake: number[];
  private readonly doorShake: number[];
  private readonly frames: Phaser.GameObjects.Image[];
  private readonly doors: Phaser.GameObjects.Image[];
  private readonly lintels: Phaser.GameObjects.Image[];
  private readonly bowls: Phaser.GameObjects.Image[];
  private readonly flames: Phaser.GameObjects.Image[];
  private readonly rubble = new Map<number, Phaser.GameObjects.Image>();
  private readonly gas: Phaser.GameObjects.Graphics;
  private lastSmoke = 0;
  private now = 0;

  constructor(private readonly scene: Phaser.Scene, private readonly layer: Phaser.GameObjects.Layer, private readonly world: World, private readonly fx: Effects, private readonly sfx: () => SoundBoard) {
    const level = world.level;
    const width = (i: number): number => (world.plates[i]?.def.x1 ?? 0) - (world.plates[i]?.def.x0 ?? 0);
    this.glyphs = world.plates.map((_, i) => plateDiscX(level, i));
    this.notches = world.plates.map((_, i) => plateNotches(width(i), this.glyphs[i]!));
    this.sinks = world.plates.map(() => 0);
    this.wasDown = world.plates.map((p) => p.down);
    this.pulseAt = world.plates.map(() => -Infinity);
    this.glowUntil = world.plates.map(() => -Infinity);
    this.plateShake = world.plates.map(() => -Infinity);
    this.doorShake = world.doors.map(() => -Infinity);
    this.sockets = world.plates.map((p, i) => scene.add.image(p.def.x0 - PLATE_PX, p.def.y + PLATE_TOP - PLATE_PT, socketKey(width(i))).setOrigin(0).setScale(S));
    this.slabs = world.plates.map((p, i) => scene.add.image(p.def.x0 - SLAB_PAD, p.def.y + PLATE_TOP - SLAB_PAD, plateKey(width(i), i, false, this.glyphs[i]!)).setOrigin(0).setScale(S));
    this.gauge = scene.add.graphics();
    // The grooves: carved, a lit copy over them, and the beads of light; all behind everything but the board.
    const behind: Phaser.GameObjects.GameObject[] = [];
    this.routes = world.plates.map((_, i) => plateRoutes(level, i).map(route));
    this.links = world.plates.map((_, i) => {
      if (!this.routes[i]!.length) return null;
      const box = linkBox(level, i);
      behind.push(scene.add.image(box.x, box.y, linkKey(level.id, i, false)).setOrigin(0).setScale(S));
      const lit = scene.add.image(box.x, box.y, linkKey(level.id, i, true)).setOrigin(0).setScale(S).setAlpha(0);
      behind.push(lit);
      return lit;
    });
    this.pulses = this.routes.map((rs, i) =>
      rs.map(() => {
        const img = scene.add.image(0, 0, pulseKey(i)).setScale(S).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
        behind.push(img);
        return img;
      }),
    );
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
    layer.add([...this.sockets, ...this.slabs, this.gauge, ...this.bowls, ...this.flames, ...this.rubble.values(), ...this.frames, ...this.doors, ...this.lintels, this.gas]);
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

  /**
   * A tap at (x, y) on a plate or a door (pins are checked first): it
   * shakes, and its plate's groove lights with a bead of light running to
   * its doors. True when it found one.
   */
  poke(x: number, y: number): boolean {
    const w = this.world;
    const plate = w.plates.findIndex((p) => x >= p.def.x0 - POKE_REACH && x <= p.def.x1 + POKE_REACH && y >= p.def.y + PLATE_TOP - POKE_REACH - 6 && y <= p.def.y + PLATE_TOP + PLATE_SLAB + POKE_REACH);
    let lights = plate;
    if (plate >= 0) {
      this.plateShake[plate] = this.now;
    } else {
      const door = w.doors.findIndex((d) => d.open < d.len && segDistance(doorSeg(d), x, y) <= d.def.t + POKE_REACH);
      if (door < 0) return false;
      this.doorShake[door] = this.now;
      lights = w.plates.findIndex((p) => p.def.id === w.doors[door]!.def.plate);
    }
    if (lights >= 0) {
      this.glowUntil[lights] = this.now + POKE_GLOW_MS;
      this.pulseAt[lights] = this.now;
    }
    this.sfx().play('thud', 0.35);
    return true;
  }

  /** Follows the world each frame. */
  update(time: number): void {
    const w = this.world;
    const snap = time === 0;
    this.now = time;
    this.gauge.clear();
    w.plates.forEach((p, i) => {
      const width = p.def.x1 - p.def.x0;
      const mark = plateMark(i);
      // Weight building toward `need`: the notches light one by one, and the slab gives a little.
      const need = p.def.need ?? PLATE_NEED;
      const f = Math.min(1, p.weight / need);
      const target = p.down ? PLATE_SINK : f * PLATE_GIVE;
      const sink = snap ? target : this.sinks[i]! + (target - this.sinks[i]!) * SINK_EASE;
      this.sinks[i] = sink;
      const dx = wiggle(time - this.plateShake[i]!);
      const top = p.def.y + PLATE_TOP + sink;
      this.slabs[i]?.setTexture(plateKey(width, i, p.down, this.glyphs[i]!)).setPosition(p.def.x0 - SLAB_PAD + dx, top - SLAB_PAD);
      this.paintNotches(i, p.down, f, p.def.x0 + dx, top, mark);
      // Down or up: a bead of light runs from the plate to its doors.
      if (p.down !== this.wasDown[i]) {
        this.wasDown[i] = p.down;
        if (!snap) this.pulseAt[i] = time;
      }
      this.runPulses(i, time);
      const lit = this.links[i];
      if (lit) {
        const held = time < this.glowUntil[i]!;
        const glow = p.down ? 0.85 + 0.15 * Math.sin(time / 260) : held ? 0.75 : 0;
        lit.setAlpha(snap ? glow : lit.alpha + (glow - lit.alpha) * GLOW_EASE);
      }
    });
    w.doors.forEach((d, i) => {
      const img = this.doors[i];
      if (!img) return;
      // Its symbol lights with its plate.
      const lit = w.plates.find((p) => p.def.id === d.def.plate)?.down ?? false;
      img.setTexture(this.doorTexture(d.def, d.len, lit));
      const s = doorSeg(d);
      // A tapped door shakes across its own length.
      const k = wiggle(time - this.doorShake[i]!) / (d.len || 1);
      img.setPosition((s.ax + s.bx) / 2 - (s.by - s.ay) * k, (s.ay + s.by) / 2 + (s.bx - s.ax) * k).setVisible(d.open < d.len);
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

  /** A plate's weight notches: lit in order as weight builds; all of them once it is down. */
  private paintNotches(i: number, down: boolean, f: number, x0: number, top: number, mark: PlateMark): void {
    const xs = this.notches[i] ?? [];
    if (!xs.length) return;
    const lit = down ? xs.length : Math.min(xs.length - 1, Math.floor(f * xs.length + 1e-6));
    if (lit <= 0) return;
    const halo = hex(mark.glow);
    const c = hex(mix(mark.tint, mark.glow, 0.3));
    const y = top + PLATE_SLAB / 2 - NOTCH_H / 2;
    for (let k = 0; k < lit; k++) {
      const x = x0 + xs[k]! - NOTCH_W / 2;
      this.gauge.fillStyle(halo, 0.55).fillRect(x - 1.4, y - 1.4, NOTCH_W + 2.8, NOTCH_H + 2.8);
      this.gauge.fillStyle(c, 1).fillRect(x, y, NOTCH_W, NOTCH_H);
      this.gauge.fillStyle(0xfffbe8, 0.75).fillRect(x + NOTCH_W * 0.35, y + 1.5, NOTCH_W * 0.3, NOTCH_H - 3);
    }
  }

  /** A plate's beads of light, each running the length of its groove. */
  private runPulses(i: number, time: number): void {
    const imgs = this.pulses[i] ?? [];
    this.routes[i]?.forEach((r, k) => {
      const img = imgs[k];
      if (!img) return;
      const dur = Math.max(PULSE_MIN, Math.min(PULSE_MAX, r.len / PULSE_SPEED));
      const u = (time - this.pulseAt[i]!) / dur;
      if (!(u >= 0 && u <= 1)) {
        img.setVisible(false);
        return;
      }
      const q = along(r, u * r.len);
      img.setVisible(true).setPosition(q.x, q.y).setAlpha(u < 0.1 ? u * 10 : u > 0.85 ? (1 - u) / 0.15 : 1);
    });
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
    w.plates.forEach((p, i) => {
      this.wasDown[i] = p.down;
      this.pulseAt[i] = -Infinity;
    });
    w.bowls.forEach((b, i) => this.bowls[i]?.setTexture(b.lit ? 'bowl-lit' : 'bowl-out'));
    for (const [i, img] of this.rubble) img.setVisible(w.broken[i] ?? false);
    this.update(0);
  }
}

/** Board px a rubble picture is padded by (for textures.ts). */
export const TOMB_PAD = STONE_PAD;
