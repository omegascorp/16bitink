import Phaser from 'phaser';
import { FOOT, FRAME, SHELL_UNITS } from '../../art/frame';
import { crabShift } from '../../art/mouth';
import { BLUE_HEX, BOIL } from '../../art/palette';
import { TEX } from '../../art/textures';
import { MOUTH_OFFSET, bodyFill, shellPx, SHELLS, type ShellKind } from '../../logic/shells';
import { inkText } from '../ui';

/** Gap between shells in the row, layout px. */
const GAP = 16;
/** The crab's own shell, at the end of the row, is drawn this much bigger than the rest. */
const HERO_BOOST = 1.35;
/** Most a shell may be magnified: tiny ones shouldn't become blurry giants on a wide screen. */
const MAX_ZOOM = 4.2;
const POP_MS = 260;
const BOIL_MS = 240;

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
export function shellParade(scene: Phaser.Scene, ladder: readonly ShellKind[], x0: number, x1: number, ground: number, depth: number): Parade {
  const widths = ladder.map((k, i) => shellPx(SHELLS[k].maxSize) * (i === ladder.length - 1 ? HERO_BOOST : 1));
  const zoom = Math.min(MAX_ZOOM, (x1 - x0 - GAP * (ladder.length - 1)) / widths.reduce((a, b) => a + b, 0));
  const total = widths.reduce((a, b) => a + b * zoom, 0) + GAP * (ladder.length - 1);
  let left = x0 + (x1 - x0 - total) / 2;
  const origin = { x: FOOT.x / FRAME, y: FOOT.y / FRAME };
  const shells: Phaser.GameObjects.Image[] = [];
  let hero = { x: 0, y: ground };
  let heroCrab: Phaser.GameObjects.Container | null = null;
  const ticks = scene.add.graphics().setDepth(depth);

  ladder.forEach((kind, i) => {
    const w = widths[i]! * zoom;
    const unit = w / SHELL_UNITS;
    // Sprites anchor at the opening, MOUTH_OFFSET of the width right of the middle.
    const mid = left + w / 2;
    const foot = mid + MOUTH_OFFSET * w;
    left += w + GAP;
    const last = i === ladder.length - 1;
    const delay = 350 + i * POP_MS;
    const shell = scene.add.image(foot, ground, TEX.shell(kind, 0)).setOrigin(origin.x, origin.y).setScale(0).setDepth(depth + 1);
    shells.push(shell);
    scene.tweens.add({ targets: shell, scale: unit, delay, duration: 380, ease: 'Back.Out' });
    puff(scene, mid, ground - w * 0.3, w, delay, depth + 2);
    // Size tick: the biggest size this shell lets the crab reach.
    ticks.lineStyle(1.6, BLUE_HEX, 0.75).lineBetween(mid, ground + 22, mid, ground + 32);
    const label = inkText(scene, mid, ground + 48, String(SHELLS[kind].maxSize), 22).setAlpha(0).setDepth(depth);
    scene.tweens.add({ targets: label, alpha: 0.85, delay, duration: 300 });
    if (last) {
      heroCrab = crabIn(scene, kind, shell, foot, ground, unit, depth + 1);
      hero = { x: mid, y: ground - w * 0.5 };
    }
  });
  // The growth line under the row, from the first shell to the crab's.
  ticks.lineStyle(1.8, BLUE_HEX, 0.75).lineBetween(x0 + (x1 - x0 - total) / 2, ground + 27, x0 + (x1 - x0 + total) / 2, ground + 27);
  inkText(scene, x0 + (x1 - x0 - total) / 2 - 6, ground + 48, 'size', 18).setOrigin(1, 0.5).setAlpha(0.7).setDepth(depth);

  const inAt = 350 + ladder.length * POP_MS + 200;
  boil(scene, shells, ladder);
  const onDone = new Promise<void>((resolve) => scene.time.delayedCall(inAt, () => resolve()));
  if (heroCrab) hop(scene, heroCrab, inAt);
  return { hero, onDone };
}

/** The grown crab in its biggest shell (moved into one group with it), crowding the opening as it does at the cap. */
function crabIn(scene: Phaser.Scene, kind: ShellKind, shell: Phaser.GameObjects.Image, foot: number, ground: number, unit: number, depth: number): Phaser.GameObjects.Container {
  const origin = { x: FOOT.x / FRAME, y: FOOT.y / FRAME };
  const spec = SHELLS[kind];
  const body = unit * bodyFill(spec, spec.maxSize);
  const shift = crabShift(kind, unit, body);
  const back = scene.add.image(shift, 0, TEX.crabBack(0)).setOrigin(origin.x, origin.y).setScale(body).setAlpha(0);
  const front = scene.add.image(shift, 0, TEX.crabFront(0)).setOrigin(origin.x, origin.y).setScale(body).setAlpha(0);
  shell.setPosition(0, 0);
  const c = scene.add.container(foot, ground, [back, shell, front]).setDepth(depth);
  let f = 0;
  scene.time.addEvent({
    delay: BOIL_MS, loop: true, callback: () => {
      f = (f + 1) % BOIL;
      back.setTexture(TEX.crabBack(f));
      front.setTexture(TEX.crabFront(f));
    },
  });
  return c;
}

/** Peeks out once its shell lands, then hops for joy every so often. */
function hop(scene: Phaser.Scene, crab: Phaser.GameObjects.Container, at: number): void {
  const [back, , front] = crab.list;
  scene.tweens.add({ targets: [back, front], alpha: 1, delay: at - 200, duration: 200 });
  scene.tweens.chain({
    targets: crab,
    delay: at,
    loop: -1,
    loopDelay: 900,
    tweens: [
      { y: crab.y - 26, duration: 180, ease: 'Quad.Out' },
      { y: crab.y, duration: 200, ease: 'Bounce.Out' },
      { y: crab.y - 16, duration: 150, ease: 'Quad.Out' },
      { y: crab.y, duration: 170, ease: 'Bounce.Out' },
    ],
  });
}

function boil(scene: Phaser.Scene, shells: readonly Phaser.GameObjects.Image[], kinds: readonly ShellKind[]): void {
  let f = 0;
  scene.time.addEvent({
    delay: BOIL_MS, loop: true, callback: () => {
      f = (f + 1) % BOIL;
      shells.forEach((s, i) => s.setTexture(TEX.shell(kinds[i]!, f)));
    },
  });
}

function puff(scene: Phaser.Scene, x: number, y: number, size: number, delay: number, depth: number): void {
  const p = scene.add.image(x, y, TEX.puff(0)).setScale(0).setAlpha(0).setDepth(depth);
  const s = (size * 1.5) / 64;
  scene.tweens.add({ targets: p, scale: s, alpha: { from: 0.9, to: 0 }, delay, duration: 520, ease: 'Quad.Out', onComplete: () => p.destroy() });
}
