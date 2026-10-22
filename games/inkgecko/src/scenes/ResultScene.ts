import Phaser from 'phaser';
import { PAPER, PAPER_HEX } from '../art/palette';
import { getHost, getSound } from '../host';
import { isFreeEnd, levelById, levelOrder, loadedLevels, nextLevel } from '../level/levels';
import { screenScene, screenSize, viewSize } from './hidpi';
import { GeckoPortrait } from './result/geckoPortrait';
import { loseContent } from './result/loseContent';
import { pickTip } from './result/tips';
import { WIN, winContent } from './result/winContent';
import { inkButton, inkText } from './ui';
import { cardFit, uprightScreen } from './uiLayout';
import { freePaper, paperCard, softenBoard, spot } from './uiPaint';

export interface ResultData {
  readonly levelId: string;
  readonly won: boolean;
  readonly time: number;
  readonly blots: number;
  readonly livesLost: number;
  readonly score: number;
  readonly bestCombo: number;
  readonly bestStreak: number;
  /** Fastest clear before this one, if the level had been cleared. */
  readonly previousBest?: number;
  /** How full the bar got, 0..1 (for a loss: how close it came). */
  readonly progress?: number;
}

const SOFT_INK = '#4a463e';
const CARD = { w: 540, h: 550 } as const;
const SEED = 31;
/** The title block sits right of the gecko. */
const TITLE_X = 62;
/** The gecko's portrait: its centre, from the card's left edge and top. */
const PORTRAIT = { x: -CARD.w / 2 + 118, y: 132 } as const;
const BUTTONS = { primary: 438, secondary: 506 } as const;
/** Which tip shows after the next loss, kept for the session. */
const TIP_TURN = 'resultTipTurn';

interface Action {
  readonly label: string;
  readonly run: () => void;
}

/**
 * After a level, a card over the stilled, blurred board: cleared (the
 * gecko spitting marbles for joy, ink blots stamping down, the score
 * counting up, what's next) or into the well (the gecko glum, how close
 * it came, a tip), and what to do now. Enter takes the main button.
 */
export class ResultScene extends Phaser.Scene {
  private gecko: GeckoPortrait | null = null;
  /** Set while the card is laid out again for a resized screen: no entrance, same tip. */
  private relaid = false;

  constructor() {
    super('Result');
  }

  create(data: ResultData): void {
    screenScene(this, true);
    const def = levelById(data.levelId) ?? loadedLevels()[0]!;
    const view = viewSize(this);
    const css = screenSize(this);
    const unblur = softenBoard(this);
    // Over the board when it's held behind; plain paper when it isn't.
    const behind = this.scene.isPaused('Game');
    if (!behind) this.cameras.main.setBackgroundColor(PAPER);
    const shade = this.add.rectangle(0, 0, view.width, view.height, PAPER_HEX, behind ? 0.55 : 0).setOrigin(0).setInteractive();
    const top = -CARD.h / 2;
    const card = this.add.container(view.width / 2, view.height / 2);
    card.add([this.add.zone(0, 0, CARD.w, CARD.h).setInteractive(), paperCard(this, 0, 0, CARD.w, CARD.h, SEED, { tapes: ['tl', 'tr'], rule: true, leaf: !data.won })]);
    card.add(spot(this, PORTRAIT.x, top + PORTRAIT.y, 86, data.won ? 'sun' : 'rain'));
    this.gecko = new GeckoPortrait(this, PORTRAIT.x, top + PORTRAIT.y, data.won ? 'happy' : 'glum', 1.08);
    card.add(this.gecko.root);
    const n = levelOrder().indexOf(def.id) + 1;
    card.add(inkText(this, TITLE_X, top + WIN.level, `Level ${n} · ${def.name}`, 23, SOFT_INK));
    if (data.won) winContent(this, card, data, def, top, TITLE_X);
    else loseContent(this, card, data, top, TITLE_X, this.nextTip(def.shooter.kind));
    const primary = this.buttons(card, data, top);
    const fit = cardFit(view, CARD, uprightScreen(css.width, css.height) ? 1.4 : 1);
    card.setScale(fit * 0.92).setAlpha(0).setY(view.height / 2 + 18);
    shade.setAlpha(0);
    this.tweens.add({ targets: shade, alpha: 1, duration: 200 });
    this.tweens.add({ targets: card, scale: fit, alpha: 1, y: view.height / 2, duration: 280, ease: 'Back.Out' });
    if (!this.relaid) getSound(this)?.play('card');
    this.relaid = false;
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (!e.repeat && (e.code === 'Enter' || e.code === 'NumpadEnter')) primary?.run();
    });
    // A resize lays the card out afresh (without its entrance).
    const relayout = (): void => {
      this.relaid = true;
      this.scene.restart(data);
    };
    this.scale.once('resize', relayout);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', relayout);
      unblur();
      freePaper(this, CARD.w, CARD.h, SEED);
      this.gecko = null;
    });
  }

  update(time: number): void {
    this.gecko?.update(time);
  }

  /** The tip after this loss, then the next one in turn. */
  private nextTip(kind: Parameters<typeof pickTip>[1]): string {
    const next = (this.registry.get(TIP_TURN) as number | undefined) ?? 0;
    const turn = this.relaid ? Math.max(0, next - 1) : next;
    this.registry.set(TIP_TURN, turn + 1);
    return pickTip(turn, kind, !this.sys.game.device.os.desktop);
  }

  /** Leaves for scene `key`, letting the held board go unless it's the game being started afresh. */
  private go(key: 'Game' | 'Menu', data?: object): void {
    if (key !== 'Game') this.scene.stop('Game');
    this.scene.start(key, data);
  }

  /** The main button and the small ones under it; returns the main action, for Enter. */
  private buttons(card: Phaser.GameObjects.Container, data: ResultData, top: number): Action | null {
    const host = getHost(this);
    const next = nextLevel(data.levelId);
    const replay = (): void => this.go('Game', { levelId: data.levelId });
    const map = (): void => this.go('Menu');
    let primary: Action | null;
    if (!data.won) primary = { label: 'Try again', run: replay };
    else if (next) primary = { label: 'Next level', run: () => this.go('Game', { levelId: next.id }) };
    else if (isFreeEnd(data.levelId) && !host.unlocked && host.price) primary = { label: `Full game · ${host.price}`, run: () => host.onBuy() };
    else primary = null;
    const y = top + BUTTONS.primary;
    if (primary) card.add(inkButton(this, 0, y, primary.label, primary.run, { width: 260, height: 62, size: 34, kind: 'leaf' }));
    else card.add(inkText(this, 0, y, 'More chapters are on the way!', 28));
    if (data.won && next) card.add(inkText(this, TITLE_X - 62, top + WIN.peek, `Next up: ${levelOrder().indexOf(next.id) + 1} · ${next.name}`, 21, SOFT_INK));
    const small = data.won ? [{ label: 'Replay', run: replay }, { label: 'Map', run: map }] : [{ label: 'Level map', run: map }];
    small.forEach((b, i) => card.add(inkButton(this, small.length === 1 ? 0 : (i - 0.5) * 180, top + BUTTONS.secondary, b.label, b.run, { width: 160, height: 50, size: 25 })));
    return primary;
  }
}
