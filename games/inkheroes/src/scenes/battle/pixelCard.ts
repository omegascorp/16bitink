import Phaser from 'phaser';
import { getSound } from '../../host';
import type { CardSpec } from '../CardScene';
import { drawRule } from './pixelFrames';
import { PixelButton, PixelFrame, PixelImage, TextLabel } from './pixelUi';

/** The card's widest, its padding and the space between its parts, UI pixels. */
const MAX_W = 280;
const PAD = 9;
const GAP = 5;
const BTN_H = 22;
const BTN_NOTE_H = 34;
/** The rule's height. */
const RULE_H = 5;

/**
 * The battle's card (a unit's stats, the spellbook, the result) as pixel
 * art in the UI layer: a dark panel with a bronze rim and gold studs, the
 * title in gold over a bronze rule, the text, and a button per choice.
 * Behind it the screen dims and takes every tap. Any button closes it
 * before running its action.
 */
export class PixelCard {
  private readonly root: Phaser.GameObjects.Container;
  private readonly owned: { destroy(): void }[] = [];
  private closed = false;

  constructor(private readonly scene: Phaser.Scene, parent: Phaser.GameObjects.Container, spec: CardSpec, screen: { w: number; h: number }, private readonly onClose: () => void) {
    getSound(scene)?.play('card');
    const w = Math.min(MAX_W, screen.w - 8);
    const inner = w - PAD * 2;
    const shade = scene.add.rectangle(0, 0, screen.w, screen.h, 0x0a0604, 0.55).setOrigin(0).setInteractive();
    const title = new TextLabel(scene, { kind: 'title', wrap: inner, anchor: { x: 0.5, y: 0 } }).setText(spec.title);
    const rule = new PixelImage(scene, drawRule(Math.min(inner, title.width + 40)), { x: 0.5, y: 0 });
    const body = new TextLabel(scene, { wrap: inner, anchor: { x: 0.5, y: 0 } }).setText(spec.body);
    const buttons = spec.buttons.map((b, i) => new PixelButton(scene, {
      w: inner, h: b.note ? BTN_NOTE_H : BTN_H, label: b.label, note: b.note,
      rim: (b.kind ?? (i === 0 ? 'primary' : 'plain')) === 'plain' ? 'bronze' : 'gold',
      onClick: () => {
        if (this.closed) return;
        this.close();
        b.onClick();
      },
    }));
    const h = PAD + title.height + GAP + RULE_H + GAP + body.height + GAP * 2 + buttons.reduce((a, b) => a + b.height + GAP, 0) - GAP + PAD;
    const left = Math.floor((screen.w - w) / 2);
    const top = Math.max(2, Math.floor((screen.h - h) / 2));
    const panel = new PixelFrame(scene, w, h, { rim: 'bronze', thick: 2, fill: [34, 24, 17, 246], studs: true }).setPosition(left, top);
    const cx = left + Math.floor(w / 2);
    let y = top + PAD;
    title.setPosition(cx, y);
    y += title.height + GAP;
    rule.setPosition(cx, y);
    y += RULE_H + GAP;
    body.setPosition(cx, y);
    y += body.height + GAP * 2;
    for (const b of buttons) {
      b.setPosition(left + PAD, y);
      y += b.height + GAP;
    }
    this.owned.push(panel, title, rule, body, ...buttons);
    this.root = scene.add.container(0, 0, [shade, panel.img, rule.img, title.img, body.img, ...buttons.map((b) => b.root)]);
    parent.add(this.root);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    for (const o of this.owned) o.destroy();
    this.root.destroy();
    this.onClose();
  }
}
