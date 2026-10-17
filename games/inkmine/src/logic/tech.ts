import { canBuild, blueprintId, recipeOf } from './blueprints';
import { hasOnHand, printerWorks, type Profile } from './economy';
import { PIECES, type Piece } from './gear';
import { canRepair, currentGoal, REPAIR_IDS, type RepairId } from './repairs';
import { canUpgrade, MODULE_KEYS, type ModuleKey } from './ship';

/**
 * The lander's menu as No Man's Sky lays it out: a Suit tab and a Ship tab,
 * each with technology slots (the gear pieces; the ship's crashed systems
 * and its modules) above its storage. Each slot says at a glance how it
 * stands: an upgrade ready to print, broken, fitted, or not built yet.
 */
export type Tab = 'suit' | 'ship';
export const TABS: readonly Tab[] = ['suit', 'ship'];

export type Tech =
  | { readonly kind: 'gear'; readonly piece: Piece }
  | { readonly kind: 'module'; readonly key: ModuleKey }
  | { readonly kind: 'repair'; readonly id: RepairId };

export type TechState = 'ready' | 'broken' | 'fitted' | 'empty';

export const SUIT_TECH: readonly Tech[] = PIECES.map((piece) => ({ kind: 'gear', piece }));
export const SHIP_SYSTEMS: readonly Tech[] = REPAIR_IDS.map((id) => ({ kind: 'repair', id }));
export const SHIP_MODULES: readonly Tech[] = MODULE_KEYS.map((key) => ({ kind: 'module', key }));

/** Every slot on a tab, in reading order. */
export const tabTech = (tab: Tab): readonly Tech[] => (tab === 'suit' ? SUIT_TECH : [...SHIP_SYSTEMS, ...SHIP_MODULES]);

/** "gear:drill", "repair:hull", "module:hull": unique, as a repair and a module can share a name. */
export function techKey(t: Tech): string {
  return t.kind === 'gear' ? `gear:${t.piece}` : t.kind === 'module' ? `module:${t.key}` : `repair:${t.id}`;
}

const ALL: ReadonlyMap<string, Tech> = new Map([...SUIT_TECH, ...SHIP_SYSTEMS, ...SHIP_MODULES].map((t) => [techKey(t), t]));

export function techOf(key: string): Tech | undefined {
  return ALL.get(key);
}

export function techState(p: Profile, t: Tech): TechState {
  if (t.kind === 'repair') {
    const why = canRepair(p, t.id);
    return why === 'done' ? 'fitted' : why === 'ok' ? 'ready' : 'broken';
  }
  if (t.kind === 'module') {
    if (printerWorks(p) && canUpgrade(p.ship, t.key, hasOnHand(p)) === 'ok') return 'ready';
    return p.ship[t.key] > 0 ? 'fitted' : 'empty';
  }
  const r = recipeOf(blueprintId(t.piece, p.gear[t.piece] + 1));
  return r && printerWorks(p) && canBuild(r, p.found, p.gear, hasOnHand(p)) === 'ok' ? 'ready' : 'fitted';
}

/** The tab to open on: the suit when the next thing to do is print gear, else the ship. */
export function defaultTab(p: Profile): Tab {
  return currentGoal(p).kind === 'print' ? 'suit' : 'ship';
}

/** The slot the detail card shows: the one asked for if it's on this tab, else the first ready, else the first broken, else the first. */
export function focusOf(p: Profile, tab: Tab, asked?: string): Tech {
  const list = tabTech(tab);
  const keys = new Set(list.map(techKey));
  const want = asked && keys.has(asked) ? techOf(asked) : undefined;
  return want ?? list.find((t) => techState(p, t) === 'ready') ?? list.find((t) => techState(p, t) === 'broken') ?? list[0]!;
}
