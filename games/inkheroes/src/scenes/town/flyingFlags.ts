import type Phaser from 'phaser';
import { TOWN_ART, type TownArt } from '../../art/pixel/town';
import { putBuffer, texturePixels } from '../battle/pixelUi';
import { cutFlags, FLAG_FRAME_MS, FLAG_FRAMES, flagAmp, FLAGS } from './townFlags';
import { TOWN_TEX } from './townTex';

/** A sprite's flags as textures: its still sprite and each flag's frames, with where the frames go. */
interface FlagTextures {
  readonly still: string;
  readonly flags: readonly { readonly x: number; readonly y: number; readonly w: number; readonly frames: readonly string[] }[];
}

/** The textures for `art`'s flags, cut once and kept (null: it flies none). */
export function flagTextures(scene: Phaser.Scene, art: TownArt): FlagTextures | null {
  const spots = FLAGS[art];
  if (!spots) return null;
  const base = TOWN_TEX.piece(art);
  const still = `${base}-still`;
  const frameKey = (i: number, f: number): string => `${base}-flag-${i}-${f}`;
  if (!scene.textures.exists(still)) {
    const cut = cutFlags(texturePixels(scene, base), spots);
    putBuffer(scene, cut.still, still);
    cut.flags.forEach((fl, i) => fl.frames.forEach((fr, f) => putBuffer(scene, fr, frameKey(i, f))));
  }
  return {
    still,
    flags: spots.map((s, i) => ({ x: s.x, y: s.y - flagAmp(s), w: s.w, frames: Array.from({ length: FLAG_FRAMES }, (_, f) => frameKey(i, f)) })),
  };
}

/**
 * The town's flags flying: each sprite that has flags is drawn still and
 * its flags over it, every one waving a little out of step with the rest.
 */
export class FlyingFlags {
  private readonly flags: { readonly img: Phaser.GameObjects.Image; readonly frames: readonly string[]; readonly phase: number }[] = [];
  private t = 0;

  constructor(private readonly scene: Phaser.Scene) {}

  /** For a sprite of `art` with its top-left at (x, y), mirrored with `flip`: the texture to draw it with, and its flags (add them just after it). */
  fly(art: TownArt, x: number, y: number, flip = false): { key: string; flags: Phaser.GameObjects.Image[] } {
    const tex = flagTextures(this.scene, art);
    if (!tex) return { key: TOWN_TEX.piece(art), flags: [] };
    const w = TOWN_ART[art].w;
    const flags = tex.flags.map((f) => {
      const fx = flip ? x + w - f.x - f.w : x + f.x;
      const img = this.scene.add.image(fx, y + f.y, f.frames[0]!).setOrigin(0).setFlipX(flip);
      this.flags.push({ img, frames: f.frames, phase: (this.flags.length * 2) % FLAG_FRAMES });
      return img;
    });
    return { key: tex.still, flags };
  }

  update(delta: number): void {
    this.t = (this.t + delta) % (FLAG_FRAME_MS * FLAG_FRAMES);
    const step = Math.floor(this.t / FLAG_FRAME_MS);
    for (const f of this.flags) f.img.setTexture(f.frames[(step + f.phase) % FLAG_FRAMES]!);
  }
}
