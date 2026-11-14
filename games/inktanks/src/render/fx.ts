import type Phaser from 'phaser';
import type { Match } from '../logic/match/match';
import type { MatchEvent } from '../logic/match/types';
import { slotOf } from '../logic/parts';
import { partsArt } from './partsArt';
import { bpTexture, pickupKey, preloadPickups, type PickupArt } from './pickupArt';
import { BombLayer, preloadBombs } from './bombView';
import { worldKey } from './worldArt';

/**
 * Shots, pickups, hits and the objective's rings (zones, flags, exits, artillery marks), drawn each frame. Code only draws
 * what the art rules allow it to (particles, rings, flashes); loot crates use
 * the world art's whole crate (loaded with the structures).
 */
/** Loot crates drawn larger than the world's crate structure, so they read as loot next to a tank. */
const CRATE_SCALE = 1.4;
const CRATE = { key: worldKey('structures/crate-1'), shadow: worldKey('structures/crate-1-shadow'), anchor: [21, 41], size: [49, 60] } as const;
const DEPTH = { pickups: 900, aims: 6900, shots: 7000, fx: 7500, marks: 8000 } as const;
/** A gadget charge in a crate: drawn with the player's gadget icon (UI art), or a ring and a G. */
const gadgetIcons = import.meta.glob<string>('../art/pixel/ui/gadget-*.png', { eager: true, query: '?url', import: 'default' });
const gadgetIconKey = (g: string): string => `ui:gadget-${g === 'mines' ? 'mine' : g}`;

interface Puff {
  x: number;
  y: number;
  r: number;
  t: number;
  life: number;
  colour: number;
}

/** World size of each pickup's 64 px art. */
const PICKUP_SCALE: Readonly<Record<PickupArt, number>> = { intel: 0.7, kit: 0.7, proto: 0.95 };

/** The pickups' art; the crate comes with the world structures (preloadStructures). */
export function preloadFx(scene: Phaser.Scene): void {
  preloadPickups(scene);
  preloadBombs(scene);
  for (const [p, url] of Object.entries(gadgetIcons)) scene.load.image(`ui:${p.slice(p.lastIndexOf('/') + 1, -4)}`, url);
}

export class WorldFx {
  private readonly shots: Phaser.GameObjects.Graphics;
  private readonly marks: Phaser.GameObjects.Graphics;
  private readonly fx: Phaser.GameObjects.Graphics;
  private readonly rings: Phaser.GameObjects.Graphics;
  private readonly crates = new Map<number, Phaser.GameObjects.Image>();
  private readonly crateShadows = new Map<number, Phaser.GameObjects.Image>();
  private readonly parts = new Map<number, Phaser.GameObjects.Image>();
  private readonly items = new Map<number, Phaser.GameObjects.Image>();
  private puffs: Puff[] = [];
  /** Telegraphed big shots: the aim line held until `until` (match time). */
  private aimLines: { tank: number; angle: number; len: number; until: number }[] = [];
  private readonly aims: Phaser.GameObjects.Graphics;
  private readonly bombs: BombLayer;
  /** Match time at the last update, for events (bombers pass over marks on time). */
  private now = 0;

  constructor(private readonly scene: Phaser.Scene) {
    this.marks = scene.add.graphics().setDepth(DEPTH.pickups);
    this.shots = scene.add.graphics().setDepth(DEPTH.shots);
    this.aims = scene.add.graphics().setDepth(DEPTH.aims);
    this.fx = scene.add.graphics().setDepth(DEPTH.fx);
    this.rings = scene.add.graphics().setDepth(DEPTH.marks);
    this.bombs = new BombLayer(scene);
  }

  onEvent(e: MatchEvent): void {
    if (e.kind === 'fire') this.puffs.push({ x: e.x, y: e.y, r: e.shot === 'tracer' ? 5 : 10, t: 0, life: 0.08, colour: 0xffe2a0 });
    else if (e.kind === 'hit') this.puffs.push({ x: e.x, y: e.y, r: e.shot === 'tracer' ? 4 : 12, t: 0, life: 0.18, colour: 0xffb060 });
    else if (e.kind === 'explode' || e.kind === 'mark') this.bombs.onEvent(e, this.now);
    else if (e.kind === 'kill') this.puffs.push({ x: 0, y: 0, r: 0, t: 0, life: 0, colour: 0 });
    else if (e.kind === 'aim') this.aimLines.push({ tank: e.tank, angle: e.angle, len: e.len, until: e.until });
    else if (e.kind === 'gadget' && e.gadget === 'smoke') this.puffs.push({ x: e.x, y: e.y, r: 40, t: 0, life: 0.25, colour: 0xf4ecd8 });
  }

  update(m: Match, dt: number, view: Phaser.Geom.Rectangle): void {
    this.now = m.t;
    this.drawPickups(m, view);
    this.bombs.update(m);
    const g = this.shots.clear();
    for (const s of m.shots) {
      if (s.x < view.x - 50 || s.x > view.right + 50 || s.y < view.y - 50 || s.y > view.bottom + 50) continue;
      const sp = Math.hypot(s.vx, s.vy);
      const ux = s.vx / sp;
      const uy = s.vy / sp;
      if (s.kind === 'tracer') g.lineStyle(2, 0xfff0b0, 0.95).lineBetween(s.x - ux * 14, s.y - uy * 14, s.x, s.y);
      else if (s.kind === 'shell') g.fillStyle(0x2a2620, 1).fillCircle(s.x, s.y, 3).fillStyle(0xffe0a0, 0.6).fillCircle(s.x - ux * 4, s.y - uy * 4, 2);
      else {
        g.fillStyle(0xd0c8b8, 0.35).fillCircle(s.x - ux * 16, s.y - uy * 16, 5).fillCircle(s.x - ux * 28, s.y - uy * 28, 7);
        g.fillStyle(0x4a4a40, 1).fillCircle(s.x, s.y, 3.5).fillStyle(0xffa040, 1).fillCircle(s.x - ux * 5, s.y - uy * 5, 2.5);
      }
    }
    this.drawAims(m);
    const f = this.fx.clear();
    this.puffs = this.puffs.filter((p) => (p.t += dt) < p.life);
    for (const p of this.puffs) {
      const k = p.t / p.life;
      f.fillStyle(p.colour, 0.8 * (1 - k)).fillCircle(p.x, p.y, p.r * (0.6 + k * 0.6));
    }
    const rg = this.rings.clear();
    for (const k of m.objective.marks()) {
      const p = k.progress ?? 0;
      if (k.kind === 'artillery') {
        // The danger zone: a red ring with four ticks, pulsing faster as the bomb comes down (the bomb is BombLayer's).
        const a = 0.8 + 0.2 * Math.sin(m.t * (8 + 14 * p));
        rg.fillStyle(0xc83a2a, 0.08 + 0.12 * p).fillCircle(k.x, k.y, k.r);
        rg.lineStyle(3, 0xff6a4a, a).strokeCircle(k.x, k.y, k.r);
        for (let i = 0; i < 4; i++) {
          const c = Math.cos((i * Math.PI) / 2);
          const s = Math.sin((i * Math.PI) / 2);
          rg.lineBetween(k.x + c * (k.r - 12), k.y + s * (k.r - 12), k.x + c * (k.r + 6), k.y + s * (k.r + 6));
        }
        continue;
      }
      const colour = k.state === 'ours' || k.state === 'done' ? 0x8cc85a : k.state === 'theirs' ? 0xd85a3a : k.kind === 'exit' || k.kind === 'pickup' ? 0x8cc85a : 0xf4ecd8;
      rg.lineStyle(3, colour, 0.75).strokeCircle(k.x, k.y, k.r);
      if (p > 0 && p < 1) rg.lineStyle(5, 0xf0c040, 0.9).beginPath().arc(k.x, k.y, k.r + 6, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2).strokePath();
    }
  }

  /** A thin red line from the muzzle along the held aim, brighter as the shot comes (Tactics §4). */
  private drawAims(m: Match): void {
    const g = this.aims.clear();
    this.aimLines = this.aimLines.filter((a) => a.until > m.t);
    for (const a of this.aimLines) {
      const t = m.tank(a.tank);
      if (!t?.alive) continue;
      const k = 1 - Math.max(0, a.until - m.t) / 0.4;
      const c = Math.cos(a.angle);
      const s = Math.sin(a.angle);
      const r0 = t.stats.radius;
      g.lineStyle(1.5, 0xff4a2a, 0.35 + 0.5 * k).lineBetween(t.x + c * r0, t.y + s * r0, t.x + c * a.len, t.y + s * a.len);
      g.fillStyle(0xff4a2a, 0.4 + 0.5 * k).fillCircle(t.x + c * a.len, t.y + s * a.len, 2.5);
    }
  }

  /** The world's whole crate, standing on its anchor like a structure, with its shadow under it. */
  private crateImage(id: number, x: number, y: number): Phaser.GameObjects.Image {
    const [ax, ay] = CRATE.anchor;
    const [w, h] = CRATE.size;
    if (this.scene.textures.exists(CRATE.shadow)) this.crateShadows.set(id, this.scene.add.image(x, y, CRATE.shadow).setOrigin(ax / w, ay / h).setScale(CRATE_SCALE).setDepth(DEPTH.pickups));
    return this.scene.add.image(x, y, CRATE.key).setOrigin(ax / w, ay / h).setScale(CRATE_SCALE).setDepth(DEPTH.pickups + 1);
  }

  private drawPickups(m: Match, view: Phaser.Geom.Rectangle): void {
    const g = this.marks.clear();
    const art = partsArt();
    const seen = new Set<number>();
    for (const p of m.pickups) {
      if (p.taken || p.x < view.x - 60 || p.x > view.right + 60 || p.y < view.y - 60 || p.y > view.bottom + 60) continue;
      seen.add(p.id);
      if (p.kind === 'crate') {
        if (!this.crates.has(p.id)) this.crates.set(p.id, this.crateImage(p.id, p.x, p.y));
      } else if (p.kind === 'part') {
        if (!this.parts.has(p.id)) {
          const slot = slotOf(p.part.family);
          const key = slot === 'gun' ? art.turret(p.part) : slot === 'hull' ? art.hull(p.part) : art.frames(art.drive(p.part, 'medium'))[0]!;
          this.parts.set(p.id, this.scene.add.image(p.x, p.y, key).setScale(0.55).setDepth(DEPTH.pickups + 1));
        }
        g.lineStyle(2, p.part.mk === 3 ? 0xf0c040 : p.part.mk === 2 ? 0xc0c8d0 : 0xa08060, 0.8 + 0.2 * Math.sin(m.t * 5)).strokeCircle(p.x, p.y, 26);
      } else if (p.kind === 'gadget') {
        g.lineStyle(2, 0xe0b040, 0.55 + 0.35 * Math.sin(m.t * 4)).strokeCircle(p.x, p.y, 24);
        const icon = gadgetIconKey(m.player?.gadget ?? 'mines');
        if (!this.items.has(p.id) && this.scene.textures.exists(icon)) this.items.set(p.id, this.scene.add.image(p.x, p.y, icon).setScale(0.8).setDepth(DEPTH.pickups + 1));
        else if (!this.scene.textures.exists(icon)) g.fillStyle(0xe0b040, 0.9).fillCircle(p.x, p.y, 8);
      } else if (p.kind === 'kit' || p.kind === 'intel' || p.kind === 'proto') {
        // A soft pulsing ring under the art so it stands out from the ground: green kit, blue intel, gold prototype.
        const ring = p.kind === 'kit' ? 0x8cc85a : p.kind === 'intel' ? 0x5a8ce0 : 0xf0c040;
        g.lineStyle(2, ring, 0.55 + 0.35 * Math.sin(m.t * 4)).strokeCircle(p.x, p.y, p.kind === 'proto' ? 34 : 24);
        if (!this.items.has(p.id) && this.scene.textures.exists(pickupKey(p.kind))) {
          const key = p.kind === 'intel' ? bpTexture(this.scene, Object.keys(p.bag)[0]) : pickupKey(p.kind);
          this.items.set(p.id, this.scene.add.image(p.x, p.y, key).setScale(PICKUP_SCALE[p.kind]).setDepth(DEPTH.pickups + 1));
        }
      }
    }
    for (const map of [this.crates, this.crateShadows, this.parts, this.items]) {
      for (const [id, img] of map) {
        if (seen.has(id)) continue;
        img.destroy();
        map.delete(id);
      }
    }
  }
}
