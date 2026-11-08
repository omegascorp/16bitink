import Phaser from 'phaser';
import { PixelBuffer, type Rgba } from '../battle/pixelRaster';
import { INK, PixelButton, PixelFrame, putBuffer, TextLabel } from '../battle/pixelUi';
import { buttonsW, STRIP, stripBox, textWidth, type Box, type StripRoom } from './stripLayout';

/** What the strip needs from the narrator: its three buttons. */
export interface StripActions {
  readonly pause: () => void;
  readonly skip: () => void;
  readonly read: () => void;
}

/** The panel's fill: the map HUD's, solid, so nothing under it shows through the words. */
const FILL: Rgba = [34, 24, 17, 255];

/** A small icon drawn in code: 'pause' two bars, 'play' a triangle. */
function drawIcon(kind: 'pause' | 'play'): PixelBuffer {
  const b = new PixelBuffer(7, 9);
  const ink = INK.text;
  for (let y = 1; y < 8; y++) {
    if (kind === 'pause') {
      for (const x of [1, 2, 4, 5]) b.put(x, y, ink);
    } else {
      const reach = Math.min(y - 1, 7 - y);
      for (let x = 1; x <= 1 + reach * 1.5; x++) b.put(x, y, ink);
    }
  }
  return b;
}

/**
 * The narrator's strip (spec, "Narration"), as the HUD's pixel panel: the
 * speaker's name in gold and the card's title beside it, the subtitle
 * under them, a thin line along the foot for how far through the line is,
 * and ❚❚ (pause), » (skip) and Read at the right.
 */
export class NarratorStrip {
  readonly root: Phaser.GameObjects.Container;
  private readonly owned: { destroy(): void }[] = [];
  private readonly name: TextLabel;
  private readonly title: TextLabel;
  private readonly text: TextLabel;
  private readonly buttons: PixelButton[];
  private readonly pauseIcon: Phaser.GameObjects.Image;
  private readonly icons: Record<'pause' | 'play', string>;
  private frame: PixelFrame | null = null;
  private readonly track: Phaser.GameObjects.Rectangle;
  private readonly fill: Phaser.GameObjects.Rectangle;
  private box: Box = { x: 0, y: 0, w: 0, h: 0 };
  private room: StripRoom;
  /** Two lines of subtitle, as the font draws them: the most a subtitle runs to (the strip grows for a third, should one wrap so). */
  private readonly twoLines: number;

  constructor(private readonly scene: Phaser.Scene, room: StripRoom, speaker: string, title: string, actions: StripActions) {
    this.room = room;
    this.name = new TextLabel(scene, { kind: 'title', align: 'left' }).setText(speaker);
    this.title = new TextLabel(scene, { align: 'left', ink: INK.dim }).setText(`· ${title}`);
    this.text = new TextLabel(scene, { align: 'left', wrap: textWidth(Math.min(STRIP.maxW, room.w)) }).setText('…\n…');
    this.twoLines = this.text.height;
    this.text.setText('…');
    const { button } = STRIP;
    this.icons = { pause: putBuffer(scene, drawIcon('pause')), play: putBuffer(scene, drawIcon('play')) };
    const pause = new PixelButton(scene, { w: button.w, h: button.h, label: ' ', onClick: actions.pause });
    this.pauseIcon = scene.add.image(Math.floor((button.w - 7) / 2), Math.floor((button.h - 9) / 2), this.icons.pause).setOrigin(0);
    pause.root.add(this.pauseIcon);
    const skip = new PixelButton(scene, { w: button.w, h: button.h, label: '»', onClick: actions.skip });
    const read = new PixelButton(scene, { w: button.read, h: button.h, label: 'Read', onClick: actions.read });
    this.buttons = [pause, skip, read];
    this.track = scene.add.rectangle(0, 0, 1, STRIP.bar, 0x140d08, 0.9).setOrigin(0);
    this.fill = scene.add.rectangle(0, 0, 1, STRIP.bar, 0xf8d26e, 0.85).setOrigin(0);
    this.owned.push(this.name, this.title, this.text, ...this.buttons);
    this.root = scene.add.container(0, 0, [this.name.img, this.title.img, this.text.img, this.track, this.fill, ...this.buttons.map((b) => b.root)]);
    this.layout(room);
  }

  /** Where the strip is now, in UI pixels (the map lifts its status line above it). */
  get bounds(): Box {
    return this.box;
  }

  /** Lays the strip out in `room` (after a resize, or when the screen under it changed). */
  layout(room: StripRoom): void {
    this.room = room;
    const w = Math.min(STRIP.maxW, room.w);
    this.text.setWrap(textWidth(w));
    this.box = stripBox(room, this.name.height, Math.max(this.twoLines, this.text.height));
    const { x, y, h } = this.box;
    if (!this.frame || this.frame.width !== w || this.frame.height !== h) {
      this.frame?.destroy();
      this.frame = new PixelFrame(this.scene, w, h, { rim: 'bronze', thick: 2, fill: FILL, studs: true });
      this.root.addAt(this.frame.img, 0);
    }
    this.frame.setPosition(x, y);
    const left = x + STRIP.pad;
    const top = y + STRIP.pad;
    this.name.setPosition(left, top);
    this.title.setPosition(left + this.name.width + 4, top);
    // The title gives way on a narrow strip rather than run under the buttons.
    this.title.img.setVisible(this.name.width + 4 + this.title.width <= textWidth(w));
    this.text.setPosition(left, top + this.name.height + STRIP.gap);
    const { button } = STRIP;
    let bx = x + w - STRIP.pad - buttonsW();
    const by = y + Math.floor((h - button.h) / 2);
    for (const b of this.buttons) {
      b.setPosition(bx, by);
      bx += b.width + button.gap;
    }
    this.track.setPosition(left, y + h - STRIP.pad - STRIP.bar).setSize(w - STRIP.pad * 2, STRIP.bar);
    this.fill.setPosition(left, this.track.y);
  }

  /** Shows a subtitle; the strip grows for a third line, should one wrap so. */
  setSubtitle(text: string): void {
    const before = this.text.height;
    this.text.setText(text);
    if (this.text.height !== before) this.layout(this.room);
  }

  /** How far through the line, 0 to 1. */
  setProgress(k: number): void {
    const full = Math.max(1, this.box.w - STRIP.pad * 2);
    this.fill.setSize(Math.max(1, Math.round(full * Phaser.Math.Clamp(k, 0, 1))), STRIP.bar);
  }

  setPaused(paused: boolean): void {
    this.pauseIcon.setTexture(this.icons[paused ? 'play' : 'pause']);
  }

  setVisible(on: boolean): void {
    this.root.setVisible(on);
  }

  destroy(): void {
    for (const o of this.owned) o.destroy();
    this.frame?.destroy();
    this.root.destroy();
    for (const key of Object.values(this.icons)) if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
  }
}
