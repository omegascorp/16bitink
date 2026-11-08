import type Phaser from 'phaser';
import earth1 from '../../art/ramp/earth-1.png?url';
import earth2 from '../../art/ramp/earth-2.png?url';
import earth3 from '../../art/ramp/earth-3.png?url';
import brick1 from '../../art/ramp/brick-1.png?url';
import brick2 from '../../art/ramp/brick-2.png?url';
import brick3 from '../../art/ramp/brick-3.png?url';
import { creature } from '../../logic/creatures';
import type { BattleState } from '../../logic/battleTypes';
import { PART_HEX, rampDone, type Ramp, type WallPart } from '../../logic/siege';
import { hexPx } from './pixelLayout';

/**
 * Egypt's siege ramps on the field: one sprite per ramp against its
 * stretch of wall, swapped a stage as it grows (PixelLab's, from
 * dev/pixel/siege/ramp/: 96 × 64, the same canvas each stage, a low heap,
 * half height, then reaching the wall top). `rampLook` and `rampArt` are
 * the one place a ramp's picture is chosen.
 */
export type RampLook = 'earth' | 'brick';

const ART: Readonly<Record<RampLook, readonly [string, string, string]>> = {
  earth: [earth1, earth2, earth3],
  brick: [brick1, brick2, brick3],
};

/** The canvas point that stands on the wall hex's centre: the ramp's high end leans on the wall, its foot on the moat hex before it. */
const ANCHOR = { x: 87, y: 15 } as const;

/** Where a stretch's ramp leans, nudged along its wall: the north stretch runs on up the screen, so its ramp climbs the wall further up, clear of the gate turret below. */
const NUDGE: Readonly<Partial<Record<WallPart, { x: number; y: number }>>> = { wallNorth: { x: 13, y: -70 } };

const key = (look: RampLook, stage: 1 | 2 | 3): string => `px-ramp-${look}-${stage}`;

/** Every ramp picture, for the loader (a siege loads them all, as its wall pieces). */
export const rampArt = (): { key: string; url: string }[] =>
  (Object.keys(ART) as RampLook[]).flatMap((look) => ART[look].map((url, i) => ({ key: key(look, (i + 1) as 1 | 2 | 3), url })));

/** How the attackers' ramps look: the Earth Ramp's packed mud, the finer grades' mudbrick. */
export function rampLook(state: BattleState): RampLook {
  const workers = state.stacks.find((s) => creature(s.creature).ramp);
  return workers && creature(workers.creature).level > 1 ? 'brick' : 'earth';
}

/** Which of the three pictures a ramp shows: a low heap when begun, half height while it grows, the whole ramp once done. */
const stageOf = (r: Ramp): 1 | 2 | 3 => (rampDone(r) ? 3 : r.stage === 0 ? 1 : 2);

/** The ramps against a town's walls, kept as the siege has them. */
export class RampView {
  private readonly images = new Map<WallPart, Phaser.GameObjects.Image>();

  constructor(private readonly scene: Phaser.Scene, private readonly layer: Phaser.GameObjects.Layer, private readonly look: RampLook, private readonly depthOf: (part: WallPart) => number) {}

  /** Each ramp at its stage; a new one appears. */
  show(ramps: readonly Ramp[]): void {
    for (const r of ramps) {
      const k = key(this.look, stageOf(r));
      const img = this.images.get(r.part) ?? this.place(r.part);
      img.setTexture(k).setDisplayOrigin(ANCHOR.x, ANCHOR.y);
    }
  }

  private place(part: WallPart): Phaser.GameObjects.Image {
    const hex = hexPx(PART_HEX[part]);
    const at = { x: hex.x + (NUDGE[part]?.x ?? 0), y: hex.y + (NUDGE[part]?.y ?? 0) };
    // In front of the stretch it leans on.
    const img = this.scene.add.image(at.x, at.y, key(this.look, 1)).setDepth(this.depthOf(part) + 0.5);
    this.layer.add(img);
    this.images.set(part, img);
    return img;
  }

  destroy(): void {
    for (const img of this.images.values()) img.destroy();
    this.images.clear();
  }
}
