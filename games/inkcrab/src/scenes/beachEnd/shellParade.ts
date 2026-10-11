import { shellFit } from '../../art/shellFit';
import Phaser from 'phaser';
import { FOOT, FRAME, SHELL_UNITS } from '../../art/frame';
import { BLUE_HEX } from '../../art/palette';
import { TEX } from '../../art/textures';
import { MOUTH_OFFSET, shellPx, type Shell } from '../../logic/shells';
import { boil, crabIn, hop, POP_DELAY, puff } from '../heroCrab';
import { inkText } from '../ui';

/** Gap between shells in the row, layout px. */
const GAP = 16;
/** The crab's own shell, at the end of the row, is drawn this much bigger than the rest. */
const HERO_BOOST = 1.35;
/** Most a shell may be magnified: tiny ones shouldn't become blurry giants on a wide screen. */
const MAX_ZOOM = 4.2;
const POP_MS = 260;

export interface Parade {
  /** The crab in its last shell, for confetti to burst from. */
  readonly hero: { readonly x: number; readonly y: number };
  /** Starts the boil and the crab's happy hops; call once the row is in. */
  readonly onDone: Promise<void>;
}

/**
 * The climb of the beach as a row of shells on the sand, smallest first,
 * each popping in with a puff; the last one holds the crab, fully grown,
 * hopping. Size ticks underneath read like the growth bar's.
 */
export function shellParade(scene: Phaser.Scene, ladder: readonly Shell[], x0: number, x1: number, ground: number, depth: number): Parade {
  const widths = ladder.map((s, i) => shellPx(s.size) * (i === ladder.length - 1 ? HERO_BOOST : 1));
  const zoom = Math.min(MAX_ZOOM, (x1 - x0 - GAP * (ladder.length - 1)) / widths.reduce((a, b) => a + b, 0));
  const total = widths.reduce((a, b) => a + b * zoom, 0) + GAP * (ladder.length - 1);
  let left = x0 + (x1 - x0 - total) / 2;
  const origin = { x: FOOT.x / FRAME, y: FOOT.y / FRAME };
  const shells: Phaser.GameObjects.Image[] = [];
  let hero = { x: 0, y: ground };
  let heroCrab: Phaser.GameObjects.Container | null = null;
  const ticks = scene.add.graphics().setDepth(depth);

  ladder.forEach((home, i) => {
    const w = widths[i]! * zoom;
    const unit = w / SHELL_UNITS;
    // Sprites anchor at the opening, MOUTH_OFFSET of the width right of the middle.
    const mid = left + w / 2;
    const foot = mid + MOUTH_OFFSET * w;
    left += w + GAP;
    const last = i === ladder.length - 1;
    const delay = POP_DELAY + i * POP_MS;
    const shell = scene.add.image(foot, ground, TEX.shell(home.kind, 0)).setOrigin(origin.x, origin.y).setScale(0).setDepth(depth + 1);
    shells.push(shell);
    scene.tweens.add({ targets: shell, scale: unit * shellFit(home.kind), delay, duration: 380, ease: 'Back.Out' });
    puff(scene, mid, ground - w * 0.3, w, delay, depth + 2);
    // Size tick: the size of this shell, the size it lets the crab reach.
    ticks.lineStyle(1.6, BLUE_HEX, 0.75).lineBetween(mid, ground + 22, mid, ground + 32);
    const label = inkText(scene, mid, ground + 48, String(home.size), 22).setAlpha(0).setDepth(depth);
    scene.tweens.add({ targets: label, alpha: 0.85, delay, duration: 300 });
    if (last) {
      heroCrab = crabIn(scene, home, shell, foot, ground, unit, depth + 1);
      hero = { x: mid, y: ground - w * 0.5 };
    }
  });
  // The growth line under the row, from the first shell to the crab's.
  ticks.lineStyle(1.8, BLUE_HEX, 0.75).lineBetween(x0 + (x1 - x0 - total) / 2, ground + 27, x0 + (x1 - x0 + total) / 2, ground + 27);
  inkText(scene, x0 + (x1 - x0 - total) / 2 - 6, ground + 48, 'size', 18).setOrigin(1, 0.5).setAlpha(0.7).setDepth(depth);

  const inAt = POP_DELAY + ladder.length * POP_MS + 200;
  boil(scene, shells, ladder);
  const onDone = new Promise<void>((resolve) => scene.time.delayedCall(inAt, () => resolve()));
  if (heroCrab) hop(scene, heroCrab, inAt);
  return { hero, onDone };
}
