import Phaser from 'phaser';
import { CRITTER_FRAME, CRITTER_GROUND, CRITTER_RES, CRITTER_SPAN } from '../../art/critterArt';
import { BOIL } from '../../art/palette';
import { TEX } from '../../art/textures';
import { armTip, breached, type Critter } from '../../logic/critters';
import { movementOf } from '../../logic/species';
import type { Terrain } from '../../logic/terrain';
import { BLUE_HEX, RED_HEX } from '../../art/palette';

interface CritterSprites {
  readonly mark: Phaser.GameObjects.Image;
  readonly art: Phaser.GameObjects.Image;
}

/** The octopus's arm: its mottled red-brown, and its pale suckers. */
const ARM_HEX = 0xb5654a;
const SUCKER_HEX = 0xf1d9c6;
/** Leg-pose frames per second at a walk. */
const WALK_FPS = 9;
const BOIL_MS = 260;

/**
 * The beach's creatures. Ones that can eat the player are inked red; ones it can eat
 * get a highlighter swipe, like food. It changes as the player grows. A
 * sandfish inside the sand shows only as ripples in the hatching (red when
 * it hunts you), and in full where it breaks into a tunnel.
 */
export class CrittersView {
  private readonly sprites = new Map<number, CritterSprites>();
  private readonly ripples: Phaser.GameObjects.Graphics;
  private readonly arms: Phaser.GameObjects.Graphics;

  constructor(private readonly scene: Phaser.Scene, private readonly terrain: Terrain, private readonly tile: number) {
    this.ripples = scene.add.graphics().setDepth(3.5);
    this.arms = scene.add.graphics().setDepth(4.5);
  }

  sync(critters: ReadonlyMap<number, Critter>, playerSize: number, time: number): void {
    const g = this.ripples.clear();
    this.arms.clear();
    for (const [id, s] of this.sprites) {
      if (critters.has(id)) continue;
      s.mark.destroy();
      s.art.destroy();
      this.sprites.delete(id);
    }
    for (const c of critters.values()) {
      const s = this.sprites.get(c.id) ?? this.create(c);
      const walking = Math.abs(c.vx) > 1 && (c.onGround || movementOf(c.species) === 'swim');
      const f = Math.floor(time / (walking ? 1000 / WALK_FPS : BOIL_MS) + c.id) % BOIL;
      const cx = c.x + c.w / 2;
      const bottom = c.y + c.h;
      const k = c.w / CRITTER_SPAN[c.species] / CRITTER_RES;
      s.art.setTexture(TEX.critter(c.species, c.size > playerSize, f)).setScale(k * c.dir, k).setPosition(cx, bottom);
      s.mark.setVisible(c.size < playerSize).setPosition(cx, c.y + c.h * 0.4).setDisplaySize(c.w * 1.6, c.h * 1.5);
      const hidden = movementOf(c.species) === 'burrow' && !breached(this.terrain, c, this.tile);
      s.art.setVisible(!hidden);
      if (hidden) this.ripple(g, c, c.size > playerSize, time);
      if (c.arm > 0.02) this.arm(c, c.size > playerSize, time);
    }
  }

  /**
   * An octopus's arm reaching out of its den: a tapering, wriggling curve
   * with a row of pale suckers, inked red when it can catch you.
   */
  private arm(c: Critter, danger: boolean, time: number): void {
    const g = this.arms;
    const from = { x: c.x + c.w / 2, y: c.y + c.h / 2 };
    const tip = armTip(c, this.tile);
    const dx = tip.x - from.x;
    const dy = tip.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const ink = danger ? RED_HEX : BLUE_HEX;
    const thick = c.w * 0.28;
    const steps = 14;
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      // An S-curl that travels down the arm as it feels about.
      const curl = Math.sin(u * Math.PI * 1.5 + time / 160 + c.id) * len * 0.12 * u;
      pts.push({ x: from.x + dx * u + nx * curl, y: from.y + dy * u + ny * curl });
    }
    for (let i = 0; i < steps; i++) {
      const u = i / steps;
      const w = thick * (1 - u * 0.85);
      const [a, b] = [pts[i]!, pts[i + 1]!];
      g.lineStyle(w + 1.6, ink, 0.95).lineBetween(a.x, a.y, b.x, b.y);
      g.lineStyle(w, ARM_HEX, 1).lineBetween(a.x, a.y, b.x, b.y);
    }
    // Suckers along the underside.
    g.fillStyle(SUCKER_HEX, 0.95);
    for (let i = 2; i < steps; i += 2) {
      const u = i / steps;
      const p = pts[i]!;
      const r = Math.max(0.7, thick * 0.22 * (1 - u * 0.7));
      g.fillCircle(p.x - nx * thick * 0.25 * (1 - u), p.y - ny * thick * 0.25 * (1 - u) + r * 0.5, r);
    }
  }

  /** Bow waves in the sand ahead of a swimming sandfish, and a wake behind it. */
  private ripple(g: Phaser.GameObjects.Graphics, c: Critter, danger: boolean, time: number): void {
    const cx = c.x + c.w / 2;
    const cy = c.y + c.h / 2;
    const color = danger ? RED_HEX : BLUE_HEX;
    const h = c.h * 0.9 + 3;
    for (let i = 0; i < 3; i++) {
      // Each arc drifts back from the head and fades, so the ripples seem to stream past.
      const t = ((time / 420 + i / 3 + c.id * 0.37) % 1);
      const x = cx + c.dir * (c.w * 0.45 - t * c.w * 0.9);
      const r = h * (0.55 + 0.45 * (1 - t));
      g.lineStyle(1.3, color, 0.85 * (1 - t) + 0.1);
      g.beginPath();
      g.arc(x, cy, r, c.dir > 0 ? -Math.PI / 2.6 : Math.PI - Math.PI / 2.6, c.dir > 0 ? Math.PI / 2.6 : Math.PI + Math.PI / 2.6);
      g.strokePath();
    }
  }

  private create(c: Critter): CritterSprites {
    const mark = this.scene.add.image(0, 0, TEX.highlight(c.id % BOIL)).setBlendMode(Phaser.BlendModes.MULTIPLY).setAlpha(0.8).setDepth(3);
    const art = this.scene.add.image(0, 0, TEX.critter(c.species, false, 0)).setOrigin(0.5, (CRITTER_FRAME / 2 + CRITTER_GROUND) / CRITTER_FRAME).setDepth(4);
    const s = { mark, art };
    this.sprites.set(c.id, s);
    return s;
  }
}
