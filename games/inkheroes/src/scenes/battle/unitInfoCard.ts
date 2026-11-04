import Phaser from 'phaser';
import type { SceneryArt } from '../../art/pixel/scenery';
import { getSound } from '../../host';
import { badgeTexture, PX_TEX, unitArt } from './pixelAssets';
import { drawFrame, drawPicture, drawRule, inkBox, pictureOffset } from './pixelFrames';
import { HORIZON_Y, composeScenery, type Pixels } from './pixelScenery';
import { PixelButton, PixelFrame, PixelImage, putBuffer, TextLabel, texturePixels, UI_TEX, INK } from './pixelUi';
import type { UnitInfo } from './unitCard';

/** The battle's terrain parts, for the scene behind the unit. */
export interface PictureScenery {
  readonly atlas: Pixels;
  readonly art: SceneryArt;
  readonly seed: number;
}

/** A button above Close (Upgrade, in a town): off when it can't be pressed now. */
export interface InfoButton {
  readonly label: string;
  readonly note?: string;
  readonly enabled?: boolean;
  readonly onClick: () => void;
}

/** The picture, the stat column, padding and gaps, UI pixels. */
const PIC = 112;
const COL_W = 156;
const ROW_H = 16;
const PAD = 9;
const GAP = 6;
const BTN_H = 30;
/** A button with a note line under its label. */
const BTN_NOTE_H = 42;
/** Where the picture's scene is taken from: a stretch of the world off the field's left, its horizon this far down the picture. */
const SCENE_AT = { x: -200, horizon: 58 } as const;
/** How fast the unit's idle frames turn over, ms. */
const FRAME_MS = 170;

/**
 * A unit's info card, as Heroes 3's creature window: its name in gold, its
 * picture (its own idle animation, standing in a scene of this battle's
 * terrain, its count in the corner), a column of stats with an icon each
 * (the battle's changes in brackets), its abilities and the spells on it,
 * and Close. Pixel art at UI pixels; the screen dims behind it.
 */
export class UnitInfoCard {
  private readonly root: Phaser.GameObjects.Container;
  private readonly owned: { destroy(): void }[] = [];
  private readonly keys: string[] = [];
  private readonly timer: Phaser.Time.TimerEvent | null = null;
  private closed = false;

  constructor(private readonly scene: Phaser.Scene, parent: Phaser.GameObjects.Container, info: UnitInfo, scenery: PictureScenery | null, screen: { w: number; h: number }, private readonly onClose: () => void, buttons: readonly InfoButton[] = []) {
    getSound(scene)?.play('card');
    const inner = PIC + 4 + GAP + COL_W;
    const w = inner + PAD * 2;
    const shade = scene.add.rectangle(0, 0, screen.w, screen.h, 0x0a0604, 0.55).setOrigin(0).setInteractive();
    const title = new TextLabel(scene, { kind: 'title', wrap: inner, anchor: { x: 0.5, y: 0 } }).setText(info.name);
    const rule = new PixelImage(scene, drawRule(Math.min(inner, title.width + 40)), { x: 0.5, y: 0 });
    const notes = new TextLabel(scene, { wrap: inner - 10, anchor: { x: 0.5, y: 0 } }).setText(info.notes.length ? info.notes.join(' · ') : 'No special abilities');
    const notesH = notes.height + 8;
    const bodyH = Math.max(PIC + 4, info.rows.length * ROW_H + 4);
    const heights = buttons.map((b) => (b.note ? BTN_NOTE_H : BTN_H));
    const h = PAD + title.height + GAP + 5 + GAP + bodyH + GAP + notesH + GAP + heights.reduce((a, b) => a + b + GAP, 0) + BTN_H + PAD;
    const left = Math.floor((screen.w - w) / 2);
    const top = Math.max(2, Math.floor((screen.h - h) / 2));
    const panel = new PixelFrame(scene, w, h, { rim: 'bronze', thick: 2, fill: [34, 24, 17, 246], studs: true }).setPosition(left, top);
    const cx = left + Math.floor(w / 2);
    let y = top + PAD;
    title.setPosition(cx, y);
    y += title.height + GAP;
    rule.setPosition(cx, y);
    y += 5 + GAP;
    const x0 = left + PAD;
    const parts: Phaser.GameObjects.GameObject[] = [shade, panel.img, title.img, rule.img];
    // The picture: a framed scene with the unit's idle animation and its count.
    const picFrame = new PixelFrame(scene, PIC + 4, PIC + 4, { rim: 'bronze', fill: null }).setPosition(x0, y);
    const frames = this.pictureFrames(info, scenery);
    const pic = scene.add.image(x0 + 2, y + 2, frames[0]!).setOrigin(0);
    const badge = scene.add.image(0, 0, badgeTexture(scene, info.side, info.count)).setOrigin(1, 1);
    badge.setPosition(x0 + 2 + PIC - 2, y + 2 + PIC - 2);
    parts.push(pic, picFrame.img, badge);
    if (frames.length > 1) {
      let f = 0;
      this.timer = scene.time.addEvent({ delay: FRAME_MS, loop: true, callback: () => pic.setTexture(frames[(f = (f + 1) % frames.length)]!) });
    }
    // The stats: a dark well, a row each (icon, name, value), thin lines between.
    const colX = x0 + PIC + 4 + GAP;
    const well = drawFrame(COL_W, info.rows.length * ROW_H + 4, { rim: 'dim', fill: [22, 15, 10, 255] });
    for (let i = 1; i < info.rows.length; i++) for (let x = 2; x < COL_W - 2; x++) well.put(x, 2 + i * ROW_H - 1, [62, 46, 30, 255]);
    const wellImg = new PixelImage(scene, well).setPosition(colX, y);
    parts.push(wellImg.img);
    this.owned.push(wellImg);
    info.rows.forEach((r, i) => {
      const ry = y + 2 + i * ROW_H;
      parts.push(scene.add.image(colX + 3, ry, UI_TEX.stat(r.stat)).setOrigin(0));
      const label = new TextLabel(scene, { align: 'left', anchor: { x: 0, y: 0 } }).setText(r.label).setPosition(colX + 22, ry);
      const value = new TextLabel(scene, { align: 'right', ink: INK.title, anchor: { x: 1, y: 0 } }).setText(r.value).setPosition(colX + COL_W - 5, ry);
      parts.push(label.img, value.img);
      this.owned.push(label, value);
    });
    y += bodyH + GAP;
    // Abilities and spells, in a well across the card.
    const notesWell = new PixelFrame(scene, inner, notesH, { rim: 'dim', fill: [22, 15, 10, 255] }).setPosition(x0, y);
    notes.setPosition(cx, y + 4);
    parts.push(notesWell.img, notes.img);
    y += notesH + GAP;
    buttons.forEach((b, i) => {
      const btn = new PixelButton(scene, { w: inner, h: heights[i]!, label: b.label, note: b.note, onClick: () => { this.close(); b.onClick(); } });
      btn.setPosition(x0, y);
      btn.setEnabled(b.enabled ?? true);
      parts.push(btn.root);
      this.owned.push(btn);
      y += heights[i]! + GAP;
    });
    const close = new PixelButton(scene, { w: inner, h: BTN_H, label: 'Close', rim: 'gold', onClick: () => this.close() });
    close.setPosition(x0, y);
    parts.push(close.root);
    this.owned.push(panel, title, rule, notes, picFrame, notesWell, close);
    this.root = scene.add.container(0, 0, parts);
    parent.add(this.root);
  }

  /** The picture's frames: the scene once, the unit's idle frames drawn over it. */
  private pictureFrames(info: UnitInfo, scenery: PictureScenery | null): string[] {
    const art = unitArt(info.creature);
    const sheet = texturePixels(this.scene, PX_TEX.unit(info.creature, 'idle'));
    const back = scenery ? composeScenery(scenery.atlas, scenery.art, { x: SCENE_AT.x, y: HORIZON_Y - SCENE_AT.horizon, w: PIC, h: PIC }, scenery.seed) : null;
    const box = inkBox(sheet, 0, art.w, art.h) ?? { l: 0, t: 0, r: art.w, b: art.h };
    const at = pictureOffset(box, art.footY, PIC, PIC);
    for (let f = 0; f < art.frames.idle; f++) this.keys.push(putBuffer(this.scene, drawPicture(back, sheet, f * art.w, art.w, art.h, at, PIC, PIC)));
    return this.keys;
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.timer?.remove();
    for (const o of this.owned) o.destroy();
    this.root.destroy();
    for (const k of this.keys) if (this.scene.textures.exists(k)) this.scene.textures.remove(k);
    this.onClose();
  }
}
