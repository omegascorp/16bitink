/// <reference types="vite/client" />
import type Phaser from 'phaser';
import quote from '@tabler/icons/outline/quote.svg?raw';
import maximize from '@tabler/icons/outline/maximize.svg?raw';
import music from '@tabler/icons/outline/music.svg?raw';
import pause from '@tabler/icons/outline/player-pause.svg?raw';
import play from '@tabler/icons/outline/player-play.svg?raw';
import skip from '@tabler/icons/outline/player-track-next.svg?raw';
import { bakeUi, RES } from './paint';

/**
 * The buttons' icons (the HUD's own pictures, hearts and gauges, are
 * icons.ts): Tabler's outline set (tabler.io/icons, MIT), each
 * a few stroked paths on a 24-unit grid. They're inked, not pasted: drawn
 * onto a canvas as the plates are, in the game's ink, with a dip pen's round
 * ends and a fainter second pass a hair off, as a re-inked line has; the
 * solid shapes (play, pause, skip) get a light wash under the line.
 */
const ICONS = {
  pause: { svg: pause, wash: true },
  play: { svg: play, wash: true },
  skip: { svg: skip, wash: true },
  sound: { svg: music, wash: false },
  narration: { svg: quote, wash: false },
  fullscreen: { svg: maximize, wash: false },
} as const;

export type IconName = keyof typeof ICONS;

/** The grid Tabler draws on. */
const GRID = 24;
/** The pen's weight on that grid (Tabler's own is 2), and the second pass's. */
const LINE = 1.9;
const RETRACE = 0.9;

/** An icon's path data: each path in the SVG but Tabler's invisible 24 × 24 frame (stroke="none"). */
export function iconPaths(svg: string): string[] {
  return [...svg.matchAll(/<path\b[^>]*>/g)]
    .map((m) => m[0])
    .filter((tag) => !/stroke="none"/.test(tag))
    .map((tag) => /\sd="([^"]+)"/.exec(tag)?.[1])
    .filter((d): d is string => !!d);
}

/** The icon `name`, `size` layout px square, inked in `color`; baked once per size and colour. Returns its texture key. */
export function iconTexture(scene: Phaser.Scene, name: IconName, size: number, color: string): string {
  const { svg, wash } = ICONS[name];
  return bakeUi(scene, `ui-tabler-${name}-${size}-${color}`, size, size, (ctx) => {
    ctx.scale(size / GRID, size / GRID);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    const paths = iconPaths(svg).map((d) => new Path2D(d));
    if (wash) {
      ctx.globalAlpha = 0.18;
      for (const p of paths) ctx.fill(p);
    }
    ctx.globalAlpha = 0.95;
    ctx.lineWidth = LINE;
    for (const p of paths) ctx.stroke(p);
    // The pen's second pass, a hair off and fainter.
    ctx.translate(0.35, 0.25);
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = RETRACE;
    for (const p of paths) ctx.stroke(p);
  });
}

/** An image of the icon centred on (x, y). */
export function iconImage(scene: Phaser.Scene, x: number, y: number, name: IconName, size: number, color: string): Phaser.GameObjects.Image {
  return scene.add.image(x, y, iconTexture(scene, name, size, color)).setScale(1 / RES);
}
