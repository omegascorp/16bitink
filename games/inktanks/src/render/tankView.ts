import type Phaser from 'phaser';
import type { Tank } from '../logic/match/types';
import { CLAN_COLOUR } from '../logic/match/names';
import type { HullFamily } from '../logic/parts';
import { partsArt } from './partsArt';
import type { RotBank } from './rotBank';

/** The fixed sun: shadows fall right and up (as the art tests). */
export const SHADOW = { x: 0.78, y: -0.58 };
export const DEPTH = { shadow: 20, drive: 0.01, hull: 0.02, turretShadow: 0.03, turret: 0.04, bar: 6000 } as const;
/** Things standing on the ground sort by their foot: the castle projection's draw order. */
export const footDepth = (y: number): number => 1000 + y / 10;
/** Native px a drive rolls per frame step. */
const ROLL_STEP = 6;

export function preloadParts(scene: Phaser.Scene): void {
  for (const [key, url] of partsArt().urls) if (!scene.textures.exists(key)) scene.load.image(key, url);
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
  update(t: Tank): void {
    if (this.loadoutRef !== t.loadout) {
      this.loadoutRef = t.loadout;
      this.keys = tankKeys(t, this.bank);
    }
    const k = this.keys!;
    const vis = t.alive;
    // Placeholders until the world art's truck and fortress land: a turret-less tank, a big one, bare turrets.
    const body = t.role !== 'bossTurret';
    const gun = t.role !== 'boss' && t.role !== 'truck';
    for (const i of [this.shadow, this.drive, this.hull]) i.setVisible(vis && body);
    for (const i of [this.tShadow, this.turret]) i.setVisible(vis && gun);
    const showBar = !!this.bar && vis && t.dropT <= 0 && t.hp < t.stats.maxHp;
    if (this.bar) for (const b of this.bar) b.setVisible(showBar);
    if (!vis) return;
    const drop = t.dropT > 0 ? t.dropT / 3 : 0;
    const scale = (1 + drop * 1.5) * (t.role === 'boss' ? 2.3 : 1);
    const x = Math.round(t.x);
    const y = Math.round(t.y);
    const frame = k.drive[Math.floor(t.rolled / ROLL_STEP) % k.drive.length]!;
    const lift = 6 + drop * 120;
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
    this.turret.setDepth(d + DEPTH.turret + (drop > 0 ? 6000 : 0));
    this.drive.setPosition(x, y).setScale(scale);
    this.hull.setPosition(x, y).setScale(scale);
    this.tShadow.setPosition(tx + SHADOW.x * 4, ty + SHADOW.y * 4).setScale(scale);
    this.turret.setPosition(Math.round(tx), Math.round(ty)).setScale(scale);
    const alpha = drop > 0 ? 0.55 : 1;
    for (const i of [this.drive, this.hull, this.turret]) i.setAlpha(alpha);
    if (this.bar && showBar) {
      const w = 40;
      const share = Math.max(0, t.hp / t.stats.maxHp);
      const [back, fill] = this.bar;
      back.setPosition(x - w / 2 - 1, y - 46).setDisplaySize(w + 2, 5);
      fill.setPosition(x - w / 2, y - 45).setDisplaySize(Math.max(1, w * share), 3).setTint(share > 0.5 ? 0x8cc85a : share > 0.25 ? 0xe0b040 : 0xd85a3a);
    }
  }

  destroy(): void {
    for (const i of [this.shadow, this.drive, this.hull, this.tShadow, this.turret]) i.destroy();
    if (this.bar) for (const b of this.bar) b.destroy();
  }
}
