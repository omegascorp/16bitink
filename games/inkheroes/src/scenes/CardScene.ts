import Phaser from 'phaser';
import type { PlateKind } from '../art/uiArtParts';
import { getSound } from '../host';
import { cardFit } from './uiLayout';
import { screenScene, viewSize } from './hidpi';
import { body as bodyText, freePanel, MEDAL_R, paintedButton, panelCard, title as titleText, UI_TEX } from './uiPaint';

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
  /** Medals to show (victory), out of 3. */
  readonly blots?: number;
}

const W = 520;
const PAD = 34;

/**
 * A leather panel over the map: a title, some text and its buttons, stacked.
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
    const shade = this.add.rectangle(0, 0, view.width * 3, view.height * 3, 0x0a0604, 0.55).setOrigin(0).setInteractive();
    shade.on('pointerup', () => undefined);
    const tall = spec.buttons.some((b) => b.note);
    const btnH = tall ? 66 : 52;
    const title = titleText(this, 0, 0, spec.title, 30, { align: 'center', wrap: W - PAD * 2 }).setOrigin(0.5, 0);
    const body = bodyText(this, 0, 0, spec.body, 20, { align: 'center', wrap: W - PAD * 2 }).setOrigin(0.5, 0);
    const blotsH = spec.blots !== undefined ? 50 : 0;
    const h = PAD + title.height + 10 + body.height + 18 + blotsH + spec.buttons.length * (btnH + 12) + PAD - 12;
    this.size = { w: W, h };
    this.seed = 400 + Math.round(h);
    const card = panelCard(this, 0, 0, W, h, this.seed);
    const root = this.add.container(view.width / 2, view.height / 2, [card]);
    let y = -h / 2 + PAD;
    title.setPosition(0, y);
    y += title.height + 10;
    body.setPosition(0, y);
    y += body.height + 18;
    root.add([title, body]);
    if (spec.blots !== undefined) {
      for (let i = 0; i < 3; i++) root.add(this.add.image((i - 1) * 46, y + 18, i < spec.blots ? UI_TEX.medal : UI_TEX.medalSlot).setScale(17 / MEDAL_R / 2));
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
      }, { width: W - PAD * 2, height: btnH, size: b.note ? 16 : 19, kind: b.kind ?? (i === 0 ? 'primary' : 'plain') });
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
      freePanel(this, this.size.w, this.size.h, this.seed);
    });
  }
}

/** Opens a card (closing any card already open). */
export function openCard(scene: Phaser.Scene, spec: CardSpec): void {
  if (scene.scene.isActive('Card')) scene.scene.stop('Card');
  scene.scene.launch('Card', spec);
  scene.scene.bringToTop('Card');
}
