import Phaser from 'phaser';
import { BLUE, BLUE_HEX, PAPER_HEX, RED, RED_HEX } from '../art/palette';
import { slotOf } from '../level/levels';
import type { LevelDef } from '../level/types';
import { inPouch } from '../logic/items';
import type { Mine } from '../logic/mine';
import { contractBroken, contractDone, contractText, goalDone, goalLine, goalText, missionDone, payText, rewardText } from '../logic/mission';
import type { GameScene } from './GameScene';
import { screenScene, viewSize } from './hidpi';
import { drawSlotGrid, gridHeight } from './slots';
import { bagFull } from '../logic/suit';
import { HAND_FONT, inkButton, inkText, noteCard, noteText, wobblyRect } from './ui';

/** The cell reads as low (red) under this share of its charge. */
const LOW = 0.25;
const PANEL = { x: 14, y: 12, w: 330, h: 100 } as const;
/** The bag's slots under the gauges. */
const BAG = { cell: 38, cols: 7, top: 98 } as const;
/** Where the cell's and the jetpack's gauges sit in the panel. */
const GAUGE = { x: 156, w: 100, h: 18, cell: 20, fuel: 48 } as const;
/** The mission scrap, top right. */
const MISSION = { w: 330, line: 24, pad: 10 } as const;
const BRIEF_W = 620;

/** A heart's outline, for the suit's hearts (blue: they're yours). */
function heart(cx: number, cy: number, s: number): Phaser.Math.Vector2[] {
  return Array.from({ length: 28 }, (_, i) => {
    const t = (i / 28) * Math.PI * 2;
    const x = 16 * Math.sin(t) ** 3;
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    return new Phaser.Math.Vector2(cx + (x / 17) * s, cy - (y / 17) * s);
  });
}

/**
 * The HUD on paper scraps: hearts, the drill's energy cell, the jetpack's
 * fuel, the bag, the depth and the haul banked so far; the mission and its
 * contracts at the top right; a prompt at the lander; the controls along
 * the bottom; and the intro card before the landing starts. Redrawn only
 * when a number changes.
 */
export class HudScene extends Phaser.Scene {
  private g!: Phaser.GameObjects.Graphics;
  private energy!: Phaser.GameObjects.Text;
  private fuel!: Phaser.GameObjects.Text;
  private depth!: Phaser.GameObjects.Text;
  private banked!: Phaser.GameObjects.Text;
  private bagCells: Phaser.GameObjects.GameObject[] = [];
  private missionG!: Phaser.GameObjects.Graphics;
  private missionLines: Phaser.GameObjects.Text[] = [];
  private prompt!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private failed!: Phaser.GameObjects.Text;
  private brief: Phaser.GameObjects.Container | null = null;
  private shown = '';

  constructor() {
    super('Hud');
  }

  private get play(): GameScene | null {
    return this.scene.get('Game') as GameScene | null;
  }

  create(): void {
    screenScene(this, true);
    this.shown = '';
    this.missionLines = [];
    this.bagCells = [];
    this.g = this.add.graphics();
    this.missionG = this.add.graphics();
    const text = (x: number, y: number, size: number): Phaser.GameObjects.Text => inkText(this, x, y, '', size).setOrigin(0, 0.5);
    const gaugeEnd = PANEL.x + GAUGE.x + GAUGE.w + 6;
    text(PANEL.x + GAUGE.x - 48, PANEL.y + GAUGE.cell, 20).setText('cell');
    text(PANEL.x + GAUGE.x - 48, PANEL.y + GAUGE.fuel, 20).setText('fuel');
    this.energy = text(gaugeEnd, PANEL.y + GAUGE.cell, 22);
    this.fuel = text(gaugeEnd, PANEL.y + GAUGE.fuel, 22);
    this.depth = text(PANEL.x + 14, PANEL.y + 80, 22);
    this.banked = text(PANEL.x + 130, PANEL.y + 80, 22);
    this.prompt = inkText(this, 0, 0, '', 28).setVisible(false);
    this.hint = this.add
      .text(0, 0, '← → walk   ↓ ↑ drill (push into rock)   space jump, hold to fly   E ladder   R recall   L lift off', { fontFamily: HAND_FONT, fontSize: '19px', color: BLUE })
      .setOrigin(0.5, 1)
      .setAlpha(0.75);
    this.failed = inkText(this, 0, 0, 'Your suit gave out. Banked ore is safe.', 34, RED).setVisible(false);
    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', this.layout, this));
    const level = this.play?.level;
    if (level) this.showBriefing(level);
  }

  update(): void {
    const game = this.play;
    const mine = game?.mine;
    if (!game || !mine) return;
    const s = mine.suit;
    const t = mine.tally();
    const pouch = inPouch(mine.items).length;
    const ready = mine.atLander && missionDone(game.level.mission, t);
    const bag = s.bag.slots.map((x) => (x ? `${x.ore}${x.n}` : '-')).join(',');
    const sig = [s.hearts, s.maxHearts, s.energy, Math.ceil(s.fuel), bag, mine.depth, mine.bankedPieces, mine.state,
      t.items.length, pouch, t.heartsLost, t.charges, Math.floor(t.deepest), ready, Math.floor(t.time / 5)].join('|');
    if (sig === this.shown) return;
    this.shown = sig;
    this.draw(mine);
    this.drawMission(game.level, mine);
    this.prompt.setVisible(ready).setText('mission done: press L to lift off');
  }

  private layout(): void {
    const { width, height } = viewSize(this);
    this.hint.setPosition(width / 2, height - 8);
    this.failed.setPosition(width / 2, height / 2);
    this.prompt.setPosition(width / 2, height - 52);
    this.brief?.setPosition(width / 2, height / 2);
    this.shown = '';
  }

  /** The intro card: the site's name, what it teaches, the mission and its reward, the contracts. Any key or a tap lands. */
  private showBriefing(level: LevelDef): void {
    const { width, height } = viewSize(this);
    const left = -BRIEF_W / 2 + 34;
    const tw = BRIEF_W - 68;
    const parts: Phaser.GameObjects.GameObject[] = [];
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      parts.push(o);
      return o;
    };
    add(inkText(this, 0, 44, `${slotOf(level.id)} · ${level.name}`, 40));
    let y = 80;
    const line = (text: string, size: number, color = BLUE): void => {
      const t = add(noteText(this, left, y, text, size, tw, color));
      y += t.height + 6;
    };
    line(level.hint, 22, '#4a463e');
    y += 6;
    line(`Mission: ${level.mission.goals.map(goalText).join(', then ')}.`, 26);
    line(`Pays ${rewardText(level.mission)}.`, 22);
    y += 6;
    line('Contracts (optional, each pays once):', 22);
    for (const c of level.contracts) line(`☐ ${contractText(c)} · pays ${payText(c.pay)}`, 22);
    // The card fits what's on it: the text laid out from its top, then the button under it.
    const h = y + 90;
    for (const part of parts) (part as unknown as { y: number }).y -= h / 2;
    add(inkButton(this, 0, h / 2 - 44, 'Land ▸', () => this.closeBriefing(), { width: 180, height: 50 }));
    this.brief = noteCard(this, width / 2, height / 2, BRIEF_W, h, parts, 77).setDepth(50);
    const kb = this.input.keyboard;
    const go = (): void => this.closeBriefing();
    kb?.once('keydown-SPACE', go);
    kb?.once('keydown-ENTER', go);
  }

  private closeBriefing(): void {
    if (!this.brief) return;
    this.brief.destroy();
    this.brief = null;
    this.play?.dismissBriefing();
  }

  private gauge(g: Phaser.GameObjects.Graphics, row: number, share: number, seed: number): void {
    const ink = share < LOW ? RED_HEX : BLUE_HEX;
    const gx = PANEL.x + GAUGE.x;
    const gy = PANEL.y + row - GAUGE.h / 2;
    g.lineStyle(1.2, ink, 0.9);
    for (let k = 3; k < GAUGE.w * share; k += 3.2) g.lineBetween(gx + k, gy + GAUGE.h - 2, gx + k + 5, gy + 2);
    wobblyRect(g, gx, gy, GAUGE.w, GAUGE.h, seed, 1.5, ink);
  }

  private draw(mine: Mine): void {
    const s = mine.suit;
    const g = this.g.clear();
    const { x, y, w } = PANEL;
    const h = BAG.top + gridHeight(s.bag.slots.length, BAG) + 6;
    g.fillStyle(PAPER_HEX, 0.93).fillRect(x, y, w, h);
    wobblyRect(g, x, y, w, h, 17, 1.6, BLUE_HEX);
    for (let i = 0; i < s.maxHearts; i++) {
      const pts = heart(x + 22 + i * 30, y + 34, 11);
      if (i < s.hearts) g.fillStyle(BLUE_HEX, 0.85).fillPoints(pts, true);
      g.lineStyle(1.6, BLUE_HEX, i < s.hearts ? 1 : 0.4).strokePoints(pts, true);
    }
    // The cell and the fuel tank: pencil gauges filled with hatching, red once they're low.
    this.gauge(g, GAUGE.cell, s.energy / s.maxEnergy, 23);
    this.gauge(g, GAUGE.fuel, s.fuel / s.maxFuel, 29);
    const lowCell = s.energy / s.maxEnergy < LOW;
    const lowFuel = s.fuel / s.maxFuel < LOW;
    this.energy.setText(`${s.energy}`).setColor(lowCell ? RED : BLUE);
    this.fuel.setText(`${Math.ceil(s.fuel)}`).setColor(lowFuel ? RED : BLUE);
    this.depth.setText(mine.depth ? `−${mine.depth} m` : 'surface');
    this.banked.setText(`banked ${mine.bankedPieces}`);
    // The bag: its slots, red-rimmed when nothing more fits.
    for (const old of this.bagCells) old.destroy();
    this.bagCells = drawSlotGrid(this, x + 12, y + BAG.top, s.bag, { ...BAG, seed: 61 });
    if (bagFull(s)) wobblyRect(g, x + 8, y + BAG.top - 4, w - 16, gridHeight(s.bag.slots.length, BAG) + 4, 67, 1.6, RED_HEX);
    this.failed.setVisible(mine.state === 'failed');
  }

  /** The mission scrap: each goal and contract with a tick when done, struck through in red when lost; the pouch. */
  private drawMission(level: LevelDef, mine: Mine): void {
    const t = mine.tally();
    const rows: { text: string; done: boolean; lost?: boolean }[] = [
      ...level.mission.goals.map((goal) => ({ text: goalLine(goal, t), done: goalDone(goal, t) })),
      ...level.contracts.map((c) => ({ text: contractText(c).replace(/^[^:]+: /, ''), done: contractDone(c, t, false), lost: contractBroken(c, t) })),
    ];
    const pouch = inPouch(mine.items);
    if (pouch.length) rows.push({ text: `pouch: ${pouch.map((it) => (it.kind === 'core' ? 'core sample' : it.kind)).join(', ')} (bank it at the lander)`, done: false });
    const { width } = viewSize(this);
    const x = width - MISSION.w - 14;
    const y = 12;
    const h = MISSION.pad * 2 + 26 + rows.length * MISSION.line;
    const g = this.missionG.clear();
    g.fillStyle(PAPER_HEX, 0.93).fillRect(x, y, MISSION.w, h);
    wobblyRect(g, x, y, MISSION.w, h, 31, 1.6, BLUE_HEX);
    for (const old of this.missionLines) old.destroy();
    this.missionLines = [inkText(this, x + MISSION.pad, y + MISSION.pad + 10, 'Mission', 22).setOrigin(0, 0.5)];
    rows.forEach((row, i) => {
      const ry = y + MISSION.pad + 34 + i * MISSION.line;
      const box = i < level.mission.goals.length ? '•' : row.done && !row.lost ? '☑' : '☐';
      const color = row.lost ? RED : BLUE;
      const label = noteText(this, x + MISSION.pad + 4, ry - 12, `${box} ${row.text}`, 19, MISSION.w - MISSION.pad * 2 - 8, color).setAlpha(row.done ? 0.6 : 1);
      this.missionLines.push(label);
      if (row.lost) g.lineStyle(1.4, RED_HEX, 0.8).lineBetween(x + MISSION.pad + 20, ry, x + MISSION.pad + 20 + Math.min(label.width, MISSION.w - 40), ry);
      if (row.done && i < level.mission.goals.length) g.lineStyle(1.4, BLUE_HEX, 0.7).lineBetween(x + MISSION.pad + 20, ry, x + MISSION.pad + 20 + Math.min(label.width, MISSION.w - 40), ry);
    });
  }
}
