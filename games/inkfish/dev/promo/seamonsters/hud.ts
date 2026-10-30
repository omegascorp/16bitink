import { smooth } from '../short';
import { drawCard, drawText, INK_ON_PAPER, PAPER_ON_INK, YELLOW_ON_INK } from '../swallowyou/text';
import { drawMonsterMap, type Legend } from './art/legends';
import { MONSTERS, SIPHONOPHORE, SPECIES, yousLabel, YOU_FT } from './species';
import { ARRIVE, sectionStart, T } from './timeline';

/**
 * What's written over the line-up: the length counter (bottom centre, in feet
 * with metres under and "= N of you" beside it, rolling up with a tick as
 * each animal is measured, MrBeast's climbing dollar figure), the name card
 * (top left), and the monster map (top right), where each legend gets its
 * REAL stamp as the video goes.
 */

const s = sectionStart;
const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

/** One step of the counter: when it starts rolling, and to what. */
export interface Measure {
  readonly at: number;
  readonly feet: number;
  readonly us: string;
  readonly metric: string;
  readonly name: string;
}

export const MEASURES: readonly Measure[] = [
  { at: T.fiveNine, feet: YOU_FT, us: '5 ft 9 in', metric: '1.75 m', name: 'YOU' },
  { at: T.frilled + 0.6, ...pick('frilled') },
  { at: T.thirteen, ...pick('manatee') },
  { at: T.twentySix, ...pick('oarfish') },
  { at: T.thirty, ...pick('basking') },
  { at: T.forty, ...pick('squid') },
  { at: T.fiftyTwo, ...pick('sperm') },
  { at: T.hundred, ...pick('blue') },
  { at: T.oneFifty, feet: SIPHONOPHORE.feet, us: SIPHONOPHORE.us, metric: SIPHONOPHORE.metric, name: SIPHONOPHORE.name },
];

function pick(m: (typeof MONSTERS)[number]): Omit<Measure, 'at'> {
  const sp = SPECIES[m];
  return { feet: sp.feet, us: sp.us, metric: sp.metric, name: sp.name };
}

/** How long the counter takes to roll from one length to the next. */
export const ROLL_S = 1.1;

/** The counter's state at t: the step it's on, the shown length (rolling), and how far through the roll. */
export function counterAt(t: number): { readonly step: Measure | null; readonly feet: number; readonly roll: number } {
  let i = -1;
  for (let k = 0; k < MEASURES.length; k++) if (t >= MEASURES[k]!.at) i = k;
  if (i < 0) return { step: null, feet: 0, roll: 0 };
  const step = MEASURES[i]!;
  const prev = i > 0 ? MEASURES[i - 1]!.feet : 0;
  const roll = clamp01((t - step.at) / ROLL_S);
  const eased = 1 - (1 - roll) ** 3;
  return { step, feet: prev + (step.feet - prev) * eased, roll };
}

/** When the HUD is on: from the first measure until the end card, off during full-frame cut-aways (the caller passes that). */
export function hudAlpha(t: number): number {
  return smooth((t - T.fiveNine + 0.3) / 0.4) * (1 - smooth((t - T.allReal) / 0.4));
}

/** The counter, bottom centre over the sand. */
export function drawCounter(ctx: CanvasRenderingContext2D, t: number, alpha: number): void {
  const c = counterAt(t);
  if (!c.step || alpha <= 0) return;
  const settled = c.roll >= 1;
  const shown = settled ? c.step.us : `${c.feet < 10 ? c.feet.toFixed(1) : Math.round(c.feet)} ft`;
  const pop = settled ? 1 + 0.18 * Math.max(0, 1 - (t - c.step.at - ROLL_S) / 0.25) : 1;
  ctx.save();
  ctx.translate(960, 985);
  ctx.scale(pop, pop);
  drawText(ctx, shown, { x: 0, y: 0, size: 120, maxWidth: 560 }, 700, alpha, YELLOW_ON_INK);
  ctx.restore();
  drawText(ctx, c.step.metric, { x: 960, y: 1055, size: 44, maxWidth: 300 }, 500, alpha * (settled ? 1 : 0.5), PAPER_ON_INK);
  if (c.step.name !== 'YOU') drawText(ctx, yousLabel(c.step.feet), { x: 1380, y: 1000, size: 62, maxWidth: 380 }, 700, alpha * smooth((t - c.step.at - ROLL_S) / 0.3), PAPER_ON_INK);
}

/** When each name card comes on: as the animal swims in (its length is measured later, when it's said). */
const NAMES: readonly { readonly at: number; readonly name: string }[] = [
  { at: MEASURES[0]!.at, name: 'YOU' },
  ...MONSTERS.map((m) => ({ at: ARRIVE[m] + 0.5, name: SPECIES[m].name })),
  { at: T.siphonophore, name: SIPHONOPHORE.name },
];

/** The name card, top left, for the animal on screen. */
export function drawNameCard(ctx: CanvasRenderingContext2D, t: number, alpha: number): void {
  const on = [...NAMES].reverse().find((n) => t >= n.at);
  if (!on || alpha <= 0) return;
  const a = alpha * smooth((t - on.at) / 0.35);
  drawCard(ctx, 40, 36, 620, 112, a);
  drawText(ctx, on.name, { x: 66, y: 94, size: 66, maxWidth: 570, left: true }, 700, a, INK_ON_PAPER);
}

/** When each legend on the map gets its REAL stamp. */
const STAMPS: readonly { readonly legend: Legend; readonly at: number }[] = [
  { legend: 'serpent', at: T.serpentStories },
  { legend: 'mermaid', at: T.manatees },
  { legend: 'seaserpent', at: T.realSerpent + 0.6 },
  { legend: 'carcass', at: T.mostLikely },
  { legend: 'kraken', at: T.realOne },
  { legend: 'essex', at: T.wasReal },
  { legend: 'blue', at: T.biggestEver },
];

export function stampsAt(t: number): Partial<Record<Legend, number>> {
  const out: Partial<Record<Legend, number>> = {};
  // A drawing joins the map a few seconds before its stamp (when its legend comes up), unstamped until then.
  for (const st of STAMPS) if (t >= st.at - 3) out[st.legend] = clamp01((t - st.at) / 0.35);
  return out;
}

export const STAMP_TIMES: readonly number[] = STAMPS.map((st) => st.at);

/** The map's box in the corner, and full frame at the end (`grow` 0 .. 1). */
export function drawCornerMap(ctx: CanvasRenderingContext2D, t: number, alpha: number, grow = 0): void {
  if (alpha <= 0) return;
  const k = smooth(grow);
  const w = 430 + (1920 - 430) * k;
  const h = 300 + (1080 - 300) * k;
  const x = 1920 - 40 - w + 40 * k;
  const y = 36 - 36 * k;
  ctx.save();
  ctx.globalAlpha = alpha;
  drawMonsterMap(ctx, x, y, w, h, t, stampsAt(t));
  ctx.restore();
}

/** The map is in the corner from the first legend until it fills the frame. */
export function mapAlpha(t: number): number {
  return smooth((t - s(2) - 0.5) / 0.5);
}
