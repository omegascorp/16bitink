import type Phaser from 'phaser';
import { creature, type CreatureId } from '../../logic/creatures';
import { faceOf, PX_TEX, unitArt } from '../battle/pixelAssets';
import { drawPortrait } from '../battle/pixelFrames';
import { rimOfUnit } from '../battle/rankLook';
import { PixelButton, PixelFrame, PixelImage, TextLabel } from '../battle/pixelUi';
import { splitCount } from './armySlots';

const PANEL = { w: 300, h: 196, pad: 10 } as const;
const FACE_SLOT = 60;
const TRACK = { h: 6, hit: 30, knob: { w: 12, h: 20 } } as const;
const BTN = { h: 30, step: 34, gap: 8 } as const;
const FILL = [34, 24, 17, 250] as const;
const TRACK_BACK = 0x160e09;
const TRACK_FILL = 0xf8d26e;
const KNOB = 0xffe9a0;

export interface SplitOpts {
  readonly id: CreatureId;
  readonly count: number;
  readonly screen: { readonly w: number; readonly h: number };
  readonly depth: number;
  /** Draw inside this container (at the screen's corner), when the scene has one on top. */
  readonly parent?: Phaser.GameObjects.Container;
  onSplit(count: number): void;
  onClose(): void;
}

/**
 * Splitting a company: how many stay and how many form a new one, side by
 * side, set with a slider or a step at a time. It starts at half.
 */
export class SplitPicker {
  private readonly owned: { destroy(): void }[] = [];
  private readonly root: Phaser.GameObjects.Container;
  private readonly keep: TextLabel;
  private readonly take: TextLabel;
  private readonly knob: Phaser.GameObjects.Rectangle;
  private readonly fill: Phaser.GameObjects.Rectangle;
  private readonly less: PixelButton;
  private readonly more: PixelButton;
  private readonly track: { x: number; w: number; y: number };
  private n: number;

  constructor(private readonly scene: Phaser.Scene, private readonly opts: SplitOpts) {
    this.n = Math.floor(opts.count / 2);
    const { screen, count, id } = opts;
    const w = Math.min(PANEL.w, screen.w - 8);
    const x = Math.floor((screen.w - w) / 2);
    const y = Math.max(2, Math.floor((screen.h - PANEL.h) / 2));
    const shade = scene.add.rectangle(0, 0, screen.w, screen.h, 0x0a0604, 0.55).setOrigin(0).setInteractive();
    shade.on('pointerup', () => opts.onClose());
    const frame = new PixelFrame(scene, w, PANEL.h, { rim: 'bronze', thick: 2, fill: FILL, studs: true }).setPosition(x, y);
    frame.img.setInteractive();
    const cr = creature(id);
    const title = new TextLabel(scene, { kind: 'title', anchor: { x: 0.5, y: 0 } }).setText(`Split ${cr.plural}`).setPosition(x + Math.floor(w / 2), y + PANEL.pad);
    const face = drawPortrait(faceOf(scene, PX_TEX.unit(id, 'idle'), unitArt(id), FACE_SLOT - 4), rimOfUnit(id), false, false, FACE_SLOT);
    const faceY = y + PANEL.pad + 19;
    const leftX = x + PANEL.pad + 26;
    const rightX = x + w - PANEL.pad - 26 - FACE_SLOT;
    const left = new PixelImage(scene, face).setPosition(leftX, faceY);
    const right = new PixelImage(scene, face).setPosition(rightX, faceY);
    this.keep = new TextLabel(scene, { kind: 'title', anchor: { x: 0, y: 0 } }).setPosition(leftX + FACE_SLOT + 7, faceY + 12);
    this.take = new TextLabel(scene, { kind: 'title', anchor: { x: 1, y: 0 } }).setPosition(rightX - 7, faceY + 12);
    const stays = new TextLabel(scene, { anchor: { x: 0, y: 0 } }).setText('stay').setPosition(leftX + FACE_SLOT + 7, faceY + 28);
    const leaves = new TextLabel(scene, { anchor: { x: 1, y: 0 } }).setText('new').setPosition(rightX - 7, faceY + 28);
    const stepY = faceY + FACE_SLOT + 9;
    this.less = new PixelButton(scene, { w: BTN.step, h: BTN.h, label: '-', onClick: () => this.set(this.n - 1) });
    this.more = new PixelButton(scene, { w: BTN.step, h: BTN.h, label: '+', onClick: () => this.set(this.n + 1) });
    this.less.setPosition(x + PANEL.pad, stepY);
    this.more.setPosition(x + w - PANEL.pad - BTN.step, stepY);
    const tx = x + PANEL.pad + BTN.step + 10;
    const tw = w - (PANEL.pad + BTN.step + 10) * 2;
    const ty = stepY + Math.floor((BTN.h - TRACK.h) / 2);
    this.track = { x: tx, w: tw, y: ty };
    const back = scene.add.rectangle(tx, ty, tw, TRACK.h, TRACK_BACK).setOrigin(0);
    this.fill = scene.add.rectangle(tx, ty, 0, TRACK.h, TRACK_FILL).setOrigin(0);
    this.knob = scene.add.rectangle(tx, ty + TRACK.h / 2, TRACK.knob.w, TRACK.knob.h, KNOB).setOrigin(0.5);
    const hit = scene.add.rectangle(tx - TRACK.knob.w, stepY, tw + TRACK.knob.w * 2, TRACK.hit, 0, 0).setOrigin(0).setInteractive();
    const slide = (p: Phaser.Input.Pointer): void => this.set(splitCount((p.worldX - tx) / tw, count));
    hit.on('pointerdown', slide);
    hit.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.isDown) slide(p);
    });
    const btnY = y + PANEL.h - PANEL.pad - BTN.h;
    const bw = Math.floor((w - PANEL.pad * 2 - BTN.gap) / 2);
    const ok = new PixelButton(scene, { w: bw, h: BTN.h, label: 'Split', primary: true, rim: 'gold', onClick: () => opts.onSplit(this.n) });
    const no = new PixelButton(scene, { w: bw, h: BTN.h, label: 'Cancel', onClick: () => opts.onClose() });
    ok.setPosition(x + PANEL.pad, btnY);
    no.setPosition(x + PANEL.pad + bw + BTN.gap, btnY);
    this.root = scene.add.container(0, 0, [shade, frame.img, title.img, left.img, right.img, this.keep.img, this.take.img, stays.img, leaves.img, back, this.fill, this.knob, hit, this.less.root, this.more.root, ok.root, no.root]);
    if (opts.parent) opts.parent.add(this.root);
    else this.root.setDepth(opts.depth);
    this.owned.push(frame, title, left, right, this.keep, this.take, stays, leaves, this.less, this.more, ok, no);
    this.set(this.n);
  }

  private set(n: number): void {
    const { count } = this.opts;
    this.n = Math.max(1, Math.min(count - 1, n));
    this.keep.setText(String(count - this.n));
    this.take.setText(String(this.n));
    const px = Math.round((this.n / count) * this.track.w);
    this.fill.setSize(px, TRACK.h);
    this.knob.setX(this.track.x + px);
    this.less.setEnabled(this.n > 1);
    this.more.setEnabled(this.n < count - 1);
  }

  destroy(): void {
    for (const o of this.owned) o.destroy();
    this.root.destroy();
  }
}
