import Phaser from 'phaser';
import { createRng } from '../../logic/rng';
import { bakeUi, granulate, RES, roundRect, rule, RULE, uiImage, wash } from './paint';

/** What a gauge holds, and so its wash. */
export type GaugeKind = 'air' | 'cell';

const COLORS: Readonly<Record<GaugeKind | 'low', string>> = {
  /** Cerulean: life support. */
  air: '#3f8fae',
  /** Gamboge: the drill's charge. */
  cell: '#d49a2a',
  /** Madder, once it's low. */
  low: '#b0382e',
};

/** The well a gauge's wash sits in: a sunk channel with a double rule. */
function frameKey(scene: Phaser.Scene, w: number, h: number): string {
  return bakeUi(scene, `ui-gauge-frame-${w}x${h}`, w, h, (ctx) => {
    roundRect(ctx, 0, 0, w, h, h / 2);
    ctx.fillStyle = '#e6dcc2';
    ctx.fill();
    // Its inside shaded at the top, where the rim overhangs.
    ctx.save();
    roundRect(ctx, 0, 0, w, h, h / 2);
    ctx.clip();
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(80, 60, 30, 0.22)');
    g.addColorStop(0.45, 'rgba(80, 60, 30, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  });
}

/** Over the wash: the tick marks, a glassy highlight, and the rule round it. */
function glassKey(scene: Phaser.Scene, w: number, h: number): string {
  return bakeUi(scene, `ui-gauge-glass-${w}x${h}`, w, h, (ctx) => {
    ctx.strokeStyle = RULE;
    for (let i = 1; i < 10; i++) {
      const x = (w * i) / 10;
      const big = i === 5;
      ctx.globalAlpha = big ? 0.6 : 0.35;
      ctx.lineWidth = big ? 0.9 : 0.6;
      ctx.beginPath();
      ctx.moveTo(x, h);
      ctx.lineTo(x, h - (big ? h * 0.55 : h * 0.32));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(255, 252, 240, 0.55)';
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(h * 0.6, h * 0.28);
    ctx.lineTo(w - h * 0.6, h * 0.28);
    ctx.stroke();
    roundRect(ctx, 0.6, 0.6, w - 1.2, h - 1.2, h / 2);
    rule(ctx, 1.2);
  });
}

/** The full wash a gauge shows a share of. */
function fillKey(scene: Phaser.Scene, w: number, h: number, kind: GaugeKind | 'low'): string {
  return bakeUi(scene, `ui-gauge-fill-${kind}-${w}x${h}`, w, h, (ctx) => {
    roundRect(ctx, 1.5, 1.5, w - 3, h - 3, (h - 3) / 2);
    wash(ctx, 0, 0, w, h, COLORS[kind], w + h + kind.length, { alpha: 0.92, pool: 0.5, rim: 0.4 });
    // A little hatching along the bottom gives the liquid body.
    ctx.save();
    roundRect(ctx, 1.5, 1.5, w - 3, h - 3, (h - 3) / 2);
    ctx.clip();
    ctx.strokeStyle = RULE;
    ctx.globalAlpha = 0.18;
    ctx.lineWidth = 0.5;
    for (let x = -h; x < w; x += 2.6) {
      ctx.beginPath();
      ctx.moveTo(x, h);
      ctx.lineTo(x + h * 0.5, h * 0.55);
      ctx.stroke();
    }
    ctx.restore();
    granulate(ctx, createRng(w), 0, 0, w, h, 'rgba(255,255,255,1)', 0.04, 0.12);
  });
}

/**
 * A gauge like an instrument's: a sunk channel filled with a watercolour
 * wash to the level it holds (cerulean air, gamboge charge, madder when
 * low), ticked in tenths under a glassy rule.
 */
export class Gauge {
  private readonly frame: Phaser.GameObjects.Image;
  private readonly fill: Phaser.GameObjects.Image;
  private readonly lowFill: Phaser.GameObjects.Image;
  private readonly glass: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, x: number, y: number, private readonly w: number, private readonly h: number, kind: GaugeKind) {
    this.frame = uiImage(scene, x, y, frameKey(scene, w, h));
    this.fill = uiImage(scene, x, y, fillKey(scene, w, h, kind));
    this.lowFill = uiImage(scene, x, y, fillKey(scene, w, h, 'low')).setVisible(false);
    this.glass = uiImage(scene, x, y, glassKey(scene, w, h));
  }

  /** Shows `share` (0..1) of it, in madder once under `low`. */
  set(share: number, low: number): void {
    const s = Phaser.Math.Clamp(share, 0, 1);
    const isLow = s < low;
    this.fill.setVisible(!isLow);
    this.lowFill.setVisible(isLow);
    (isLow ? this.lowFill : this.fill).setCrop(0, 0, this.w * RES * s, this.h * RES);
  }

  get objects(): Phaser.GameObjects.GameObject[] {
    return [this.frame, this.fill, this.lowFill, this.glass];
  }
}
