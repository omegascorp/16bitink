import type { StatName } from '../../art/pixel/ui';
import { creature, lineOf, lineUnits, tierOf, type CreatureId } from '../../logic/creatures';
import { rankOf, type Rarity } from '../../logic/rarity';
import { describeAmount } from '../../logic/resources';
import { newTraits, traitList } from './unitCard';

/** The comparison panel's data and layout (unitCompareView.ts draws it). Pure: no Phaser. */

/** A unit's levels in order, base first, up to and including `id`: what the Compare panel shows (nothing for a base unit). */
export function lineUpTo(id: CreatureId): CreatureId[] {
  return lineUnits(lineOf(id)).slice(0, tierOf(id));
}

/** How many columns side by side fit `screen` at the narrowest a column may be (a phone: four; wider: all five ranks). */
export function columnsThatFit(screen: { w: number }): number {
  return Math.max(2, Math.floor((screen.w - 8 - PAD * 2 + GAP) / (MIN_COL_W + GAP)));
}

/** Whether a unit has an earlier level to compare with. */
export const canCompare = (id: CreatureId): boolean => tierOf(id) > 1;

/** One stat of a column: its icon, its text and whether it rose above the column to its left. */
export interface CompareCell {
  readonly stat: StatName;
  readonly text: string;
  readonly up: boolean;
}

/** One ability of a column, and whether this level is the first to have it. */
export interface CompareTrait {
  readonly text: string;
  readonly isNew: boolean;
}

/** One level of the line, as the panel shows it. */
export interface CompareColumn {
  readonly id: CreatureId;
  readonly name: string;
  readonly level: number;
  readonly cells: readonly CompareCell[];
  readonly growth: string;
  readonly growthUp: boolean;
  readonly cost: string;
  readonly traits: readonly CompareTrait[];
  /** The unit that was tapped (framed in gold). */
  readonly tapped: boolean;
  /** Its rank (its name is drawn in the rank's colour); null for a unit with none. */
  readonly rank: Rarity | null;
}

const damageText = (id: CreatureId): string => {
  const c = creature(id);
  return c.minDmg === c.maxDmg ? `${c.minDmg}` : `${c.minDmg}–${c.maxDmg}`;
};

/** The stats of one level; `prev` is the level to its left (nothing is marked up in the first column). */
function cellsOf(id: CreatureId, prev: CreatureId | null, withShots: boolean): CompareCell[] {
  const c = creature(id);
  const p = prev ? creature(prev) : null;
  const rows: CompareCell[] = [
    { stat: 'attack', text: `${c.attack}`, up: !!p && c.attack > p.attack },
    { stat: 'defense', text: `${c.defense}`, up: !!p && c.defense > p.defense },
    { stat: 'damage', text: damageText(id), up: !!p && c.minDmg + c.maxDmg > p.minDmg + p.maxDmg },
    { stat: 'health', text: `${c.hp}`, up: !!p && c.hp > p.hp },
    { stat: 'speed', text: `${c.speed}`, up: !!p && c.speed > p.speed },
  ];
  if (withShots) rows.splice(2, 0, { stat: 'shots', text: c.shots ? `${c.shots}` : '–', up: !!p && (c.shots ?? 0) > (p.shots ?? 0) });
  return rows;
}

/**
 * The columns of `id`'s line from level 1 up to `id`, with what rose and
 * what is new marked; at most `max` of them, the tapped one and those just
 * below it (a narrow screen drops the lowest). Empty for a base unit.
 */
export function compareColumns(id: CreatureId, max = Infinity): CompareColumn[] {
  const line = lineUpTo(id).slice(-Math.max(2, max));
  if (line.length < 2) return [];
  const withShots = line.some((u) => !!creature(u).shots);
  return line.map((u, i) => {
    const prev = i > 0 ? line[i - 1]! : null;
    const c = creature(u);
    const fresh = new Set(prev ? newTraits(prev, u) : []);
    return {
      id: u,
      name: c.name,
      level: tierOf(u),
      cells: cellsOf(u, prev, withShots),
      growth: `${c.growth}`,
      growthUp: !!prev && c.growth > creature(prev).growth,
      cost: describeAmount(c.cost),
      traits: traitList(u).map((text) => ({ text, isNew: fresh.has(text) })),
      tapped: u === id,
      rank: rankOf(u),
    };
  });
}

export const PAD = 9;
export const GAP = 4;
export const ROW_H = 16;
export const LINE_H = 15;
export const BTN_H = 30;
const MAX_COL_W = 150;
/** The narrowest a column may be, its text still readable. */
const MIN_COL_W = 60;
const FIGURE_MIN_COL = 100;
const MAX_PIC = 112;
export const FACE_PIC = 32;
/** The frame round a picture, each side. */
export const PIC_RIM = 2;
/** The title line, its rule and the gap under it. */
const HEAD_H = 15 + 5 + 6;
/** A name's line, in the title font. */
const NAME_LINE = 16;

/** The text lines (wrapped) the panel needs, measured by the view in the room `textW` leaves. */
export interface CompareText {
  readonly nameLines: number;
  readonly costLines: number;
  /** All abilities' lines in the tallest column, and how many abilities it has. */
  readonly traitLines: number;
  readonly traitCount: number;
}

export interface CompareLayout {
  readonly w: number;
  readonly h: number;
  readonly left: number;
  readonly top: number;
  readonly colW: number;
  /** Each column's left edge on the screen. */
  readonly colX: readonly number[];
  readonly mode: 'figure' | 'face';
  /** The picture's side, UI pixels (without its frame). */
  readonly pic: number;
  /** Text inside a column wraps to this width. */
  readonly textW: number;
  /** Offsets from the panel's top. */
  readonly picY: number;
  readonly nameY: number;
  readonly levelY: number;
  readonly rowsY: number;
  readonly growthY: number;
  readonly costY: number;
  readonly costH: number;
  readonly traitsY: number;
  readonly traitsH: number;
  readonly closeY: number;
  readonly fits: boolean;
}

/** One column's width on `screen` for `n` columns (the view measures its text with it). */
export function columnWidth(screen: { w: number }, n: number): number {
  const room = screen.w - 8 - PAD * 2 - GAP * (n - 1);
  return Math.max(MIN_COL_W, Math.min(MAX_COL_W, Math.floor(room / n)));
}

/** The text width inside a column. */
export const textWidth = (colW: number): number => colW - 10;

/**
 * The panel on `screen`: `n` columns side by side (each figure over its
 * numbers), the widest that fits, figures shrunk to faces on a narrow
 * screen, centred. Its pictures shrink before the panel overflows the height.
 */
export function compareLayout(screen: { w: number; h: number }, n: number, text: CompareText, statRows = 6): CompareLayout {
  const colW = columnWidth(screen, n);
  const w = n * colW + GAP * (n - 1) + PAD * 2;
  const mode = colW >= FIGURE_MIN_COL ? 'figure' : 'face';
  const traitsH = text.traitLines * LINE_H + Math.max(0, text.traitCount - 1) * 2 + 8;
  const costH = text.costLines * LINE_H + 4;
  const rest = HEAD_H + (PIC_RIM * 2) + 4 + text.nameLines * NAME_LINE + LINE_H + 4 + statRows * ROW_H + 4 + ROW_H + GAP + costH + GAP + traitsH + GAP + BTN_H + PAD * 2;
  const room = screen.h - 4;
  const want = mode === 'face' ? FACE_PIC : Math.min(MAX_PIC, colW - PIC_RIM * 2);
  // Shrink the figure a step at a time (never below a face) until the panel fits.
  const pic = Math.max(FACE_PIC, Math.min(want, want - Math.max(0, rest + want - room)));
  const h = rest + pic;
  const picY = PAD + HEAD_H;
  const nameY = picY + pic + PIC_RIM * 2 + 4;
  const levelY = nameY + text.nameLines * NAME_LINE;
  const rowsY = levelY + LINE_H + 4;
  const growthY = rowsY + statRows * ROW_H + 4;
  const costY = growthY + ROW_H + GAP;
  const traitsY = costY + costH + GAP;
  const closeY = traitsY + traitsH + GAP;
  const left = Math.floor((screen.w - w) / 2);
  const top = Math.max(2, Math.floor((screen.h - h) / 2));
  return {
    w, h, left, top, colW,
    colX: Array.from({ length: n }, (_, i) => left + PAD + i * (colW + GAP)),
    mode, pic, textW: textWidth(colW),
    picY, nameY, levelY, rowsY, growthY, costY, costH, traitsY, traitsH, closeY,
    fits: h <= screen.h && w <= screen.w,
  };
}
