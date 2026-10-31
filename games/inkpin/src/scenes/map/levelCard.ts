import Phaser from 'phaser';
import { ART_RES, INK, PAPER } from '../../art/palette';
import type { GuardAnimal, LevelDef } from '../../logic/level';
import { LEDGE_T } from '../../logic/ledges';
import { inPlay, RUBY_R } from '../../logic/rubies';
import { COIN, LAVA, STONE, WATER } from '../../logic/particles';
import { World } from '../../logic/world';
import type { LevelRecord } from '../progress';
import { bakeBoard, nibKey } from '../textures';
import { drawBlots } from './nodes';

const FONT = 'Caveat';
const SOFT_INK = '#4a463e';
const CARD_W = 420;
const PREVIEW = { w: 340, h: 250 } as const;
const GRAIN_COLOR: Record<number, number> = { [WATER]: 0x6f9fcf, [LAVA]: 0xe8782a, [COIN]: 0xe2b33c, [STONE]: 0x8f857a };
/** Each guard's colour in the preview, by animal. */
const GUARD_COLOR: Record<GuardAnimal, number> = { boar: 0x8b5e3c, porcupine: 0x4a3a2c, salamander: 0x2a2430, armadillo: 0xa88f6c };

export interface LevelCardOpts {
  readonly level: LevelDef;
  readonly chapter: number;
  readonly number: number;
  readonly record: LevelRecord | undefined;
  readonly onPlay: () => void;
}

/**
 * A level's card over the map: a picture of the level as it opens, its
 * goal, its best result and a Play button. Tapping outside it, Esc or ×
 * closes it; Enter plays.
 */
export class LevelCard {
  private readonly root: Phaser.GameObjects.Container;
  private readonly onKey: (e: KeyboardEvent) => void;

  constructor(private readonly scene: Phaser.Scene, layer: Phaser.GameObjects.Layer, view: { width: number; height: number }, o: LevelCardOpts, private readonly onClose: () => void) {
    const shade = scene.add.rectangle(0, 0, view.width, view.height, 0xf5f0e1, 0.6).setOrigin(0).setInteractive();
    shade.on('pointerup', () => this.close());
    const h = 560;
    const fit = Math.min(1, (view.height - 24) / h, (view.width - 16) / CARD_W);
    const card = scene.add.container(view.width / 2, view.height / 2);
    const bg = scene.add.graphics();
    bg.fillStyle(0x000000, 0.12).fillRoundedRect(-CARD_W / 2 + 6, -h / 2 + 8, CARD_W, h, 14);
    bg.fillStyle(Phaser.Display.Color.HexStringToColor(PAPER).color, 1).fillRoundedRect(-CARD_W / 2, -h / 2, CARD_W, h, 14);
    bg.lineStyle(3, 0x26316a, 1).strokeRoundedRect(-CARD_W / 2, -h / 2, CARD_W, h, 14);
    const body = scene.add.zone(0, 0, CARD_W, h).setInteractive();
    const text = (y: number, s: string, size: number, color = INK, bold = true): Phaser.GameObjects.Text =>
      scene.add.text(0, y, s, { fontFamily: FONT, fontSize: `${size}px`, fontStyle: bold ? '700' : '500', color, align: 'center', wordWrap: { width: CARD_W - 50 }, padding: { x: 6, y: 3 } }).setOrigin(0.5).setResolution(window.devicePixelRatio * 2);
    const top = -h / 2;
    const parts: Phaser.GameObjects.GameObject[] = [bg, body, text(top + 30, `Chapter ${o.chapter} · Level ${o.number}`, 20, '#7a5a2e', false), text(top + 66, o.level.name, 38)];
    parts.push(preview(scene, o.level, top + 100 + PREVIEW.h / 2));
    const y = top + 100 + PREVIEW.h + 30;
    parts.push(text(y, o.level.goal, 22, SOFT_INK, false));
    const blots = scene.add.graphics();
    drawBlots(blots, -70, y + 48, o.record?.blots ?? 0, 10);
    parts.push(blots, text(y + 48, o.record ? `Best: ${o.record.coins} coins` : 'Not won yet', 21, SOFT_INK, false).setOrigin(0, 0.5).setX(-20));
    const play = text(y + 112, o.record ? 'Play again' : 'Play', 34, '#ffffff').setBackgroundColor('#2f7a3a').setPadding(30, 4, 30, 4);
    let fired = false;
    const go = (): void => {
      if (fired) return;
      fired = true;
      o.onPlay();
    };
    play.setInteractive({ useHandCursor: true }).on('pointerup', go);
    const close = text(top + 26, '×', 36, INK).setX(CARD_W / 2 - 26).setInteractive({ useHandCursor: true });
    close.on('pointerup', () => this.close());
    parts.push(play, close);
    card.add(parts);
    this.root = scene.add.container(0, 0, [shade, card]);
    layer.add(this.root);
    card.setScale(fit * 0.92).setAlpha(0);
    scene.tweens.add({ targets: card, scale: fit, alpha: 1, duration: 140, ease: 'Back.Out' });
    this.onKey = (e: KeyboardEvent): void => {
      if (e.repeat) return;
      if (e.code === 'Escape') this.close();
      else if (e.code === 'Enter' || e.code === 'Space') go();
    };
    scene.input.keyboard?.on('keydown', this.onKey);
  }

  close(): void {
    this.scene.input.keyboard?.off('keydown', this.onKey);
    this.root.destroy();
    this.onClose();
  }
}

/** The level as it opens, small: its painted board, the grains settled, pins, guards, Nib and the chest. */
function preview(scene: Phaser.Scene, level: LevelDef, cy: number): Phaser.GameObjects.Container {
  // The rooms and a little rock round them; a tall level shows its top part.
  const xs = level.rooms.flatMap((r) => r.map(([x]) => x));
  const ys = level.rooms.flatMap((r) => r.map(([, y]) => y));
  const pad = 24;
  const x0 = Math.min(...xs) - pad;
  const y0 = Math.min(...ys) - pad;
  const roomsW = Math.max(...xs) + pad - x0;
  const shownH = Math.min(Math.max(...ys) + pad - y0, roomsW * (PREVIEW.h / PREVIEW.w) * 1.6);
  const k = Math.min(PREVIEW.w / roomsW, PREVIEW.h / shownH);
  const w = roomsW * k;
  const h = shownH * k;
  const { view } = level;
  const c = scene.add.container(0, cy);
  const frame = scene.add.graphics();
  frame.fillStyle(level.ruin === 'volcano' ? 0x5c5157 : 0xcdbfa6, 1).fillRect(-w / 2, -h / 2, w, h);
  // The board's tiles, each cropped to the part of the rooms it holds.
  const board = bakeBoard(scene, level).map((t) => {
    const cx0 = Math.max(x0, t.x) - t.x;
    const cx1 = Math.min(x0 + roomsW, t.x + t.w) - t.x;
    return scene.add.image(-w / 2 + (t.x - x0) * k, -h / 2 - (y0 - view.y) * k, t.key).setOrigin(0).setScale(k / ART_RES).setCrop(cx0 * ART_RES, (y0 - view.y) * ART_RES, Math.max(0, cx1 - cx0) * ART_RES, shownH * ART_RES);
  });
  const g = scene.add.graphics();
  const world = new World(level);
  const at = (x: number, y: number): { x: number; y: number } => ({ x: -w / 2 + (x - x0) * k, y: -h / 2 + (y - y0) * k });
  const gr = world.grains;
  for (let i = 0; i < gr.count; i++) {
    const p = at(gr.x[i]!, gr.y[i]!);
    if (p.y > h / 2) continue;
    g.fillStyle(GRAIN_COLOR[gr.kind[i]!] ?? 0x888888, 1).fillCircle(p.x, p.y, Math.max(1.2, 6 * k));
  }
  for (const l of world.ledges) {
    const a = at(l.x0, l.y);
    g.fillStyle(0x6c6180, 1).fillRect(a.x, a.y, (l.x1 - l.x0) * k, Math.max(2, LEDGE_T * 2 * k)).lineStyle(1, 0x26316a, 1).strokeRect(a.x, a.y, (l.x1 - l.x0) * k, Math.max(2, LEDGE_T * 2 * k));
  }
  for (const pin of level.pins) {
    const a = at(pin.ax, pin.ay);
    const b = at(pin.bx, pin.by);
    // A gate pin is striped red, as on the board.
    g.lineStyle(Math.max(2, pin.t * 2 * k), pin.gate ? 0xb3322b : 0xd9a531, 1).lineBetween(a.x, a.y, b.x, b.y);
    g.lineStyle(1.4, 0x26316a, 1).strokeCircle(a.x, a.y, Math.max(3, 12 * k));
  }
  for (const r of world.rubies) {
    if (!inPlay(r)) continue;
    const p = at(r.x, r.y);
    g.fillStyle(0xd8283c, 1).fillCircle(p.x, p.y, Math.max(1.6, RUBY_R * k));
  }
  for (const v of world.vines) {
    const foot = at(v.x, v.bottom);
    if (v.def.seed) g.fillStyle(0x6e4a2c, 1).fillCircle(foot.x, foot.y - 6 * k, Math.max(2, 8 * k));
    else g.lineStyle(Math.max(1.5, 6 * k), 0x5f7a3c, 1).lineBetween(foot.x, foot.y, foot.x, at(v.x, v.top - 30).y);
  }
  for (const b of world.boulders) {
    const p = at(b.x, b.y);
    if (b.raft) g.fillStyle(0xd8ccae, 1).fillRect(p.x - b.hw * k, p.y - b.hh * k, b.hw * 2 * k, b.hh * 2 * k).lineStyle(1, 0x26316a, 1).strokeRect(p.x - b.hw * k, p.y - b.hh * k, b.hw * 2 * k, b.hh * 2 * k);
    else if (b.crate) g.fillStyle(0xa8774a, 1).fillRect(p.x - b.r * k, p.y - b.r * k, b.r * 2 * k, b.r * 2 * k).lineStyle(1, 0x26316a, 1).strokeRect(p.x - b.r * k, p.y - b.r * k, b.r * 2 * k, b.r * 2 * k);
    else g.fillStyle(level.ruin === 'volcano' ? 0x4a4257 : 0xa79b88, 1).fillCircle(p.x, p.y, b.r * k).lineStyle(1, 0x26316a, 1).strokeCircle(p.x, p.y, b.r * k);
  }
  for (const b of world.blots) {
    const p = at(b.x, b.y);
    g.fillStyle(GUARD_COLOR[b.animal], 1).fillCircle(p.x, p.y, b.r * k);
    // A salamander's orange spots, so it reads as one even this small.
    if (b.animal === 'salamander') g.fillStyle(0xf2a52a, 1).fillCircle(p.x - b.r * k * 0.3, p.y - b.r * k * 0.2, Math.max(0.8, b.r * k * 0.25)).fillCircle(p.x + b.r * k * 0.3, p.y + b.r * k * 0.1, Math.max(0.8, b.r * k * 0.2));
  }
  if (level.chest) {
    const p = at(level.chest.x, level.chest.y);
    g.fillStyle(0x8a5a34, 1).fillRect(p.x - 18 * k, p.y - 14 * k, 36 * k, 30 * k).lineStyle(1, 0xe2b33c, 1).strokeRect(p.x - 18 * k, p.y - 14 * k, 36 * k, 30 * k);
  }
  const nibAt = at(level.nib.x, level.nib.y);
  const nib = scene.add.image(nibAt.x, nibAt.y, nibKey('stand', 0)).setScale((k / ART_RES) * 1.2);
  frame.lineStyle(2.5, 0x26316a, 1).strokeRect(-w / 2, -h / 2, w, h);
  c.add([frame, ...board, g, nib]);
  return c;
}
