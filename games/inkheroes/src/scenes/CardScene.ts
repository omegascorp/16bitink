import Phaser from 'phaser';
import { INK } from '../art/palette';
import type { PlateKind } from '../art/uiArtParts';
import { getSound } from '../host';
import { cardFit } from './uiLayout';
import { screenScene, viewSize } from './hidpi';
import { freePaper, HAND, paintedButton, paperCard } from './uiPaint';

export interface CardButton {
  readonly label: string;
  /** A second line under the label (a skill's effect). */
  readonly note?: string;
  readonly kind?: PlateKind;
  readonly onClick: () => void;
}

export interface CardSpec {
  readonly title: string;
  readonly body: string;
  readonly buttons: readonly CardButton[];
  /** Ink blots to show (victory), out of 3. */
  readonly blots?: number;
}

const W = 520;
const PAD = 34;

/**
 * A paper card over the map: a title, some text and its buttons, stacked.
 * Any button closes the card before running its action.
 */
export class CardScene extends Phaser.Scene {
  private size = { w: W, h: 0 };
  private seed = 0;

  constructor() {
    super('Card');
  }

  create(spec: CardSpec): void {
    screenScene(this, true);
    getSound(this)?.play('card');
    const view = viewSize(this);
    const shade = this.add.rectangle(0, 0, view.width * 3, view.height * 3, 0x1a1f33, 0.35).setOrigin(0).setInteractive();
    shade.on('pointerup', () => undefined);
    const tall = spec.buttons.some((b) => b.note);
    const btnH = tall ? 66 : 52;
    const title = this.add.text(0, 0, spec.title, { fontFamily: HAND, padding: { x: 8, y: 4 }, fontSize: '40px', color: INK, align: 'center', wordWrap: { width: W - PAD * 2 } }).setOrigin(0.5, 0);
    const body = this.add.text(0, 0, spec.body, { fontFamily: 'Georgia, serif', fontSize: '18px', color: INK, align: 'center', lineSpacing: 5, wordWrap: { width: W - PAD * 2 } }).setOrigin(0.5, 0);
    const blotsH = spec.blots !== undefined ? 50 : 0;
    const h = PAD + title.height + 10 + body.height + 18 + blotsH + spec.buttons.length * (btnH + 12) + PAD - 12;
    this.size = { w: W, h };
    this.seed = 400 + Math.round(h);
    const card = paperCard(this, 0, 0, W, h, this.seed, { rule: true });
    const root = this.add.container(view.width / 2, view.height / 2, [card]);
    let y = -h / 2 + PAD;
    title.setPosition(0, y);
    y += title.height + 10;
    body.setPosition(0, y);
    y += body.height + 18;
    root.add([title, body]);
    if (spec.blots !== undefined) {
      const g = this.add.graphics();
      for (let i = 0; i < 3; i++) {
        const x = (i - 1) * 46;
        if (i < spec.blots) g.fillStyle(0x27408b, 0.9).fillCircle(x, y + 18, 15);
        g.lineStyle(2.5, 0x27408b, i < spec.blots ? 1 : 0.4).strokeCircle(x, y + 18, 15);
      }
      root.add(g);
      y += blotsH;
    }
    // Two taps in one frame must not answer the card twice (stop() only takes effect next frame).
    let closed = false;
    for (const [i, b] of spec.buttons.entries()) {
      const label = b.note ? `${b.label}\n${b.note}` : b.label;
      const btn = paintedButton(this, 0, y + btnH / 2, label, () => {
        if (closed) return;
        closed = true;
        this.scene.stop();
        b.onClick();
      }, { width: W - PAD * 2, height: btnH, size: b.note ? 22 : 26, kind: b.kind ?? (i === 0 ? 'leaf' : 'paper') });
      root.add(btn);
      y += btnH + 12;
    }
    const fit = (): void => {
      const v = viewSize(this);
      root.setPosition(v.width / 2, v.height / 2).setScale(cardFit(v, { w: W + 20, h: h + 20 }));
    };
    fit();
    this.scale.on('resize', fit);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', fit);
      freePaper(this, this.size.w, this.size.h, this.seed);
    });
  }
}

/** Opens a card (closing any card already open). */
export function openCard(scene: Phaser.Scene, spec: CardSpec): void {
  if (scene.scene.isActive('Card')) scene.scene.stop('Card');
  scene.scene.launch('Card', spec);
  scene.scene.bringToTop('Card');
}
