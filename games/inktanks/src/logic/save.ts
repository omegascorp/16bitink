import { TOTAL_LEVELS } from './campaign';
import { GADGETS, type GadgetKind } from './match/types';
import type { Medals } from './mission/outcome';
import { FAMILIES, slotOf, type Family, type Loadout, type Mk, type Part } from './parts';
import { RESEARCH_MAX, type Research, type ResearchLine } from './stats';
import { canFit, LINES_BY_SLOT, newProgress, STARTER_FAMILIES, type IntelBag, type Progress } from './workshop';

/**
 * The saved game, through host.storage: the player's Progress (medals,
 * intel, workshop, rank XP, fitted tank) plus settings. Versioned, and
 * validated on load: anything that isn't a well-formed save of this
 * version gives a fresh game, never a crash.
 */
export const SAVE_KEY = 'inktanks.save';
export const SAVE_VERSION = 1;

export interface SaveData {
  readonly v: typeof SAVE_VERSION;
  readonly progress: Progress;
  readonly sound: boolean;
  /** True once the first-blueprints tip was shown (only once per player). */
  readonly seenBlueprints: boolean;
  /** The gadget picked in the briefing (older saves without one get the default). */
  readonly gadget: GadgetKind;
}

export const DEFAULT_GADGET: GadgetKind = 'mines';
export const newSave = (): SaveData => ({ v: SAVE_VERSION, progress: newProgress(), sound: true, seenBlueprints: false, gadget: DEFAULT_GADGET });
const isGadget = (x: unknown): x is GadgetKind => typeof x === 'string' && (GADGETS as readonly string[]).includes(x);

type Obj = Readonly<Record<string, unknown>>;
const isObj = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x);
const isFamily = (x: unknown): x is Family => typeof x === 'string' && (FAMILIES as readonly string[]).includes(x);
const isCount = (x: unknown): x is number => typeof x === 'number' && Number.isInteger(x) && x >= 0 && x < 1e7;
const isMk = (x: unknown): x is Mk => x === 1 || x === 2 || x === 3;

/** Thrown inside validation; caught by parseSave, never escapes it. */
class BadSave extends Error {}
const bad = (what: string): never => {
  throw new BadSave(what);
};

function intelBag(x: unknown, what: string): IntelBag {
  if (!isObj(x)) return bad(what);
  const out: Partial<Record<Family, number>> = {};
  for (const [k, n] of Object.entries(x)) {
    if (!isFamily(k) || !isCount(n)) bad(`${what}.${k}`);
    out[k as Family] = n as number;
  }
  return out;
}

function mkBook(x: unknown): Partial<Record<Family, Mk>> {
  if (!isObj(x)) return bad('mk');
  const out: Partial<Record<Family, Mk>> = {};
  for (const [k, n] of Object.entries(x)) {
    if (!isFamily(k) || !isMk(n)) bad(`mk.${k}`);
    out[k as Family] = n as Mk;
  }
  return out;
}

function research(x: unknown): Research {
  if (!isObj(x)) return bad('research');
  const out: Record<string, Partial<Record<ResearchLine, number>>> = {};
  for (const [f, lines] of Object.entries(x)) {
    if (!isFamily(f) || !isObj(lines)) bad(`research.${f}`);
    const allowed: readonly string[] = LINES_BY_SLOT[slotOf(f as Family)];
    const row: Partial<Record<ResearchLine, number>> = {};
    for (const [line, n] of Object.entries(lines as Obj)) {
      if (!allowed.includes(line) || !isCount(n) || (n as number) > RESEARCH_MAX) bad(`research.${f}.${line}`);
      row[line as ResearchLine] = n as number;
    }
    out[f] = row;
  }
  return out;
}

function medals(x: unknown): Readonly<Record<number, Medals>> {
  if (!isObj(x)) return bad('medals');
  const out: Record<number, Medals> = {};
  for (const [k, m] of Object.entries(x)) {
    const n = Number(k);
    if (!Number.isInteger(n) || n < 1 || n > TOTAL_LEVELS) bad(`medals.${k}`);
    if (!Array.isArray(m) || m.length !== 3 || !m.every((b) => typeof b === 'boolean')) bad(`medals.${k}`);
    const [a, b, c] = m as boolean[];
    out[n] = [a!, b!, c!];
  }
  return out;
}

function part(x: unknown, slot: 'gun' | 'hull' | 'drive'): Part {
  if (!isObj(x) || !isFamily(x.family) || !isMk(x.mk) || slotOf(x.family) !== slot) return bad(`loadout.${slot}`);
  return { family: x.family, mk: x.mk };
}

/** The best Mk you own of the starter's families: the tank a broken fitting falls back to. */
function fallbackLoadout(p: Progress): Loadout {
  const best = (f: Family): Part => ({ family: f, mk: p.mk[f] ?? 1 });
  return { gun: best(STARTER_FAMILIES[0]!), hull: best(STARTER_FAMILIES[1]!), drive: best(STARTER_FAMILIES[2]!) };
}

function progress(x: unknown): Progress {
  if (!isObj(x)) return bad('progress');
  const unlockedRaw = x.unlocked;
  if (!Array.isArray(unlockedRaw) || !unlockedRaw.every(isFamily)) bad('unlocked');
  // The starter families are always yours.
  const unlocked = [...new Set<Family>([...STARTER_FAMILIES, ...(unlockedRaw as Family[])])];
  const mk = mkBook(x.mk);
  for (const f of unlocked) mk[f] ??= 1;
  if (!isCount(x.xp)) bad('xp');
  if (!isObj(x.loadout)) bad('loadout');
  const l = x.loadout as Obj;
  const loadout: Loadout = { gun: part(l.gun, 'gun'), hull: part(l.hull, 'hull'), drive: part(l.drive, 'drive') };
  const p: Progress = {
    intel: intelBag(x.intel, 'intel'),
    intelTotal: intelBag(x.intelTotal, 'intelTotal'),
    unlocked,
    mk,
    research: research(x.research),
    xp: x.xp as number,
    medals: medals(x.medals),
    loadout,
  };
  // A fitting you no longer own (or never did) swaps for the starter's families rather than failing the save.
  const fits = [loadout.gun, loadout.hull, loadout.drive].every((q) => canFit(p, q));
  return fits ? p : { ...p, loadout: fallbackLoadout(p) };
}

export interface Loaded {
  readonly save: SaveData;
  /** Why the stored save was dropped, or null when it loaded (or there was none). */
  readonly problem: string | null;
}

/** Reads a stored save. Never throws: a missing, corrupt or old save gives a fresh game. */
export function parseSave(raw: string | null | undefined): Loaded {
  if (raw === null || raw === undefined || raw === '') return { save: newSave(), problem: null };
  try {
    const x: unknown = JSON.parse(raw);
    if (!isObj(x)) return bad('not an object');
    if (x.v !== SAVE_VERSION) return bad(`version ${String(x.v)}`);
    return { save: { v: SAVE_VERSION, progress: progress(x.progress), sound: x.sound !== false, seenBlueprints: x.seenBlueprints === true, gadget: isGadget(x.gadget) ? x.gadget : DEFAULT_GADGET }, problem: null };
  } catch (e) {
    return { save: newSave(), problem: e instanceof BadSave ? `bad save: ${e.message}` : 'bad save: not JSON' };
  }
}

export const serializeSave = (s: SaveData): string => JSON.stringify(s);
