import Phaser from 'phaser';
import { getSound } from '../../host';
import { iconImage, type IconName } from './uiIcons';
import { bakeUi, castShadow, PAPER_DEEP, RES, roundRect, rule, RULE, wash } from './paint';
import { FADED, INK_TEXT, SERIF } from './type';

/** How a plaque reads: the main thing to do, a lesser choice, a loss, or nothing to do yet. */
export type PlaqueKind = 'primary' | 'secondary' | 'danger' | 'off';

export interface PlaqueOpts {
  readonly width?: number;
  readonly height?: number;
  readonly size?: number;
  readonly kind?: PlaqueKind;
  /** An icon in place of the label (the label is then only its name). */
  readonly icon?: IconName;
}

const MARGIN = 8;
/** Fill, and the label's ink, for each kind. */
const LOOK: Readonly<Record<PlaqueKind, { readonly wash: string | null; readonly label: string }>> = {
  primary: { wash: '#2c3d7c', label: '#fbf6e6' },
  secondary: { wash: null, label: INK_TEXT },
  danger: { wash: '#a3352c', label: '#fbf6e6' },
  off: { wash: null, label: FADED },
};

function plaqueKey(scene: Phaser.Scene, w: number, h: number, kind: PlaqueKind): string {
  const W = Math.round(w);
  const H = Math.round(h);
  return bakeUi(scene, `ui-plaque-${kind}-${W}x${H}`, W + MARGIN * 2, H + MARGIN * 2, (ctx) => {
    ctx.translate(MARGIN, MARGIN);
    const r = Math.min(8, H / 2);
    const look = LOOK[kind];
    if (kind !== 'off') {
      roundRect(ctx, 0, 0, W, H, r);
      castShadow(ctx, 4, 2, 0.3);
    }
    roundRect(ctx, 0, 0, W, H, r);
    if (look.wash) wash(ctx, 0, 0, W, H, look.wash, W * 7 + H, { alpha: 0.95, pool: 0.4, rim: 0.5 });
    else {
      ctx.fillStyle = kind === 'off' ? 'rgba(240, 232, 212, 0.6)' : PAPER_DEEP;
      ctx.fill();
    }
    roundRect(ctx, 0.6, 0.6, W - 1.2, H - 1.2, r);
    rule(ctx, kind === 'off' ? 0.8 : 1.3, kind === 'off' ? FADED : RULE);
    // A fine inner line: in paper on a wash, in ink on paper.
    roundRect(ctx, 3.5, 3.5, W - 7, H - 7, Math.max(2, r - 3));
    rule(ctx, 0.6, look.wash ? '#f3ead4' : RULE, look.wash ? 0.55 : kind === 'off' ? 0.25 : 0.5);
  });
}

/** An icon's size on a plaque whose label would be `size` px: about a capital's height and a half. */
export const plaqueIconSize = (size: number): number => Math.round(size * 1.3);

/** The label's ink on a plaque of `kind` (an icon swapped in later is inked to match). */
export const plaqueInk = (kind: PlaqueKind = 'secondary'): string => LOOK[kind].label;

/**
 * A button as a small engraved plaque: the main action washed in ink with
 * paper-coloured capitals, a lesser one on paper, a loss in madder, and
 * nothing-to-do faded. It fires only for a press that started on it and
 * didn't drag.
 */
export function plaque(scene: Phaser.Scene, x: number, y: number, text: string, onClick: () => void, opts: PlaqueOpts = {}): Phaser.GameObjects.Container {
  const w = opts.width ?? 200;
  const h = opts.height ?? 48;
  const kind = opts.kind ?? 'secondary';
  const size = opts.size ?? 19;
  const img = scene.add.image(0, 0, plaqueKey(scene, w, h, kind)).setScale(1 / RES);
  const t = opts.icon
    ? iconImage(scene, 0, 0, opts.icon, plaqueIconSize(size), LOOK[kind].label)
    : scene.add
      .text(0, 1, text.toUpperCase(), { fontFamily: SERIF, fontSize: `${size}px`, fontStyle: '600', color: LOOK[kind].label, padding: { x: 2, y: 3 } })
      .setLetterSpacing(size * 0.12)
      .setOrigin(0.5);
  const c = scene.add.container(x, y, [img, t]).setSize(w, h);
  if (kind === 'off') return c;
  c.setInteractive({ useHandCursor: true });
  let pressedAt: { x: number; y: number } | null = null;
  c.on('pointerover', () => c.setScale(1.03));
  c.on('pointerout', () => {
    c.setScale(1);
    pressedAt = null;
  });
  c.on('pointerdown', (p: Phaser.Input.Pointer) => {
    pressedAt = { x: p.x, y: p.y };
    c.setScale(0.98);
  });
  c.on('pointerup', (p: Phaser.Input.Pointer) => {
    const start = pressedAt;
    pressedAt = null;
    c.setScale(1.03);
    if (!start || Math.hypot(start.x - p.x, start.y - p.y) > 16) return;
    getSound(scene)?.play('tick');
    onClick();
  });
  return c;
}
