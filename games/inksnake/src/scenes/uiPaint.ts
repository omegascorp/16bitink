import type { SliceJob } from '@16bitink/game-sdk';
import Phaser from 'phaser';
import { CARD_PAD, paintPaper, type PaperStyle } from '../art/uiArt';
import { GROOVE_PAD, paintBlot, paintBlotSlot, paintGroove, paintIcon, paintPlate, paintPlateShadow, paintSocket, paintSpot, paintSprout, paintStamp, paintVine, PLATE_PAD, SHADOW_PAD, type IconKind, type PlateKind, type SpotTint } from '../art/uiArtParts';
import { freeTexture } from '../art/textures';
import { makeCanvas } from '../art/pen';
import { getSound } from '../host';
import { toView, uiScaleOf } from './hidpi';
import { hitSize } from './uiLayout';

/**
 * The painted interface in Phaser: textures baked from art/uiArt*, lazily
 * per size (a few at boot, see uiTextureJobs), and the pieces made of
 * them: paper cards, painted buttons, the bar's groove and vine.
 */

/** Texture px per unit for interface paintings: the most the interface is drawn at. */
export const UI_RES = 2;
export const HAND = '"Caveat", "Patrick Hand", "Comic Sans MS", cursive';
/** The bar: its groove's size, units. */
export const GROOVE = { w: 300, h: 22 } as const;
/** A round button's diameter, units. */
export const ROUND = 54;
export const BLOT_R = 24;
export const LIFE_R = 11;
/** An icon's canvas, units. */
const ICON = 38;

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
  groove: 'ui-groove',
  vine: 'ui-vine',
  sprout: 'ui-sprout',
  socket: 'ui-socket',
  blot: (i: number) => `ui-blot-${i}`,
  blotSlot: 'ui-blot-slot',
  icon: (kind: IconKind) => `ui-icon-${kind}`,
} as const;

/** The fixed-size parts, as boot jobs (the rest bake the first time they're wanted). */
export function uiTextureJobs(scene: Phaser.Scene): SliceJob[] {
  const icons: IconKind[] = ['pause', 'sound', 'muted', 'close', 'clock'];
  return [
    () => groove(scene),
    () => uiTexture(scene, UI_TEX.sprout, 28, 28, (ctx) => { ctx.translate(14, 14); paintSprout(ctx, 41); }),
    () => uiTexture(scene, UI_TEX.socket, LIFE_R * 2 + 6, LIFE_R * 2 + 6, (ctx) => paintSocket(ctx, LIFE_R, 43, UI_RES)),
    ...[0, 1, 2].map((i) => () => uiTexture(scene, UI_TEX.blot(i), BLOT_R * 3.2, BLOT_R * 3.2, (ctx) => paintBlot(ctx, BLOT_R, 50 + i * 7))),
    () => uiTexture(scene, UI_TEX.blotSlot, BLOT_R * 3.2, BLOT_R * 3.2, (ctx) => paintBlotSlot(ctx, BLOT_R, 71)),
    ...icons.map((kind, i) => () => uiTexture(scene, UI_TEX.icon(kind), ICON, ICON, (ctx) => { ctx.translate(ICON / 2, ICON / 2); paintIcon(ctx, kind, 80 + i); })),
    () => plate(scene, 'paper', ROUND, ROUND, true),
    () => plate(scene, 'leaf', 240, 60),
    () => plate(scene, 'paper', 160, 50),
  ];
}

function groove(scene: Phaser.Scene): void {
  const [w, h] = [GROOVE.w + GROOVE_PAD * 2, GROOVE.h + GROOVE_PAD * 2];
  uiTexture(scene, UI_TEX.groove, w, h, (ctx) => paintGroove(ctx, GROOVE.w, GROOVE.h, 31, UI_RES));
  uiTexture(scene, UI_TEX.vine, w, h, (ctx) => paintVine(ctx, GROOVE.w, GROOVE.h, 33));
}

/** A button plate's texture and its shadow's, w × h. */
function plate(scene: Phaser.Scene, kind: PlateKind, w: number, h: number, round = false): { plate: string; shadow: string } {
  const id = `${kind}-${w}x${h}${round ? '-o' : ''}`;
  return {
    plate: uiTexture(scene, `ui-plate-${id}`, w + PLATE_PAD * 2, h + PLATE_PAD * 2, (ctx) => paintPlate(ctx, w, h, w * 7 + h, kind, round)),
    shadow: uiTexture(scene, `ui-shadow-${w}x${h}${round ? '-o' : ''}`, w + SHADOW_PAD * 2, h + SHADOW_PAD * 2, (ctx) => paintPlateShadow(ctx, w, h, UI_RES, round)),
  };
}

/** The key of a paper card w × h in `style`; bake it with paperCard. */
const cardKey = (w: number, h: number, seed: number): string => `ui-card-${Math.round(w)}x${Math.round(h)}-${seed}`;

/** A painted paper card w × h centred on (x, y). Free it with freePaper when its scene is done with it. */
export function paperCard(scene: Phaser.Scene, x: number, y: number, w: number, h: number, seed: number, style: PaperStyle = {}): Phaser.GameObjects.Image {
  const key = uiTexture(scene, cardKey(w, h, seed), w + CARD_PAD * 2, h + CARD_PAD * 2, (ctx) => paintPaper(ctx, w, h, seed, UI_RES, style));
  return scene.add.image(x, y, key).setScale(1 / UI_RES);
}

/** Lets a card's painting go (cards are the biggest interface textures). */
export function freePaper(scene: Phaser.Scene, w: number, h: number, seed: number): void {
  freeTexture(scene, cardKey(w, h, seed));
}

/** A round pool of watercolour, radius r, centred on (x, y): what a portrait sits on. */
export function spot(scene: Phaser.Scene, x: number, y: number, r: number, tint: SpotTint): Phaser.GameObjects.Image {
  const key = uiTexture(scene, `ui-spot-${tint}-${r}`, r * 2.4, r * 2.4, (ctx) => paintSpot(ctx, r, 90 + r, tint));
  return scene.add.image(x, y, key).setScale(1 / UI_RES);
}

/** A red rubber stamp reading `label`, w × h, centred on (x, y). */
export function stamp(scene: Phaser.Scene, x: number, y: number, label: string, w: number, h: number): Phaser.GameObjects.Image {
  const key = uiTexture(scene, `ui-stamp-${label}-${w}x${h}`, w + 8, h + 8, (ctx) => paintStamp(ctx, w, h, label, HAND, label.length * 13));
  return scene.add.image(x, y, key).setScale(1 / UI_RES);
}

export interface PaintedButtonOpts {
  readonly width?: number;
  readonly height?: number;
  readonly size?: number;
  readonly kind?: PlateKind;
  /** The label's ink (default blue on paper, cream on a coloured wash). */
  readonly color?: string;
}

const LABEL: Readonly<Record<PlateKind, { color: string; stroke: string }>> = {
  leaf: { color: '#fffbef', stroke: '#2f5426' },
  sky: { color: '#fffbef', stroke: '#22386f' },
  paper: { color: '#27408b', stroke: '' },
};

/**
 * A painted button: a wash-filled plate with a pen contour over its soft
 * shadow, and a hand-lettered label. It lifts under the pointer and
 * presses into its shadow while held. It fires only for a press that
 * started on it and didn't drag, so lifting a steering finger never
 * triggers it. The label is the container's second child (list[1]).
 */
export function paintedButton(scene: Phaser.Scene, x: number, y: number, label: string, onClick: () => void, opts: PaintedButtonOpts = {}): Phaser.GameObjects.Container {
  const w = opts.width ?? 200;
  const h = opts.height ?? 52;
  const kind = opts.kind ?? 'paper';
  const tex = plate(scene, kind, w, h);
  const shadow = scene.add.image(0, 3, tex.shadow).setScale(1 / UI_RES).setAlpha(0.8);
  const face = scene.add.image(0, 0, tex.plate).setScale(1 / UI_RES);
  const base = scene.add.container(0, 0, [shadow, face]);
  const style = LABEL[kind];
  const size = opts.size ?? 28;
  const text = scene.add.text(0, -1, label, {
    fontFamily: HAND, fontSize: `${size}px`, color: opts.color ?? style.color, padding: { x: size * 0.2, y: 4 },
    ...(style.stroke ? { stroke: style.stroke, strokeThickness: 3.5 } : {}),
  }).setOrigin(0.5);
  if (style.stroke) text.setShadow(0, 1.5, 'rgba(38,49,106,0.35)', 2, true, true);
  const c = scene.add.container(x, y, [base, text]);
  wire(scene, c, Math.max(w + 10, hitSize(w, uiScaleOf(scene))), hitSize(h, uiScaleOf(scene)), (state) => {
    const dy = state === 'down' ? 2.5 : state === 'over' ? -1 : 0;
    face.setY(dy);
    text.setY(dy - 1);
    shadow.setAlpha(state === 'down' ? 0.45 : state === 'over' ? 0.95 : 0.8).setY(state === 'over' ? 4 : 3);
  }, onClick);
  return c;
}

export interface RoundButton {
  readonly root: Phaser.GameObjects.Container;
  setIcon(kind: IconKind): void;
}

/** A round paper button with a painted icon, `d` across. */
export function roundButton(scene: Phaser.Scene, x: number, y: number, icon: IconKind, onClick: () => void, d = ROUND): RoundButton {
  const tex = plate(scene, 'paper', d, d, true);
  const shadow = scene.add.image(0, 3, tex.shadow).setScale(1 / UI_RES).setAlpha(0.8);
  const face = scene.add.image(0, 0, tex.plate).setScale(1 / UI_RES);
  const glyph = scene.add.image(0, 0, UI_TEX.icon(icon)).setScale((d / ROUND) / UI_RES);
  const root = scene.add.container(x, y, [shadow, face, glyph]);
  const hit = hitSize(d, uiScaleOf(scene));
  wire(scene, root, hit, hit, (state) => {
    const dy = state === 'down' ? 2.5 : state === 'over' ? -1 : 0;
    face.setY(dy);
    glyph.setY(dy).setAngle(state === 'over' ? -6 : 0);
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

/** The bar's groove with the vine grown `progress` (0..1) along it, left end at (x, y). */
export class VineBar {
  readonly root: Phaser.GameObjects.Container;
  private readonly vine: Phaser.GameObjects.Image;
  private readonly sprout: Phaser.GameObjects.Image;
  private shown = -1;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    groove(scene);
    const g = scene.add.image(-GROOVE_PAD, 0, UI_TEX.groove).setOrigin(0, 0.5).setScale(1 / UI_RES);
    this.vine = scene.add.image(-GROOVE_PAD, 0, UI_TEX.vine).setOrigin(0, 0.5).setScale(1 / UI_RES);
    this.sprout = scene.add.image(0, 0, UI_TEX.sprout).setOrigin(0.3, 0.5).setScale(1 / UI_RES);
    this.root = scene.add.container(x, y, [g, this.vine, this.sprout]);
  }

  set(progress: number, time = 0): void {
    const p = Phaser.Math.Clamp(progress, 0, 1);
    this.sprout.setVisible(p > 0.02 && p < 1).setX(p * GROOVE.w - 2).setRotation(Math.sin(time / 420) * 0.12);
    if (p === this.shown) return;
    this.shown = p;
    this.vine.setCrop(0, 0, (GROOVE_PAD + p * GROOVE.w) * UI_RES, this.vine.height);
  }
}

/** Blurs the paused board behind a card (WebGL only); returns how to undo it. */
export function softenBoard(scene: Phaser.Scene): () => void {
  const game = scene.scene.get('Game');
  if (!game?.sys.isActive() && !game?.sys.isPaused()) return () => undefined;
  if (scene.game.renderer.type !== Phaser.WEBGL) return () => undefined;
  const cam = game.cameras.main;
  const blur = cam.filters.external.addBlur(1, 1.6, 1.6, 1);
  return () => {
    if (cam.filters) cam.filters.external.remove(blur);
  };
}
