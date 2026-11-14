import type Phaser from 'phaser';
import type { Match } from '../logic/match/match';
import type { MatchEvent } from '../logic/match/types';
import { slotOf } from '../logic/parts';
import { partsArt } from './partsArt';

/**
 * Shots, pickups, hits and the objective's rings (zones, flags, exits, artillery marks), drawn each frame. Code only draws
 * what the art rules allow it to (particles, rings, flashes); crates use
 * the art test's crate until the world art's lands.
 */
const crateUrl = Object.values(import.meta.glob<string>('../../dev/art-test/assets/parts/crate.png', { eager: true, query: '?url', import: 'default' }))[0];
const DEPTH = { pickups: 900, shots: 7000, fx: 7500, marks: 8000 } as const;

interface Puff {
  x: number;
  y: number;
  r: number;
  t: number;
  life: number;
  colour: number;
}

export function preloadFx(scene: Phaser.Scene): void {
  if (crateUrl) scene.load.image('crate', crateUrl);
}

export class WorldFx {
  private readonly shots: Phaser.GameObjects.Graphics;
  private readonly marks: Phaser.GameObjects.Graphics;
  private readonly fx: Phaser.GameObjects.Graphics;
  private readonly rings: Phaser.GameObjects.Graphics;
  private readonly crates = new Map<number, Phaser.GameObjects.Image>();
  private readonly parts = new Map<number, Phaser.GameObjects.Image>();
  private puffs: Puff[] = [];

  constructor(private readonly scene: Phaser.Scene) {
    this.marks = scene.add.graphics().setDepth(DEPTH.pickups);
    this.shots = scene.add.graphics().setDepth(DEPTH.shots);
    this.fx = scene.add.graphics().setDepth(DEPTH.fx);
    this.rings = scene.add.graphics().setDepth(DEPTH.marks);
  }

  onEvent(e: MatchEvent): void {
    if (e.kind === 'fire') this.puffs.push({ x: e.x, y: e.y, r: e.shot === 'tracer' ? 5 : 10, t: 0, life: 0.08, colour: 0xffe2a0 });
    else if (e.kind === 'hit') this.puffs.push({ x: e.x, y: e.y, r: e.shot === 'tracer' ? 4 : 12, t: 0, life: 0.18, colour: 0xffb060 });
    else if (e.kind === 'explode') this.puffs.push({ x: e.x, y: e.y, r: e.r + 10, t: 0, life: 0.35, colour: 0xff8040 });
    else if (e.kind === 'kill') this.puffs.push({ x: 0, y: 0, r: 0, t: 0, life: 0, colour: 0 });
  }

  update(m: Match, dt: number, view: Phaser.Geom.Rectangle): void {
    this.drawPickups(m, view);
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
        // A red target ring that fills as the shell comes down.
        rg.fillStyle(0xc83a2a, 0.15 + 0.3 * p).fillCircle(k.x, k.y, k.r * Math.max(0.15, p));
        rg.lineStyle(2, 0xff7a5a, 0.9).strokeCircle(k.x, k.y, k.r);
        continue;
      }
      const colour = k.state === 'ours' || k.state === 'done' ? 0x8cc85a : k.state === 'theirs' ? 0xd85a3a : k.kind === 'exit' || k.kind === 'pickup' ? 0x8cc85a : 0xf4ecd8;
      rg.lineStyle(3, colour, 0.75).strokeCircle(k.x, k.y, k.r);
      if (p > 0 && p < 1) rg.lineStyle(5, 0xf0c040, 0.9).beginPath().arc(k.x, k.y, k.r + 6, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2).strokePath();
    }
  }

  private drawPickups(m: Match, view: Phaser.Geom.Rectangle): void {
    const g = this.marks.clear();
    const art = partsArt();
    const seen = new Set<number>();
    for (const p of m.pickups) {
      if (p.taken || p.x < view.x - 60 || p.x > view.right + 60 || p.y < view.y - 60 || p.y > view.bottom + 60) continue;
      seen.add(p.id);
      if (p.kind === 'crate') {
        if (!this.crates.has(p.id) && this.scene.textures.exists('crate')) this.crates.set(p.id, this.scene.add.image(p.x, p.y, 'crate').setScale(2).setDepth(DEPTH.pickups + 1));
        if (!this.scene.textures.exists('crate')) g.fillStyle(0x9a7040, 1).fillRect(p.x - 12, p.y - 12, 24, 24);
      } else if (p.kind === 'part') {
        if (!this.parts.has(p.id)) {
          const slot = slotOf(p.part.family);
          const key = slot === 'gun' ? art.turret(p.part) : slot === 'hull' ? art.hull(p.part) : art.frames(art.drive(p.part, 'medium'))[0]!;
          this.parts.set(p.id, this.scene.add.image(p.x, p.y, key).setScale(0.55).setDepth(DEPTH.pickups + 1));
        }
        g.lineStyle(2, p.part.mk === 3 ? 0xf0c040 : p.part.mk === 2 ? 0xc0c8d0 : 0xa08060, 0.8 + 0.2 * Math.sin(m.t * 5)).strokeCircle(p.x, p.y, 26);
      } else if (p.kind === 'kit') {
        g.fillStyle(0xf4ecd8, 1).fillRect(p.x - 10, p.y - 10, 20, 20).fillStyle(0xc83a2a, 1).fillRect(p.x - 7, p.y - 2, 14, 4).fillRect(p.x - 2, p.y - 7, 4, 14);
      } else if (p.kind === 'intel') {
        g.fillStyle(0x3c6cc8, 0.35 + 0.25 * Math.sin(m.t * 4)).fillCircle(p.x, p.y, 14).fillStyle(0xf4ecd8, 1).fillRect(p.x - 6, p.y - 8, 12, 16);
      } else if (p.kind === 'proto') {
        g.fillStyle(0xf0c040, 0.4 + 0.3 * Math.sin(m.t * 4)).fillCircle(p.x, p.y, 30).fillStyle(0x4a4438, 1).fillRect(p.x - 18, p.y - 12, 36, 24);
      }
    }
    for (const map of [this.crates, this.parts]) {
      for (const [id, img] of map) {
        if (seen.has(id)) continue;
        img.destroy();
        map.delete(id);
      }
    }
  }
}
