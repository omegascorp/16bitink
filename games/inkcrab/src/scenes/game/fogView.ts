import Phaser from 'phaser';
import { BLUE_HEX } from '../../art/palette';
import { bankCentres, clearRadius, FOG, fogAt, type FogSpec } from '../../logic/fog';
import { createRng } from '../../logic/rng';
import { surfaceRow, type Terrain } from '../../logic/terrain';

/** Over everything on the beach but the coach's arrow and floating words: what's in the fog is behind it. */
const DEPTH = 6.5;
/** The fog's paper-white, a touch cold. */
const MIST = '#eef0ea';
/** Puff texture size (px) and how wide a puff is drawn (tiles). */
const PUFF_PX = 128;
const PUFF_TILES = 5.5;
/** Tiles between puffs, and how high over the sand the fog stands. */
const SPACING = 2.2;
const TALL = 9;
/** The lowest puffs' middles (tiles over the sand): low enough to hide what's on it, not so low the fog seeps into the burrows. */
const LOWEST = 1.6;
/** Thick fog's opacity: nearly, not quite, hiding what's behind it. */
const MOST = 0.94;
/** Pen wisps drawn along each bank. */
const WISPS = 4;

let views = 0;

interface Puff {
  readonly bank: number;
  /** Offset from the bank's centre (tiles) and height over the sand (tiles). */
  readonly dx: number;
  readonly up: number;
  readonly bob: number;
  /** Tiles from its middle to its soft rim. */
  readonly radius: number;
  readonly image: Phaser.GameObjects.Image;
}

/**
 * Sea fog drifting over the beach: soft puffs carried along with each bank,
 * stacked up from the sand, thick in the middle of a bank and thinning at
 * its ends (the same thickness the hunters go by), with a few pen wisps
 * drifting through. Round the crab it clears, as far as it can see.
 */
export class FogView {
  private readonly key = `fog${++views}`;
  private readonly puffs: Puff[] = [];
  private readonly wisps: Phaser.GameObjects.Graphics;

  constructor(private readonly scene: Phaser.Scene, private readonly spec: FogSpec, private readonly terrain: Terrain, private readonly tile: number) {
    this.bakePuff();
    const rng = createRng(terrain.width * 7 + spec.banks.length);
    spec.banks.forEach(([, width], bank) => {
      const half = width / 2 + FOG.edge * 0.5;
      for (let dx = -half; dx <= half; dx += SPACING) {
        for (let up = LOWEST; up <= TALL; up += SPACING) {
          const across = PUFF_TILES * (0.8 + rng() * 0.5);
          const image = scene.add.image(0, 0, this.key).setDepth(DEPTH).setScale((across * tile) / PUFF_PX);
          this.puffs.push({ bank, dx: dx + (rng() - 0.5) * SPACING, up: Math.max(LOWEST, up + (rng() - 0.5)), bob: rng() * Math.PI * 2, radius: across / 2, image });
        }
      }
    });
    this.wisps = scene.add.graphics().setDepth(DEPTH + 0.01);
  }

  /** A soft round puff of mist, fading to nothing at its rim. */
  private bakePuff(): void {
    const canvas = document.createElement('canvas');
    canvas.width = PUFF_PX;
    canvas.height = PUFF_PX;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const r = PUFF_PX / 2;
    const g = ctx.createRadialGradient(r, r, 0, r, r, r);
    g.addColorStop(0, MIST);
    g.addColorStop(0.45, `${MIST}d0`);
    g.addColorStop(1, `${MIST}00`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, PUFF_PX, PUFF_PX);
    this.scene.textures.addCanvas(this.key, canvas);
  }

  /** `time` in seconds (the beach's clock); `crab` the middle of the crab (world px) and its size. */
  update(time: number, crab: { x: number; y: number }, size: number): void {
    const T = this.tile;
    const W = this.terrain.width;
    const loop = W + Math.max(...this.spec.banks.map(([, w]) => w));
    const centres = bankCentres(this.spec, W, time);
    const clear = clearRadius(size);
    // How much a puff may show: none while any of it would reach into the clear patch round the crab.
    const see = (x: number, y: number, reach = 0): number => Math.min(1, Math.max(0, (Math.hypot(x - crab.x, y - crab.y) / T - reach - clear) / FOG.fade));
    for (const p of this.puffs) {
      // Wrapped onto the beach, keeping puffs just off its left end that still hang over it.
      const col = ((((centres[p.bank]! + p.dx + p.radius) % loop) + loop) % loop) - p.radius;
      const ground = surfaceRow(this.terrain, Math.max(0, Math.min(W - 1, Math.floor(col))));
      const x = col * T + Math.sin(time * 0.3 + p.bob) * T * 0.4;
      const y = (ground - p.up) * T + Math.cos(time * 0.25 + p.bob) * T * 0.25;
      // Stacked puffs look thick sooner than one does, so thin fog is drawn thinner still: it looks as thick as it blinds.
      const alpha = col >= W + p.radius ? 0 : Math.pow(fogAt(this.spec, W, col, time), 1.6) * see(x, y, p.radius * 0.7) * MOST;
      p.image.setPosition(x, y).setAlpha(alpha).setVisible(alpha > 0.01);
    }
    this.drawWisps(centres, loop, time, see);
  }

  /** Long faint pen strokes drifting through each bank, as an illustrator suggests mist. */
  private drawWisps(centres: readonly number[], loop: number, time: number, see: (x: number, y: number) => number): void {
    const g = this.wisps.clear();
    const T = this.tile;
    const W = this.terrain.width;
    this.spec.banks.forEach(([, width], bank) => {
      for (let k = 0; k < WISPS; k++) {
        const along = ((k * 0.618 + bank * 0.37) % 1 - 0.5) * width * 0.8;
        const col = ((((centres[bank]! + along + Math.sin(time * 0.2 + k) * 1.5) % loop) + loop) % loop);
        if (col >= W) continue;
        const thick = fogAt(this.spec, W, col, time);
        const ground = surfaceRow(this.terrain, Math.floor(col));
        const x = col * T;
        const y = (ground - 1 - ((k * 1.7) % 4)) * T;
        const alpha = Math.max(0, thick - 0.4) * see(x, y) * 0.4;
        if (alpha < 0.02) continue;
        const len = (2 + (k % 3)) * T;
        g.lineStyle(1, BLUE_HEX, alpha).beginPath();
        for (let i = 0; i <= 12; i++) {
          const u = i / 12;
          const px = x - len / 2 + u * len;
          const py = y + Math.sin(u * Math.PI * 2 + time * 0.5 + k) * 1.6;
          if (i === 0) g.moveTo(px, py);
          else g.lineTo(px, py);
        }
        g.strokePath();
      }
    });
  }

  destroy(): void {
    this.scene.textures.remove(this.key);
  }
}
