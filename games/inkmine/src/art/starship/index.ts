import type { Draw } from '../kit';
import { SHADOW } from '../paint';
import type { Profile } from '../../logic/economy';
import { isFixed } from '../../logic/starship';
import { bow, scopeShards } from './bow';
import type { ShipLook } from './hull';
import { hold, waist } from './midship';
import { engineGlow, ringBack, ringFront, stern } from './stern';

export type { ShipLook } from './hull';

/** The starship's frame, in drawing units: nose to the right, origin at the centre. */
export const STARSHIP_ART = { w: 252, h: 110 } as const;

/** How the starship stands in a profile: which of its systems are mended. */
export function shipLookOf(p: Pick<Profile, 'starship'>): ShipLook {
  return { power: isFixed(p, 'power'), telescope: isFixed(p, 'telescope'), tank: isFixed(p, 'tank'), engine: isFixed(p, 'engine') };
}

/** A look as a short key, for its texture. */
export const shipLookKey = (l: ShipLook): string => [l.power, l.telescope, l.tank, l.engine].map((b) => (b ? 1 : 0)).join('');

/** The starship as it first docks: everything the wormhole broke still broken. */
export const BROKEN_SHIP: ShipLook = { power: false, telescope: false, tank: false, engine: false };

/**
 * Your starship, side on, nose to the right (spec, "Your starship and
 * travel"): three ion thrusters behind a power bay with radiator wings,
 * the jump drive's ring round the waist (burnt black and torn: it's dead),
 * the fuel tank in an open truss, the hold with its doors, the docking
 * collar the lander locks onto, the dish and a sensor mast, three ore pods
 * under it, the crew's drum with its portholes and the telescope along its
 * back, and the bridge in the nose. Each system the wormhole broke shows it
 * until it's mended (`look`); its windows and lights stay dark until the
 * power's back.
 */
export function drawStarship(d: Draw, look: ShipLook): void {
  ringBack(d);
  stern(d, look);
  waist(d, look);
  hold(d, look);
  bow(d, look);
  ringFront(d);
  if (look.power) return;
  // Without power the whole ship sits a shade colder.
  const ctx = d.pen.ctx;
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = SHADOW;
  ctx.fillRect(-STARSHIP_ART.w / 2, -STARSHIP_ART.h / 2, STARSHIP_ART.w, STARSHIP_ART.h);
  ctx.restore();
}

/** What's round the ship, outside its outline: the engine's blue, the telescope's broken glass, the fuel frozen off the split tank. */
export function drawStarshipAir(d: Draw, look: ShipLook): void {
  engineGlow(d, look);
  scopeShards(d, look);
  if (look.tank) return;
  const { pen } = d;
  for (let i = 0; i < 26; i++) {
    const t = pen.rng();
    const x = -64 + t * 9 + (pen.rng() - 0.5) * 6 * t;
    const y = -12.5 - t * 9 - pen.rng() * 2;
    pen.dot(x, y, 0.12 + pen.rng() * 0.22, '#eef8ff', 0.5 + (1 - t) * 0.4);
  }
}
