import { CHARMS, type CharmId } from '../logic/charms';
import { COLOURS } from '../logic/colours';
import { D } from '../logic/line';
import { buildPath, type Pt } from '../logic/path';
import { CHAPTER_1 } from './chapter1';
import { BOARD, type LevelDef, type PillarDef, type ShooterDef, type Teach, type TrackDef, type TunnelDef } from './types';

/** Caps on what the server may send. */
const MAX_CHAPTERS = 20;
const MAX_LEVELS = 20;
const MAX_TRACKS = 4;
const MAX_POINTS = 400;
const MAX_PADS = 4;
const MAX_TUNNELS = 6;
const TEACH: readonly Teach[] = ['spit', 'swap', 'rail', 'catch', 'pull', 'hop', 'tunnel', 'dragonfly', 'cross', 'inkpot', 'fruit', 'bud', 'stone', 'geode', 'twine', 'hedgehog', 'chameleon', 'rain', 'bank', 'pillar', 'dark', 'lantern'];
/** Most of a line that may be stones and buds together. */
const MAX_SHARE = 0.4;
/** A line shorter than this many marbles is over before it starts. */
const MIN_MARBLES = 30;
/** Tunnels end by here along their line, so the marbles show again before the well. */
const TUNNEL_END = 0.9;
/** Most of a line that may run hidden in tunnels. */
const MAX_HIDDEN = 0.5;
/** Lily pads lie on the board, this far apart at least. */
const PAD_APART = 80;
const MAX_PILLARS = 8;

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
  if (v.kind === 'hop' && Array.isArray(v.pads) && v.pads.length >= 2 && v.pads.length <= MAX_PADS) return { kind: 'hop', pads: pads(v.pads) };
  throw new Error('bad shooter');
}

function pads(list: readonly unknown[]): Pt[] {
  const out = list.map((v) => {
    if (!isObj(v) || !num(v.x, 0, BOARD.w) || !num(v.y, 0, BOARD.h)) throw new Error('bad pad');
    return { x: v.x, y: v.y };
  });
  out.forEach((a, i) => out.forEach((b, j) => {
    if (j > i && Math.hypot(a.x - b.x, a.y - b.y) < PAD_APART) throw new Error('pads too close');
  }));
  return out;
}

/** Stretches in order, none overlapping the next. */
function inOrder(list: readonly TunnelDef[]): boolean {
  return list.every((c, i) => i === 0 || c.from >= list[i - 1]!.to);
}

function tunnel(v: unknown): TunnelDef {
  if (!isObj(v) || !num(v.from, 0, 1) || !num(v.to, 0, 1) || v.from >= v.to) throw new Error('bad tunnel');
  return { from: v.from, to: v.to };
}

function stretches(v: unknown, what: string): TunnelDef[] | undefined {
  if (v === undefined) return undefined;
  if (!Array.isArray(v) || v.length > MAX_TUNNELS) throw new Error(`bad ${what}`);
  return v.map(tunnel);
}

function track(v: unknown): TrackDef {
  if (!isObj(v) || !Array.isArray(v.points) || v.points.length < 2 || v.points.length > MAX_POINTS) throw new Error('bad track');
  const points = v.points.map(point);
  if (buildPath(points).length < D * MIN_MARBLES) throw new Error('track too short');
  const tunnels = stretches(v.tunnels, 'tunnels');
  const raised = stretches(v.raised, 'raised');
  if (tunnels) {
    const hidden = tunnels.reduce((sum, c) => sum + c.to - c.from, 0);
    if (!inOrder(tunnels) || tunnels.some((c) => c.to > TUNNEL_END) || hidden > MAX_HIDDEN) throw new Error('bad tunnels');
  }
  if (raised && !inOrder(raised)) throw new Error('bad raised');
  return { points, ...(tunnels ? { tunnels } : {}), ...(raised ? { raised } : {}) };
}

/** Broken columns on the board: a few, on it, of a sensible size. */
function pillarList(v: unknown, id: string): PillarDef[] | undefined {
  if (v === undefined) return undefined;
  if (!Array.isArray(v) || v.length > MAX_PILLARS) throw new Error(`${id}: bad pillars`);
  return v.map((p) => {
    if (!isObj(p) || !num(p.x, 0, BOARD.w) || !num(p.y, 0, BOARD.h) || !num(p.r, 12, 60)) throw new Error(`${id}: bad pillar`);
    return { x: p.x, y: p.y, r: p.r };
  });
}

/** An optional share (of stones or buds) in 0..MAX_SHARE. */
function share(v: unknown, id: string): number | undefined {
  if (v === undefined) return undefined;
  if (!num(v, 0, MAX_SHARE)) throw new Error(`${id}: bad share`);
  return v;
}

function level(v: unknown): LevelDef {
  if (!isObj(v)) throw new Error('bad level');
  const { id, name, tracks, colours, speed, goal, par, charms, teach, fruit, walls, dark } = v;
  if (!str(id, /^[a-z0-9-]{1,64}$/) || id in Object.prototype || !str(name, /^.{1,60}$/)) throw new Error('bad level id or name');
  if (!Array.isArray(tracks) || tracks.length < 1 || tracks.length > MAX_TRACKS) throw new Error(`${id}: bad tracks`);
  if (!num(colours, 2, COLOURS.length) || !Number.isInteger(colours)) throw new Error(`${id}: bad colours`);
  if (!num(speed, 5, 200) || !num(goal, 10, 100000) || !num(par, 1, 3600)) throw new Error(`${id}: bad numbers`);
  if (!Array.isArray(charms) || !charms.every((c): c is CharmId => (CHARMS as readonly unknown[]).includes(c)) || new Set(charms).size !== charms.length) throw new Error(`${id}: bad charms`);
  if (teach !== undefined && (!Array.isArray(teach) || !teach.every((t): t is Teach => (TEACH as readonly unknown[]).includes(t)))) throw new Error(`${id}: bad teach`);
  if (fruit !== undefined && typeof fruit !== 'boolean') throw new Error(`${id}: bad fruit`);
  if (walls !== undefined && typeof walls !== 'boolean') throw new Error(`${id}: bad walls`);
  if (dark !== undefined && typeof dark !== 'boolean') throw new Error(`${id}: bad dark`);
  const pillars = pillarList(v.pillars, id);
  const twine = share(v.twine, id);
  const chameleons = share(v.chameleons, id);
  const buds = share(v.buds, id);
  const stones = share(v.stones, id);
  if ((buds ?? 0) + (stones ?? 0) > MAX_SHARE) throw new Error(`${id}: too many buds and stones`);
  return {
    id, name, shooter: shooter(v.shooter), tracks: tracks.map(track), colours, speed, goal, par, charms,
    ...(teach ? { teach: teach as Teach[] } : {}),
    ...(fruit !== undefined ? { fruit } : {}),
    ...(buds !== undefined ? { buds } : {}),
    ...(stones !== undefined ? { stones } : {}),
    ...(twine !== undefined ? { twine } : {}),
    ...(chameleons !== undefined ? { chameleons } : {}),
    ...(walls !== undefined ? { walls } : {}),
    ...(dark !== undefined ? { dark } : {}),
    ...(pillars ? { pillars } : {}),
  };
}

/** The full game's chapters from the server (untrusted): checked level by level, or thrown out whole. */
export function parseChapters(raw: unknown): LevelDef[][] {
  if (!Array.isArray(raw) || raw.length > MAX_CHAPTERS) throw new Error('bad chapters');
  const chapters = raw.map((c) => {
    if (!Array.isArray(c) || c.length < 1 || c.length > MAX_LEVELS) throw new Error('bad chapter');
    return c.map(level);
  });
  // Ids key the saves and the unlock order: none may repeat, nor take a free level's.
  const ids = [...CHAPTER_1, ...chapters.flat()].map((l) => l.id);
  if (new Set(ids).size !== ids.length) throw new Error('duplicate level ids');
  return chapters;
}
