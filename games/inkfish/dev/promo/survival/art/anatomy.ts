import type { Anatomy } from '../../../../src/art/fish/kit';
import * as big from './big';
import * as small from './small';

/**
 * The contestants the game doesn't draw, as game Anatomies (drawn by the
 * game's own fishArt: same pen, wash, hatching and boil as every InkFish fish).
 *
 * CONTRACT between the art (this folder) and the engine (../*.ts): these
 * export names never change; every fish faces right; `hl`/`hh` are in fish
 * texture px like the game's own species. The drawings live in small.ts
 * (rivulus, mudskippers, pupfish) and big.ts (the rest); helpers in parts.ts.
 * Size a sprite by the anatomy's own hl (makeSprite's bodyPx comes from the
 * shape passed, not from the anatomy).
 */

/** Mangrove rivulus (Kryptolebias marmoratus): small, slim, olive-brown killifish, rounded tail, a gold-ringed eyespot on the upper tail base, a big bright eye. */
export const RIVULUS: Anatomy = small.RIVULUS;
/** Mudskipper (Periophthalmus): eyes on turrets on top of the head, arm-like pectorals it walks on, a flared first dorsal, spotted grey-brown. */
export const MUDSKIPPER: Anatomy = small.MUDSKIPPER;
/** Giant mudskipper (Periophthalmodon schlosseri): the same idea, bigger, bulkier and darker, pale-spotted, for round 4. */
export const GIANT_MUDSKIPPER: Anatomy = small.GIANT_MUDSKIPPER;
/** Desert pupfish (Cyprinodon macularius): a stubby, deep little fish; the breeding male, bright blue with a black tail edge. */
export const PUPFISH: Anatomy = small.PUPFISH;
/** Blackfin icefish (Chaenocephalus aceratus): pale, see-through-looking, a long flat crocodile snout, big dark fins. */
export const ICEFISH: Anatomy = big.ICEFISH;
/** Atlantic salmon (Salmo salar): silver, steel-blue back, black cross spots, small adipose fin. */
export const SALMON: Anatomy = big.SALMON;
/** Sailfish (Istiophorus): a bill and the huge sail-like dorsal fin. */
export const SAILFISH: Anatomy = big.SAILFISH;
/** Nurse shark (Ginglymostoma cirratum): a tan bottom-resting shark, two barbels, small mouth, rounded fins. */
export const NURSE_SHARK: Anatomy = big.NURSE_SHARK;
/** African lungfish (Protopterus): long eel-like body, thread-like paired fins. Its mud cocoon: cocoon.ts. */
export const LUNGFISH: Anatomy = big.LUNGFISH;
