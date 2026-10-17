import Phaser from 'phaser';
import { usedSlots } from '../logic/inventory';
import { inPouch } from '../logic/items';
import type { Mine } from '../logic/mine';
import { goalLine } from '../logic/repairs';
import { AIR, bagFull, type Gauge as GaugeName } from '../logic/suit';
import type { GameScene, Woke } from './GameScene';
import { screenScene, viewSize } from './hidpi';
import { Gauge } from './kit/gauge';
import { iconKey, type IconKind } from './kit/icons';
import { RES, uiImage } from './kit/paint';
import { plate, plateCard, plateHeading, PLATE_BODY } from './kit/plate';
import { plaque } from './kit/plaque';
import { aside, heading, INK_TEXT, label, MADDER, prose, SEPIA } from './kit/type';
import { drawSlotGrid, gridHeight } from './slots';
import { storyCard } from './kit/storyCard';
import { talkSpec } from './hud/talkCards';

/** The cell reads as low (madder) under this share of its charge. */
const LOW = 0.25;
/** The suit's plate, top left, and where its rows sit inside it. */
const PANEL = { x: 14, y: 14, w: 316 } as const;
const ROW = { hearts: 24, air: 60, cell: 88, info: 118, rule: 138, bag: 148 } as const;
const GAUGE = { x: 46, w: 196, h: 15 } as const;
const BAG = { cell: 36, cols: 7 } as const;
const HEART = 24;
const SHIELD = 22;
/** The objective plate, top right. */
const GOAL = { w: 352, pad: 22 } as const;
const INTRO_W = 600;
const PAUSE_W = 520;
/** Ms the note on waking stays up. */
const WOKE_MS = 9000;
/** Paper-coloured halo round text laid straight over the game. */
const HALO = { stroke: '#f5efdf', strokeThickness: 5 } as const;
/** The opening card (spec, "Story: chapter 1"). */
const INTRO = [
  'The jump went wrong. A wormhole tore open, and the lander fell through it, out among stars no chart has.',
  'It came down hard on a small grey moon. The link to the guild is gone, and the suit is still listing the damage.',
  "Nothing can be mended without the printer, and the printer wants copper. There's copper in the crater walls.",
] as const;

/** Sets a gauge's reading, in madder when low; only when it changed. */
function reading(t: Phaser.GameObjects.Text, text: string, low: boolean): void {
  const color = low ? MADDER : INK_TEXT;
  if (t.text !== text) t.setText(text);
  if (t.style.color !== color) t.setColor(color);
}

/** The note on waking after the suit gave out (spec, "Why you wake at the lander"). */
function wokeText(w: Woke): string {
  const how = w.how === 'printed'
    ? 'The printer made you again, from the scan it took the last time you were aboard.'
    : 'The suit dragged you back to the lander on the last of its charge. Mend the printer: it can do better than that.';
  return w.bag ? `${how} Your bag is where you fell: follow the red arrow.` : how;
}

/**
 * The HUD, as plates of a field journal laid over the game: the suit's
 * plate top left (hearts and the shield's bars, life support and the cell
 * as washed gauges you can tap to feed, depth and cargo, the bag's wells);
 * the one thing to do next top right (never none: No Man's Sky's start is
 * criticised for the stretch with no prompt); a prompt at the lander; the
 * controls along the bottom; and the cards: the opening, the note on
 * waking, and the pause card. Rows are redrawn only when something on them
 * changes; the gauges just move.
 */
export class HudScene extends Phaser.Scene {
  private air!: Gauge;
  private cell!: Gauge;
  /** The gauges' readings: set as they change, not rebuilt with the rows. */
  private airText!: Phaser.GameObjects.Text;
  private cellText!: Phaser.GameObjects.Text;
  /** The suit plate's sheet, and the height it was drawn for. */
  private sheet: Phaser.GameObjects.GameObject[] = [];
  private sheetH = 0;
  /** Everything on the suit plate that's redrawn when it changes. */
  private rows: Phaser.GameObjects.GameObject[] = [];
  private goalParts: Phaser.GameObjects.GameObject[] = [];
  private prompt!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private failed!: Phaser.GameObjects.Text;
  private intro: Phaser.GameObjects.Container | null = null;
  private pause: Phaser.GameObjects.Container | null = null;
  private woke: Phaser.GameObjects.Container | null = null;
  /** A Lamplighter's card, while one is talking. */
  private talk: Phaser.GameObjects.GameObject[] | null = null;
  private shown = '';
  private goalShown = '';

  constructor() {
    super('Hud');
  }

  private get play(): GameScene | null {
    return this.scene.get('Game') as GameScene | null;
  }

  create(): void {
    screenScene(this, true);
    this.shown = '';
    this.goalShown = '';
    this.sheet = [];
    this.sheetH = 0;
    this.rows = [];
    this.goalParts = [];
    this.intro = null;
    this.pause = null;
    this.woke = null;
    this.talk = null;
    const gx = PANEL.x + GAUGE.x;
    this.air = new Gauge(this, gx, PANEL.y + ROW.air - GAUGE.h / 2, GAUGE.w, GAUGE.h, 'air');
    this.cell = new Gauge(this, gx, PANEL.y + ROW.cell - GAUGE.h / 2, GAUGE.w, GAUGE.h, 'cell');
    for (const o of [...this.air.objects, ...this.cell.objects]) (o as Phaser.GameObjects.Image).setDepth(1);
    const gEnd = PANEL.x + GAUGE.x + GAUGE.w + 10;
    this.airText = label(this, gEnd, PANEL.y + ROW.air, '', 18, INK_TEXT, '600').setOrigin(0, 0.5).setDepth(1);
    this.cellText = label(this, gEnd, PANEL.y + ROW.cell, '', 18, INK_TEXT, '600').setOrigin(0, 0.5).setDepth(1);
    // Tapping a gauge feeds it from the bag.
    for (const [gauge, row] of [['air', ROW.air], ['cell', ROW.cell]] as const) {
      this.add.zone(PANEL.x + 8, PANEL.y + row - 13, PANEL.w - 16, 26).setOrigin(0).setDepth(2).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.play?.feedGauge(gauge as GaugeName));
    }
    this.prompt = aside(this, 0, 0, 'At the lander: press L to go aboard', 22, 600, INK_TEXT).setStyle(HALO).setOrigin(0.5).setVisible(false);
    this.hint = label(this, 0, 0, '← →  walk     ↓ ↑  drill     SPACE  jump, hold to fly     R  feed air or cell     L  go aboard     ESC  pause', 15, SEPIA, '500')
      .setStyle(HALO).setOrigin(0.5, 1).setAlpha(0.9);
    this.failed = heading(this, 0, 0, 'Your suit gave out', 34, MADDER).setStyle(HALO).setOrigin(0.5).setVisible(false);
    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', this.layout, this));
    if (this.play?.intro) this.showIntro();
    const woke = this.play?.woke;
    if (woke) this.showWoke(woke);
  }

  update(): void {
    const game = this.play;
    const mine = game?.mine;
    if (!game || !mine) return;
    if (!!this.pause !== game.paused) this.togglePause(game.paused);
    const s = mine.suit;
    this.air.set(s.air / s.maxAir, AIR.low);
    this.cell.set(s.energy / s.maxEnergy, LOW);
    reading(this.airText, `${Math.ceil(s.air)}`, s.air / s.maxAir < AIR.low);
    reading(this.cellText, `${s.energy}`, s.energy / s.maxEnergy < LOW);
    const pouch = inPouch(mine.items).length;
    const aboard = mine.atLander && mine.state === 'playing';
    const bag = s.bag.slots.map((x) => (x ? `${x.ore}${x.n}` : '-')).join(',');
    const sig = [s.hearts, s.maxHearts, Math.round(s.shield * 20), s.maxShield, bag, mine.depth, usedSlots(mine.cargo), mine.state, pouch].join('|');
    if (sig !== this.shown) {
      this.shown = sig;
      this.draw(mine);
    }
    this.showTalk(game);
    const goal = goalLine(game.liveProfile(), game.goal());
    const bars = game.signal();
    const key = `${goal}|${bars}`;
    if (key !== this.goalShown) {
      this.goalShown = key;
      this.drawGoal(goal, bars);
    }
    this.prompt.setVisible(aboard);
  }

  private layout(): void {
    const { width, height } = viewSize(this);
    this.hint.setPosition(width / 2, height - 10);
    this.failed.setPosition(width / 2, height / 2);
    this.prompt.setPosition(width / 2, height - 56);
    this.intro?.setPosition(width / 2, height / 2);
    this.pause?.setPosition(width / 2, height / 2);
    this.woke?.setPosition(width / 2, height * 0.3);
    this.shown = '';
    this.goalShown = '';
  }

  /** The suit's plate: its sheet (redrawn only when the bag changes its height), then its rows. */
  private draw(mine: Mine): void {
    const s = mine.suit;
    const { x, y, w } = PANEL;
    const h = ROW.bag + gridHeight(s.bag.slots.length, BAG) + 10;
    if (h !== this.sheetH) {
      for (const o of this.sheet) o.destroy();
      this.sheet = plate(this, x, y, w, h, { seed: 17 });
      this.sheetH = h;
    }
    for (const o of this.rows) o.destroy();
    const rows: Phaser.GameObjects.GameObject[] = [];
    const icon = (kind: IconKind, ix: number, iy: number, size: number): Phaser.GameObjects.Image => {
      const img = uiImage(this, ix, iy, iconKey(this, kind, size)).setDepth(1);
      rows.push(img);
      return img;
    };
    // Hearts, then the shield's bars (a part-charged bar fills from the bottom).
    for (let i = 0; i < s.maxHearts; i++) icon(i < s.hearts ? 'heart' : 'heartEmpty', x + 16 + i * (HEART + 3), y + ROW.hearts - HEART / 2, HEART);
    const sx = x + 16 + s.maxHearts * (HEART + 3) + 10;
    for (let i = 0; i < s.maxShield; i++) {
      const bx = sx + i * (SHIELD + 3);
      const by = y + ROW.hearts - SHIELD / 2;
      icon('shieldEmpty', bx, by, SHIELD);
      const fill = Phaser.Math.Clamp(s.shield - i, 0, 1);
      if (fill > 0) {
        const px = SHIELD * RES;
        icon('shield', bx, by, SHIELD).setCrop(0, px * (1 - fill), px, px * fill).setAlpha(fill >= 1 ? 1 : 0.7);
      }
    }
    // The gauges' emblems and readings.
    icon('air', x + 16, y + ROW.air - 10, 20);
    icon('cell', x + 16, y + ROW.cell - 10, 20);
    // Depth and cargo, then a rule over the bag.
    icon('depth', x + 16, y + ROW.info - 9, 18);
    rows.push(label(this, x + 40, y + ROW.info, mine.depth ? `${mine.depth} m down` : 'Surface', 17, SEPIA).setOrigin(0, 0.5).setDepth(1));
    icon('cargo', x + 160, y + ROW.info - 9, 18);
    rows.push(label(this, x + 184, y + ROW.info, `Cargo ${usedSlots(mine.cargo)} / ${mine.cargo.slots.length}`, 17, SEPIA).setOrigin(0, 0.5).setDepth(1));
    const g = this.add.graphics().setDepth(1);
    g.lineStyle(0.7, 0x1f2a55, 0.4).lineBetween(x + 16, y + ROW.rule, x + w - 16, y + ROW.rule);
    if (bagFull(s)) g.lineStyle(1.4, 0xa3352c, 0.9).strokeRoundedRect(x + 11, y + ROW.bag - 5, w - 22, gridHeight(s.bag.slots.length, BAG) + 4, 5);
    rows.push(g);
    rows.push(...drawSlotGrid(this, x + 16, y + ROW.bag, s.bag, { ...BAG, depth: 1 }));
    this.rows = rows;
    this.failed.setVisible(mine.state === 'failed');
  }

  /** A Lamplighter's card up while one is talking (the world waits), gone once it's read. */
  private showTalk(game: GameScene): void {
    if (game.talk && game.talk !== 'thanks' && !this.talk) {
      this.talk = storyCard(this, talkSpec(this, game.talk), () => {
        this.talk = null;
        game.closeTalk();
      }, 70);
    }
  }

  /** The objective plate: what to do next, with what's on hand counted; while following the call, the receiver's bars. */
  private drawGoal(line: string, bars: number | null): void {
    for (const o of this.goalParts) o.destroy();
    const { width } = viewSize(this);
    const x = width - GOAL.w - 14;
    const y = 14;
    const text = prose(this, x + GOAL.pad, y + PLATE_BODY - 4, line, 18, GOAL.w - GOAL.pad * 2, INK_TEXT).setDepth(1);
    let h = PLATE_BODY + text.height + 10;
    const parts: Phaser.GameObjects.GameObject[] = [text];
    if (bars !== null) {
      const by = y + h + 22;
      parts.push(label(this, x + GOAL.pad, by, 'Receiver', 17, SEPIA, '600').setOrigin(0, 0.5).setDepth(1));
      const g = this.add.graphics().setDepth(1);
      for (let k = 0; k < 5; k++) {
        const bh = 6 + k * 4;
        const bx = x + GOAL.pad + 96 + k * 14;
        g.fillStyle(k < bars ? 0x2f6f62 : 0xd8cfb8, 1).fillRect(bx, by + 10 - bh, 9, bh);
        g.lineStyle(0.8, 0x1f2a55, 0.7).strokeRect(bx, by + 10 - bh, 9, bh);
      }
      parts.push(g);
      parts.push(aside(this, x + GOAL.pad + 176, by, bars === 0 ? 'static' : bars >= 5 ? 'right here' : 'warmer, colder', 16, 140, SEPIA).setOrigin(0, 0.5).setDepth(1));
      h += 44;
    }
    this.goalParts = [...plate(this, x, y, GOAL.w, h, { seed: 31, depth: 0 }), ...plateHeading(this, x, y, GOAL.w, 'Next', 0.5), ...parts];
  }

  /** The opening card: how you got here, and the first thing to do. Any key or a tap starts. */
  private showIntro(): void {
    const { width, height } = viewSize(this);
    const left = -INTRO_W / 2 + 40;
    const parts: Phaser.GameObjects.GameObject[] = [heading(this, 0, 36, 'Graphite', 30).setOrigin(0.5, 0)];
    parts.push(aside(this, 0, 76, 'a grey moon, uncharted', 18, INTRO_W - 80, SEPIA).setOrigin(0.5, 0));
    let y = 120;
    for (const para of INTRO) {
      const t = prose(this, left, y, para, 20, INTRO_W - 80);
      parts.push(t);
      y += t.height + 12;
    }
    const h = y + 80;
    for (const part of parts) (part as unknown as { y: number }).y -= h / 2;
    const close = (): void => this.closeIntro();
    parts.push(plaque(this, 0, h / 2 - 46, 'Get up', close, { width: 180, height: 46, kind: 'primary' }));
    this.intro = plateCard(this, width / 2, height / 2, INTRO_W, h, parts, 77).setDepth(50);
    this.input.keyboard?.once('keydown-SPACE', close);
    this.input.keyboard?.once('keydown-ENTER', close);
    // Closed by the button, the keys mustn't stay listening.
    this.intro.once(Phaser.GameObjects.Events.DESTROY, () => {
      this.input.keyboard?.off('keydown-SPACE', close);
      this.input.keyboard?.off('keydown-ENTER', close);
    });
  }

  /** The note on waking: how you came back, and where the bag is. It fades on its own. */
  private showWoke(w: Woke): void {
    const { width, height } = viewSize(this);
    const t = aside(this, -220, 0, wokeText(w), 20, 440, INK_TEXT);
    t.setY(-t.height / 2);
    this.woke = plateCard(this, width / 2, height * 0.3, 490, t.height + 44, [t], 91).setDepth(40);
    this.tweens.add({ targets: this.woke, alpha: 0, delay: WOKE_MS, duration: 900, onComplete: () => {
      this.woke?.destroy();
      this.woke = null;
    } });
  }

  /** The pause card: the world waits; recall from here (the winch hauls you up, the bag stays flagged). */
  private togglePause(on: boolean): void {
    this.pause?.destroy();
    this.pause = null;
    if (!on) return;
    const { width, height } = viewSize(this);
    const note = prose(this, -PAUSE_W / 2 + 40, -58, 'Stuck? The winch hauls you up to the lander. What its share leaves of the bag stays where you are, under a flag.', 19, PAUSE_W - 80);
    const by = note.y + note.height + 42;
    const parts: Phaser.GameObjects.GameObject[] = [
      heading(this, 0, -104, 'Paused', 28).setOrigin(0.5, 0),
      note,
      plaque(this, -110, by, 'Resume', () => this.play?.resume(), { width: 180, height: 46, kind: 'primary' }),
      plaque(this, 110, by, 'Recall', () => this.play?.recall(), { width: 180, height: 46 }),
    ];
    this.pause = plateCard(this, width / 2, height / 2, PAUSE_W, 270, parts, 57).setDepth(60);
  }

  private closeIntro(): void {
    if (!this.intro) return;
    this.intro.destroy();
    this.intro = null;
    this.play?.closeIntro();
  }
}
