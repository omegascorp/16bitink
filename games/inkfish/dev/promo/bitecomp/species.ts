import { drawAlligator, prepare as prepareAlligator } from './art/alligator';
import { drawBullShark, prepare as prepareBullShark } from './art/bullShark';
import type { DrawHead } from './art/contract';
import { drawDog, prepare as prepareDog } from './art/dog';
import { drawGreatWhite, prepare as prepareGreatWhite } from './art/greatWhite';
import { drawHuman, prepare as prepareHuman } from './art/human';
import { drawJaguar, prepare as prepareJaguar } from './art/jaguar';
import { drawLion, prepare as prepareLion } from './art/lion';
import { drawMegalodon, prepare as prepareMegalodon } from './art/megalodon';
import { drawPiranha, prepare as preparePiranha } from './art/piranha';
import { drawSaltCroc, prepare as prepareSaltCroc } from './art/saltCroc';
import { drawTrex, prepare as prepareTrex } from './art/trex';

/**
 * Every animal that bites the sensor, with its number exactly as script.md's
 * source table has it: pounds of force (the one unit on screen for the whole
 * video) with newtons under it, and whether a live animal bit a sensor
 * (MEASURED) or a scientist's model gave it (ESTIMATED).
 */

export const ANIMALS = ['human', 'jaguar', 'dog', 'lion', 'bullShark', 'alligator', 'saltCroc', 'greatWhite', 'trex', 'megalodon', 'piranha'] as const;
export type Animal = (typeof ANIMALS)[number];

export type Status = 'MEASURED' | 'ESTIMATED';

export interface Species {
  readonly name: string;
  /** One line under the name: what was measured, from the source table. */
  readonly note: string;
  readonly lb: number;
  /** Shown as "~4,000 lb" when the source gives a rounded figure. */
  readonly approx: boolean;
  readonly newtons: string;
  readonly status: Status;
  /** Head length on screen when it bites, px (the sensor bar is scaled to it). */
  readonly size: number;
  /** The ladder's short label. */
  readonly short: string;
  /**
   * Bite force over body weight, only for the twist's "pound for pound" bars.
   * Rough, from typical adult weights (none of these is shown as a number;
   * only the piranha's ×30 is, from Grubich et al. 2012: 320 N from a 1.1 kg fish).
   */
  readonly perWeight: number;
  readonly draw: DrawHead;
}

export const SPECIES: Readonly<Record<Animal, Species>> = {
  human: { name: 'YOU (an adult)', note: 'back teeth on a sensor', lb: 135, approx: false, newtons: '600 N', status: 'MEASURED', size: 300, short: 'You', perWeight: 0.9, draw: drawHuman },
  jaguar: { name: 'JAGUAR', note: 'at the fangs, from its skull', lb: 228, approx: false, newtons: '1,014 N', status: 'ESTIMATED', size: 330, short: 'Jaguar', perWeight: 2, draw: drawJaguar },
  dog: { name: 'BIG PET DOG', note: '22 dogs tested: the hardest bite', lb: 313, approx: false, newtons: '1,394 N', status: 'MEASURED', size: 320, short: 'Dog', perWeight: 4, draw: drawDog },
  lion: { name: 'LION', note: 'at the fangs, from its skull', lb: 397, approx: false, newtons: '1,768 N', status: 'ESTIMATED', size: 400, short: 'Lion', perWeight: 2, draw: drawLion },
  bullShark: { name: 'BULL SHARK', note: 'a 9 ft (2.7 m) shark, from its jaw muscles', lb: 1330, approx: false, newtons: '5,914 N', status: 'ESTIMATED', size: 480, short: 'Bull shark', perWeight: 4, draw: drawBullShark },
  alligator: { name: 'AMERICAN ALLIGATOR', note: 'biting a real sensor', lb: 2960, approx: false, newtons: '13,172 N', status: 'MEASURED', size: 560, short: 'Alligator', perWeight: 5, draw: drawAlligator },
  saltCroc: { name: 'SALTWATER CROCODILE', note: 'about 15 ft (4.5 m) long', lb: 3690, approx: false, newtons: '16,414 N', status: 'MEASURED', size: 640, short: 'Croc', perWeight: 3, draw: drawSaltCroc },
  greatWhite: { name: 'GREAT WHITE SHARK', note: 'from a 3D model of its skull', lb: 4000, approx: true, newtons: '~18,000 N', status: 'ESTIMATED', size: 760, short: 'Great white', perWeight: 1, draw: drawGreatWhite },
  trex: { name: 'TYRANNOSAURUS REX', note: 'up to · some studies go higher', lb: 7800, approx: false, newtons: '34,522 N', status: 'ESTIMATED', size: 900, short: 'T. rex', perWeight: 0.5, draw: drawTrex },
  megalodon: { name: 'MEGALODON', note: 'from fossil teeth and a giant model shark', lb: 40000, approx: true, newtons: '~180,000 N', status: 'ESTIMATED', size: 1450, short: 'Megalodon', perWeight: 0.5, draw: drawMegalodon },
  piranha: { name: 'BLACK PIRANHA', note: 'a 2.5 lb (1.1 kg) fish', lb: 72, approx: false, newtons: '320 N', status: 'MEASURED', size: 230, short: 'Piranha', perWeight: 30, draw: drawPiranha },
};

/** The cold open's crocodile is the record's: the same head, a little closer. */
export const OPEN_SIZE = 700;

export const STATUS_COLOUR: Readonly<Record<Status | 'RECORD', string>> = { MEASURED: '#2f9e44', ESTIMATED: '#e8960c', RECORD: '#d4a017' };

/** "3,690 lb", "~40,000 lb". */
export const lbLabel = (lb: number, approx = false): string => `${approx ? '~' : ''}${Math.round(lb).toLocaleString('en-US')} lb`;

const KG_PER_LB = 0.45359237;

/** The same force as kilograms on a scale: "1,674 kg"; a rounded source figure stays rounded, to two digits ("~18,000 kg"). */
export function kgLabel(lb: number, approx = false): string {
  const kg = lb * KG_PER_LB;
  if (!approx) return `${Math.round(kg).toLocaleString('en-US')} kg`;
  const step = 10 ** Math.max(0, Math.floor(Math.log10(kg)) - 1);
  return `~${(Math.round(kg / step) * step).toLocaleString('en-US')} kg`;
}

export async function prepareSpecies(): Promise<void> {
  await Promise.all([
    prepareHuman(), prepareJaguar(), prepareDog(), prepareLion(), prepareBullShark(), prepareAlligator(),
    prepareSaltCroc(), prepareGreatWhite(), prepareTrex(), prepareMegalodon(), preparePiranha(),
  ]);
}
