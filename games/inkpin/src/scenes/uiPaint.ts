import Phaser from 'phaser';
import { makeCanvas, shrink } from '../art/pen';
import { CARD_PAD, paintPaper, type PaperStyle } from '../art/uiArt';
import { paintBlot, paintBlotSlot, paintIcon, paintPlate, paintPlateShadow, paintStickBase, paintStickRest, PLATE_PAD, SHADOW_PAD, type IconKind, type PlateKind } from '../art/uiArtParts';
import type { SoundBoard } from '../audio/sfx';
import { STICK } from '../logic/stick';
import { hudTake } from './controls';
import { DPR } from './hidpi';

/**
 * The painted interface in Phaser (as InkSnake's): textures baked from
 * art/uiArt*, and the pieces made of them: paper cards, painted buttons,
 * round icon buttons. Units are the HUD's, CSS px.
 */

/** Texture px per unit for interface paintings: the most the interface is drawn at. */
export const UI_RES = 2;
export const HAND = 'Caveat';
/** A round button's diameter. */
export const ROUND = 48;
export const BLOT_R = 20;
/** A press that moves further than this (CSS px) before it lifts is a drag, not a click. */
const CLICK_SLOP = 14;
/** The smallest a button's hit area gets, CSS px: a fingertip. */
const MIN_TOUCH = 44;

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

function freeTexture(scene: Phaser.Scene, key: string): void {
  if (!scene.textures.exists(key)) return;
  const source = scene.textures.get(key).getSourceImage();
  scene.textures.remove(key);
  if (source instanceof HTMLCanvasElement) shrink(source);
}

export const UI_TEX = {
  icon: (kind: IconKind) => `ui-icon-${kind}`,
  blot: (i: number) => `ui-blot-${i}`,
  blotSlot: 'ui-blot-slot',
  stickRest: 'ui-stick-rest',
  stickBase: 'ui-stick-base',
} as const;
/** An icon's canvas, units. */
const ICON = 34;

/** Bakes the interface's fixed parts (a few ms; the cards bake when they're wanted). */
export function bakeUi(scene: Phaser.Scene): void {
  const icons: IconKind[] = ['restart', 'map', 'zoomIn', 'zoomOut', 'jump', 'close'];
  icons.forEach((kind, i) => uiTexture(scene, UI_TEX.icon(kind), ICON, ICON, (ctx) => {
    ctx.translate(ICON / 2, ICON / 2);
    paintIcon(ctx, kind, 80 + i);
  }));
  [0, 1, 2].forEach((i) => uiTexture(scene, UI_TEX.blot(i), BLOT_R * 3.2, BLOT_R * 3.2, (ctx) => paintBlot(ctx, BLOT_R, 50 + i * 7)));
  uiTexture(scene, UI_TEX.blotSlot, BLOT_R * 3.2, BLOT_R * 3.2, (ctx) => paintBlotSlot(ctx, BLOT_R, 71));
  const r = STICK.radius;
  uiTexture(scene, UI_TEX.stickRest, r * 2 + 16, r * 2 + 16, (ctx) => paintStickRest(ctx, r, 91));
  uiTexture(scene, UI_TEX.stickBase, r * 2 + 28, r * 2 + 28, (ctx) => paintStickBase(ctx, r + 6, 93, UI_RES));
}

/** A button plate's texture and its shadow's, w × h. */
function plate(scene: Phaser.Scene, kind: PlateKind, w: number, h: number, round = false): { plate: string; shadow: string } {
  const id = `${kind}-${w}x${h}${round ? '-o' : ''}`;
  return {
    plate: uiTexture(scene, `ui-plate-${id}`, w + PLATE_PAD * 2, h + PLATE_PAD * 2, (ctx) => paintPlate(ctx, w, h, w * 7 + h, kind, round)),
    shadow: uiTexture(scene, `ui-shadow-${w}x${h}${round ? '-o' : ''}`, w + SHADOW_PAD * 2, h + SHADOW_PAD * 2, (ctx) => paintPlateShadow(ctx, w, h, UI_RES, round)),
  };
}

const cardKey = (w: number, h: number, seed: number): string => `ui-card-${Math.round(w)}x${Math.round(h)}-${seed}`;

/** A painted paper card w × h centred on (x, y). Let it go with freePaper once no card that size and seed is shown. */
export function paperCard(scene: Phaser.Scene, x: number, y: number, w: number, h: number, seed: number, style: PaperStyle = {}): Phaser.GameObjects.Image {
  const key = uiTexture(scene, cardKey(w, h, seed), w + CARD_PAD * 2, h + CARD_PAD * 2, (ctx) => paintPaper(ctx, w, h, seed, UI_RES, style));
  return scene.add.image(x, y, key).setScale(1 / UI_RES);
}

export function freePaper(scene: Phaser.Scene, w: number, h: number, seed: number): void {
  freeTexture(scene, cardKey(w, h, seed));
}

/** Ink and outline for a label on each kind of plate. */
const LABEL: Readonly<Record<PlateKind, { color: string; stroke: string }>> = {
  paper: { color: '#26316a', stroke: '' },
  leaf: { color: '#fffbef', stroke: '#2f5426' },
  gold: { color: '#4a2c0c', stroke: '#fff3c4' },
  clay: { color: '#fffbef', stroke: '#6e2a1d' },
};

export interface PaintedButtonOpts {
  readonly width?: number;
  readonly height?: number;
  readonly size?: number;
  readonly kind?: PlateKind;
}

export interface PaintedButton {
  readonly root: Phaser.GameObjects.Container;
  readonly label: Phaser.GameObjects.Text;
}

/**
 * A painted button: a wash-filled plate with a pen contour over its soft
 * shadow, and a hand-lettered label. It lifts under the mouse and presses
 * into its shadow while held, and fires for a press that started on it and
 * didn't drag.
 */
export function paintedButton(scene: Phaser.Scene, x: number, y: number, text: string, onClick: () => void, opts: PaintedButtonOpts = {}): PaintedButton {
  const w = opts.width ?? 200;
  const h = opts.height ?? 50;
  const kind = opts.kind ?? 'paper';
  const tex = plate(scene, kind, w, h);
  const shadow = scene.add.image(0, 3, tex.shadow).setScale(1 / UI_RES).setAlpha(0.8);
  const face = scene.add.image(0, 0, tex.plate).setScale(1 / UI_RES);
  const style = LABEL[kind];
  const size = opts.size ?? 28;
  const label = scene.add.text(0, -1, text, {
    fontFamily: HAND, fontSize: `${size}px`, fontStyle: '700', color: style.color, padding: { x: size * 0.2, y: 4 },
    ...(style.stroke ? { stroke: style.stroke, strokeThickness: 3.5 } : {}),
  }).setOrigin(0.5).setResolution(DPR);
  const root = scene.add.container(x, y, [shadow, face, label]);
  wire(scene, root, Math.max(w + 6, MIN_TOUCH), Math.max(h + 6, MIN_TOUCH), (state) => {
    const dy = state === 'down' ? 2.5 : state === 'over' ? -1 : 0;
    face.setY(dy);
    label.setY(dy - 1);
    shadow.setAlpha(state === 'down' ? 0.45 : state === 'over' ? 0.95 : 0.8).setY(state === 'over' ? 4 : 3);
  }, onClick);
  return { root, label };
}

/**
 * A round paper button with a painted icon, `d` across. `onPress` buttons
 * (jump) fire as the finger lands, so they answer as fast as a key.
 */
export function roundButton(scene: Phaser.Scene, x: number, y: number, icon: IconKind, onClick: () => void, d = ROUND, onPress = false): Phaser.GameObjects.Container {
  const tex = plate(scene, 'paper', d, d, true);
  const shadow = scene.add.image(0, 3, tex.shadow).setScale(1 / UI_RES).setAlpha(0.8);
  const face = scene.add.image(0, 0, tex.plate).setScale(1 / UI_RES);
  const glyph = scene.add.image(0, 0, UI_TEX.icon(icon)).setScale((d / ROUND) * (1.25 / UI_RES));
  const root = scene.add.container(x, y, [shadow, face, glyph]);
  const hit = Math.max(d + 8, MIN_TOUCH);
  wire(scene, root, hit, hit, (state) => {
    const dy = state === 'down' ? 2.5 : state === 'over' ? -1 : 0;
    face.setY(dy);
    glyph.setY(dy).setAngle(state === 'over' ? -6 : 0);
    shadow.setAlpha(state === 'down' ? 0.45 : 0.8);
  }, onClick, onPress);
  return root;
}

/** A round paper plate over its shadow, `d` across, that does nothing when pressed: the thumbstick's knob. */
export function roundButtonFace(scene: Phaser.Scene, d: number): Phaser.GameObjects.Container {
  const tex = plate(scene, 'paper', d, d, true);
  const shadow = scene.add.image(0, 4, tex.shadow).setScale(1 / UI_RES).setAlpha(0.9);
  const face = scene.add.image(0, 0, tex.plate).setScale(1 / UI_RES);
  return scene.add.container(0, 0, [shadow, face]);
}

type PressState = 'up' | 'over' | 'down';

/** Hover, press and a click that ignores drags, on a container with a w × h hit area. */
function wire(scene: Phaser.Scene, c: Phaser.GameObjects.Container, w: number, h: number, show: (s: PressState) => void, onClick: () => void, onPress = false): void {
  c.setSize(w, h).setInteractive({ useHandCursor: true });
  const sfx = (): SoundBoard => scene.registry.get('sfx') as SoundBoard;
  let pressedAt: { x: number; y: number } | null = null;
  c.on('pointerover', () => show('over'));
  c.on('pointerout', () => {
    show('up');
    pressedAt = null;
  });
  c.on('pointerdown', (p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
    // The board under the interface hears this press too: it isn't a tap on the board.
    ev.stopPropagation();
    hudTake(p);
    sfx().unlock();
    show('down');
    if (onPress) {
      sfx().play('tap');
      onClick();
      return;
    }
    pressedAt = { x: p.x / DPR, y: p.y / DPR };
  });
  c.on('pointerup', (p: Phaser.Input.Pointer) => {
    const start = pressedAt;
    pressedAt = null;
    show(p.wasTouch ? 'up' : 'over');
    if (!start || Math.hypot(start.x - p.x / DPR, start.y - p.y / DPR) > CLICK_SLOP) return;
    sfx().play('tap');
    onClick();
  });
}
