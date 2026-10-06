import Phaser from 'phaser';
import { BLUE_HEX, PAPER_HEX, RED } from '../art/palette';
import { TEX } from '../art/textures';
import { levelById, nextLevel } from '../level/levels';
import { screenScene, viewSize } from './hidpi';
import { clock, drawBlots, inkButton, inkText, wobblyRect } from './ui';

export interface ResultData {
  readonly levelId: string;
  readonly won: boolean;
  readonly time: number;
  readonly blots: number;
  readonly livesLost: number;
}

/** After a level: blots and time when it's won, a try-again when the lives ran out. */
export class ResultScene extends Phaser.Scene {
  constructor() {
    super('Result');
  }

  create(data: ResultData): void {
    screenScene(this);
    const { width, height } = viewSize(this);
    const def = levelById(data.levelId);
    this.add.tileSprite(0, 0, width, height, TEX.paper).setOrigin(0);
    const w = Math.min(440, width - 32);
    const h = 330;
    const cx = width / 2;
    const top = Math.max(16, (height - h) / 2);
    const g = this.add.graphics();
    g.fillStyle(PAPER_HEX, 0.95).fillRect(cx - w / 2, top, w, h);
    wobblyRect(g, cx - w / 2, top, w, h, 77, 2, BLUE_HEX);
    inkText(this, cx, top + 40, def?.name ?? '', 30);
    if (data.won) {
      inkText(this, cx, top + 86, 'grown up!', 40);
      drawBlots(g, cx, top + 144, data.blots, 16);
      const par = def ? `  (par ${clock(def.parTime)})` : '';
      inkText(this, cx, top + 190, `${clock(data.time)}${par}`, 22).setAlpha(0.8);
      inkText(this, cx, top + 216, data.livesLost === 0 ? 'no lives lost' : `${data.livesLost} ${data.livesLost === 1 ? 'life' : 'lives'} lost`, 20).setAlpha(0.7);
    } else {
      inkText(this, cx, top + 96, 'out of lives', 40, RED);
      inkText(this, cx, top + 150, 'Keep away from anything inked red, or hide (Z).', 20).setAlpha(0.8);
    }
    const next = data.won ? nextLevel(data.levelId) : undefined;
    const by = top + h - 50;
    const buttons: [string, () => void][] = [
      ['levels', () => this.scene.start('Menu')],
      ['try again', () => this.scene.start('Game', { levelId: data.levelId })],
      ...(next ? [['next', () => this.scene.start('Game', { levelId: next.id })] as [string, () => void]] : []),
    ];
    const bw = Math.min(130, (w - 40) / buttons.length - 10);
    // One press leaves the card; a double tap mustn't start the next scene twice.
    let leaving = false;
    const once = (go: () => void) => (): void => {
      if (leaving) return;
      leaving = true;
      go();
    };
    buttons.forEach(([label, go], i) => inkButton(this, cx + (i - (buttons.length - 1) / 2) * (bw + 12), by, label, once(go), { width: bw, height: 46, size: 24 }));
  }
}
