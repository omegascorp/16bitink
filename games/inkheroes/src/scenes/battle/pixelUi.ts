import Phaser from 'phaser';
import { ICONS, SPELL_ICONS, STAT_ICONS, type IconName, type StatName } from '../../art/pixel/ui';
import type { SpellId } from '../../logic/spells';
import { drawFrame, FILLS, type FrameLook, type RimName } from './pixelFrames';
import type { PixelBuffer, Rgba } from './pixelRaster';
import { renderPixelText, wrapLines, type PixelTextStyle } from './pixelFont';
import type { Pixels } from './pixelScenery';

/**
 * The battle UI's pieces as Phaser objects. Frames, buttons and portraits
 * are pixel art, each drawn once into its own NEAREST texture at UI pixel
 * size (the UI camera's whole zoom keeps them on the art's grid) and placed
 * on whole pixels; textures belong to the piece and go when it does. Text is
 * a real pixel font drawn the same way (see pixelFont), so it can carry
 * other alphabets for translations.
 */

export const UI_TEX = {
  icon: (i: IconName) => `pxui-icon-${i}`,
  stat: (s: StatName) => `pxui-stat-${s}`,
  spell: (s: SpellId) => `pxui-spell-${s}`,
} as const;

/** Text colours: the body's warm cream, the titles' gold, and the shared dark outline. */
export const INK = {
  text: [243, 230, 196, 255],
  title: [248, 210, 110, 255],
  dim: [190, 174, 146, 255],
  outline: [20, 13, 8, 255],
  shadow: [20, 13, 8, 140],
  damage: [255, 112, 88, 255],
  retaliation: [236, 160, 96, 255],
  spell: [168, 198, 255, 255],
  good: [186, 226, 140, 255],
} as const satisfies Record<string, Rgba>;

/** Queues the icons (call with the battle's other art). */
export function loadUiArt(scene: Phaser.Scene): string[] {
  const all: [string, string][] = [
    ...(Object.entries(ICONS) as [IconName, string][]).map(([n, url]): [string, string] => [UI_TEX.icon(n), url]),
    ...(Object.entries(STAT_ICONS) as [StatName, string][]).map(([n, url]): [string, string] => [UI_TEX.stat(n), url]),
    ...(Object.entries(SPELL_ICONS) as [SpellId, string][]).map(([n, url]): [string, string] => [UI_TEX.spell(n), url]),
  ];
  for (const [key, url] of all) if (!scene.textures.exists(key)) scene.load.image(key, url);
  return all.map(([key]) => key);
}

let serial = 0;

/** A fresh texture holding `b`, filtered NEAREST; its key. */
export function putBuffer(scene: Phaser.Scene, b: PixelBuffer | Pixels, key = `pxui-${serial++}`): string {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, b.w, b.h)!;
  tex.context.putImageData(new ImageData(new Uint8ClampedArray(b.data), b.w, b.h), 0, 0);
  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  return key;
}

/** A loaded texture's pixels. */
export function texturePixels(scene: Phaser.Scene, key: string, crop?: { x: number; y: number; w: number; h: number }): Pixels {
  const img = scene.textures.get(key).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
  const r = crop ?? { x: 0, y: 0, w: img.width, h: img.height };
  const c = document.createElement('canvas');
  c.width = r.w;
  c.height = r.h;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(img, -r.x, -r.y);
  return { data: ctx.getImageData(0, 0, r.w, r.h).data, w: r.w, h: r.h };
}

/** Where an object's anchor point goes: 0 left/top, 0.5 centre, 1 right/bottom. */
export interface Anchor {
  readonly x: number;
  readonly y: number;
}

/** An image of a texture this piece owns, kept on whole pixels about its anchor. */
class Owned {
  readonly img: Phaser.GameObjects.Image;
  private key: string | null = null;
  private at = { x: 0, y: 0 };

  constructor(protected readonly scene: Phaser.Scene, private anchor: Anchor = { x: 0, y: 0 }) {
    this.img = scene.add.image(0, 0, '__DEFAULT').setOrigin(0);
  }

  protected show(b: PixelBuffer): void {
    const old = this.key;
    this.key = putBuffer(this.scene, b);
    this.img.setTexture(this.key);
    if (old) this.scene.textures.remove(old);
    this.place();
  }

  get width(): number {
    return this.img.width;
  }

  get height(): number {
    return this.img.height;
  }

  setPosition(x: number, y: number, anchor?: Anchor): this {
    this.at = { x, y };
    if (anchor) this.anchor = anchor;
    this.place();
    return this;
  }

  private place(): void {
    this.img.setPosition(Math.round(this.at.x - Math.floor(this.img.width * this.anchor.x)), Math.round(this.at.y - Math.floor(this.img.height * this.anchor.y)));
  }

  destroy(): void {
    this.img.destroy();
    if (this.key && this.scene.textures.exists(this.key)) this.scene.textures.remove(this.key);
    this.key = null;
  }
}

/** Body text, or a title (gold, outlined, shadowed). */
export type TextKind = 'body' | 'title';

export interface LabelOpts {
  readonly kind?: TextKind;
  readonly ink?: Rgba;
  /** A dark edge round the letters (text over the field, not on a panel). */
  readonly outline?: boolean;
  /** Wrap to this many UI pixels. */
  readonly wrap?: number;
  readonly align?: 'left' | 'center' | 'right';
  readonly anchor?: Anchor;
}

/** A line or a paragraph in the pixel font (see pixelFont), redrawn only when it changes. */
export class TextLabel extends Owned {
  private shown: string | null = null;
  private wrapW: number | undefined;

  constructor(scene: Phaser.Scene, private readonly opts: LabelOpts = {}) {
    super(scene, opts.anchor);
    this.wrapW = opts.wrap;
  }

  get text(): string {
    return this.shown ?? '';
  }

  setText(text: string): this {
    if (text === this.shown) return this;
    this.shown = text;
    const title = this.opts.kind === 'title';
    const style: PixelTextStyle = {
      ink: this.opts.ink ?? (title ? INK.title : INK.text),
      outline: this.opts.outline || title ? INK.outline : undefined,
      shadow: title ? INK.shadow : undefined,
    };
    this.show(renderPixelText({ lines: wrapLines(text, this.wrapW), align: this.opts.align ?? 'center' }, style));
    return this;
  }

  /** Wraps to `w` UI pixels from now on. */
  setWrap(w: number | undefined): this {
    if (w === this.wrapW) return this;
    this.wrapW = w;
    const t = this.shown;
    this.shown = null;
    return t === null ? this : this.setText(t);
  }
}

/** A frame (see pixelFrames) of a given size and look. */
export class PixelFrame extends Owned {
  constructor(scene: Phaser.Scene, w: number, h: number, look: FrameLook, anchor?: Anchor) {
    super(scene, anchor);
    this.show(drawFrame(w, h, look));
  }
}

/** An image from a buffer drawn in code (a portrait, a rule). */
export class PixelImage extends Owned {
  constructor(scene: Phaser.Scene, b: PixelBuffer | Pixels, anchor?: Anchor) {
    super(scene, anchor);
    this.show(b as PixelBuffer);
  }
}

export interface ButtonOpts {
  readonly w: number;
  readonly h: number;
  readonly label: string;
  /** A second, dimmer line under the label. */
  readonly note?: string;
  readonly icon?: IconName;
  /** The icon over the label (the action buttons) instead of beside it. */
  readonly stacked?: boolean;
  readonly rim?: RimName;
  readonly onClick: () => void;
}

type ButtonState = 'idle' | 'hover' | 'down' | 'off';
const FILL_OF: Record<ButtonState, Rgba> = { idle: FILLS.button, hover: FILLS.hover, down: FILLS.pressed, off: FILLS.pressed };

/**
 * A framed button: an icon and a label (and an optional note line), lit on
 * hover, pressed a pixel down while held, dimmed when off.
 */
export class PixelButton {
  readonly root: Phaser.GameObjects.Container;
  private readonly keys: Record<ButtonState, string>;
  private readonly frame: Phaser.GameObjects.Image;
  private readonly face: Phaser.GameObjects.Container;
  private readonly label: TextLabel;
  private readonly note: TextLabel | null;
  private state: ButtonState = 'idle';
  private enabled = true;

  constructor(private readonly scene: Phaser.Scene, private readonly opts: ButtonOpts) {
    const { w, h } = opts;
    const look = (s: ButtonState): FrameLook => ({ rim: s === 'off' ? 'dim' : s === 'hover' ? 'gold' : opts.rim ?? 'bronze', fill: FILL_OF[s], sheen: s !== 'down' && s !== 'off' });
    this.keys = { idle: putBuffer(scene, drawFrame(w, h, look('idle'))), hover: putBuffer(scene, drawFrame(w, h, look('hover'))), down: putBuffer(scene, drawFrame(w, h, look('down'))), off: putBuffer(scene, drawFrame(w, h, look('off'))) };
    this.frame = scene.add.image(0, 0, this.keys.idle).setOrigin(0);
    this.label = new TextLabel(scene, { anchor: { x: 0, y: 0.5 }, align: 'left' }).setText(opts.label);
    this.note = opts.note ? new TextLabel(scene, { anchor: { x: 0, y: 0.5 }, align: 'left', ink: INK.dim, wrap: w - 12 }).setText(opts.note) : null;
    const parts: Phaser.GameObjects.GameObject[] = [];
    const icon = opts.icon ? scene.add.image(0, 0, UI_TEX.icon(opts.icon)).setOrigin(0) : null;
    if (icon && opts.stacked) {
      // The icon centred in the upper part, the label centred under it.
      const top = Math.floor((h - icon.height - this.label.height) / 2);
      icon.setPosition(Math.floor((w - icon.width) / 2), top);
      this.label.setPosition(Math.floor(w / 2), top + icon.height + Math.floor(this.label.height / 2), { x: 0.5, y: 0.5 });
      parts.push(icon, this.label.img);
    } else this.layoutRow(icon, parts);
    this.face = scene.add.container(0, 0, parts);
    this.root = scene.add.container(0, 0, [this.frame, this.face]);
    this.frame.setInteractive({ useHandCursor: false });
    this.frame.on('pointerover', () => this.set('hover'));
    this.frame.on('pointerout', () => this.set('idle'));
    this.frame.on('pointerdown', () => this.set('down'));
    this.frame.on('pointerup', () => {
      if (this.state !== 'down') return;
      this.set('hover');
      opts.onClick();
    });
  }

  /** Icon then label, centred together (a note line goes under the label, both left-aligned beside the icon). */
  private layoutRow(icon: Phaser.GameObjects.Image | null, parts: Phaser.GameObjects.GameObject[]): void {
    const { w, h } = this.opts;
    const textW = Math.max(this.label.width, this.note?.width ?? 0);
    const iconW = icon ? icon.width + 3 : 0;
    const left = Math.floor((w - iconW - textW) / 2);
    const mid = Math.floor(h / 2);
    if (icon) {
      icon.setPosition(left, mid - Math.floor(icon.height / 2));
      parts.push(icon);
    }
    if (this.note) {
      this.label.setPosition(left + iconW, mid - Math.ceil(this.label.height / 2) + 1);
      this.note.setPosition(left + iconW, mid + Math.floor(this.note.height / 2));
      parts.push(this.label.img, this.note.img);
    } else {
      this.label.setPosition(left + iconW, mid);
      parts.push(this.label.img);
    }
  }

  get width(): number {
    return this.opts.w;
  }

  get height(): number {
    return this.opts.h;
  }

  /** Top-left on a whole UI pixel. */
  setPosition(x: number, y: number): this {
    this.root.setPosition(Math.round(x), Math.round(y));
    return this;
  }

  setLabel(text: string): void {
    this.label.setText(text);
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    this.set(on ? 'idle' : 'off');
  }

  setVisible(on: boolean): void {
    this.root.setVisible(on);
  }

  private set(s: ButtonState): void {
    if (!this.enabled && s !== 'off') return;
    this.state = s;
    this.frame.setTexture(this.keys[s]);
    this.face.setPosition(0, s === 'down' ? 1 : 0).setAlpha(s === 'off' ? 0.55 : 1);
  }

  destroy(): void {
    this.label.destroy();
    this.note?.destroy();
    this.root.destroy();
    for (const k of Object.values(this.keys)) if (this.scene.textures.exists(k)) this.scene.textures.remove(k);
  }
}
