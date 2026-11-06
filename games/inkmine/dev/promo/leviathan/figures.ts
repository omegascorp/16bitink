import { RED_FINISH } from '../../../src/art/brineFauna';
import { drawLeviathan, drawLeviathanAir, LEVIATHAN_ART, type LeviathanPose } from '../../../src/art/creatures/leviathan';
import { makeDraw } from '../../../src/art/kit';
import { BOIL, RED } from '../../../src/art/palette';
import { drawProspector, PROSPECTOR_FRAME, PROSPECTOR_GROUND, type Pose } from '../../../src/art/prospector';
import { PROSPECTOR_FINISH, render } from '../../../src/art/textures';
import { evenLoadout, prospectorLook } from '../../../src/logic/gear';
import { bakeSprite, type Sprite } from '../sprites';

/** The game's own drawings at video size: the prospector at Brine's marks of gear, and the Leviathan side on, as in play. */
export interface Figures {
  readonly fly: Sprite;
  readonly drill: Sprite;
  readonly idle: Sprite;
  readonly sleep: Sprite;
  readonly stir: Sprite;
  readonly awake: Sprite;
  /** Just the lights of `stir` and `awake`, to lay on after the deep-water grade. */
  readonly stirLights: Sprite;
  readonly awakeLights: Sprite;
}

const FRAME = { w: PROSPECTOR_FRAME, h: PROSPECTOR_FRAME, ox: PROSPECTOR_FRAME / 2, oy: PROSPECTOR_FRAME / 2 + PROSPECTOR_GROUND };
/** The prospector's feet, under its origin (drawing units). */
export const FEET = PROSPECTOR_GROUND;
const POSE_SEED: Readonly<Record<LeviathanPose, number>> = { sleep: 7300, stir: 7310, awake: 7320 };

/** The Leviathan as the game bakes it (brineFauna.ts), red finish, bubbles on after, only finer. */
function bakeGiant(pose: LeviathanPose, res: number): Sprite {
  const { w, h, ox, oy } = LEVIATHAN_ART;
  const seed = POSE_SEED[pose];
  const frames = Array.from({ length: BOIL }, (_, f) =>
    render(w, h, ox, oy, res, (ctx) => drawLeviathan(makeDraw(ctx, seed + f, f, 0, RED), pose), RED_FINISH, (ctx) => drawLeviathanAir(makeDraw(ctx, seed + 5 + f, f, 0, RED), pose)));
  return { frames, frame: LEVIATHAN_ART, res };
}

/** The cold bright pixels of a sprite: its photophores and its eye. */
function lightsOf(s: Sprite): Sprite {
  const frames = s.frames.map((src) => {
    const canvas = document.createElement('canvas');
    canvas.width = src.width;
    canvas.height = src.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(src, 0, 0);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const px = img.data;
    for (let i = 0; i < px.length; i += 4) {
      const cold = px[i + 2]! - px[i]!;
      const keep = (cold > 14 && px[i + 2]! > 238 && px[i + 1]! > 225) || (px[i]! > 245 && px[i + 1]! > 245 && px[i + 2]! > 245) ? 1 : 0;
      px[i + 3] = px[i + 3]! * keep;
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
  });
  return { ...s, frames };
}

export function makeFigures(): Figures {
  const look = prospectorLook(evenLoadout(3));
  const bake = (pose: Pose, seed: number): Sprite => bakeSprite(FRAME, 8, seed, (d) => drawProspector(d, pose, look), PROSPECTOR_FINISH);
  const stir = bakeGiant('stir', 7);
  const awake = bakeGiant('awake', 8);
  return {
    fly: bake('fly', 100), drill: bake('drillDown', 110), idle: bake('idle', 120),
    sleep: bakeGiant('sleep', 7), stir, awake,
    stirLights: lightsOf(stir), awakeLights: lightsOf(awake),
  };
}
