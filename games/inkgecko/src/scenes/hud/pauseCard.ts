import Phaser from 'phaser';
import { MARBLE_R, MARBLE_RES } from '../../art/marbleArt';
import { BLUE, PAPER_HEX } from '../../art/palette';
import { TEX } from '../../art/textures';
import { getSound } from '../../host';
import { LIVES } from '../../logic/board';
import type { GameScene } from '../GameScene';
import { clock, inkButton, inkText } from '../ui';
import { freePaper, GROOVE, LIFE_R, paperCard, roundButton, softenBoard, UI_RES, UI_TEX, VineBar, type RoundButton } from '../uiPaint';
import { cardFit, type Size } from '../uiLayout';

const CARD = { w: 420, h: 470 } as const;
const SEED = 77;
const SOFT_INK = '#4a463e';
const PENCIL = '#8a8578';
const LEAF_INK = '#365f2c';

export interface PauseCardOpts {
  readonly game: GameScene;
  readonly view: Size;
  readonly upright: boolean;
  readonly touch: boolean;
  readonly title: { readonly n: number; readonly name: string };
  readonly onResume: () => void;
  readonly onSound: () => void;
}

/**
 * The pause card: a taped paper card over the blurred, washed-out board,
 * with where the level stands (points and how full the bar is, lives,
 * the clock against par), Resume, Start over and Level map, and a sound
 * switch. It swallows every press, so none reaches the board.
 */
export class PauseCard {
  private readonly root: Phaser.GameObjects.Container;
  private readonly sound: RoundButton;
  private readonly unblur: () => void;

  constructor(private readonly scene: Phaser.Scene, o: PauseCardOpts) {
    const { width, height } = o.view;
    const shade = scene.add.rectangle(0, 0, width, height, PAPER_HEX, 0.5).setOrigin(0).setInteractive();
    this.unblur = softenBoard(scene);
    const top = -CARD.h / 2;
    const card = scene.add.container(width / 2, height / 2);
    const body = scene.add.zone(0, 0, CARD.w, CARD.h).setInteractive();
    card.add([body, paperCard(scene, 0, 0, CARD.w, CARD.h, SEED, { tapes: ['tl', 'tr'], rule: true, leaf: true })]);
    card.add(inkText(scene, 0, top + 56, 'Paused', 50, BLUE));
    card.add(inkText(scene, 0, top + 100, `Level ${o.title.n} · ${o.title.name}`, 23, SOFT_INK));
    this.standing(card, o.game, top + 140);
    card.add(inkButton(scene, 0, top + 306, 'Resume', o.onResume, { width: 240, height: 60, size: 33, kind: 'leaf' }));
    card.add(inkButton(scene, -88, top + 378, 'Start over', () => o.game.restart(), { width: 160, height: 50, size: 25 }));
    card.add(inkButton(scene, 88, top + 378, 'Level map', () => o.game.quit(), { width: 160, height: 50, size: 25 }));
    if (!o.touch) card.add(inkText(scene, 0, top + 432, 'Esc or P to resume  ·  M for sound', 18, PENCIL));
    this.sound = roundButton(scene, CARD.w / 2 - 50, top + 52, getSound(scene)?.muted ? 'muted' : 'sound', o.onSound, 46);
    card.add(this.sound.root);
    this.root = scene.add.container(0, 0, [shade, card]).setDepth(50);
    const fit = cardFit(o.view, CARD, o.upright ? 1.45 : 1);
    shade.setAlpha(0);
    card.setScale(fit * 0.94).setAlpha(0).setY(height / 2 + 14);
    scene.tweens.add({ targets: shade, alpha: 1, duration: 160 });
    scene.tweens.add({ targets: card, scale: fit, alpha: 1, y: height / 2, duration: 240, ease: 'Back.Out' });
    getSound(scene)?.play('card');
  }

  /** Points and the bar, lives, and the clock against par. */
  private standing(card: Phaser.GameObjects.Container, game: GameScene, y: number): void {
    const s = this.scene;
    const b = game.board;
    const left = -GROOVE.w / 2;
    card.add(inkText(s, left, y, `${b.score} points`, 24, BLUE).setOrigin(0, 0.5));
    const pct = Math.round(b.progress * 100);
    card.add(inkText(s, -left, y, b.filled ? 'bar full!' : `bar ${pct}% full`, 20, b.filled ? LEAF_INK : SOFT_INK).setOrigin(1, 0.5));
    const bar = new VineBar(s, left, y + 30);
    bar.set(b.progress);
    card.add(bar.root);
    const row = y + 80;
    for (let i = 0; i < LIVES; i++) {
      const x = left + 14 + i * 30;
      card.add(s.add.image(x, row + 1, UI_TEX.socket).setScale(1.15 / UI_RES));
      if (i < b.lives) card.add(s.add.image(x, row, TEX.marble('green', i % 3)).setScale((LIFE_R * 1.15) / MARBLE_R / MARBLE_RES));
    }
    card.add(inkText(s, left + 2, row + 28, b.lives === 1 ? '1 life left' : `${b.lives} lives left`, 18, SOFT_INK).setOrigin(0, 0.5));
    const late = b.elapsed > game.level.par;
    const time = inkText(s, -left, row, clock(b.elapsed), 26, BLUE).setOrigin(1, 0.5);
    card.add([s.add.image(-left - time.width - 8, row + 1, UI_TEX.icon('clock')).setScale(0.75 / UI_RES), time]);
    card.add(inkText(s, -left, row + 28, late ? `past par ${clock(game.level.par)}` : `par ${clock(game.level.par)}`, 18, SOFT_INK).setOrigin(1, 0.5));
  }

  setMuted(muted: boolean): void {
    this.sound.setIcon(muted ? 'muted' : 'sound');
  }

  destroy(): void {
    this.unblur();
    this.root.destroy();
  }

  /** Lets the card's painting go, once the HUD is done with it. */
  static free(scene: Phaser.Scene): void {
    freePaper(scene, CARD.w, CARD.h, SEED);
  }
}
