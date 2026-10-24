import Phaser from 'phaser';
import { fieldPoint, FIELD_H, FIELD_PAD, FIELD_W, HEX, hexOutline, paintBattlefield } from '../../art/battlefield';
import { CREATURE_RES, FRAME_H, GROUND_Y } from '../../art/creatures/types';
import { BANNER } from '../../art/palette';
import { makeCanvas } from '../../art/pen';
import { freeTexture, TEX } from '../../art/textures';
import { alive, stackById } from '../../logic/battle';
import type { BattleEvent, BattleState, Stack } from '../../logic/battleTypes';
import { creature } from '../../logic/creatures';
import type { Hex } from '../../logic/hex';
import type { Terrain } from '../../logic/map';
import { SPELLS } from '../../logic/spells';
import { getSound } from '../../host';
import { HAND } from '../uiPaint';

/** How big units stand on the field (units per frame unit). */
const UNIT_SCALE = 0.9;
const FIELD_KEY = 'battlefield';
const SIDE_HEX = [0x2f55a8, 0xb98a3e] as const;

interface UnitSprite {
  readonly img: Phaser.GameObjects.Image;
  readonly badge: Phaser.GameObjects.Text;
}

/** Highlights to show for the active unit. */
export interface Marks {
  readonly active: Hex | null;
  readonly reach: readonly Hex[];
  readonly targets: readonly Hex[];
  /** The hex the pointer is over, and the hex a strike would come from. */
  readonly hover?: Hex | null;
  readonly from?: Hex | null;
}

/**
 * Draws a battle: the painted field, the heroes beside it, every unit with
 * its count, the active unit's reach, and the animations of each event.
 * Everything sits in one container laid out in field units.
 */
export class BattleView {
  readonly root: Phaser.GameObjects.Container;
  private readonly units = new Map<number, UnitSprite>();
  private readonly marks: Phaser.GameObjects.Graphics;
  private boil = 0;
  private boilClock = 0;

  constructor(private readonly scene: Phaser.Scene, state: BattleState, terrain: Terrain, seed: number, heroes: readonly [boolean, boolean]) {
    freeTexture(scene, FIELD_KEY);
    const res = 1.5;
    const { canvas, ctx } = makeCanvas(Math.ceil(FIELD_W * res), Math.ceil(FIELD_H * res));
    ctx.scale(res, res);
    paintBattlefield(ctx, terrain, state.obstacles, seed);
    scene.textures.addImage(FIELD_KEY, canvas as unknown as HTMLImageElement);
    this.root = scene.add.container(0, 0);
    this.root.add(scene.add.image(0, 0, FIELD_KEY).setOrigin(0).setDisplaySize(FIELD_W, FIELD_H));
    this.marks = scene.add.graphics();
    this.root.add(this.marks);
    heroes.forEach((has, side) => {
      if (!has) return;
      const x = side === 0 ? FIELD_PAD.x * 0.45 : FIELD_W - FIELD_PAD.x * 0.45;
      const img = scene.add.image(x, FIELD_H * 0.42, TEX.hero(side === 0 ? 'player' : 'rival', 0)).setOrigin(0.5, GROUND_Y / FRAME_H).setScale(0.95 / CREATURE_RES).setFlipX(side === 1);
      this.root.add(img);
    });
    for (const s of state.stacks) this.addUnit(s);
    this.sync(state);
  }

  private addUnit(s: Stack): void {
    const p = fieldPoint(s.hex);
    const img = this.scene.add.image(p.x, p.y + HEX * 0.55, TEX.creature(s.creature, 0)).setOrigin(0.5, GROUND_Y / FRAME_H).setScale(UNIT_SCALE / CREATURE_RES).setFlipX(s.side === 1);
    const badge = this.scene.add.text(p.x, p.y + HEX * 0.62, '', {
      fontFamily: 'Georgia, serif', fontSize: '15px', color: '#fdf8ea', backgroundColor: s.side === 0 ? BANNER.player : '#8a6a32', padding: { x: 4, y: 1 },
    }).setOrigin(0.5, 0.5);
    this.root.add([img, badge]);
    this.units.set(s.id, { img, badge });
  }

  /** Puts every unit where the state has it, sorted so lower rows stand in front. */
  sync(state: BattleState): void {
    for (const s of state.stacks) {
      const u = this.units.get(s.id)!;
      const p = fieldPoint(s.hex);
      u.img.setPosition(p.x, p.y + HEX * 0.55).setVisible(alive(s));
      u.badge.setPosition(p.x + HEX * 0.42, p.y + HEX * 0.5).setText(String(s.count)).setVisible(alive(s));
    }
    const order = [...state.stacks].sort((a, b) => a.hex - b.hex);
    for (const s of order) {
      const u = this.units.get(s.id)!;
      this.root.bringToTop(u.img);
      this.root.bringToTop(u.badge);
    }
  }

  showMarks(m: Marks): void {
    const g = this.marks.clear();
    for (const h of m.reach) this.fillHex(g, h, 0x2f6b3a, 0.12, 0x2f6b3a, 0.35);
    for (const h of m.targets) this.fillHex(g, h, 0xa9302a, 0.12, 0xa9302a, 0.7);
    if (m.active !== null) this.fillHex(g, m.active, 0xe8c45a, 0.35, 0x8a6a1e, 0.9);
    if (m.from !== null && m.from !== undefined) this.fillHex(g, m.from, 0x2f6b3a, 0.3, 0x2f6b3a, 0.9);
    else if (m.hover !== null && m.hover !== undefined) this.fillHex(g, m.hover, 0x232a4f, 0.1, 0x232a4f, 0.6);
  }

  private fillHex(g: Phaser.GameObjects.Graphics, h: Hex, fill: number, fa: number, line: number, la: number): void {
    const o = hexOutline(fieldPoint(h), HEX * 0.93);
    g.fillStyle(fill, fa).beginPath();
    o.forEach((p, i) => (i === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y)));
    g.closePath().fillPath();
    g.lineStyle(2, line, la).strokePath();
  }

  /** Plays one event; `after` is the state once it has happened. */
  async play(ev: BattleEvent, before: BattleState, after: BattleState): Promise<void> {
    switch (ev.type) {
      case 'move': {
        const u = this.units.get(ev.stack)!;
        const from = stackById(before, ev.stack);
        for (const h of ev.path) {
          const p = fieldPoint(h);
          if (p.x !== u.img.x) u.img.setFlipX(p.x < u.img.x);
          u.badge.setVisible(false);
          await this.tween(u.img, { x: p.x, y: p.y + HEX * 0.55 }, ev.flies ? 380 : 140, ev.flies ? 'Sine.easeInOut' : 'Linear');
        }
        u.img.setFlipX(from.side === 1);
        return;
      }
      case 'strike': {
        const a = this.units.get(ev.stack)!;
        const t = this.units.get(ev.target)!;
        if (ev.ranged) await this.projectile(a.img, t.img, stackById(before, ev.stack));
        else {
          const dx = (t.img.x - a.img.x) * 0.3;
          const dy = (t.img.y - a.img.y) * 0.3;
          await this.tween(a.img, { x: a.img.x + dx, y: a.img.y + dy }, 110, 'Quad.easeIn');
          void this.tween(a.img, { x: a.img.x - dx, y: a.img.y - dy }, 160, 'Quad.easeOut');
        }
        this.hit(t.img);
        this.float(t.img.x, t.img.y - 70, `−${ev.damage}${ev.kills ? `  ${ev.kills} fall` : ''}${ev.lucky ? '  Lucky!' : ''}`, ev.retaliation ? '#7a4a1e' : '#a9302a');
        await this.wait(260);
        this.syncOne(after, ev.target);
        return;
      }
      case 'spell': {
        const t = this.units.get(ev.target)!;
        const flash = this.scene.add.circle(t.img.x, t.img.y - 30, 10, 0xfff3c0, 0.9);
        this.root.add(flash);
        await this.tween(flash, { radius: 46, alpha: 0 }, 420, 'Quad.easeOut');
        flash.destroy();
        const def = SPELLS[ev.spell];
        this.float(t.img.x, t.img.y - 70, ev.amount && def.target === 'enemy' ? `${def.name}: −${ev.amount}${ev.kills ? `  ${ev.kills} fall` : ''}` : def.name, '#27408b');
        this.syncOne(after, ev.target);
        await this.wait(200);
        return;
      }
      case 'wait':
      case 'defend': {
        const u = this.units.get(ev.stack)!;
        this.float(u.img.x, u.img.y - 64, ev.type === 'wait' ? 'waits' : 'defends', '#232a4f');
        await this.wait(250);
        return;
      }
      case 'morale': {
        const u = this.units.get(ev.stack)!;
        this.float(u.img.x, u.img.y - 80, ev.good ? 'High morale! Again!' : 'Low morale: falters', ev.good ? '#2f6b3a' : '#a9302a');
        await this.wait(450);
        return;
      }
      case 'round': {
        if (ev.round > 1) {
          this.float(FIELD_W / 2, FIELD_H / 2, `Round ${ev.round}`, '#232a4f', 44);
          await this.wait(350);
        }
        return;
      }
      default:
        return;
    }
  }

  private syncOne(state: BattleState, id: number): void {
    const s = stackById(state, id);
    const u = this.units.get(id)!;
    u.badge.setText(String(s.count));
    if (!alive(s)) {
      getSound(this.scene)?.play('death');
      u.badge.setVisible(false);
      this.scene.tweens.add({ targets: u.img, alpha: 0, angle: s.side === 0 ? -80 : 80, duration: 500, ease: 'Quad.easeIn', onComplete: () => u.img.setVisible(false).setAlpha(1).setAngle(0) });
    }
  }

  private async projectile(from: Phaser.GameObjects.Image, to: Phaser.GameObjects.Image, shooter: Stack): Promise<void> {
    const monk = creature(shooter.creature).id === 'monk';
    const shot = monk ? this.scene.add.circle(from.x, from.y - 40, 6, 0xfff0b0, 1).setStrokeStyle(2, 0xc99a2e) : this.scene.add.rectangle(from.x, from.y - 40, 22, 2.4, 0x3b2a1a);
    shot.setRotation(Math.atan2(to.y - from.y, to.x - from.x));
    this.root.add(shot);
    await this.tween(shot, { x: to.x, y: to.y - 40 }, 260, 'Linear');
    shot.destroy();
  }

  private hit(img: Phaser.GameObjects.Image): void {
    img.setTint(0xd0574e);
    this.scene.time.delayedCall(90, () => img.clearTint());
    this.scene.tweens.add({ targets: img, x: img.x + 4, yoyo: true, repeat: 2, duration: 40 });
  }

  float(x: number, y: number, text: string, color: string, size = 26): void {
    const t = this.scene.add.text(x, y, text, { fontFamily: HAND, padding: { x: 8, y: 4 }, fontSize: `${size}px`, color, stroke: '#fdf8ea', strokeThickness: 5 }).setOrigin(0.5);
    this.root.add(t);
    this.scene.tweens.add({ targets: t, y: y - 36, alpha: 0, delay: 500, duration: 900, ease: 'Sine.easeIn', onComplete: () => t.destroy() });
  }

  private tween(target: object, props: Record<string, number>, duration: number, ease: string): Promise<void> {
    return new Promise((resolve) => this.scene.tweens.add({ targets: target, ...props, duration, ease, onComplete: () => resolve() }));
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.scene.time.delayedCall(ms, resolve));
  }

  /** Line boil for every unit. */
  update(delta: number, state: BattleState): void {
    this.boilClock += delta;
    if (this.boilClock < 200) return;
    this.boilClock = 0;
    this.boil = (this.boil + 1) % 3;
    for (const s of state.stacks) this.units.get(s.id)!.img.setTexture(TEX.creature(s.creature, this.boil));
  }

  /** Field units under a screen point. */
  toField(x: number, y: number): { x: number; y: number } {
    const m = this.root.getWorldTransformMatrix();
    const out = new Phaser.Math.Vector2();
    m.applyInverse(x, y, out);
    return { x: out.x, y: out.y };
  }

  destroy(): void {
    this.root.destroy();
    freeTexture(this.scene, FIELD_KEY);
  }
}

export { SIDE_HEX };
