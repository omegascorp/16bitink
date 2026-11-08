import type Phaser from 'phaser';
import { drawRule, drawSocket } from '../battle/pixelFrames';
import { PixelButton, PixelFrame, PixelImage, putBuffer, TextLabel } from '../battle/pixelUi';
import { ROOM } from './guildLayout';

const CLOSE = { w: 50, h: 18 } as const;
const PLATE = [34, 24, 17, 226] as const;
const FILL = [34, 24, 17, 255] as const;
const ROOM_SHADE = 0.28;
/** The room a window keeps from the edges of what it opens over. */
const MARGIN = 8;

/** The room a window may take of `area`. */
export const roomIn = (area: { w: number; h: number }): { w: number; h: number } => ({ w: area.w - MARGIN, h: area.h - MARGIN });

/**
 * A town building as a room, after Heroes III's: a window over the town with
 * its interior painted behind everything (a room with no painting yet is
 * the bare window). Tapping outside closes it.
 */
export abstract class TownRoom {
  protected readonly root: Phaser.GameObjects.Container;
  protected readonly owned: { destroy(): void }[] = [];
  private readonly keys: string[] = [];

  protected constructor(protected readonly scene: Phaser.Scene, area: { w: number; h: number }, size: { w: number; h: number }, look: { title: string; art?: string }, private readonly close: () => void, depth: number) {
    const x = Math.floor((area.w - size.w) / 2);
    const y = Math.max(4, Math.floor((area.h - size.h) / 2));
    const shade = scene.add.rectangle(0, 0, area.w, area.h, 0x0a0604, 0.5).setOrigin(0).setDepth(depth).setInteractive();
    shade.on('pointerup', () => close());
    this.owned.push(shade);
    this.root = scene.add.container(x, y).setDepth(depth + 1);
    this.drawRoom(size, look);
  }

  /** The window, the room behind everything (as much of it as fits, its middle first), and the title. */
  private drawRoom(l: { w: number; h: number }, look: { title: string; art?: string }): void {
    const { scene } = this;
    const panel = new PixelFrame(scene, l.w, l.h, { rim: 'bronze', thick: 2, fill: FILL, studs: true });
    panel.img.setInteractive();
    this.root.add(panel.img);
    if (look.art) {
      const inner = { w: l.w - 4, h: Math.min(l.h - 4, ROOM.h) };
      const crop = { x: Math.floor((ROOM.w - inner.w) / 2), y: Math.floor((ROOM.h - inner.h) / 2) };
      const art = scene.add.image(2 - crop.x, 2 - crop.y, look.art).setOrigin(0).setCrop(crop.x, crop.y, inner.w, inner.h);
      const dim = scene.add.rectangle(2, 2, inner.w, inner.h, 0x0a0604, ROOM_SHADE).setOrigin(0);
      this.root.add([art, dim]);
    }
    this.owned.push(panel);
    const title = this.label(look.title, Math.floor(l.w / 2), 7, { kind: 'title', outline: true, anchor: { x: 0.5, y: 0 } });
    const rule = new PixelImage(scene, drawRule(title.width + 40), { x: 0.5, y: 0 }).setPosition(Math.floor(l.w / 2), 8 + title.height);
    this.root.add(rule.img);
    this.owned.push(rule);
    const close = new PixelButton(scene, { w: CLOSE.w, h: CLOSE.h, label: 'Close', onClick: () => this.close() });
    close.setPosition(l.w - CLOSE.w - 6, 6);
    this.root.add(close.root);
    this.owned.push(close);
  }

  protected label(text: string, x: number, y: number, opts: ConstructorParameters<typeof TextLabel>[1]): TextLabel {
    const t = new TextLabel(this.scene, opts).setText(text).setPosition(x, y);
    this.root.add(t.img);
    this.owned.push(t);
    return t;
  }

  protected plate(x: number, y: number, w: number, h: number, rim: 'bronze' | 'gold' = 'bronze'): PixelFrame {
    const p = new PixelFrame(this.scene, w, h, { rim, fill: PLATE }).setPosition(x, y);
    this.root.add(p.img);
    this.owned.push(p);
    return p;
  }

  /** `texture` in a frame `size` across, shown at `scale` of its 64 pixels. */
  protected socket(x: number, y: number, size: number, rim: Parameters<typeof drawSocket>[1], texture: string, scale: number): Phaser.GameObjects.Image {
    const key = putBuffer(this.scene, drawSocket(size, rim));
    this.keys.push(key);
    const frame = this.scene.add.image(x, y, key).setOrigin(0);
    const icon = this.scene.add.image(x + Math.floor(size / 2), y + Math.floor(size / 2), texture).setScale(scale);
    this.root.add([frame, icon]);
    return frame;
  }

  destroy(): void {
    for (const o of this.owned) o.destroy();
    this.root.destroy();
    for (const k of this.keys) if (this.scene.textures.exists(k)) this.scene.textures.remove(k);
  }
}
