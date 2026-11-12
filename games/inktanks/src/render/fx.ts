import type Phaser from 'phaser';
import type { Match } from '../logic/match/match';
import type { MatchEvent } from '../logic/match/types';
import { slotOf } from '../logic/parts';
import { partsArt } from './partsArt';

/**
 * Shots, pickups, hits and the storm, drawn each frame. Code only draws
 * what the art rules allow it to (particles, rings, flashes); crates use
 * the art test's crate until the world art's lands.
 */
const crateUrl = Object.values(import.meta.glob<string>('../../dev/art-test/assets/parts/crate.png', { eager: true, query: '?url', import: 'default' }))[0];
const DEPTH = { pickups: 900, shots: 7000, fx: 7500, storm: 8000 } as const;

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
  private readonly storm: Phaser.GameObjects.Graphics;
  private readonly crates = new Map<number, Phaser.GameObjects.Image>();
  private readonly parts = new Map<number, Phaser.GameObjects.Image>();
  private puffs: Puff[] = [];
  private warnings: { x: number; y: number; at: number }[] = [];

  constructor(private readonly scene: Phaser.Scene) {
    this.marks = scene.add.graphics().setDepth(DEPTH.pickups);
    this.shots = scene.add.graphics().setDepth(DEPTH.shots);
    this.fx = scene.add.graphics().setDepth(DEPTH.fx);
    this.storm = scene.add.graphics().setDepth(DEPTH.storm);
  }

  onEvent(e: MatchEvent): void {
    if (e.kind === 'fire') this.puffs.push({ x: e.x, y: e.y, r: e.shot === 'tracer' ? 5 : 10, t: 0, life: 0.08, colour: 0xffe2a0 });
    else if (e.kind === 'hit') this.puffs.push({ x: e.x, y: e.y, r: e.shot === 'tracer' ? 4 : 12, t: 0, life: 0.18, colour: 0xffb060 });
    else if (e.kind === 'explode') this.puffs.push({ x: e.x, y: e.y, r: e.r + 10, t: 0, life: 0.35, colour: 0xff8040 });
    else if (e.kind === 'kill') this.puffs.push({ x: 0, y: 0, r: 0, t: 0, life: 0, colour: 0 });
    else if (e.kind === 'supplyWarn') this.warnings.push({ x: e.x, y: e.y, at: e.at });
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
    this.warnings = this.warnings.filter((w) => m.t < w.at + 1);
    for (const w of this.warnings) {
      const left = w.at - m.t;
      // Red smoke and a falling marker, a 10-second warning.
      f.fillStyle(0xc83a2a, 0.25 + 0.15 * Math.sin(m.t * 6)).fillCircle(w.x, w.y, 26 + 6 * Math.sin(m.t * 3));
      f.lineStyle(2, 0xf4ecd8, 0.9).strokeCircle(w.x, w.y - Math.max(0, left) * 40, 14);
    }
    const st = m.stormNow;
    const sg = this.storm.clear();
    if (m.cfg.mission.storm === 'on') {
      sg.lineStyle(3000, 0x5a3a6a, 0.32).strokeCircle(st.circle.x, st.circle.y, st.circle.r + 1500);
      sg.lineStyle(3, 0xc0a0e0, 0.9).strokeCircle(st.circle.x, st.circle.y, st.circle.r);
      sg.lineStyle(2, 0xf4ecd8, 0.5).strokeCircle(st.next.x, st.next.y, st.next.r);
    }
    const hz = m.objective.zone;
    if (hz) sg.lineStyle(3, 0xf4ecd8, 0.7).strokeCircle(hz.x, hz.y, hz.r);
    const pick = m.objective.pickupAt;
    if (pick) sg.lineStyle(3, 0x8cc85a, 0.8).strokeCircle(pick.x, pick.y, 80);
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
        g.lineStyle(2, p.supply ? 0xe04030 : p.part.mk === 3 ? 0xf0c040 : p.part.mk === 2 ? 0xc0c8d0 : 0xa08060, 0.8 + 0.2 * Math.sin(m.t * 5)).strokeCircle(p.x, p.y, 26);
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
