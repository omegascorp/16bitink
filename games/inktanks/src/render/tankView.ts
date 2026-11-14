import type Phaser from 'phaser';
import type { Tank } from '../logic/match/types';
import { CLAN_COLOUR } from '../logic/match/names';
import type { HullFamily } from '../logic/parts';
import { partsArt } from './partsArt';
import type { RotBank } from './rotBank';
import { WORLD, type FortressArt } from '../art/pixel/world/world';
import { WORLD_URLS, worldKey } from './worldArt';

/** The escort truck, and the level 10 fortress with its body, treads and turret mounts. */
const FORT: FortressArt = WORLD.vehicles.fortress;
const TRUCK = WORLD.vehicles.truck;
/** Fortress body drawn at this scale of its 288 px art: the level's turret mounts are sized to it. */
const FORT_SCALE = 0.7;
const TURRET_SCALE: Readonly<Record<string, number>> = { fortressCannon: 0.5, fortressMG: 0.7, fortressRockets: 0.7 };
const TURRET_OF: Readonly<Record<string, string>> = { cannon: 'fortressCannon', machinegun: 'fortressMG', rockets: 'fortressRockets' };

/** The fixed sun: shadows fall right and up (as the art tests). */
export const SHADOW = { x: 0.78, y: -0.58 };
export const DEPTH = { shadow: 20, drive: 0.01, hull: 0.02, turretShadow: 0.03, turret: 0.04, bar: 6000 } as const;
/** The tarp is much lighter than a hull's stripe, so its tint is darkened to sit with the painted art. */
const TARP_SHADE = 0.68;
const shade = (rgb: number, k: number): number => (Math.round(((rgb >> 16) & 255) * k) << 16) | (Math.round(((rgb >> 8) & 255) * k) << 8) | Math.round((rgb & 255) * k);
/** HP bar width and height above the centre, native px, by what it's over. */
const BAR = { tank: { w: 40, lift: 46 }, truck: { w: 52, lift: 62 }, crew: { w: 24, lift: 32 }, boss: { w: 110, lift: 120 }, bossTurret: { w: 30, lift: 30 } } as const;
/** Things standing on the ground sort by their foot: the castle projection's draw order. */
export const footDepth = (y: number): number => 1000 + y / 10;
/** Native px a drive rolls per frame step. */
const ROLL_STEP = 6;
/** The crew's facing for a world heading (0 = east, y down): s, e, n or w. */
export function crewFacing(heading: number): 's' | 'e' | 'n' | 'w' {
  const c = Math.cos(heading);
  const sn = Math.sin(heading);
  if (Math.abs(c) >= Math.abs(sn)) return c >= 0 ? 'e' : 'w';
  return sn >= 0 ? 's' : 'n';
}

export function preloadParts(scene: Phaser.Scene): void {
  for (const [key, url] of partsArt().urls) if (!scene.textures.exists(key)) scene.load.image(key, url);
  for (const [key, url] of WORLD_URLS) if ((key.startsWith('world:vehicles/') || key.startsWith('world:crew/')) && !scene.textures.exists(key)) scene.load.image(key, url);
}

/** The keys a tank's current parts draw with. */
export function tankKeys(t: Tank, bank: RotBank): { drive: readonly string[]; hull: string; turret: string; ring: readonly [number, number] } {
  const art = partsArt();
  const hullKey = art.hull(t.loadout.hull);
  const drive = art.frames(art.drive(t.loadout.drive, t.loadout.hull.family as HullFamily));
  const hull = bank.tinted(hullKey, art.stripe(hullKey), CLAN_COLOUR[t.clan]);
  return { drive, hull, turret: art.turret(t.loadout.gun), ring: art.ring(hullKey) };
}

export class TankView {
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly drive: Phaser.GameObjects.Image;
  private readonly hull: Phaser.GameObjects.Image;
  private readonly tShadow: Phaser.GameObjects.Image;
  private readonly turret: Phaser.GameObjects.Image;
  /** HP bar as two plain images (cheaper than redrawing a Graphics each frame). */
  private readonly bar: [Phaser.GameObjects.Image, Phaser.GameObjects.Image] | null;
  private keys: ReturnType<typeof tankKeys> | null = null;
  private loadoutRef: Tank['loadout'] | null = null;

  constructor(scene: Phaser.Scene, private readonly bank: RotBank, private readonly showBar: boolean) {
    const img = (d: number) => scene.add.image(0, 0, '__DEFAULT').setDepth(d);
    this.shadow = img(DEPTH.shadow).setTint(0x000000).setAlpha(0.32);
    this.drive = img(DEPTH.drive);
    this.hull = img(DEPTH.hull);
    this.tShadow = img(DEPTH.turretShadow).setTint(0x000000).setAlpha(0.2);
    this.turret = img(DEPTH.turret);
    this.bar = showBar ? [scene.add.image(0, 0, '__WHITE').setOrigin(0, 0).setDepth(DEPTH.bar).setTint(0x14120e).setAlpha(0.7), scene.add.image(0, 0, '__WHITE').setOrigin(0, 0).setDepth(DEPTH.bar + 0.1)] : null;
  }

  /** Draws the tank; a dropping tank falls in from above, large and faint. */
  update(t: Tank, parent?: Tank): void {
    if (t.role === 'truck' || t.role === 'boss' || t.role === 'bossTurret' || t.role === 'crew') {
      this.updateVehicle(t, parent);
      return;
    }
    if (this.loadoutRef !== t.loadout) {
      this.loadoutRef = t.loadout;
      this.keys = tankKeys(t, this.bank);
    }
    const k = this.keys!;
    const vis = t.alive;
    const body = true;
    const gun = true;
    for (const i of [this.shadow, this.drive, this.hull]) i.setVisible(vis && body);
    for (const i of [this.tShadow, this.turret]) i.setVisible(vis && gun);
    const showBar = !!this.bar && vis && t.hp < t.stats.maxHp;
    if (this.bar) for (const b of this.bar) b.setVisible(showBar);
    if (!vis) return;
    const scale = 1;
    const x = Math.round(t.x);
    const y = Math.round(t.y);
    const frame = k.drive[Math.floor(t.rolled / ROLL_STEP) % k.drive.length]!;
    const lift = 6;
    this.bank.apply(this.shadow, k.hull, t.heading);
    this.shadow.setPosition(x + SHADOW.x * lift, y + SHADOW.y * lift).setScale(scale);
    this.bank.apply(this.drive, frame, t.heading);
    this.bank.apply(this.hull, k.hull, t.heading);
    const c = Math.cos(t.heading + Math.PI / 2);
    const s = Math.sin(t.heading + Math.PI / 2);
    const [rx, ry] = k.ring;
    const tx = x + rx * c - ry * s;
    const ty = y + rx * s + ry * c;
    this.bank.apply(this.tShadow, k.turret, t.turret);
    this.bank.apply(this.turret, k.turret, t.turret);
    const d = footDepth(y + 20);
    this.drive.setDepth(d + DEPTH.drive);
    this.hull.setDepth(d + DEPTH.hull);
    this.tShadow.setDepth(d + DEPTH.turretShadow);
    this.turret.setDepth(d + DEPTH.turret);
    this.drive.setPosition(x, y).setScale(scale);
    this.hull.setPosition(x, y).setScale(scale);
    this.tShadow.setPosition(tx + SHADOW.x * 4, ty + SHADOW.y * 4).setScale(scale);
    this.turret.setPosition(Math.round(tx), Math.round(ty)).setScale(scale);
    if (showBar) this.drawBar(t, x, y, BAR.tank);
  }

  /** The HP bar over a damaged tank, truck, crew, fortress or fortress turret; full ones show none. */
  private drawBar(t: Tank, x: number, y: number, size: { readonly w: number; readonly lift: number }): void {
    if (!this.bar) return;
    const show = t.alive && t.hp < t.stats.maxHp;
    for (const b of this.bar) b.setVisible(show);
    if (!show) return;
    const { w, lift } = size;
    const share = Math.max(0, t.hp / t.stats.maxHp);
    const [back, fill] = this.bar;
    back.setPosition(x - w / 2 - 1, y - lift).setDisplaySize(w + 2, 5);
    fill.setPosition(x - w / 2, y - lift + 1).setDisplaySize(Math.max(1, w * share), 3).setTint(share > 0.5 ? 0x8cc85a : share > 0.25 ? 0xe0b040 : 0xd85a3a);
  }

  /** The truck (one image over its wheels frame), the fortress body with rolling treads, and a fortress turret in its mount. */
  private updateVehicle(t: Tank, parent?: Tank): void {
    const vis = t.alive || t.role === 'bossTurret';
    for (const i of [this.shadow, this.drive, this.hull, this.tShadow, this.turret]) i.setVisible(false);
    if (this.bar) for (const b of this.bar) b.setVisible(false);
    if (!vis) return;
    const x = Math.round(t.x);
    const y = Math.round(t.y);
    const step = Math.floor(t.rolled / (t.role === 'crew' ? 4 : ROLL_STEP));
    if (t.role === 'bossTurret') {
      const name = TURRET_OF[t.loadout.gun.family] ?? 'fortressCannon';
      const key = worldKey(`vehicles/${name}-${t.alive ? 1 : 0}`);
      const sc = TURRET_SCALE[name] ?? 0.7;
      const depth = footDepth((parent?.y ?? t.y) + 20) + DEPTH.turret;
      this.bank.apply(this.tShadow, key, t.turret);
      this.bank.apply(this.turret, key, t.turret);
      this.tShadow.setVisible(t.alive).setPosition(x + SHADOW.x * 5, y + SHADOW.y * 5).setScale(sc).setDepth(depth - 0.01);
      this.turret.setVisible(true).setPosition(x, y).setScale(sc).setDepth(depth);
      this.drawBar(t, x, y, BAR.bossTurret);
      return;
    }
    if (t.role === 'crew') {
      // An otter on foot: a 4-frame walk in four facings (s, e, n, w), picked by heading and never rotated.
      const key = worldKey(`crew/crew-${crewFacing(t.heading)}-${step % 4}`);
      this.shadow.setTexture(key).setRotation(0).setVisible(true).setPosition(x + 3, y - 2).setDepth(DEPTH.shadow);
      this.hull.setTexture(key).setRotation(0).setVisible(true).setPosition(x, y).setScale(1).setDepth(footDepth(y + 10) + DEPTH.hull);
      this.shadow.setScale(1);
      this.drawBar(t, x, y, BAR.crew);
      return;
    }
    const boss = t.role === 'boss';
    // A truck's tarp takes its side's colour (Ink blue for yours, the clan's for a convoy), as a tank's stripe does.
    const truckKey = (frame: string): string => this.bank.tinted(worldKey(`vehicles/${frame}`), worldKey('vehicles/truck-1-stripe'), shade(CLAN_COLOUR[t.clan], TARP_SHADE));
    const body = boss ? worldKey(`vehicles/${FORT.body}`) : truckKey('truck-1');
    const sc = boss ? FORT_SCALE : 1;
    const frames = boss ? FORT.treads : TRUCK.frames.slice(1);
    const d = footDepth(y + 20);
    this.bank.apply(this.shadow, body, t.heading);
    this.shadow.setVisible(true).setPosition(x + SHADOW.x * 8 * sc, y + SHADOW.y * 8 * sc).setScale(sc).setDepth(DEPTH.shadow);
    this.bank.apply(this.hull, body, t.heading);
    this.hull.setVisible(true).setPosition(x, y).setScale(sc).setDepth(d + DEPTH.hull);
    // The truck's own frames are whole-vehicle (frame 1, then 2 while rolling); the fortress has its treads on a layer under the body.
    if (boss) {
      this.bank.apply(this.drive, worldKey(`vehicles/${frames[step % frames.length]!}`), t.heading);
      this.drive.setVisible(true).setPosition(x, y).setScale(sc).setDepth(d + DEPTH.drive);
    } else if (step % 2 === 1) {
      this.bank.apply(this.hull, truckKey(TRUCK.frames[1]!), t.heading);
    }
    this.drawBar(t, x, y, boss ? BAR.boss : BAR.truck);
  }

  destroy(): void {
    for (const i of [this.shadow, this.drive, this.hull, this.tShadow, this.turret]) i.destroy();
    if (this.bar) for (const b of this.bar) b.destroy();
  }
}
