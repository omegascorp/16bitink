import Phaser from 'phaser';
import { SIEGE_ART, type SiegePiece } from '../../art/pixel/siege';
import { SIEGE_ART_NORSE } from '../../art/pixel/siege-norse';
import { standing, TOWERS, WALLS, type Siege, type SiegePart } from '../../logic/siege';
import { FIGURE_DEPTH } from './pixelFigure';
import type { Castle } from './castle';
import { rampArt, RampView, type RampLook } from './rampView';

/** Each castle's pieces; the Greek one's textures keep their first names, the others' carry the castle's. */
const ART: Readonly<Record<Castle, Readonly<Record<string, SiegePiece>>>> = { greek: SIEGE_ART, norse: SIEGE_ART_NORSE };
const tex = (key: string, castle: Castle = 'greek'): string => (castle === 'greek' ? `px-siege-${key}` : `px-siege-${castle}-${key}`);

/** Ground pieces of the wall, there in every state. */
const FIXED = ['wallNorthInner', 'wallSouthInner', 'wallSouthEnd', 'farWall', 'nearWall'] as const;
/** The court, moat and bridge lie on the ground, under the grid and the figures. */
const GROUND_DEPTH = 0.5;
/** A stone's flight, ms, and how high it arcs, native pixels. */
const FLIGHT_MS = 620;
const ARC = 90;
/** How long the bridge takes to lower or lift, ms. */
const BRIDGE_MS = 280;
const SHAKE = { ms: 90, strength: 0.004 } as const;
const DUST = { count: 14, spread: 26, rise: 22, ms: 420, tint: 0xd8c4a0 } as const;

/** Where a stone lands on each part, native pixels. */
const PART_AT: Readonly<Record<SiegePart, { x: number; y: number }>> = {
  wallNorth: { x: 667, y: 110 }, wallGateNorth: { x: 601, y: 226 }, gate: { x: 578, y: 250 }, wallGateSouth: { x: 601, y: 310 }, wallSouth: { x: 667, y: 436 },
  keep: { x: 858, y: 230 }, towerNorth: { x: 689, y: 62 }, towerSouth: { x: 709, y: 520 },
};

/** The Norse hall is lower and longer than the Greek keep: a stone lands on its roof. */
const PART_AT_NORSE: Readonly<Record<SiegePart, { x: number; y: number }>> = { ...PART_AT, keep: { x: 890, y: 250 } };

export const partAt = (part: SiegePart, castle: Castle = 'greek'): { x: number; y: number } => (castle === 'norse' ? PART_AT_NORSE : PART_AT)[part];

/** The art a siege needs loaded: every piece, so a fall needs no load mid-battle. */
export function siegeArt(castle: Castle = 'greek'): { key: string; url: string }[] {
  return [...Object.entries(ART[castle]).map(([k, p]) => ({ key: tex(k, castle), url: p.url })), ...rampArt()];
}

/**
 * A town's walls on the battlefield: one sprite for each piece on the grid,
 * sorted among the figures by the row it stands on, so a figure behind a
 * stretch is hidden by it. `show` swaps each to how much of it is left.
 */
export class SiegeView {
  private readonly parts = new Map<string, Phaser.GameObjects.Image>();
  private readonly keepShadow: Phaser.GameObjects.Image;
  /** Every piece placed. */
  private readonly images: Phaser.GameObjects.Image[] = [];
  private readonly full: Siege['parts'];
  private readonly art: Readonly<Record<string, SiegePiece>>;
  /** The bridge, hinged at the gatehouse. The door faces away from this view, so the bridge is what shows the gate open. */
  private readonly bridge: Phaser.GameObjects.Image;
  private gateUp = true;
  /** Someone stands in the gateway, so it can't shut. */
  private held = false;
  private open = false;
  /** Egypt's ramps against the wall, if the attackers raise any. */
  private readonly ramps: RampView;

  constructor(private readonly scene: Phaser.Scene, private readonly layer: Phaser.GameObjects.Layer, siege: Siege, look: RampLook = 'earth', private readonly castle: Castle = 'greek') {
    this.art = ART[castle];
    this.full = siege.parts;
    this.ramps = new RampView(scene, layer, look, (w) => FIGURE_DEPTH + Math.max(...Object.entries(this.art).filter(([k]) => k.startsWith(`${w}-`) || k.startsWith(`${w}Inner-`)).map(([, p]) => p.foot)) - 1);
    if (siege.moat) this.place('moat', GROUND_DEPTH);
    // The court lies over the moat's inner bank, so a breach opens on paving.
    this.place('court', GROUND_DEPTH);
    this.keepShadow = this.place('keepShadow', GROUND_DEPTH);
    this.bridge = this.place('bridge', GROUND_DEPTH);
    this.bridge.setOrigin(1, 0).setX(this.bridge.x + this.bridge.width).setScale(0, 1).setVisible(false);
    for (const k of FIXED) this.place(`${k}-2`);
    for (const w of WALLS) this.parts.set(w, this.place(`${w}-2`));
    this.parts.set('gate', this.place('gate-1'));
    // A tower with no place at this town's level still stands, unmanned: the painted walls end on it.
    for (const t of TOWERS) {
      const tower = this.place(`${t}-1`);
      if (t in siege.parts) this.parts.set(t, tower);
    }
    this.show(siege);
  }

  private place(key: string, depth?: number): Phaser.GameObjects.Image {
    const p = this.art[key]!;
    const img = this.scene.add.image(p.x, p.y, tex(key, this.castle)).setOrigin(0).setDepth(depth ?? FIGURE_DEPTH + p.foot);
    this.layer.add(img);
    this.images.push(img);
    return img;
  }

  /** Each part as `siege` has it: whole, cracked or down, the bridge lying once the gate has gone or someone is in the gateway. */
  show(siege: Siege): void {
    for (const w of WALLS) {
      const left = siege.parts[w] ?? 0;
      this.swap(w, `${w}-${left <= 0 ? 0 : left >= (this.full[w] ?? 0) ? 2 : 1}`);
    }
    this.swap('gate', `gate-${standing(siege, 'gate') ? 1 : 0}`);
    for (const t of TOWERS) if (t in siege.parts) this.swap(t, `${t}-${standing(siege, t) ? 1 : 0}`);
    this.keepShadow.setVisible(standing(siege, 'keep'));
    this.gateUp = standing(siege, 'gate');
    this.ramps.show(siege.ramps ?? []);
    this.settle();
  }

  /** Workers' dust where a ramp is begun or grows. */
  rampDust(part: SiegePart): void {
    this.dust({ x: partAt(part, this.castle).x - 30, y: partAt(part, this.castle).y + 20 });
  }

  /** Tells the view whether someone stands in the gateway. */
  hold(held: boolean): void {
    this.held = held;
    this.settle();
  }

  /** Lowers the bridge for a defender on their way through. Resolves once it's down. */
  openGate(): Promise<void> {
    return this.swing(true);
  }

  private settle(): void {
    void this.swing(!this.gateUp || this.held);
  }

  private swing(open: boolean): Promise<void> {
    if (open === this.open) return Promise.resolve();
    this.open = open;
    this.scene.tweens.killTweensOf(this.bridge);
    this.bridge.setVisible(true);
    return new Promise((resolve) => this.scene.tweens.add({
      targets: this.bridge, scaleX: open ? 1 : 0, duration: BRIDGE_MS, ease: open ? 'Quad.easeIn' : 'Quad.easeOut',
      onComplete: () => {
        this.bridge.setVisible(open);
        resolve();
      },
    }));
  }

  private swap(part: string, key: string): void {
    const p = this.art[key]!;
    this.parts.get(part)?.setTexture(tex(key, this.castle)).setPosition(p.x, p.y);
  }

  /** A stone flies from `from` to the part, and lands in a puff of dust. Resolves as it lands. */
  async hurl(from: { x: number; y: number }, part: SiegePart, stoneKey: string, miss: boolean): Promise<void> {
    const at = partAt(part, this.castle);
    const to = miss ? { x: at.x - 46, y: at.y + 30 } : at;
    const stone = this.scene.add.image(from.x, from.y, stoneKey).setDepth(2000).setScale(2);
    this.layer.add(stone);
    await new Promise<void>((resolve) => this.scene.tweens.addCounter({
      from: 0, to: 1, duration: FLIGHT_MS, ease: 'Linear',
      onUpdate: (tw) => {
        const u = tw.getValue() ?? 0;
        stone.setPosition(Math.round(from.x + (to.x - from.x) * u), Math.round(from.y + (to.y - from.y) * u - ARC * Math.sin(Math.PI * u)));
      },
      onComplete: () => resolve(),
    }));
    stone.destroy();
    this.dust(to);
    if (!miss) this.scene.cameras.main.shake(SHAKE.ms, SHAKE.strength);
  }

  /** A blow by hand: dust at the part and a small shake, the stones still holding. */
  jolt(part: SiegePart): void {
    this.dust(partAt(part, this.castle));
    this.scene.cameras.main.shake(SHAKE.ms, SHAKE.strength);
  }

  private dust(at: { x: number; y: number }): void {
    for (let i = 0; i < DUST.count; i++) {
      const puff = this.scene.add.rectangle(at.x, at.y, 3, 3, DUST.tint).setDepth(2000);
      this.layer.add(puff);
      this.scene.tweens.add({
        targets: puff, x: at.x + Phaser.Math.Between(-DUST.spread, DUST.spread), y: at.y - Phaser.Math.Between(0, DUST.rise), alpha: 0, duration: DUST.ms,
        onComplete: () => puff.destroy(),
      });
    }
  }

  destroy(): void {
    this.scene.tweens.killTweensOf(this.bridge);
    for (const img of this.images) img.destroy();
    this.ramps.destroy();
  }
}
