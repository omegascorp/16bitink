import { CHAPTERS } from '../src/level';
import type { LevelDef } from '../src/logic/level';
import type { Audit } from './audit';

interface CurveRow {
  readonly fromChapter: number;
  readonly maxWin: readonly [number, number];
  readonly minLessons: readonly [number, number];
  readonly maxTop: number;
  readonly minLate: number;
}

const CURVE: readonly CurveRow[] = [
  { fromChapter: 1, maxWin: [0.35, 0.15], minLessons: [3, 4], maxTop: 0.5, minLate: 0 },
  { fromChapter: 2, maxWin: [0.2, 0.1], minLessons: [4, 5], maxTop: 0.45, minLate: 0.5 },
  { fromChapter: 4, maxWin: [0.15, 0.08], minLessons: [5, 6], maxTop: 0.4, minLate: 0.6 },
  { fromChapter: 5, maxWin: [0.1, 0.06], minLessons: [6, 6], maxTop: 0.4, minLate: 0.6 },
];

const CH3_OPENERS: readonly string[] = ['sealed-door', 'bad-air', 'blasting-chamber'];

export function curveCheck(level: LevelDef, a: Audit): {
  readonly chapter: number;
  readonly pos: number;
  readonly row: CurveRow;
  readonly maxWin: number;
  readonly minLessons: number;
  readonly failures: readonly string[];
} {
  const listed = CHAPTERS.findIndex((c) => c.includes(level)) + 1;
  const chapter = listed || 3;
  const pos = listed ? (CHAPTERS[chapter - 1]?.indexOf(level) ?? 0) + 1 : CH3_OPENERS.includes(level.id) ? 1 : 4;
  const row = [...CURVE].reverse().find((r) => chapter >= r.fromChapter) ?? CURVE[0]!;
  const k = pos <= 3 ? 0 : 1;
  const maxWin = row.maxWin[k];
  const minLessons = row.minLessons[k];
  // The Door teaches the controls and is intentionally impossible to lose.
  if (level.id === 'door') return { chapter, pos, row, maxWin, minLessons, failures: [] };
  const failures: string[] = [];
  if (a.winShare > maxWin) failures.push(`win ${Math.round(a.winShare * 100)}% > ${Math.round(maxWin * 100)}%`);
  if (Object.keys(a.lessons).length < minLessons) failures.push(`lessons ${Object.keys(a.lessons).length} < ${minLessons}`);
  if (a.topLessonShare > row.maxTop) failures.push(`top lesson ${Math.round(a.topLessonShare * 100)}% > ${Math.round(row.maxTop * 100)}%`);
  if (a.stuckShare > 0.1) failures.push(`stuck ${Math.round(a.stuckShare * 100)}% > 10%`);
  if (a.lateLossShare < row.minLate) failures.push(`late losses ${Math.round(a.lateLossShare * 100)}% < ${Math.round(row.minLate * 100)}%`);
  const loses = (end: string): boolean => !['won', 'stuck', 'blocked', 'jammed'].includes(end);
  if (chapter >= 2 && (!loses(a.obvious.nearest) || !loses(a.obvious.leftToRight))) failures.push('an obvious order does not lose');
  return { chapter, pos, row, maxWin, minLessons, failures };
}
