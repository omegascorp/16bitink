import { canFix } from '../../logic/starship';
import type Phaser from 'phaser';
import { techTexture } from '../../art/textures';
import type { TechVariant } from '../../art/techArt';
import type { Profile } from '../../logic/economy';
import { lookOf } from '../../logic/gear';
import { isRepaired } from '../../logic/repairs';
import { hasBeat } from '../../logic/story';
import { techKey, techState, type Tech, type TechState } from '../../logic/tech';
import { bakeUi, roundRect, rule, RULE, uiImage, wash } from '../kit/paint';
import { FADED, INK_TEXT, label, SEPIA } from '../kit/type';
import { techName } from './techText';

export interface TechGridOpts {
  readonly cell: number;
  readonly cols: number;
  /** The slot ringed as the one the card shows. */
  readonly focus?: string;
  readonly onTap: (t: Tech) => void;
}

/** Px between cells, across and down (room under each for its name). */
const GAP_X = 12;
const CAPTION = 24;
/** The state's colour: the corner flag and the rim. */
const FLAG: Readonly<Partial<Record<TechState, string>>> = { ready: '#2f6f62', broken: '#9e2f28' };

export function techGridHeight(n: number, o: Pick<TechGridOpts, 'cell' | 'cols'>): number {
  return Math.ceil(n / o.cols) * (o.cell + CAPTION + 8);
}

/** The cell a slot fits in, and how many go across, for `n` slots in `w` px. */
export function techGridFit(n: number, w: number, max = 92, min = 70): { cell: number; cols: number } {
  const cols = Math.max(1, Math.min(n, Math.floor((w + GAP_X) / (min + GAP_X))));
  return { cols, cell: Math.min(max, Math.floor((w - GAP_X * (cols - 1)) / cols)) };
}

/** What the slot's picture shows: a gear piece in its look, a system broken or mended. */
export function variantOf(p: Profile, t: Tech): TechVariant {
  if (t.kind === 'gear') return lookOf(p.gear[t.piece]);
  // The Lamplighters' core is whole before it's fitted.
  if (t.kind === 'repair') return isRepaired(p, t.id) || (t.id === 'core' && hasBeat(p, 'core')) ? 'mended' : 'broken';
  if (t.kind === 'starship') return canFix(p, t.id) === 'done' ? 'mended' : 'broken';
  return 'mended';
}

/**
 * A technology slot's well: pressed into the paper like a storage slot but
 * bigger, a madder wash and hatching through it when broken, a dashed rim
 * when nothing's built, and a flag in the corner (verdigris: an upgrade to
 * print; madder: broken). `focused` lays highlighter round it.
 */
function slotKey(scene: Phaser.Scene, size: number, state: TechState, focused: boolean): string {
  return bakeUi(scene, `ui-tech-${state}-${focused ? 'f' : 'n'}-${size}`, size, size, (ctx) => {
    roundRect(ctx, 0.5, 0.5, size - 1, size - 1, 6);
    ctx.fillStyle = focused ? '#f6e7a6' : state === 'empty' ? '#efe7d2' : '#e9dfc4';
    ctx.fill();
    ctx.save();
    roundRect(ctx, 0.5, 0.5, size - 1, size - 1, 6);
    ctx.clip();
    const g = ctx.createLinearGradient(0, 0, 0, size);
    g.addColorStop(0, 'rgba(80, 60, 30, 0.22)');
    g.addColorStop(0.25, 'rgba(80, 60, 30, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    if (state === 'broken') {
      ctx.globalAlpha = 0.16;
      ctx.strokeStyle = '#9e2f28';
      ctx.lineWidth = 1;
      for (let k = -size; k < size * 2; k += 5) {
        ctx.beginPath();
        ctx.moveTo(k, size);
        ctx.lineTo(k + size, 0);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    const flag = FLAG[state];
    if (flag) {
      ctx.beginPath();
      ctx.moveTo(size - 20, 0);
      ctx.lineTo(size, 0);
      ctx.lineTo(size, 20);
      ctx.closePath();
      wash(ctx, size - 20, 0, 20, 20, flag, size, { alpha: 0.95, rim: 0.4 });
    }
    ctx.restore();
    if (focused) {
      roundRect(ctx, 2.5, 2.5, size - 5, size - 5, 5);
      wash(ctx, 0, 0, size, size, '#f0d55a', size + 1, { alpha: 0.35, rim: 0.7 });
    }
    roundRect(ctx, 0.75, 0.75, size - 1.5, size - 1.5, 6);
    if (state === 'empty') ctx.setLineDash([4, 3]);
    rule(ctx, focused ? 2 : state === 'empty' ? 0.9 : 1.3, flag ?? RULE, state === 'empty' ? 0.5 : 0.9);
    ctx.setLineDash([]);
  });
}

/** The small figure in a slot's corner: a gear piece's mark, a module's level. Blank for a system. */
function badge(p: Profile, t: Tech): string {
  if (t.kind === 'gear') return `Mk ${p.gear[t.piece]}`;
  if (t.kind === 'module') return p.ship[t.key] > 0 ? `Lv ${p.ship[t.key]}` : '';
  return '';
}

/**
 * Technology slots, No Man's Sky style: a grid of big wells, each with a
 * picture of what's fitted there, its mark, its name under it, and a
 * corner flag for an upgrade ready or a system broken. A tap shows it on
 * the detail card. Returns the height.
 */
export function drawTechGrid(scene: Phaser.Scene, p: Profile, x: number, y: number, list: readonly Tech[], o: TechGridOpts): number {
  list.forEach((t, i) => {
    const cx = x + (i % o.cols) * (o.cell + GAP_X);
    const cy = y + Math.floor(i / o.cols) * (o.cell + CAPTION + 8);
    const state = techState(p, t);
    const key = techKey(t);
    uiImage(scene, cx, cy, slotKey(scene, o.cell, state, o.focus === key));
    const pic = scene.add.image(cx + o.cell / 2, cy + o.cell / 2 + 2, techTexture(scene, t, variantOf(p, t)));
    pic.setScale((o.cell * 0.84) / pic.width);
    if (state === 'empty') pic.setAlpha(0.35);
    const mark = badge(p, t);
    if (mark) label(scene, cx + 5, cy + 2, mark, 13, INK_TEXT, '600').setOrigin(0, 0);
    label(scene, cx + o.cell / 2, cy + o.cell + 3, techName(t), 14, state === 'empty' ? FADED : SEPIA, '500').setOrigin(0.5, 0).setWordWrapWidth(o.cell + GAP_X - 2).setAlign('center');
    const zone = scene.add.zone(cx + o.cell / 2, cy + o.cell / 2, o.cell, o.cell).setInteractive({ useHandCursor: true });
    // A tap, not the end of a drag (the page scrolls by dragging).
    let down: { x: number; y: number } | null = null;
    zone.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      down = { x: ptr.x, y: ptr.y };
    });
    zone.on('pointerup', (ptr: Phaser.Input.Pointer) => {
      if (down && Math.hypot(ptr.x - down.x, ptr.y - down.y) < 16) o.onTap(t);
      down = null;
    });
  });
  return techGridHeight(list.length, o);
}
