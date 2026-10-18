import { canBuild, nextMark } from './blueprints';
import { hasOnHand, printerWorks, type Profile } from './economy';
import { PIECES, type Piece } from './gear';
import { canRepair, currentGoal, REPAIR_IDS, type RepairId } from './repairs';
import { canUpgrade, MODULE_KEYS, type ModuleKey } from './ship';
import { canFix, isUpgrade, STARSHIP_SLOTS, type StarshipSlot } from './starship';
import { hasBeat } from './story';
import { canPrintTool, TOOLS, type Tool } from './tools';

/**
 * The lander's menu as No Man's Sky lays it out: a Suit tab, a Lander tab
 * (saved and keyed as 'ship') and, once you've flown up to it, a Starship
 * tab, each with technology slots (the gear pieces; the lander's crashed
 * systems and its modules; the starship's systems). Each slot says at a
 * glance how it stands: an upgrade ready to print, broken, fitted, or not
 * built yet.
 */
export type Tab = 'suit' | 'ship' | 'starship';
export const TABS: readonly Tab[] = ['suit', 'ship', 'starship'];

/** The tabs there are now: the starship's once you've flown up to it the first time. */
export const tabsFor = (p: Pick<Profile, 'beats'>): readonly Tab[] => (hasBeat(p, 'flown') ? TABS : TABS.filter((t) => t !== 'starship'));

export type Tech =
  | { readonly kind: 'gear'; readonly piece: Piece }
  | { readonly kind: 'module'; readonly key: ModuleKey }
  | { readonly kind: 'repair'; readonly id: RepairId }
  | { readonly kind: 'tool'; readonly id: Tool }
  | { readonly kind: 'starship'; readonly id: StarshipSlot };

export type TechState = 'ready' | 'broken' | 'fitted' | 'empty';

export const SUIT_TECH: readonly Tech[] = [...PIECES.map((piece): Tech => ({ kind: 'gear', piece })), ...TOOLS.map((id): Tech => ({ kind: 'tool', id }))];
export const SHIP_SYSTEMS: readonly Tech[] = REPAIR_IDS.map((id) => ({ kind: 'repair', id }));
export const SHIP_MODULES: readonly Tech[] = MODULE_KEYS.map((key) => ({ kind: 'module', key }));
export const STARSHIP_TECH: readonly Tech[] = STARSHIP_SLOTS.map((id) => ({ kind: 'starship', id }));

/** Every slot on a tab, in reading order. */
export const tabTech = (tab: Tab): readonly Tech[] => (tab === 'suit' ? SUIT_TECH : tab === 'starship' ? STARSHIP_TECH : [...SHIP_SYSTEMS, ...SHIP_MODULES]);

/** "gear:drill", "repair:hull", "module:hull": unique, as a repair and a module can share a name. */
export function techKey(t: Tech): string {
  if (t.kind === 'gear') return `gear:${t.piece}`;
  if (t.kind === 'module') return `module:${t.key}`;
  return `${t.kind}:${t.id}`;
}

const ALL: ReadonlyMap<string, Tech> = new Map([...SUIT_TECH, ...SHIP_SYSTEMS, ...SHIP_MODULES, ...STARSHIP_TECH].map((t) => [techKey(t), t]));

export function techOf(key: string): Tech | undefined {
  return ALL.get(key);
}

export function techState(p: Profile, t: Tech): TechState {
  if (t.kind === 'repair') {
    const why = canRepair(p, t.id);
    return why === 'done' ? 'fitted' : why === 'ok' ? 'ready' : 'broken';
  }
  if (t.kind === 'starship') {
    const why = canFix(p, t.id);
    if (isUpgrade(t.id) && why !== 'done' && why !== 'ok') return 'empty';
    return why === 'done' ? 'fitted' : why === 'ok' ? 'ready' : 'broken';
  }
  if (t.kind === 'tool') {
    const why = canPrintTool(p, t.id);
    return why === 'have' ? 'fitted' : why === 'ok' ? 'ready' : 'empty';
  }
  if (t.kind === 'module') {
    if (printerWorks(p) && canUpgrade(p.ship, t.key, hasOnHand(p)) === 'ok') return 'ready';
    return p.ship[t.key] > 0 ? 'fitted' : 'empty';
  }
  const r = nextMark(t.piece, p.found, p.gear);
  return r && printerWorks(p) && canBuild(r, p.found, p.gear, hasOnHand(p)) === 'ok' ? 'ready' : 'fitted';
}

/** The tab to open on: the starship when aboard, the suit when the next thing to do is print gear, else the lander. */
export function defaultTab(p: Profile): Tab {
  if (p.docked) return 'starship';
  return currentGoal(p).kind === 'print' ? 'suit' : 'ship';
}

/** The slot the detail card shows: the one asked for if it's on this tab, else the first ready, else the first broken, else the first. */
export function focusOf(p: Profile, tab: Tab, asked?: string): Tech {
  const list = tabTech(tab);
  const keys = new Set(list.map(techKey));
  const want = asked && keys.has(asked) ? techOf(asked) : undefined;
  return want ?? list.find((t) => techState(p, t) === 'ready') ?? list.find((t) => techState(p, t) === 'broken') ?? list[0]!;
}
