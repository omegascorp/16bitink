/**
 * The animals of the chain: how long each is, what it weighs (the weight
 * tag's numbers) and what the step card calls it. Weights are order-of-
 * magnitude estimates (script.md's fact table) shown with both units,
 * pounds first for the US audience.
 */

export type Kind = 'diatom' | 'copepod' | 'krill' | 'anchovy' | 'mackerel' | 'tuna' | 'greatWhite' | 'orca' | 'whaleShark' | 'blueWhale';

export interface Species {
  readonly name: string;
  /** Body length, metres. */
  readonly length: number;
  /** Weight, grams. */
  readonly grams: number;
  /** The length as the card prints it, metric then US. */
  readonly size: readonly [string, string];
}

const G_PER_LB = 453.592;

export const SPECIES: Readonly<Record<Kind, Species>> = {
  diatom: { name: 'diatom', length: 5e-5, grams: 1e-7, size: ['0.05 mm', '0.002 in'] },
  copepod: { name: 'copepod', length: 1.2e-3, grams: 1e-4, size: ['1 mm', '0.04 in'] },
  krill: { name: 'krill', length: 0.05, grams: 1, size: ['5 cm', '2 in'] },
  anchovy: { name: 'anchovy', length: 0.15, grams: 25, size: ['15 cm', '6 in'] },
  mackerel: { name: 'mackerel', length: 0.4, grams: 700, size: ['40 cm', '16 in'] },
  tuna: { name: 'bluefin tuna', length: 2.5, grams: 3e5, size: ['2.5 m', '8 ft'] },
  greatWhite: { name: 'great white', length: 4.5, grams: 1.1e6, size: ['4.5 m', '15 ft'] },
  orca: { name: 'orca', length: 7, grams: 5e6, size: ['7 m', '23 ft'] },
  whaleShark: { name: 'whale shark', length: 12, grams: 2e7, size: ['12 m', '40 ft'] },
  blueWhale: { name: 'blue whale', length: 25, grams: 1.5e8, size: ['25 m', '82 ft'] },
};

/** The climb's order, and the jump each step's narration shouts ("a THOUSAND times heavier!"). */
export const STEPS: readonly { readonly kind: Kind; readonly jump: string }[] = [
  { kind: 'diatom', jump: '' },
  { kind: 'copepod', jump: '×1,000' },
  { kind: 'anchovy', jump: '×250,000' },
  { kind: 'mackerel', jump: '×30' },
  { kind: 'tuna', jump: '×400' },
  { kind: 'orca', jump: '×17' },
];

/** Enough decimals to show one significant digit of a small number, commas for a big one. */
function plain(v: number): string {
  if (v >= 1) return Math.round(v).toLocaleString('en-US');
  const places = Math.min(12, Math.max(1, Math.ceil(-Math.log10(v)) + (v * 10 ** Math.ceil(-Math.log10(v)) < 1.5 ? 1 : 0)));
  return v.toFixed(places).replace(/0+$/, '').replace(/\.$/, '');
}

/** A weight in grams as the tag prints it: pounds big, grams small. */
export function weightLabels(grams: number): { readonly lb: string; readonly g: string } {
  const lb = grams / G_PER_LB;
  const lbText = lb >= 10 ? plain(Number(lb.toPrecision(2))) : lb >= 1 ? lb.toFixed(1) : plain(Number(lb.toPrecision(1)));
  return { lb: `${lbText} lb`, g: `${plain(Number(grams.toPrecision(grams >= 1 ? 2 : 1)))} g` };
}
