import Phaser from 'phaser';
import { CRITTER_ART, type CritterKind } from '../../art/critters/index';
import { TEX } from '../../art/textures';
import type { SpriteArt } from '../../art/types';
import { Tomcat } from '../../logic/enemies/index';
import { Charger } from '../../logic/enemies/charger';
import { Lurker } from '../../logic/enemies/lurker';
import { isRinged, type Ringed } from '../../logic/enemyTypes';
import { HURTS } from '../../logic/chapters/index';
import { preySpec } from '../../logic/prey';
import type { World, WorldEvent } from '../../logic/world';
import { HAND } from '../uiPaint';
import { dottedRing } from './crittersView';

const BLUE = 0x27408b;
const RED = 0xb3322b;
const INK = '#27408b';
const RED_INK = '#b3322b';
const PAPER_STROKE = '#fffaf0';
const DEPTH = { marks: 2.3, words: 7, rings: 6.5 } as const;
/** A swallowed meal shrinks into the mouth over this long, ms. */
const GULP_MS = 160;


/**
 * The board's effects: meals sliding into the mouth, hand-lettered words
 * popping up (points, "Squeeze!", "Shoo!"), and the warnings that make
 * every attack readable: the hawk's red ring tightening, the cat's dotted
 * pounce lane, and a blue dotted ring when a coil is about to close.
 */
export class FxView {
  /** The camera's turn (upright phones), so words stay upright. */
  turn = 0;
  /** Words are sized in board px: bigger where the board is drawn small. */
  textScale = 1;
  private readonly warn: Phaser.GameObjects.Graphics;
  private readonly streaks: Phaser.GameObjects.Graphics;

  constructor(private readonly scene: Phaser.Scene, private readonly world: World) {
    this.warn = scene.add.graphics().setDepth(DEPTH.rings);
    this.streaks = scene.add.graphics().setDepth(3.45);
  }

  react(e: WorldEvent): void {
    const w = this.world;
    const head = w.snake.head;
    switch (e.type) {
      case 'eat':
        this.gulp(e.kind, e.x, e.y);
        this.word(`+${preySpec(e.kind).points}`, head.x, head.y - 26, 22, INK);
        break;
      case 'squeeze':
        this.word(e.count > 1 ? `Squeeze! ×${e.count}` : 'Squeeze!', e.x, e.y - 40, 30, INK);
        break;
      case 'hurt':
        this.word(HURTS[e.cause]?.word ?? 'Ouch!', e.x, e.y - 34, 34, RED_INK);
        this.scene.cameras.main.shake(220, 0.006);
        break;
      case 'nip':
        this.word('nip!', e.x, e.y - 20, 22, RED_INK);
        break;
      case 'scared':
        this.word(e.kind === 'hen' ? 'Bawk!' : 'Shoo!', e.x, e.y - 30, 26, INK);
        break;
      case 'caw':
        this.word('caw!', e.x + 12, e.y - 26, 18, INK, 0.75);
        break;
      case 'cluck':
        this.word('cluck!', e.x + 12, e.y - 26, 18, INK, 0.75);
        break;
      case 'cry':
        this.word('kee-eee-arr!', e.x, e.y - 30, 20, RED_INK, 0.8);
        break;
      case 'miss':
        this.word('missed!', e.x, e.y - 36, 24, INK);
        break;
      case 'growl':
        this.word('grrr…', e.x, e.y - 40, 20, INK, 0.7);
        break;
      case 'bossHit':
        this.word('HISS!', e.x, e.y - 50, 40, RED_INK);
        this.scene.cameras.main.shake(160, 0.004);
        break;
      case 'bossBeaten':
        this.word('Off it runs!', e.x, e.y - 50, 36, INK);
        break;
      case 'bite':
        this.word('Bite!', e.x, e.y - 26, 26, RED_INK);
        break;
      case 'say':
        this.word(e.text, e.x, e.y, 24, e.danger ? RED_INK : INK, 0.9);
        break;
      case 'grown':
        this.word('Long enough!', head.x, head.y - 40, 30, INK);
        break;
      default:
        break;
    }
  }

  update(time: number): void {
    const w = this.world;
    const g = this.warn;
    g.clear();
    // The coil about to close: a blue ring round what it holds.
    const hint = w.hint;
    if (hint) for (const p of hint.prey) dottedRing(g, p.x, p.y, preySpec(p.kind).size * 0.6 + 14 + Math.sin(time / 90) * 2, BLUE, 0.8, 1.8);
    for (const e of [...w.enemies, ...(w.boss ? [w.boss] : [])]) if (isRinged(e) && e.ring) this.aimRing(e, time);
    const all = [...w.enemies, ...(w.boss ? [w.boss] : [])];
    const cat = w.boss;
    if (cat instanceof Tomcat && cat.lane && (cat.mode === 'crouch' || cat.mode === 'pounce')) this.lane(cat, time);
    for (const e of all) {
      if (e instanceof Charger && e.lane && e.mode === 'warn') this.chargeLane(e, time);
      if (e instanceof Lurker && e.aim) dottedRing(g, e.aim.x, e.aim.y, 26 + Math.sin(time / 60) * 2, RED, 0.75, 1.8);
    }
    this.drawStreaks();
  }

  /** An aimed attack's ring (a dive, a stomp, a leap): wide and faint as it aims, tightening and reddening towards the blow. */
  private aimRing(h: Ringed, time: number): void {
    const ring = h.ring;
    if (!ring) return;
    const t = h.ringT;
    const r = h.ringR * (1.5 - 0.5 * t);
    dottedRing(this.warn, ring.x, ring.y, r, RED, 0.35 + 0.55 * t, 1.6 + t);
    if (t > 0.7) {
      // The crosshair at the end: the stoop is coming.
      const a = 0.5 + 0.5 * Math.sin(time / 40);
      this.warn.lineStyle(2, RED, a);
      this.warn.lineBetween(ring.x - r * 0.4, ring.y, ring.x + r * 0.4, ring.y);
      this.warn.lineBetween(ring.x, ring.y - r * 0.4, ring.x, ring.y + r * 0.4);
    }
  }

  /** The cat's pounce lane: dotted from its paws to a ring where it will land. */
  private lane(cat: Tomcat, time: number): void {
    const lane = cat.lane;
    if (!lane) return;
    const g = this.warn;
    const dx = lane.to.x - lane.from.x;
    const dy = lane.to.y - lane.from.y;
    const len = Math.hypot(dx, dy);
    const n = Math.floor(len / 14);
    const crouch = cat.mode === 'crouch' ? Math.min(1, cat.modeAge / 0.9) : 1;
    g.fillStyle(RED, 0.3 + 0.5 * crouch);
    for (let i = 2; i <= n; i++) {
      const t = i / n;
      g.fillCircle(lane.from.x + dx * t, lane.from.y + dy * t, 2);
    }
    dottedRing(g, lane.to.x, lane.to.y, 34 + Math.sin(time / 70) * 2, RED, 0.4 + 0.5 * crouch, 2);
  }

  /** A charge's lane: two dotted lines edge to edge, darkening as it comes. */
  private chargeLane(c: Charger, time: number): void {
    const lane = c.lane;
    if (!lane) return;
    const g = this.warn;
    const dx = lane.to.x - lane.from.x;
    const dy = lane.to.y - lane.from.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const k = Math.min(1, c.modeAge / c.spec.warn);
    const flash = 0.5 + 0.5 * Math.sin(time / 70);
    g.fillStyle(RED, (0.3 + 0.5 * k) * (0.7 + 0.3 * flash));
    for (const side of [-1, 1]) {
      const ox = nx * c.spec.halfWidth * side;
      const oy = ny * c.spec.halfWidth * side;
      for (let t = 0; t <= 1; t += 16 / len) g.fillCircle(lane.from.x + dx * t + ox, lane.from.y + dy * t + oy, 2);
    }
  }

  /** Speed lines behind a striking head. */
  private drawStreaks(): void {
    const s = this.world.snake;
    const g = this.streaks;
    g.clear();
    if (!s.striking) return;
    const back = s.heading + Math.PI;
    for (const off of [-1, 0, 1]) {
      const side = off * s.width * 0.55;
      const x = s.head.x + Math.cos(back) * 12 - Math.sin(back) * side;
      const y = s.head.y + Math.sin(back) * 12 + Math.cos(back) * side;
      g.lineStyle(1.6, BLUE, 0.55);
      g.lineBetween(x, y, x + Math.cos(back) * (26 - Math.abs(off) * 8), y + Math.sin(back) * (26 - Math.abs(off) * 8));
    }
  }

  /** A meal's picture slides into the mouth and shrinks away. */
  private gulp(kind: CritterKind, x: number, y: number): void {
    const art = CRITTER_ART[kind] as SpriteArt;
    const key = TEX.critter(kind, art.poses[0]!, 0);
    if (!this.scene.textures.exists(key)) return;
    const s = this.world.snake;
    const img = this.scene.add.image(x, y, key).setScale(1 / art.res).setDepth(3.58).setRotation(s.heading + Math.PI);
    this.scene.tweens.add({
      targets: img, x: s.head.x, y: s.head.y, scale: 0.25 / art.res, duration: GULP_MS, ease: 'Quad.In',
      onComplete: () => img.destroy(),
    });
  }

  /** A hand-lettered word that pops up and floats away. */
  private word(text: string, x: number, y: number, size: number, color: string, alpha = 1): void {
    const t = this.scene.add.text(x, y, text, {
      fontFamily: HAND, fontSize: `${size}px`, color, stroke: PAPER_STROKE, strokeThickness: 5, padding: { x: 4, y: 4 },
    }).setOrigin(0.5).setDepth(DEPTH.words).setRotation(-this.turn).setScale(0.6 * this.textScale).setAlpha(alpha);
    const up = 34;
    this.scene.tweens.add({ targets: t, scale: this.textScale, duration: 160, ease: 'Back.Out' });
    this.scene.tweens.add({
      targets: t, x: x + Math.sin(this.turn) * up, y: y - Math.cos(this.turn) * up, alpha: 0, delay: 520, duration: 620, ease: 'Quad.In',
      onComplete: () => t.destroy(),
    });
  }

  destroy(): void {
    this.warn.destroy();
    this.streaks.destroy();
  }
}
