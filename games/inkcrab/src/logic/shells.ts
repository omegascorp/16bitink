/**
 * Shells: the game's hook. Each one fits a range of body sizes; its maximum
 * is the crab's growth cap. Weight slows the crab, durability (used once
 * predators land) is how many hits it takes before it breaks.
 */
export const SHELL_KINDS = [
  'periwinkle', 'snail', 'nerite', 'topshell', 'whelk', 'moonsnail', 'triton', 'tun', 'conch',
  'desertsnail', 'turban', 'olive', 'murex', 'helmet',
  'flatwinkle', 'dogwhelk', 'paintedtop', 'necklace', 'frogshell', 'knobbedwhelk',
  'mangrovewinkle', 'rivernerite', 'mudcreeper', 'telescope', 'mudwhelk',
  'drupe', 'hornshell', 'spindle', 'bonnet', 'harp',
  'blackturban', 'kelpsnail', 'kellets', 'oregontriton', 'wavyturban',
  'nassa', 'figshell', 'tulip', 'lightningwhelk', 'horseconch',
  'auger', 'babylon', 'cone', 'spiderconch', 'volute',
] as const;
export type ShellKind = (typeof SHELL_KINDS)[number];

/**
 * A kind of shell: its name, the sizes it's found in on the beach (a
 * young one is small, an old one big; see Shell), its weight and its
 * durability (unused: being caught never damages a shell).
 */
export interface ShellSpec {
  readonly kind: ShellKind;
  readonly name: string;
  /** Smallest and biggest sizes this kind is found in. */
  readonly minSize: number;
  readonly maxSize: number;
  /** 1 light … 3 heavy. */
  readonly weight: 1 | 2 | 3;
  readonly durability: number;
}

const spec = (kind: ShellKind, name: string, minSize: number, maxSize: number, weight: 1 | 2 | 3, durability: number): ShellSpec => ({
  kind, name, minSize, maxSize, weight, durability,
});

// The sizes each kind is found in climb through a beach, and overlap.
// Only real sea and land snail shells: no litter, nothing man-made.
export const SHELLS: Readonly<Record<ShellKind, ShellSpec>> = {
  // A real sea-snail shell to start in, so the first thing you see reads as a hermit crab.
  periwinkle: spec('periwinkle', 'periwinkle', 1, 2, 1, 2),
  snail: spec('snail', 'snail shell', 1, 3, 1, 2),
  nerite: spec('nerite', 'nerite', 2, 4, 1, 2),
  topshell: spec('topshell', 'top shell', 2, 5, 1, 2),
  whelk: spec('whelk', 'whelk', 3, 5, 2, 3),
  moonsnail: spec('moonsnail', 'moon snail', 3, 6, 2, 3),
  triton: spec('triton', 'triton', 4, 7, 3, 3),
  tun: spec('tun', 'tun shell', 4, 7, 2, 2),
  conch: spec('conch', 'conch', 5, 8, 3, 4),
  // Dune Sea (beach 2): a bleached desert snail blown down from the dunes, and what the ocean side brings in.
  desertsnail: spec('desertsnail', 'desert snail', 1, 3, 1, 2),
  turban: spec('turban', 'turban shell', 2, 5, 2, 3),
  olive: spec('olive', 'olive shell', 3, 6, 1, 2),
  murex: spec('murex', 'murex', 4, 7, 3, 4),
  helmet: spec('helmet', 'helmet shell', 5, 8, 3, 4),
  // Tide Pool Notes (beach 3): what lives in and around cold rock pools.
  flatwinkle: spec('flatwinkle', 'flat periwinkle', 1, 3, 1, 2),
  dogwhelk: spec('dogwhelk', 'dog whelk', 2, 4, 1, 3),
  paintedtop: spec('paintedtop', 'painted top shell', 2, 5, 1, 2),
  necklace: spec('necklace', 'necklace shell', 3, 6, 2, 2),
  frogshell: spec('frogshell', 'frog shell', 4, 7, 3, 4),
  knobbedwhelk: spec('knobbedwhelk', 'knobbed whelk', 5, 8, 3, 4),
  // Mangrove Margins (beach 4): snails of the roots and the mud. Mangrove periwinkles live up on the roots.
  mangrovewinkle: spec('mangrovewinkle', 'mangrove periwinkle', 1, 3, 1, 2),
  rivernerite: spec('rivernerite', 'river nerite', 2, 4, 1, 2),
  mudcreeper: spec('mudcreeper', 'mud creeper', 3, 6, 2, 3),
  telescope: spec('telescope', 'telescope snail', 4, 7, 2, 3),
  mudwhelk: spec('mudwhelk', 'mud whelk', 5, 8, 3, 4),
  // Ash & Basalt (beach 5): shells of a volcanic shore, thrown up onto the black sand.
  drupe: spec('drupe', 'drupe', 1, 3, 1, 2),
  hornshell: spec('hornshell', 'horn shell', 2, 4, 1, 2),
  spindle: spec('spindle', 'spindle shell', 3, 6, 2, 3),
  bonnet: spec('bonnet', 'bonnet', 4, 7, 2, 3),
  harp: spec('harp', 'harp shell', 5, 8, 3, 4),
  // Fog & Kelp (beach 6): snails of a cold kelp coast, from the rocks, the kelp forest and the deep water off it.
  blackturban: spec('blackturban', 'black turban', 1, 3, 1, 2),
  kelpsnail: spec('kelpsnail', 'kelp snail', 2, 4, 1, 2),
  kellets: spec('kellets', "Kellet's whelk", 3, 6, 2, 3),
  oregontriton: spec('oregontriton', 'Oregon triton', 4, 7, 2, 3),
  wavyturban: spec('wavyturban', 'wavy turban', 5, 8, 3, 4),
  // Wreck Cove (beach 7): a Gulf shelling beach, where the whelks and conchs wash up by the wreck.
  nassa: spec('nassa', 'nassa', 1, 3, 1, 2),
  figshell: spec('figshell', 'fig shell', 2, 4, 1, 2),
  tulip: spec('tulip', 'tulip shell', 3, 6, 2, 3),
  lightningwhelk: spec('lightningwhelk', 'lightning whelk', 4, 7, 2, 3),
  horseconch: spec('horseconch', 'horse conch', 5, 8, 3, 4),
  // Monsoon Harbour (beach 8): Indian Ocean shells, the kind sold in heaps on the harbour wall.
  auger: spec('auger', 'auger shell', 1, 3, 1, 2),
  babylon: spec('babylon', 'babylon', 2, 4, 1, 2),
  cone: spec('cone', 'cone shell', 3, 6, 2, 3),
  spiderconch: spec('spiderconch', 'spider conch', 4, 7, 2, 3),
  volute: spec('volute', 'Indian volute', 5, 8, 3, 4),
};

/**
 * One shell: its kind and its size. Every kind comes in every size it's
 * found in, as real shells do; a size-N shell holds a crab of size N (it's
 * full then), or one a size smaller that will grow into it. So a crab
 * moves house at every size: a shell two sizes up is still too big.
 */
export interface Shell {
  readonly kind: ShellKind;
  readonly size: number;
}

/** A shell of a kind and size (default: the biggest that kind comes in). */
export function shellOf(kind: ShellKind, size: number = SHELLS[kind].maxSize): Shell {
  return { kind, size };
}

/** "a size-4 tulip shell", for the HUD. */
export function shellName(shell: Shell): string {
  return `size-${shell.size} ${SHELLS[shell.kind].name}`;
}

/** A hermit crab's body box: the size of its shell, or of its own body when it's out of one. */
export function crabBox(size: number, shell: Shell | null): { w: number; h: number } {
  const px = shellPx(shell ? shell.size : size);
  return { w: px * 0.85, h: px * 0.7 };
}

/** Whether a crab of `bodySize` can live in `shell`: one its size, or one size up to grow into. */
export function canWear(shell: Shell, bodySize: number): boolean {
  return bodySize === shell.size || bodySize === shell.size - 1;
}

const SPEED_BY_WEIGHT = { 1: 1, 2: 0.85, 3: 0.7 } as const;

/** Walk and dig speed multiplier; a naked crab is quick (and exposed). */
export function speedFactor(shell: Shell | null): number {
  return shell ? SPEED_BY_WEIGHT[SHELLS[shell.kind].weight] : 1;
}

/**
 * From a shell's middle to its mouth, as a fraction of its drawn width.
 * Moving house, the new shell is set mouth to mouth with the old one, so
 * the crab ends up this far past each middle. The art frame is built on it.
 */
export const MOUTH_OFFSET = 0.362;

/** Drawn size, in world px, of a shell (or naked body) for this body size. */
export function shellPx(size: number): number {
  // The periwinkle (size 2) is small enough that its crab fits one tile.
  return 8 + 5 * size;
}

/** How much of its shell's drawn width a crab's body spans, from a size smaller than the shell to its size. */
const FILL = { min: 0.8, max: 0.95 } as const;

/**
 * The crab's drawn size as a fraction of its shell's (`growth` may be
 * fractional, partway to the next size). Sized relative to the shell, not
 * absolutely, so even a crab that has only just moved in stays in the
 * opening rather than standing beside it; when it's full it crowds the mouth.
 */
export function bodyFill(shell: Shell, growth: number): number {
  const t = Math.min(1, Math.max(0, growth - (shell.size - 1)));
  return FILL.min + (FILL.max - FILL.min) * t;
}

/** Clumps of sand a crab can carry: a bigger shell holds more. Without one, only what its claws can hold. */
export function sandCapacity(shell: Shell | null): number {
  return shell ? 4 + 3 * shell.size : 4;
}
