import Phaser from 'phaser';
import type { Stack } from '../../logic/battleTypes';
import { faceOf, PX_TEX, unitArt } from './pixelAssets';
import { drawPortrait, EDGE, FACE, RIMS, SLOT, SLOT_GAP, type RimName } from './pixelFrames';
import { PixelBuffer } from './pixelRaster';
import type { Pixels } from './pixelScenery';
import { putBuffer } from './pixelUi';
import { RANK_RIM } from './rankLook';
import { rankOf, type Rarity } from '../../logic/rarity';

/** The active unit's marker under its portrait: a small gold arrow, this tall. */
const MARKER_H = 4;

const faceCrop = (scene: Phaser.Scene, creature: string): Pixels => faceOf(scene, PX_TEX.unit(creature, 'idle'), unitArt(creature));

/** The gold arrow under the active portrait, pointing up at it, outlined. */
function drawMarker(): PixelBuffer {
  const w = MARKER_H * 2 + 1;
  const inside = (x: number, y: number): boolean => y >= 0 && y < MARKER_H && Math.abs(x - MARKER_H) <= y;
  const b = new PixelBuffer(w + 2, MARKER_H + 2);
  for (let y = -1; y <= MARKER_H; y++) {
    for (let x = -1; x <= w; x++) {
      if (inside(x, y)) b.put(x + 1, y + 1, y === 0 ? RIMS.gold.light : RIMS.gold.mid);
      else if (inside(x - 1, y) || inside(x + 1, y) || inside(x, y - 1) || inside(x, y + 1)) b.put(x + 1, y + 1, EDGE);
    }
  }
  return b;
}

/** The rank gem's size from its middle (a diamond), and where its middle sits from the portrait's top-right corner. */
const GEM_R = 2;
const GEM_AT = 5;

/** A small diamond in the rank's colour, outlined, in the portrait's top-right corner: the side keeps the rim, the gem tells the rank. */
function drawRankGem(b: PixelBuffer, rank: Rarity): void {
  const rim = RIMS[RANK_RIM[rank]];
  const cx = b.w - GEM_AT;
  const cy = GEM_AT - 1;
  for (let dy = -GEM_R - 1; dy <= GEM_R + 1; dy++) {
    for (let dx = -GEM_R - 1; dx <= GEM_R + 1; dx++) {
      const d = Math.abs(dx) + Math.abs(dy);
      if (d > GEM_R + 1) continue;
      // Lit from the top left, as the rims are.
      b.put(cx + dx, cy + dy, d === GEM_R + 1 ? EDGE : dx + dy < 0 ? rim.light : dx + dy > 0 ? rim.dark : rim.mid);
    }
  }
}

/**
 * The units still to act this round, left to right, as faces: the next one
 * first, ringed in gold with an arrow under it, the rest in their side's
 * colour, a small gem in the corner telling its rank. Portraits are kept per creature, side, look and rank, so redrawing the
 * row each turn only moves images.
 */
export class TurnOrder {
  readonly root: Phaser.GameObjects.Container;
  private readonly keys = new Map<string, string>();
  private readonly faces = new Map<string, Pixels>();
  private readonly markerKey: string;

  /** The player's side, whose rims are theirs. */
  private me = 0;

  constructor(private readonly scene: Phaser.Scene) {
    this.root = scene.add.container(0, 0);
    this.markerKey = putBuffer(scene, drawMarker());
  }

  /** The row's width for `n` portraits. */
  static width(n: number): number {
    return n * SLOT + Math.max(0, n - 1) * SLOT_GAP;
  }

  /** The row's height, the marker included. */
  static get height(): number {
    return SLOT + MARKER_H + 1;
  }

  /** Shows `stacks` (in turn order, the active one first) centred on x, top at y. */
  show(stacks: readonly Stack[], cx: number, y: number, me: number = 0): void {
    this.me = me;
    this.root.removeAll(true);
    const left = Math.round(cx - Math.floor(TurnOrder.width(stacks.length) / 2));
    stacks.forEach((s, i) => {
      const key = this.portrait(s, i === 0);
      const x = left + i * (SLOT + SLOT_GAP);
      this.root.add(this.scene.add.image(x, y, key).setOrigin(0));
    });
    if (stacks.length) {
      const m = this.scene.textures.get(this.markerKey).getSourceImage();
      this.root.add(this.scene.add.image(left + Math.floor((SLOT - m.width) / 2), y + SLOT - 1, this.markerKey).setOrigin(0));
    }
  }

  private portrait(s: Stack, active: boolean): string {
    const rim: RimName = active ? 'gold' : s.side === this.me ? 'player' : 'enemy';
    const rank = rankOf(s.creature);
    const id = `${s.creature}|${s.side}|${rim}|${s.waited ? 1 : 0}|${rank ?? 0}`;
    let key = this.keys.get(id);
    if (!key) {
      let face = this.faces.get(s.creature);
      if (!face) {
        face = faceCrop(this.scene, s.creature);
        this.faces.set(s.creature, face);
      }
      const b = drawPortrait(face, rim, s.side === 1, !!s.waited);
      if (rank) drawRankGem(b, rank);
      key = putBuffer(this.scene, b);
      this.keys.set(id, key);
    }
    return key;
  }

  destroy(): void {
    this.root.destroy();
    for (const k of [...this.keys.values(), this.markerKey]) if (this.scene.textures.exists(k)) this.scene.textures.remove(k);
  }
}
