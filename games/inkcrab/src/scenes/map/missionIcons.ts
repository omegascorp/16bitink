import type Phaser from 'phaser';
import { RED_HEX } from '../../art/palette';
import type { FindId } from '../../logic/finds';
import type { MissionKind } from '../../logic/mission';
import { FIND_ICONS } from './findIcons';

/** Px across one icon, and between two side by side. */
const ICON = 14;
const GAP = 5;
/** Icons are drawn at this scale from their sketch units. */
const SCALE = 1.5;

/** A hunter circled in red: a ring round a dot. */
function marked(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.strokeCircle(x, y + 1, 5);
  g.fillCircle(x, y + 1, 1.8);
}

/** A shell chain: three shells in a line, smaller and smaller. */
function chain(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.strokeCircle(x - 4, y + 1, 3.4);
  g.strokeCircle(x + 2, y + 2, 2.4);
  g.strokeCircle(x + 6.5, y + 3, 1.5);
}

/** One life: a single shell, filled. */
function life(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillCircle(x, y + 1, 4);
  g.lineBetween(x - 4, y + 5, x + 4, y + 5);
}

/** The giant: a crown. */
function giant(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  const pts = [[-5, 5], [-5, -3], [-2, 1], [0, -4], [2, 1], [5, -3], [5, 5]] as const;
  pts.forEach(([ax, ay], i) => {
    const [bx, by] = pts[(i + 1) % pts.length]!;
    g.lineBetween(x + ax, y + ay, x + bx, y + by);
  });
}

const DRAW: Readonly<Record<Exclude<MissionKind, 'grow' | 'collect'>, (g: Phaser.GameObjects.Graphics, x: number, y: number) => void>> = {
  bounty: marked, chain, survive: life, giant,
};

/** A level's missions as little red pencil icons, side by side, centred on x (none for a plain level); a dig-up shows the beach's find. */
export function drawMissionIcons(g: Phaser.GameObjects.Graphics, x: number, y: number, kinds: readonly MissionKind[], find: FindId, alpha: number): void {
  const icons = kinds.filter((k): k is Exclude<MissionKind, 'grow'> => k !== 'grow');
  const w = icons.length * ICON + (icons.length - 1) * GAP;
  g.lineStyle(1.4 / SCALE, RED_HEX, alpha).fillStyle(RED_HEX, alpha);
  icons.forEach((k, i) => {
    const cx = x - w / 2 + ICON / 2 + i * (ICON + GAP);
    g.save();
    g.translateCanvas(cx, y);
    g.scaleCanvas(SCALE, SCALE);
    if (k === 'collect') FIND_ICONS[find](g, 0, 0);
    else DRAW[k](g, 0, 0);
    g.restore();
  });
}
