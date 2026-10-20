import { CHARMS, type CharmId } from '../logic/charms';
import { COLOURS } from '../logic/colours';
import type { Pt } from '../logic/path';
import { BOARD, type LevelDef, type ShooterDef, type Teach, type TrackDef } from './types';

/** Caps on what the server may send. */
const MAX_CHAPTERS = 20;
const MAX_LEVELS = 20;
const MAX_TRACKS = 4;
const MAX_POINTS = 400;
const TEACH: readonly Teach[] = ['spit', 'swap', 'rail', 'catch', 'pull'];

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const num = (v: unknown, lo: number, hi: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
const str = (v: unknown, re: RegExp): v is string => typeof v === 'string' && re.test(v);

function point(v: unknown): Pt {
  if (!isObj(v) || !num(v.x, -200, BOARD.w + 200) || !num(v.y, -200, BOARD.h + 200)) throw new Error('bad point');
  return { x: v.x, y: v.y };
}

function shooter(v: unknown): ShooterDef {
  if (!isObj(v)) throw new Error('bad shooter');
  if (v.kind === 'pivot' && num(v.x, 0, BOARD.w) && num(v.y, 0, BOARD.h)) return { kind: 'pivot', x: v.x, y: v.y };
  if (v.kind === 'rail' && num(v.y, 0, BOARD.h) && num(v.x0, 0, BOARD.w) && num(v.x1, 0, BOARD.w) && v.x0 < v.x1) return { kind: 'rail', y: v.y, x0: v.x0, x1: v.x1 };
  throw new Error('bad shooter');
}

function track(v: unknown): TrackDef {
  if (!isObj(v) || !Array.isArray(v.points) || v.points.length < 2 || v.points.length > MAX_POINTS) throw new Error('bad track');
  return { points: v.points.map(point) };
}

function level(v: unknown): LevelDef {
  if (!isObj(v)) throw new Error('bad level');
  const { id, name, tracks, colours, speed, goal, par, charms, teach } = v;
  if (!str(id, /^[a-z0-9-]{1,64}$/) || !str(name, /^.{1,60}$/)) throw new Error('bad level id or name');
  if (!Array.isArray(tracks) || tracks.length < 1 || tracks.length > MAX_TRACKS) throw new Error(`${id}: bad tracks`);
  if (!num(colours, 2, COLOURS.length) || !Number.isInteger(colours)) throw new Error(`${id}: bad colours`);
  if (!num(speed, 5, 200) || !num(goal, 10, 100000) || !num(par, 1, 3600)) throw new Error(`${id}: bad numbers`);
  if (!Array.isArray(charms) || !charms.every((c): c is CharmId => (CHARMS as readonly unknown[]).includes(c))) throw new Error(`${id}: bad charms`);
  if (teach !== undefined && (!Array.isArray(teach) || !teach.every((t): t is Teach => (TEACH as readonly unknown[]).includes(t)))) throw new Error(`${id}: bad teach`);
  return {
    id, name, shooter: shooter(v.shooter), tracks: tracks.map(track), colours, speed, goal, par, charms,
    ...(teach ? { teach: teach as Teach[] } : {}),
  };
}

/** The full game's chapters from the server (untrusted): checked level by level, or thrown out whole. */
export function parseChapters(raw: unknown): LevelDef[][] {
  if (!Array.isArray(raw) || raw.length > MAX_CHAPTERS) throw new Error('bad chapters');
  const chapters = raw.map((c) => {
    if (!Array.isArray(c) || c.length < 1 || c.length > MAX_LEVELS) throw new Error('bad chapter');
    return c.map(level);
  });
  const ids = chapters.flat().map((l) => l.id);
  if (new Set(ids).size !== ids.length) throw new Error('duplicate level ids');
  return chapters;
}
