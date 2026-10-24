import type { SliceJob } from '@16bitink/game-sdk';
import type Phaser from 'phaser';
import { BOOK, DISPLAY, UI } from '../art/palette';
import { CARD_PAD, paintPanel, type PanelStyle } from '../art/uiArt';
import { paintIcon, paintMedal, paintMedalSlot, paintPlate, paintPlateShadow, PLATE_PAD, SHADOW_PAD, type IconKind, type PlateKind } from '../art/uiArtParts';
import { freeTexture } from '../art/textures';
import { makeCanvas } from '../art/pen';
import { getSound } from '../host';
import { toView, uiScaleOf } from './hidpi';
import { hitSize } from './uiLayout';

/**
 * The painted interface in Phaser: textures baked from art/uiArt*, lazily
 * per size (a few at boot, see uiTextureJobs), and the pieces made of
 * them: leather panels in gilt frames, bevelled buttons, medals, and the
 * two lettering styles (carved capitals for titles, a book face for text).
 */

/** Texture px per unit for interface paintings: the most the interface is drawn at. */
export const UI_RES = 2;
/** A round button's diameter, units. */
export const ROUND = 54;
export const MEDAL_R = 24;
/** An icon's canvas, units. */
const ICON = 38;
/** What sets lettering off the leather or the painting under it. */
const LETTER_STROKE = '#140b07';

/** Bakes `paint` on a w × h-unit canvas under `key`, once. */
export function uiTexture(scene: Phaser.Scene, key: string, w: number, h: number, paint: (ctx: CanvasRenderingContext2D) => void): string {
  if (scene.textures.exists(key)) return key;
  const { canvas, ctx } = makeCanvas(Math.ceil(w * UI_RES), Math.ceil(h * UI_RES));
  ctx.scale(UI_RES, UI_RES);
  paint(ctx);
  // A plain image texture: addCanvas would read every pixel back and keep a second copy.
  scene.textures.addImage(key, canvas as unknown as HTMLImageElement);
  return key;
}

export const UI_TEX = {
  medal: 'ui-medal',
  medalSlot: 'ui-medal-slot',
  icon: (kind: IconKind) => `ui-icon-${kind}`,
} as const;

/** The fixed-size parts, as boot jobs (the rest bake the first time they're wanted). */
export function uiTextureJobs(scene: Phaser.Scene): SliceJob[] {
  const icons: IconKind[] = ['pause', 'sound', 'muted', 'close', 'clock'];
  return [
    () => uiTexture(scene, UI_TEX.medal, MEDAL_R * 3.2, MEDAL_R * 3.2, (ctx) => paintMedal(ctx, MEDAL_R, 50)),
    () => uiTexture(scene, UI_TEX.medalSlot, MEDAL_R * 3.2, MEDAL_R * 3.2, (ctx) => paintMedalSlot(ctx, MEDAL_R, 71)),
    ...icons.map((kind, i) => () => uiTexture(scene, UI_TEX.icon(kind), ICON, ICON, (ctx) => { ctx.translate(ICON / 2, ICON / 2); paintIcon(ctx, kind, 80 + i); })),
    () => plate(scene, 'plain', ROUND, ROUND, true),
    () => plate(scene, 'primary', 240, 60),
    () => plate(scene, 'plain', 160, 50),
  ];
}

/** A button plate's texture and its shadow's, w × h. */
function plate(scene: Phaser.Scene, kind: PlateKind, w: number, h: number, round = false): { plate: string; shadow: string } {
  const id = `${kind}-${w}x${h}${round ? '-o' : ''}`;
  return {
    plate: uiTexture(scene, `ui-plate-${id}`, w + PLATE_PAD * 2, h + PLATE_PAD * 2, (ctx) => paintPlate(ctx, w, h, w * 7 + h, kind, round)),
    shadow: uiTexture(scene, `ui-shadow-${w}x${h}${round ? '-o' : ''}`, w + SHADOW_PAD * 2, h + SHADOW_PAD * 2, (ctx) => paintPlateShadow(ctx, w, h, UI_RES, round)),
  };
}

export interface LetterOpts {
  /** Gilt (default) or parchment. */
  readonly color?: string;
  readonly align?: 'left' | 'center' | 'right';
  readonly wrap?: number;
}

/** A title in carved gilt capitals, `size` px, set off by a dark edge and shadow. */
export function title(scene: Phaser.Scene, x: number, y: number, text: string, size: number, o: LetterOpts = {}): Phaser.GameObjects.Text {
  const t = scene.add.text(x, y, text, {
    fontFamily: DISPLAY, fontStyle: '700', fontSize: `${size}px`, color: o.color ?? UI.title, align: o.align ?? 'left',
    stroke: LETTER_STROKE, strokeThickness: Math.max(2, size * 0.12), padding: { x: 4, y: 3 },
    ...(o.wrap ? { wordWrap: { width: o.wrap } } : {}),
  });
  t.setShadow(0, Math.max(1, size * 0.06), 'rgba(0,0,0,0.6)', size * 0.12, true, true);
  return t;
}

/** Body text in the book face on leather, `size` px. */
export function body(scene: Phaser.Scene, x: number, y: number, text: string, size: number, o: LetterOpts = {}): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, {
    fontFamily: BOOK, fontSize: `${size}px`, color: o.color ?? UI.text, align: o.align ?? 'left', lineSpacing: size * 0.18,
    ...(o.wrap ? { wordWrap: { width: o.wrap } } : {}),
  });
}

/** A troop count badge: light figures on a dark gilt-edged tab. */
export function countBadge(scene: Phaser.Scene, x: number, y: number, text: string, size = 14): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, { fontFamily: BOOK, fontStyle: '600', fontSize: `${size}px`, color: UI.giltLight, backgroundColor: UI.well, padding: { x: 4, y: 0 } });
}

/** The key of a panel w × h; bake it with panelCard. */
const panelKey = (w: number, h: number, seed: number, style: PanelStyle): string => `ui-panel-${Math.round(w)}x${Math.round(h)}-${seed}-${style.tint ?? 'oxblood'}-${style.frame ?? 'gilt'}`;

/** A leather panel w × h centred on (x, y). Free it with freePanel when its scene is done with it. */
export function panelCard(scene: Phaser.Scene, x: number, y: number, w: number, h: number, seed: number, style: PanelStyle = {}): Phaser.GameObjects.Image {
  const key = uiTexture(scene, panelKey(w, h, seed, style), w + CARD_PAD * 2, h + CARD_PAD * 2, (ctx) => paintPanel(ctx, w, h, seed, UI_RES, style));
  return scene.add.image(x, y, key).setScale(1 / UI_RES);
}

/** Lets a panel's painting go (panels are the biggest interface textures). */
export function freePanel(scene: Phaser.Scene, w: number, h: number, seed: number, style: PanelStyle = {}): void {
  freeTexture(scene, panelKey(w, h, seed, style));
}

export interface PaintedButtonOpts {
  readonly width?: number;
  readonly height?: number;
  /** The label's size, px. */
  readonly size?: number;
  readonly kind?: PlateKind;
}

const LABEL: Readonly<Record<PlateKind, string>> = { primary: UI.giltLight, plain: UI.text, crown: UI.giltLight };

/**
 * A painted button: a gilt-rimmed plate over its soft shadow, lettered in
 * carved capitals. It lifts under the pointer and presses into its shadow
 * while held. It fires only for a press that started on it and didn't
 * drag, so lifting a steering finger never triggers it. The label is the
 * container's second child (list[1]).
 */
export function paintedButton(scene: Phaser.Scene, x: number, y: number, label: string, onClick: () => void, opts: PaintedButtonOpts = {}): Phaser.GameObjects.Container {
  const w = opts.width ?? 200;
  const h = opts.height ?? 52;
  const kind = opts.kind ?? 'plain';
  const tex = plate(scene, kind, w, h);
  const shadow = scene.add.image(0, 3, tex.shadow).setScale(1 / UI_RES).setAlpha(0.8);
  const face = scene.add.image(0, 0, tex.plate).setScale(1 / UI_RES);
  const base = scene.add.container(0, 0, [shadow, face]);
  const size = opts.size ?? 20;
  const text = scene.add.text(0, 0, label, {
    fontFamily: DISPLAY, fontStyle: '700', fontSize: `${size}px`, color: LABEL[kind], align: 'center',
    stroke: LETTER_STROKE, strokeThickness: Math.max(2, size * 0.14), padding: { x: size * 0.2, y: 3 },
  }).setOrigin(0.5);
  text.setShadow(0, 1.5, 'rgba(0,0,0,0.55)', 2, true, true);
  const c = scene.add.container(x, y, [base, text]);
  wire(scene, c, Math.max(w + 10, hitSize(w, uiScaleOf(scene))), hitSize(h, uiScaleOf(scene)), (state) => {
    const dy = state === 'down' ? 2 : state === 'over' ? -1 : 0;
    face.setY(dy).setTint(state === 'over' ? 0xfff0d0 : 0xffffff);
    text.setY(dy);
    shadow.setAlpha(state === 'down' ? 0.45 : state === 'over' ? 0.95 : 0.8).setY(state === 'over' ? 4 : 3);
  }, onClick);
  return c;
}

export interface RoundButton {
  readonly root: Phaser.GameObjects.Container;
  setIcon(kind: IconKind): void;
}

/** A round gilt-rimmed button with a gilt icon, `d` across. */
export function roundButton(scene: Phaser.Scene, x: number, y: number, icon: IconKind, onClick: () => void, d = ROUND): RoundButton {
  const tex = plate(scene, 'plain', d, d, true);
  const shadow = scene.add.image(0, 3, tex.shadow).setScale(1 / UI_RES).setAlpha(0.8);
  const face = scene.add.image(0, 0, tex.plate).setScale(1 / UI_RES);
  const glyph = scene.add.image(0, 0, UI_TEX.icon(icon)).setScale((d / ROUND) / UI_RES);
  const root = scene.add.container(x, y, [shadow, face, glyph]);
  const hit = hitSize(d, uiScaleOf(scene));
  wire(scene, root, hit, hit, (state) => {
    const dy = state === 'down' ? 2 : state === 'over' ? -1 : 0;
    face.setY(dy);
    glyph.setY(dy).setScale(((d / ROUND) / UI_RES) * (state === 'over' ? 1.08 : 1));
    shadow.setAlpha(state === 'down' ? 0.45 : 0.8);
  }, onClick);
  return { root, setIcon: (kind) => glyph.setTexture(UI_TEX.icon(kind)) };
}

type PressState = 'up' | 'over' | 'down';

/** Hover, press and a click that ignores drags, on a container with a w × h hit area. */
function wire(scene: Phaser.Scene, c: Phaser.GameObjects.Container, w: number, h: number, show: (s: PressState) => void, onClick: () => void): void {
  c.setSize(w, h).setInteractive({ useHandCursor: true });
  let pressedAt: { x: number; y: number } | null = null;
  c.on('pointerover', () => show('over'));
  c.on('pointerout', () => {
    show('up');
    pressedAt = null;
  });
  c.on('pointerdown', (p: Phaser.Input.Pointer) => {
    pressedAt = toView(p.x, p.y);
    show('down');
  });
  c.on('pointerup', (p: Phaser.Input.Pointer) => {
    const start = pressedAt;
    pressedAt = null;
    show(p.wasTouch ? 'up' : 'over');
    const end = toView(p.x, p.y);
    if (!start || Math.hypot(start.x - end.x, start.y - end.y) > 12) return;
    getSound(scene)?.play('click');
    onClick();
  });
}
