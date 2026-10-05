import { describe, expect, it } from 'vitest';
import type Phaser from 'phaser';
import { washTint } from '../src/scenes/game/bake';
import { Culler, CULL_MARGIN, inView } from '../src/scenes/game/culler';
import { keepDepth, keepTint } from '../src/scenes/game/sync';
import { emptySkyline, fitOn, placeOn } from '../src/art/skyline';
import { createRng } from '../src/logic/rng';

const PAPER = 0xf4eddc;
const channels = (c: number): number[] => [(c >> 16) & 255, (c >> 8) & 255, c & 255];

describe('paper wash as a tint', () => {
  it('matches laying the wash over plain paper', () => {
    for (const [color, alpha] of [[0x2c4f86, 0.095], [0x1c2a4a, 0.57], [0x2c4f86, 0.012]] as const) {
      const tinted = channels(PAPER).map((p, i) => (p * channels(washTint(PAPER, color, alpha))[i]!) / 255);
      const blended = channels(PAPER).map((p, i) => p * (1 - alpha) + channels(color)[i]! * alpha);
      tinted.forEach((v, i) => expect(Math.abs(v - blended[i]!)).toBeLessThanOrEqual(1));
    }
  });

  it('leaves the paper alone with no wash', () => {
    expect(washTint(PAPER, 0x2c4f86, 0)).toBe(0xffffff);
  });
});

const view = { x: 0, y: 0, right: 800, bottom: 600 } as Phaser.Geom.Rectangle;

describe('culling', () => {
  it('keeps anything that reaches into the view', () => {
    expect(inView(view, 400, 300, 0)).toBe(true);
    expect(inView(view, -50, 300, 60)).toBe(true);
    expect(inView(view, -50, 300, 40)).toBe(false);
    expect(inView(view, 400, 700, 120)).toBe(true);
  });

  it('hides scenery out of view and shows it again', () => {
    const img = (x: number) => ({
      x, y: 300, active: true, visible: true, scrollFactorX: 1, scrollFactorY: 1, displayWidth: 100, displayHeight: 100,
      setVisible(v: boolean) { this.visible = v; return this; },
    });
    const near = img(400);
    const far = img(800 + CULL_MARGIN + 200);
    const parallax = { ...img(5000), scrollFactorX: 0.4 };
    const culler = new Culler();
    culler.add([near, far, parallax] as unknown as Phaser.GameObjects.Image[]);
    culler.update(view);
    expect([near.visible, far.visible, parallax.visible]).toEqual([true, false, true]);
    far.x = 700;
    culler.update(view);
    expect(far.visible).toBe(true);
  });
});

describe('follower sync', () => {
  it('writes depth and tint only when they change', () => {
    let writes = 0;
    const obj = {
      depth: 3, tintTopLeft: 0xffffff, tintMode: 0,
      setDepth(d: number) { writes++; this.depth = d; return this; },
      setTint(c: number) { writes++; this.tintTopLeft = c; return this; },
      setTintMode(m: number) { writes++; this.tintMode = m; return this; },
    };
    keepDepth(obj, 3);
    keepTint(obj as unknown as Phaser.GameObjects.Image, { tintTopLeft: 0xffffff, tintMode: 0 } as Phaser.GameObjects.Image);
    expect(writes).toBe(0);
    keepDepth(obj, 4);
    keepTint(obj as unknown as Phaser.GameObjects.Image, { tintTopLeft: 0xff0000, tintMode: 0 } as Phaser.GameObjects.Image);
    expect([obj.depth, obj.tintTopLeft, writes]).toEqual([4, 0xff0000, 2]);
  });
});

describe('atlas skyline packing', () => {
  it('places rectangles without overlap, inside the page', () => {
    const SIZE = 2048;
    const rng = createRng(3);
    let line = emptySkyline(SIZE);
    const placed: { x: number; y: number; w: number; h: number }[] = [];
    for (let n = 0; n < 400; n++) {
      const w = 16 * (1 + Math.floor(rng() * 24));
      const h = 16 * (1 + Math.floor(rng() * 24));
      const at = fitOn(line, SIZE, w, h);
      if (!at) continue;
      line = placeOn(line, at.x, at.y, w, h);
      placed.push({ ...at, w, h });
    }
    expect(placed.length).toBeGreaterThan(20);
    for (const [i, a] of placed.entries()) {
      expect(a.x + a.w).toBeLessThanOrEqual(SIZE);
      expect(a.y + a.h).toBeLessThanOrEqual(SIZE);
      for (const b of placed.slice(i + 1)) {
        const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
        expect(overlap).toBe(false);
      }
    }
    // The outline always spans the page edge to edge.
    expect(line.reduce((sum, s) => sum + s.w, 0)).toBe(SIZE);
  });

  it('packs a page of fish textures edge to edge', () => {
    let line = emptySkyline(2048);
    for (let n = 0; n < 64; n++) {
      const at = fitOn(line, 2048, 256, 256);
      expect(at).not.toBeNull();
      line = placeOn(line, at!.x, at!.y, 256, 256);
    }
    expect(fitOn(line, 2048, 256, 256)).toBeNull();
  });
});
