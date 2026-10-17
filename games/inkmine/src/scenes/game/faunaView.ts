import Phaser from 'phaser';
import { GRAZER_ART } from '../../art/creatures/grazer';
import { MOTHER_ART } from '../../art/creatures/mother';
import { PUFFBALL_ART, type PuffPose } from '../../art/creatures/puffball';
import { TENDRIL_ART, TENDRIL_REACH } from '../../art/creatures/tendril';
import { ART_RES, BOIL, RED, RED_HEX } from '../../art/palette';
import { bakeFauna, TENDRIL_STEPS, TEX } from '../../art/textures';
import { CREATURE, type Creature } from '../../logic/creatures';
import { reachOf } from '../../logic/fauna';
import type { Mine } from '../../logic/mine';
import { HAND } from '../kit/type';
import type { Ring } from './ring';

/** Line-boil frames a second; a grazer's feet step faster. */
const BOIL_FPS = 7;
const WALK_FPS = 5;
/** Art is baked at this many px a unit (textures.ts bakeFauna). */
const RES = ART_RES * 1.5;
/** How long the Mother's wave takes to spread, s. */
const WAVE_S = 0.9;

/**
 * Mycel's creatures in the world, drawn near the camera (creatures.ts):
 * each in its pose, a red "!" over any that has just noticed you, the clots
 * puffballs spit, the pulse's rings, and the Mother Mycel's wave spreading
 * from her each beat.
 */
export class FaunaView {
  private readonly sprites = new Map<number, Phaser.GameObjects.Image>();
  private readonly marks = new Map<number, Phaser.GameObjects.Text>();
  private readonly flying = new Map<string, Phaser.GameObjects.Image>();
  private readonly wave: Phaser.GameObjects.Graphics;

  constructor(private readonly scene: Phaser.Scene, private readonly tile: number) {
    bakeFauna(scene);
    this.wave = scene.add.graphics().setDepth(1.95);
  }

  update(mine: Mine, now: number, ring: Ring): void {
    const f = Math.floor((now / 1000) * BOIL_FPS) % BOIL;
    const seen = new Set<number>();
    for (const c of mine.fauna.creatures) {
      seen.add(c.id);
      this.draw(c, mine, f, now, ring);
    }
    for (const [id, img] of this.sprites) {
      if (seen.has(id)) continue;
      img.destroy();
      this.sprites.delete(id);
      this.marks.get(id)?.destroy();
      this.marks.delete(id);
    }
    this.drawFlying(mine, f, ring);
  }

  private sprite(c: Creature): Phaser.GameObjects.Image {
    let img = this.sprites.get(c.id);
    if (!img) {
      img = this.scene.add.image(0, 0, TEX.glob(0)).setDepth(c.kind === 'mother' ? 1.9 : 3.55);
      this.sprites.set(c.id, img);
    }
    return img;
  }

  private draw(c: Creature, mine: Mine, f: number, now: number, ring: Ring): void {
    const img = this.sprite(c);
    const x = ring.near(c.x);
    if (c.kind === 'puffball') {
      const P = PUFFBALL_ART;
      img.setTexture(TEX.puffball(puffPose(c), f)).setOrigin(P.ox / P.w, P.oy / P.h).setScale(1 / RES).setFlipX(c.facing < 0);
    } else if (c.kind === 'tendril') {
      const Td = TENDRIL_ART;
      const step = TENDRIL_STEPS.reduce((best, r, i) => (Math.abs(r - c.reach) < Math.abs(TENDRIL_STEPS[best]! - c.reach) ? i : best), 0);
      // Drawn to its full length for where it hangs: a deep cave's tendril is a longer one.
      const stretch = reachOf(mine.terrain, c, this.tile) / TENDRIL_REACH;
      img.setTexture(TEX.tendril(step, c.state === 'hold', f)).setOrigin(Td.ox / Td.w, Td.oy / Td.h).setScale(1 / RES, Math.max(0.6, stretch) / RES);
    } else if (c.kind === 'grazer') {
      const G = GRAZER_ART;
      const curled = c.state === 'curled';
      img.setTexture(TEX.grazer(curled ? 'curled' : 'walk', curled ? f : Math.floor((now / 1000) * WALK_FPS) % BOIL)).setOrigin(G.ox / G.w, G.oy / G.h).setScale(1 / RES).setFlipX(c.facing < 0);
    } else {
      const M = MOTHER_ART;
      img.setTexture(TEX.mother(motherBeat(c), f)).setOrigin(M.ox / M.w, M.oy / M.h).setScale(1 / ART_RES);
      this.drawWave(c, x);
    }
    img.setPosition(x, c.y).setAlpha(c.state === 'burst' || c.state === 'dead' ? Math.max(0, c.timer / 0.6) : 1);
    this.mark(c, x);
  }

  /** A red "!" over a creature that has just noticed you, before it acts (spec, "Creatures"). */
  private mark(c: Creature, x: number): void {
    const warn = c.state === 'warn';
    let t = this.marks.get(c.id);
    if (!warn) {
      t?.setVisible(false);
      return;
    }
    if (!t) {
      t = this.scene.add.text(0, 0, '!', { fontFamily: HAND, fontSize: '30px', color: RED, stroke: '#f5efdf', strokeThickness: 4 }).setOrigin(0.5, 1).setDepth(6);
      this.marks.set(c.id, t);
    }
    const y = c.kind === 'tendril' ? c.y + 30 : c.y - 34;
    t.setVisible(true).setPosition(x, y);
  }

  /** The Mother's wave: a ring of spores spreading from her just after each beat, out to its reach. */
  private drawWave(c: Creature, x: number): void {
    const g = this.wave.clear();
    if (c.timer > WAVE_S) return;
    const M = CREATURE.mother;
    const k = c.timer / WAVE_S;
    const r = (M.w / 2 + M.wave) * this.tile * k;
    g.lineStyle(3, RED_HEX, 0.5 * (1 - k)).strokeCircle(x, c.y - (M.h * this.tile) / 2, r);
    g.lineStyle(1, RED_HEX, 0.35 * (1 - k)).strokeCircle(x, c.y - (M.h * this.tile) / 2, r * 0.92);
  }

  /** The clots in flight and the pulse's rings, each turned the way it's going. */
  private drawFlying(mine: Mine, f: number, ring: Ring): void {
    const live = new Set<string>();
    for (const g of mine.fauna.globs) {
      const key = `g${g.id}`;
      live.add(key);
      this.flier(key, TEX.glob(f), 3.7).setPosition(ring.near(g.x), g.y).setRotation(Math.atan2(g.vy, g.vx));
    }
    for (const s of mine.fauna.shots) {
      const key = `s${s.id}`;
      live.add(key);
      this.flier(key, TEX.shot(f), 4.6).setPosition(ring.near(s.x), s.y).setRotation(Math.atan2(s.dy, s.dx));
    }
    for (const [key, img] of this.flying) {
      if (live.has(key)) continue;
      img.destroy();
      this.flying.delete(key);
    }
  }

  private flier(key: string, texture: string, depth: number): Phaser.GameObjects.Image {
    let img = this.flying.get(key);
    if (!img) {
      img = this.scene.add.image(0, 0, texture).setScale(1 / RES).setDepth(depth);
      this.flying.set(key, img);
    }
    return img.setTexture(texture);
  }
}

/** A puffball's pose: swelling, just spat (the first moment of its rest), burst, or still. */
function puffPose(c: Creature): PuffPose {
  if (c.state === 'swell') return 'swell';
  if (c.state === 'burst') return 'burst';
  if (c.state === 'rest' && c.timer > CREATURE.puffball.rest - 0.3) return 'spit';
  return 'idle';
}

/** Where the Mother is in her beat: at rest, swelling towards it, or full just before and after it. */
function motherBeat(c: Creature): 0 | 1 | 2 {
  const phase = c.timer / CREATURE.mother.beat;
  return phase > 0.85 || phase < 0.06 ? 2 : phase > 0.6 ? 1 : 0;
}
