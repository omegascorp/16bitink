import Phaser from 'phaser';
import { BLUE, BLUE_HEX, PAPER_HEX, RED } from '../art/palette';
import { getHost } from '../host';
import { isFreeEnd, levelById, levelOrder, loadedLevels, nextLevel } from '../level/levels';
import { screenScene, viewSize } from './hidpi';
import { clock, drawBlots, HAND_FONT, inkButton, inkText, wobblyRect } from './ui';

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
}

const SOFT_INK = '#4a463e';
const CARD = { w: 460, h: 470 } as const;

/** After a level: cleared or into the well, the blots and why, and what comes next. */
export class ResultScene extends Phaser.Scene {
  constructor() {
    super('Result');
  }

  create(data: ResultData): void {
    screenScene(this, true);
    const def = levelById(data.levelId) ?? loadedLevels()[0]!;
    const { width, height } = viewSize(this);
    const cx = width / 2;
    const top = height / 2 - CARD.h / 2;
    const g = this.add.graphics();
    g.fillStyle(PAPER_HEX, 1).fillRect(cx - CARD.w / 2, top, CARD.w, CARD.h);
    wobblyRect(g, cx - CARD.w / 2, top, CARD.w, CARD.h, 31, 2, BLUE_HEX);
    inkText(this, cx, top + 52, data.won ? 'Cleared!' : 'Into the well!', 54, data.won ? BLUE : RED);
    const n = levelOrder().indexOf(def.id) + 1;
    inkText(this, cx, top + 102, `Level ${n} · ${def.name}`, 26, SOFT_INK);
    if (data.won) this.winLines(data, def.par, cx, top + 150);
    else this.loseLines(data, cx, top + 160);
    this.buttons(data, cx, top + CARD.h - 120);
  }

  private winLines(data: ResultData, par: number, cx: number, y: number): void {
    const g = this.add.graphics();
    drawBlots(g, cx, y, data.blots, 15);
    const why = [
      'cleared',
      data.time <= par ? `under ${clock(par)}` : `par ${clock(par)}`,
      data.livesLost === 0 ? 'no lives lost' : `${data.livesLost} lost`,
    ];
    inkText(this, cx, y + 36, why.join(' · '), 20, SOFT_INK);
    const best = data.previousBest !== undefined && data.time < data.previousBest ? '  (best!)' : '';
    inkText(this, cx, y + 76, `score ${data.score}   time ${clock(data.time)}${best}`, 26);
    const extras = [data.bestCombo > 0 ? `best combo ×${data.bestCombo + 1}` : '', data.bestStreak >= 3 ? `streak ${data.bestStreak}` : ''].filter(Boolean);
    if (extras.length) inkText(this, cx, y + 110, extras.join(' · '), 22, SOFT_INK);
  }

  private loseLines(data: ResultData, cx: number, y: number): void {
    inkText(this, cx, y, `score ${data.score}`, 28);
    this.add.text(cx, y + 50, 'Tip: shoot into a gap with the same colour either side, and the line rolls back to close it.', {
      fontFamily: HAND_FONT, fontSize: '21px', color: SOFT_INK, align: 'center', wordWrap: { width: CARD.w - 60 },
    }).setOrigin(0.5, 0);
  }

  private buttons(data: ResultData, cx: number, y: number): void {
    const host = getHost(this);
    const next = nextLevel(data.levelId);
    if (data.won && next) {
      inkButton(this, cx, y, 'Next level', () => this.scene.start('Game', { levelId: next.id }), { width: 220 });
    } else if (data.won && isFreeEnd(data.levelId) && !host.unlocked && host.price) {
      inkButton(this, cx, y, `Full game · ${host.price}`, () => host.onBuy(), { width: 260 });
    } else if (data.won && !next) {
      inkText(this, cx, y, 'More chapters are on the way!', 26);
    } else {
      inkButton(this, cx, y, data.won ? 'Play again' : 'Try again', () => this.scene.start('Game', { levelId: data.levelId }), { width: 220 });
    }
    inkButton(this, cx - 80, y + 64, data.won ? 'Replay' : 'Map', () => (data.won ? this.scene.start('Game', { levelId: data.levelId }) : this.scene.start('Menu')), { width: 140, height: 46, size: 24 });
    inkButton(this, cx + 80, y + 64, data.won ? 'Map' : 'Exit', () => (data.won ? this.scene.start('Menu') : host.onExit()), { width: 140, height: 46, size: 24 });
  }
}
