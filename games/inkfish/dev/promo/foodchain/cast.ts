import type { FishShape } from '../../../src/art/fishArt';
import { BOIL_FPS, BOIL_FRAMES } from '../../../src/art/textures';
import type { Pose } from '../chain';
import { makeSprite, type Sprite } from '../sprites';
import { drawSwimmer } from '../swimmer';
import * as blueWhale from './art/blueWhale';
import * as greatWhite from './art/greatWhite';
import * as orca from './art/orca';
import * as plankton from './art/plankton';
import * as whaleShark from './art/whaleShark';
import type { Kind } from './species';

/**
 * Draws any animal of the chain at a screen position: the game's own fish
 * (anchovy, mackerel, tuna) through its swimmer, the new drawings in art/
 * through theirs. Every one is placed by its body's centre, its length on
 * screen, which way it faces and a few pose numbers.
 */

export interface Look {
  /** Body centre, screen px. */
  readonly x: number;
  readonly y: number;
  /** Snout to tail, screen px. */
  readonly length: number;
  /** +1 faces right, -1 left. */
  readonly facing: 1 | -1;
  /** Nose-up tilt, radians. */
  readonly tilt?: number;
  /** Tail-beat phase (radians) and effort (0..1). */
  readonly beat?: number;
  readonly effort?: number;
  /** Jaw or gape, 0 shut .. 1 wide. */
  readonly jaw?: number;
  readonly alpha?: number;
}

export interface Extras {
  /** Blue whale: the ballooned throat, 0..1. */
  readonly throat?: number;
  /** Orca: Port and Starboard's bent dorsal fin. */
  readonly floppy?: boolean;
  /** Great white: the fleeing look, 0..1. */
  readonly worried?: number;
  /** Plankton: legs kicking (copepod, krill), or the diatom's spin. */
  readonly kick?: number;
  readonly spin?: number;
  readonly pennate?: boolean;
}

const SWIMMERS: Partial<Record<Kind, FishShape>> = { anchovy: 'anchovy', mackerel: 'mackerel', tuna: 'tuna' };
/** Swimmer sprite resolution per kind: big enough for the closest shot of each (the cold open's first frame is an anchovy's head). */
const SWIM_RES: Partial<Record<Kind, number>> = { anchovy: 9, mackerel: 8, tuna: 10 };

/** Bakes everything the video draws (once, before the first frame). */
export async function prepareCast(): Promise<void> {
  await Promise.all([plankton.prepare(), orca.prepare(), greatWhite.prepare(), whaleShark.prepare(), blueWhale.prepare()]);
}

const sprites = new Map<Kind, Sprite>();
function spriteOf(kind: Kind): Sprite {
  let s = sprites.get(kind);
  if (!s) {
    s = makeSprite(SWIMMERS[kind]!, SWIM_RES[kind]);
    sprites.set(kind, s);
  }
  return s;
}

/** Angle and mirror for drawings whose snout points along +x. */
const heading = (look: Look): { angle: number; flip: boolean } => ({
  angle: look.facing === 1 ? -(look.tilt ?? 0) : Math.PI + (look.tilt ?? 0),
  flip: look.facing === -1,
});

export function drawAnimal(ctx: CanvasRenderingContext2D, kind: Kind, look: Look, t: number, extras: Extras = {}): void {
  if (look.length < 1.2 || (look.alpha ?? 1) <= 0) return;
  ctx.save();
  if (look.alpha !== undefined) ctx.globalAlpha *= look.alpha;
  const { angle, flip } = heading(look);
  const tail = look.beat;
  switch (kind) {
    case 'diatom':
      plankton.drawDiatom(ctx, look.x, look.y, look.length, angle, t, { spin: extras.spin, kind: extras.pennate ? 'pennate' : 'centric' });
      break;
    case 'copepod':
      plankton.drawCopepod(ctx, look.x, look.y, look.length, angle, t, { kick: extras.kick, chew: look.jaw });
      break;
    case 'krill':
      plankton.drawKrill(ctx, look.x, look.y, look.length, angle, t, { kick: extras.kick });
      break;
    case 'orca':
      orca.drawOrca(ctx, look.x, look.y, look.length, angle, t, { jaw: look.jaw, tail, floppy: extras.floppy }, flip);
      break;
    case 'greatWhite':
      greatWhite.drawGreatWhite(ctx, look.x, look.y, look.length, angle, t, { jaw: look.jaw, tail, worried: extras.worried }, flip);
      break;
    case 'whaleShark':
      whaleShark.drawWhaleShark(ctx, look.x, look.y, look.length, angle, t, { gape: look.jaw, tail }, flip);
      break;
    case 'blueWhale':
      blueWhale.drawBlueWhale(ctx, look.x, look.y, look.length, angle, t, { gape: look.jaw, throat: extras.throat, tail }, flip);
      break;
    default: {
      const pose: Pose = {
        j: 0, shape: SWIMMERS[kind]!, age: 0, x: look.x, y: look.y, length: look.length, facing: look.facing,
        tilt: look.tilt ?? 0, beat: look.beat ?? t * 9, effort: look.effort ?? 0.4,
      };
      drawSwimmer(ctx, spriteOf(kind), pose, Math.floor(t * BOIL_FPS) % BOIL_FRAMES, { jaw: look.jaw });
    }
  }
  ctx.restore();
}

/** Where a drawn animal's mouth is on screen (to put krill or copepods in it). */
export function mouthOf(kind: Kind, look: Look): { x: number; y: number } {
  const { angle, flip } = heading(look);
  if (kind === 'blueWhale') return blueWhale.blueWhaleMouth(look.x, look.y, look.length, angle, { gape: look.jaw }, flip);
  if (kind === 'whaleShark') return whaleShark.whaleSharkMouth(look.x, look.y, look.length, angle, { gape: look.jaw }, flip);
  return { x: look.x + look.facing * 0.46 * look.length * Math.cos(look.tilt ?? 0), y: look.y - 0.46 * look.length * Math.sin(look.tilt ?? 0) };
}

export { blueWhale, plankton };
