import Phaser from 'phaser';
import { HIGHLIGHT_HEX, INK, PAPER_HEX, SAND_DRY, SAND_GRAIN } from '../art/palette';
import type { ThemeId } from '../art/backdrop';
import { createRng } from '../logic/rng';
import { BackdropView } from './game/backdropView';
import { DPR, viewSize } from './hidpi';
import { inkText } from './ui';

/**
 * The shared stage of the end-of-level screens: a fixed design space the
 * camera fits to the screen, plain paper, the beach's faraway scenery and
 * the sand in front of it, and a headline marked with highlighter.
 */
export interface StageSize {
  readonly w: number;
  readonly h: number;
}

/** True when the screen is portrait enough for the stacked layout. */
export function isTall(scene: Phaser.Scene): boolean {
  const { width, height } = viewSize(scene);
  return height > width * 1.1;
}

/** Shows the design box centred, as big as fits, with text rasterized to match. */
export function fitStage(scene: Phaser.Scene, size: StageSize): void {
  const { width, height } = viewSize(scene);
  const zoom = Math.min(width / size.w, height / size.h);
  scene.cameras.main.setZoom(DPR * zoom).centerOn(size.w / 2, size.h / 2);
  const res = DPR * Math.max(1, zoom);
  const onAdded = (obj: Phaser.GameObjects.GameObject): void => {
    if (!(obj instanceof Phaser.GameObjects.Text)) return;
    obj.setResolution(res);
    // The hand font's slanted letters overhang their box: room so none are clipped.
    if (obj.padding.left === 0) obj.setPadding(8, 4, 8, 4);
  };
  scene.events.on(Phaser.Scenes.Events.ADDED_TO_SCENE, onAdded);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.ADDED_TO_SCENE, onAdded));
}

/**
 * Paper well past every edge, the faraway beach (without its sky and clouds:
 * the sun repeats too plainly on a still screen) and the sand with an inked edge.
 */
export function beachStage(scene: Phaser.Scene, size: StageSize, theme: ThemeId, ground: number): BackdropView {
  scene.add.rectangle(-size.w, -size.h, size.w * 3, size.h * 3, PAPER_HEX).setOrigin(0);
  const backdrop = new BackdropView(scene, theme, ground, size.w * 4, ['sky', 'clouds']);
  const g = scene.add.graphics().setDepth(5);
  const rng = createRng(31);
  const pts: Phaser.Math.Vector2[] = [];
  for (let x = -size.w; x <= size.w * 2; x += 40) pts.push(new Phaser.Math.Vector2(x, ground + 8 + Math.sin(x / 170) * 5 + (rng() - 0.5) * 2));
  g.fillStyle(Phaser.Display.Color.HexStringToColor(SAND_DRY).color, 1)
    .fillPoints([...pts, new Phaser.Math.Vector2(size.w * 2, size.h * 2), new Phaser.Math.Vector2(-size.w, size.h * 2)], true);
  g.lineStyle(2.4, Phaser.Display.Color.HexStringToColor(INK).color, 0.9).strokePoints(pts, false);
  const grain = Phaser.Display.Color.HexStringToColor(SAND_GRAIN).color;
  for (let i = 0; i < 260; i++) g.fillStyle(grain, 0.18 + rng() * 0.2).fillCircle(-size.w * 0.2 + rng() * size.w * 1.4, ground + 20 + rng() * size.h, 0.8 + rng() * 1.2);
  return backdrop;
}

export interface Headline {
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly maxW: number;
}

/** The headline popping in, then a swipe of highlighter drawn across it (`mark`: its colour). */
export function headline(scene: Phaser.Scene, at: Headline, text: string, color?: string, mark = HIGHLIGHT_HEX): Phaser.GameObjects.Text {
  const t = inkText(scene, at.x, at.y, text, at.size, color).setDepth(21).setScale(0.6).setAlpha(0);
  if (t.width > at.maxW) t.setFontSize(Math.floor((at.size * at.maxW) / t.width));
  const w = t.width + 36;
  const swipe = scene.add.graphics().setDepth(20);
  swipe.fillStyle(mark, 0.6).fillRoundedRect(0, -at.size * 0.22, w, at.size * 0.5, 10);
  swipe.setPosition(at.x - w / 2, at.y + at.size * 0.12).setScale(0, 1).setRotation(-0.012);
  scene.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 520, ease: 'Back.Out', delay: 120 });
  scene.tweens.add({ targets: swipe, scaleX: 1, duration: 480, ease: 'Cubic.Out', delay: 520 });
  return t;
}
