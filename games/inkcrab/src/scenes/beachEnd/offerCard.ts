import Phaser from 'phaser';
import { BLUE, BLUE_HEX, HIGHLIGHT_HEX, PAPER, RED_HEX } from '../../art/palette';
import type { Biome } from '../../level/biomes';
import { createRng } from '../../logic/rng';
import { HAND_FONT, inkButton, inkText, wobblyRect } from '../ui';

const SOFT_INK = '#4a463e';
const CARD_FILL = 0xfffaf0;
const NUMBERS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

export type Offer =
  | {
    readonly kind: 'buy';
    readonly beaches: readonly Biome[];
    readonly levels: number;
    readonly price?: string;
    readonly signedIn: boolean;
    readonly onBuy: () => void;
  }
  | {
    /** Owns the full game: what comes next, sailing on if it's built. */
    readonly kind: 'next';
    readonly beach: Biome | undefined;
    readonly onSail?: () => void;
  };

const hex = (css: string): number => Phaser.Display.Color.HexStringToColor(css).color;

/** "Nine", "10": words for small counts, as written by hand. */
export function countWord(n: number): string {
  const w = NUMBERS[n];
  return w ? w[0]!.toUpperCase() + w.slice(1) : String(n);
}

/** A smooth, lumpy ring of points around an ellipse (a few slow waves), the same for a given seed. */
function blob(cx: number, cy: number, rx: number, ry: number, seed: number, lump = 0.12): Phaser.Math.Vector2[] {
  const rng = createRng(seed);
  const waves = [2, 3, 5].map((k) => ({ k, phase: rng() * Math.PI * 2, amp: lump * (0.4 + rng() * 0.6) / Math.sqrt(k / 2) }));
  const n = 48;
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const r = 1 + waves.reduce((sum, w) => sum + Math.sin(a * w.k + w.phase) * w.amp, 0);
    return new Phaser.Math.Vector2(cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r);
  });
}

/** A beach's island as on the chart: lagoon wash, sand rim, green middle, inked coast. */
export function miniIsland(scene: Phaser.Scene, x: number, y: number, w: number, h: number, biome: Biome): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  const seed = biome.beach * 97;
  g.fillStyle(hex(biome.sea), 0.45).fillPoints(blob(x, y, w / 2, h / 2, seed, 0.06), true);
  const coast = blob(x, y, w * 0.36, h * 0.34, seed + 1);
  g.fillStyle(hex(biome.sand), 1).fillPoints(coast, true);
  g.fillStyle(hex(biome.land), 1).fillPoints(blob(x - w * 0.03, y - h * 0.05, w * 0.25, h * 0.2, seed + 2, 0.2), true);
  g.lineStyle(1.6, BLUE_HEX, 0.9).strokePoints(coast, true);
  // Swell lines off the coast.
  g.lineStyle(1, BLUE_HEX, 0.35).strokePoints(blob(x, y, w * 0.43, h * 0.42, seed + 3, 0.05), true);
  return g;
}

/** Two strips of highlighter tape pinning the card to the page. */
function tape(g: Phaser.GameObjects.Graphics, w: number, h: number): void {
  for (const side of [-1, 1]) {
    const cx = side * (w / 2 - 34);
    const cy = -h / 2 + 2;
    const a = side * 0.6;
    const pts = [[-34, -11], [34, -11], [34, 11], [-34, 11]].map(([px, py]) =>
      new Phaser.Math.Vector2(cx + px! * Math.cos(a) - py! * Math.sin(a), cy + px! * Math.sin(a) + py! * Math.cos(a)));
    g.fillStyle(HIGHLIGHT_HEX, 0.55).fillPoints(pts, true);
  }
}

/**
 * The note pinned beside the celebration: the beaches still to come, drawn
 * as their chart islands, and the one-time unlock. For an owner it shows
 * the next beach instead.
 */
export function offerCard(scene: Phaser.Scene, cx: number, cy: number, w: number, h: number, offer: Offer): Phaser.GameObjects.Container {
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.08).fillRect(-w / 2 + 6, -h / 2 + 8, w, h);
  g.fillStyle(CARD_FILL, 1).fillRect(-w / 2, -h / 2, w, h);
  wobblyRect(g, -w / 2, -h / 2, w, h, 4242, 2, BLUE_HEX);
  tape(g, w, h);
  const parts: Phaser.GameObjects.GameObject[] = [g, ...(offer.kind === 'buy' ? buyParts(scene, w, h, offer) : nextParts(scene, w, h, offer))];
  const card = scene.add.container(cx, cy, parts).setRotation(-0.018);
  // Slides in from the right a moment after the celebration starts.
  card.setAlpha(0).setX(cx + 60);
  scene.tweens.add({ targets: card, x: cx, alpha: 1, delay: 900, duration: 520, ease: 'Cubic.Out' });
  return card;
}

function buyParts(scene: Phaser.Scene, w: number, h: number, offer: Extract<Offer, { kind: 'buy' }>): Phaser.GameObjects.GameObject[] {
  const top = -h / 2;
  const parts: Phaser.GameObjects.GameObject[] = [
    inkText(scene, 0, top + 46, `${countWord(offer.beaches.length)} more beaches to comb`, 36),
    scene.add.text(0, top + 84, `${offer.levels} more levels · new shells, creatures and dangers`, { fontFamily: HAND_FONT, fontSize: '20px', color: SOFT_INK }).setOrigin(0.5),
  ];
  // The islands, three to a row, as they'll appear on the chart.
  const cols = 3;
  const cellW = (w - 40) / cols;
  const cellH = 78;
  const gridTop = top + 112;
  offer.beaches.forEach((b, i) => {
    const x = -w / 2 + 20 + cellW * (i % cols) + cellW / 2;
    const y = gridTop + cellH * Math.floor(i / cols);
    const island = miniIsland(scene, x, y + 24, cellW * 0.82, 44, b);
    const name = scene.add.text(x, y + 60, b.name, { fontFamily: HAND_FONT, fontSize: '17px', color: BLUE }).setOrigin(0.5);
    parts.push(island, name);
  });
  const rows = Math.ceil(offer.beaches.length / cols);
  const buyY = gridTop + rows * cellH + 46;
  const label = offer.price ? `Unlock the full game · ${offer.price}` : 'Unlock the full game';
  const buy = inkButton(scene, 0, buyY, label, offer.onBuy, { width: w - 56, height: 66, size: 32, fill: RED_HEX, color: PAPER });
  // A slow breath, so the eye finds it.
  scene.tweens.add({ targets: buy, scale: 1.035, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut', delay: 1600 });
  const note = offer.signedIn
    ? 'One-time purchase: no subscription, no ads.'
    : 'Sign in with Google, then pay once. No subscription, no ads.';
  parts.push(buy, scene.add.text(0, buyY + 52, note, { fontFamily: HAND_FONT, fontSize: '18px', color: SOFT_INK }).setOrigin(0.5));
  return parts;
}

function nextParts(scene: Phaser.Scene, w: number, h: number, offer: Extract<Offer, { kind: 'next' }>): Phaser.GameObjects.GameObject[] {
  const top = -h / 2;
  const b = offer.beach;
  if (!b) {
    return [
      inkText(scene, 0, top + 70, 'Every beach combed!', 38),
      scene.add.text(0, top + 120, 'You grew up on all of them. Bravo!', { fontFamily: HAND_FONT, fontSize: '22px', color: SOFT_INK }).setOrigin(0.5),
    ];
  }
  const parts: Phaser.GameObjects.GameObject[] = [
    inkText(scene, 0, top + 50, `Next: Beach ${b.beach}`, 34),
    inkText(scene, 0, top + 92, b.name, 30),
    miniIsland(scene, 0, top + 200, w * 0.7, 140, b),
    scene.add.text(0, top + 300, b.tagline, { fontFamily: HAND_FONT, fontSize: '21px', color: SOFT_INK }).setOrigin(0.5),
  ];
  parts.push(offer.onSail
    ? inkButton(scene, 0, top + 380, 'Sail on →', offer.onSail, { width: 240, height: 60, size: 30 })
    : scene.add.text(0, top + 370, 'Still being drawn: it washes up soon.', { fontFamily: HAND_FONT, fontSize: '22px', color: BLUE }).setOrigin(0.5));
  return parts;
}
