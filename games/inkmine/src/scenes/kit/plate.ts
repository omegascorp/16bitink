import Phaser from 'phaser';
import { bakeUi, castShadow, lozenge, notched, paper, roundRect, rule, RULE, uiImage } from './paint';
import { heading, INK_TEXT } from './type';

/** Room round a plate's texture for its shadow. */
const MARGIN = 14;
/** The inner border's inset and its corner cut. */
const INSET = 6;
const NOTCH = 9;
/** Where a plate's heading sits, and the rule under it. */
export const PLATE_HEAD = { x: 22, y: 16, size: 19, ruleY: 46 } as const;
/** Top of a plate's content under its heading. */
export const PLATE_BODY = 58;

export interface PlateOpts {
  readonly title?: string;
  readonly seed?: number;
  /** A softer, tinted card (for a note laid over the game) instead of a plate. */
  readonly tone?: 'plate' | 'card';
  readonly depth?: number;
}

const TONES = {
  plate: { light: '#fbf7ec', deep: '#efe5cc' },
  card: { light: '#fffcf3', deep: '#f3ead4' },
} as const;

/** A plate's paper, borders and shadow, baked once per size. */
function plateKey(scene: Phaser.Scene, w: number, h: number, seed: number, tone: 'plate' | 'card'): string {
  const W = Math.round(w);
  const H = Math.round(h);
  return bakeUi(scene, `ui-plate-${tone}-${W}x${H}-${seed}`, W + MARGIN * 2, H + MARGIN * 2, (ctx) => {
    ctx.translate(MARGIN, MARGIN);
    roundRect(ctx, 0, 0, W, H, 3);
    castShadow(ctx, 9, 3);
    roundRect(ctx, 0, 0, W, H, 3);
    paper(ctx, 0, 0, W, H, seed, TONES[tone]);
    // The outer rule, firm, and the inner one, fine, with its corners cut in round a lozenge.
    roundRect(ctx, 0.75, 0.75, W - 1.5, H - 1.5, 3);
    rule(ctx, 1.5);
    notched(ctx, INSET, INSET, W - INSET * 2, H - INSET * 2, NOTCH);
    rule(ctx, 0.7, RULE, 0.85);
    for (const [cx, cy] of [[INSET, INSET], [W - INSET, INSET], [W - INSET, H - INSET], [INSET, H - INSET]] as const) lozenge(ctx, cx, cy, 3.2);
  });
}

/**
 * A plate: a sheet of good paper with a double rule, its corners cut round
 * a printer's lozenge, lifted off the page by a soft shadow, and an
 * optional heading in spaced capitals with a rule running off it. Returns
 * what it made (the sheet first), at depth `depth` (default -1, under the
 * plate's content).
 */
export function plate(scene: Phaser.Scene, x: number, y: number, w: number, h: number, opts: PlateOpts = {}): Phaser.GameObjects.GameObject[] {
  const depth = opts.depth ?? -1;
  const sheet = uiImage(scene, x - MARGIN, y - MARGIN, plateKey(scene, w, h, opts.seed ?? 7, opts.tone ?? 'plate')).setDepth(depth);
  const made: Phaser.GameObjects.GameObject[] = [sheet];
  if (opts.title) made.push(...plateHeading(scene, x, y, w, opts.title, depth));
  return made;
}

/** A plate's heading: spaced capitals, then a hairline running to the right edge, ending in a lozenge. */
export function plateHeading(scene: Phaser.Scene, x: number, y: number, w: number, title: string, depth = 0): Phaser.GameObjects.GameObject[] {
  const t = heading(scene, x + PLATE_HEAD.x, y + PLATE_HEAD.y, title, PLATE_HEAD.size).setDepth(depth + 0.01);
  const g = scene.add.graphics().setDepth(depth + 0.01);
  const ry = y + PLATE_HEAD.ruleY;
  const ink = Phaser.Display.Color.HexStringToColor(INK_TEXT).color;
  g.lineStyle(0.8, ink, 0.75).lineBetween(x + PLATE_HEAD.x, ry, x + w - PLATE_HEAD.x - 6, ry);
  g.lineStyle(0.6, ink, 0.45).lineBetween(x + PLATE_HEAD.x, ry + 3, x + w * 0.45, ry + 3);
  g.fillStyle(ink, 0.9).fillPoints([
    new Phaser.Math.Vector2(x + w - PLATE_HEAD.x, ry - 3.4),
    new Phaser.Math.Vector2(x + w - PLATE_HEAD.x + 2.4, ry),
    new Phaser.Math.Vector2(x + w - PLATE_HEAD.x, ry + 3.4),
    new Phaser.Math.Vector2(x + w - PLATE_HEAD.x - 2.4, ry),
  ], true);
  return [t, g];
}

/** A plate laid out round a centre, holding `parts` (placed relative to it): a card over the game. */
export function plateCard(scene: Phaser.Scene, cx: number, cy: number, w: number, h: number, parts: readonly Phaser.GameObjects.GameObject[], seed = 4242): Phaser.GameObjects.Container {
  const sheet = uiImage(scene, -w / 2 - MARGIN, -h / 2 - MARGIN, plateKey(scene, w, h, seed, 'card'));
  return scene.add.container(cx, cy, [sheet, ...parts]);
}
