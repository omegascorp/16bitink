/**
 * Shells: the game's hook. Each one fits a range of body sizes; its maximum
 * is the crab's growth cap. Weight slows the crab, durability (used once
 * predators land) is how many hits it takes before it breaks.
 */
export const SHELL_KINDS = ['bottlecap', 'snail', 'bulb', 'can', 'whelk', 'moonsnail', 'jar', 'coconut', 'conch'] as const;
export type ShellKind = (typeof SHELL_KINDS)[number];

export interface ShellSpec {
  readonly kind: ShellKind;
  readonly name: string;
  readonly minSize: number;
  readonly maxSize: number;
  /** 1 light … 3 heavy. */
  readonly weight: 1 | 2 | 3;
  readonly durability: number;
  readonly trash: boolean;
}

const spec = (kind: ShellKind, name: string, minSize: number, maxSize: number, weight: 1 | 2 | 3, durability: number, trash = false): ShellSpec => ({
  kind, name, minSize, maxSize, weight, durability, trash,
});

// Ranges overlap generously so a crab can bank growth and jump past a size.
export const SHELLS: Readonly<Record<ShellKind, ShellSpec>> = {
  bottlecap: spec('bottlecap', 'bottle cap', 1, 2, 1, 1, true),
  snail: spec('snail', 'snail shell', 1, 3, 1, 2),
  bulb: spec('bulb', 'light bulb', 2, 4, 1, 1, true),
  can: spec('can', 'tin can', 2, 5, 1, 1, true),
  whelk: spec('whelk', 'whelk', 3, 5, 2, 3),
  moonsnail: spec('moonsnail', 'moon snail', 3, 6, 2, 3),
  jar: spec('jar', 'jam jar', 4, 7, 3, 2, true),
  coconut: spec('coconut', 'coconut half', 4, 7, 2, 3, true),
  conch: spec('conch', 'conch', 5, 8, 3, 4),
};

export function canWear(shell: ShellSpec, bodySize: number): boolean {
  return bodySize >= shell.minSize && bodySize <= shell.maxSize;
}

const SPEED_BY_WEIGHT = { 1: 1, 2: 0.85, 3: 0.7 } as const;

/** Walk and dig speed multiplier; a naked crab is quick (and exposed). */
export function speedFactor(shell: ShellSpec | null): number {
  return shell ? SPEED_BY_WEIGHT[shell.weight] : 1;
}

/** Drawn size, in world px, of a shell (or naked body) for this body size. */
export function shellPx(size: number): number {
  return 10 + 6 * size;
}
