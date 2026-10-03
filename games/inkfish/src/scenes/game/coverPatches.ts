import Phaser from 'phaser';
import { DECOR_SIZE, type DecorId } from '../../art/decorArt';
import type { WeedKind } from '../../art/propArt';
import { ART_RES, ensureDecorTextures, WEED_SIZE, weedKey } from '../../art/textures';
import type { CoverKind, CoverPatch } from '../../levels/cover';
import { createRng, rangeOf, type Rng } from '../../logic/rng';
import { decorKey } from './seabedDecor';

/**
 * Draws hiding places: a dense clump of weed or coral rooted in the sand.
 * Most of it stands IN FRONT of the fish, so you can see yourself slip inside;
 * a few stems stand behind for depth. The front layer turns see-through while
 * you're in it, so you never lose sight of your own fish.
 */
export interface CoverView {
  readonly patch: CoverPatch;
  /** Front layer, faded while the player is inside. */
  readonly front: Phaser.GameObjects.Image[];
  /** Weed sprites that boil and sway with the rest of the seabed. */
  readonly weeds: Phaser.GameObjects.Image[];
}

const WEED_OF: Readonly<Record<Exclude<CoverKind, 'coral'>, { readonly kind: WeedKind; readonly spacing: number }>> = {
  grass: { kind: 1, spacing: 16 },
  kelp: { kind: 0, spacing: 26 },
  weed: { kind: 2, spacing: 30 },
};
const CORALS: readonly DecorId[] = ['staghorn', 'braincoral', 'seafan', 'tubesponge'];
const FRONT_DEPTH = 21;
const BACK_DEPTH = 4;
const FRONT_ALPHA = 0.95;
/** How see-through the front layer gets while you're inside. */
const INSIDE_ALPHA = 0.45;

export function buildCover(scene: Phaser.Scene, patches: readonly CoverPatch[], floorAt: (x: number) => number, seed: number): CoverView[] {
  const rng = createRng(seed);
  if (patches.some((p) => p.kind === 'coral')) ensureDecorTextures(scene, CORALS);
  return patches.map((patch) => (patch.kind === 'coral' ? coralPatch(scene, patch, floorAt, rng) : weedPatch(scene, patch, floorAt, rng)));
}

function weedPatch(scene: Phaser.Scene, patch: CoverPatch, floorAt: (x: number) => number, rng: Rng): CoverView {
  const { kind, spacing } = WEED_OF[patch.kind as Exclude<CoverKind, 'coral'>];
  const front: Phaser.GameObjects.Image[] = [];
  const weeds: Phaser.GameObjects.Image[] = [];
  for (let x = patch.x - patch.half; x <= patch.x + patch.half; x += spacing * rangeOf(rng, 0.6, 1.2)) {
    // Taller in the middle of the clump, shorter at its edges.
    const edge = 1 - Math.abs(x - patch.x) / patch.half;
    const scale = (patch.height / WEED_SIZE.h) * rangeOf(rng, 0.7, 1.05) * (0.7 + edge * 0.35);
    const back = rng() < 0.3;
    const sprite = scene.add.image(x, floorAt(x) + 8, weedKey(kind, 0)).setOrigin(0.5, 1)
      .setDepth(back ? BACK_DEPTH : FRONT_DEPTH).setScale(scale / ART_RES).setFlipX(rng() < 0.5)
      .setAlpha(back ? 1 : FRONT_ALPHA).setData('kind', kind).setData('phase', rng() * Math.PI * 2);
    weeds.push(sprite);
    if (!back) front.push(sprite);
  }
  return { patch, front, weeds };
}

function coralPatch(scene: Phaser.Scene, patch: CoverPatch, floorAt: (x: number) => number, rng: Rng): CoverView {
  const front: Phaser.GameObjects.Image[] = [];
  const pieces = Math.max(3, Math.round(patch.half / 40));
  for (let i = 0; i < pieces; i++) {
    const kind = CORALS[Math.floor(rng() * CORALS.length)]!;
    const x = patch.x - patch.half * 0.8 + (patch.half * 1.6 * (i + rangeOf(rng, 0.2, 0.8))) / pieces;
    const scale = (patch.height / DECOR_SIZE[kind].h) * rangeOf(rng, 0.6, 0.95);
    front.push(scene.add.image(x, floorAt(x) + 6, decorKey(kind)).setOrigin(0.5, 1).setDepth(FRONT_DEPTH + i * 0.01)
      .setScale(scale / ART_RES).setFlipX(rng() < 0.5).setAlpha(FRONT_ALPHA));
  }
  return { patch, front, weeds: [] };
}

/** Fades the front of the patch you're in, and back again once you leave. */
export function fadeCover(covers: readonly CoverView[], inside: CoverView | null, dt: number): void {
  for (const c of covers) {
    const target = c === inside ? INSIDE_ALPHA : FRONT_ALPHA;
    for (const s of c.front) s.setAlpha(s.alpha + (target - s.alpha) * Math.min(1, dt * 6));
  }
}
