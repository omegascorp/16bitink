import { SPECIES, type SpeciesId } from './species';

/**
 * Missions: what a level asks on top of growing, InkFish style. Growing to
 * the goal size is always part of it; a mission adds a task or a rule.
 *
 * - collect: dig up the ink bottles buried about the beach.
 * - bounty: eat the hunters circled in red (grow big enough first).
 * - chain: lead a line of small hermit crabs; every move up to a bigger
 *   shell needs one more of them, grown to fill its shell, to take the one
 *   you leave (see line.ts).
 * - survive: one life.
 * - giant: grow to full size, then eat the beach's giant.
 */
export type MissionKind = 'grow' | 'collect' | 'bounty' | 'chain' | 'survive' | 'giant';

/** A creature to hunt down: its kind and size, and how many. */
export interface Quarry {
  readonly species: SpeciesId;
  readonly size: number;
  readonly count: number;
}

export interface Mission {
  readonly kinds: readonly MissionKind[];
  /** Ink bottles buried about the beach (0: none). */
  readonly bottles: number;
  /** Hunters circled in red, to eat. */
  readonly marked: Quarry | null;
  /** The giant, to eat once full grown. */
  readonly giant: Quarry | null;
  /** Small crabs to lead in a shell chain (0: no chain). */
  readonly chain: number;
  readonly lives: number;
}

export const PLAIN: Mission = { kinds: ['grow'], bottles: 0, marked: null, giant: null, chain: 0, lives: 3 };

/** How the level's tasks stand. */
export interface MissionProgress {
  readonly grown: boolean;
  readonly bottles: number;
  readonly marked: number;
  readonly giant: boolean;
}

/** Whether the tasks besides growing are done (a chain is done by growing: every move up needs its crab). */
export function tasksDone(m: Mission, p: MissionProgress): boolean {
  return p.bottles >= m.bottles && p.marked >= (m.marked?.count ?? 0) && (!m.giant || p.giant);
}

export function missionDone(m: Mission, p: MissionProgress): boolean {
  return p.grown && tasksDone(m, p);
}

export const MISSION_LABEL: Readonly<Record<MissionKind, string>> = {
  grow: 'Feeding time', collect: 'Ink bottles', bounty: 'Marked hunters', chain: 'Shell chain', survive: 'One life', giant: 'The giant',
};

/** Short name of the level's mission(s), shown over its name. */
export function missionTag(m: Mission): string {
  return m.kinds.map((k) => MISSION_LABEL[k]).join(' · ');
}

const plural = (q: Quarry): string => {
  const name = SPECIES[q.species].name;
  return q.count === 1 ? name : name.endsWith('s') ? `${name}es` : `${name}s`;
};

/** What to do to win, for the intro card and the level previews. */
export function missionGoal(m: Mission, goal: number): string {
  const parts = [`grow to size ${goal}`];
  if (m.bottles) parts.push(`dig up ${m.bottles} ink bottles`);
  if (m.marked) parts.push(`eat the ${m.marked.count} ${plural(m.marked)} circled in red`);
  if (m.giant) return `grow to size ${goal}, then eat the giant ${SPECIES[m.giant.species].name}`;
  if (m.chain) return `grow to size ${goal}, leading a line of ${m.chain} hermit crabs`;
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0]!;
}

/** The goal in a few words, with the mission's name: for the map and the result cards. */
export function shortGoal(m: Mission, goal: number): string {
  const plain = m.kinds.length === 1 && m.kinds[0] === 'grow';
  return plain ? `grow to size ${goal}` : `grow to size ${goal} · ${missionTag(m)}`;
}

/** Rules worth knowing before the start. */
export function missionNotes(m: Mission): string[] {
  const notes: string[] = [];
  if (m.chain) notes.push('Small hermit crabs follow you. Each move to a bigger shell needs one more of them, grown to fill its shell, to take the one you leave.');
  if (m.bottles) notes.push('The ink bottles are buried: look for highlighted sand.');
  if (m.marked) notes.push(`They're size ${m.marked.size}: they hunt you until you've grown past them.`);
  if (m.giant) notes.push(`The giant is size ${m.giant.size}: it hunts you until you're full grown.`);
  if (m.lives === 1) notes.push('Only one life: one catch ends the level.');
  return notes;
}

/** The HUD's mission line, or '' on a plain level. `chain` is how the line of followers stands (see line.ts). */
export function missionLine(m: Mission, p: MissionProgress, chain: ChainStatus | null = null): string {
  const tasks: string[] = [];
  if (m.bottles) tasks.push(`ink bottles ${Math.min(p.bottles, m.bottles)}/${m.bottles}`);
  if (m.marked) tasks.push(`marked ${SPECIES[m.marked.species].name}s ${Math.min(p.marked, m.marked.count)}/${m.marked.count}`);
  if (m.giant) tasks.push(p.grown ? `now eat the giant ${SPECIES[m.giant.species].name}!` : `grow, then eat the giant ${SPECIES[m.giant.species].name}`);
  if (m.chain && chain) tasks.push(chainText(chain));
  if (!tasks.length) return m.lives === 1 ? 'one life: don\'t get caught' : '';
  // Tasks done but still growing: point back at the growth bar.
  if (!m.giant && !m.chain && tasksDone(m, p) && !p.grown) return 'all found! now grow to full size';
  return tasks.join(' · ');
}

/**
 * How a shell chain stands for the next move up: `line` crabs following,
 * `needed` for that move; `wait`: why the move can't happen yet.
 */
export interface ChainStatus {
  readonly line: number;
  readonly needed: number;
  readonly wait: 'recruit' | 'growing' | 'behind' | null;
}

function chainText(s: ChainStatus): string {
  const n = `${s.line} following`;
  switch (s.wait) {
    case 'recruit': return `${n} · find ${s.needed - s.line === 1 ? 'one more small crab' : `${s.needed - s.line} more small crabs`}`;
    case 'growing': return `${n} · let your line eat and grow`;
    case 'behind': return `${n} · wait for your line to catch up`;
    default: return `${n} · your line is ready to move up`;
  }
}

/** Why a move up is held back, for the shell prompt. */
export function chainPrompt(s: ChainStatus): string {
  switch (s.wait) {
    case 'recruit': return 'find a small crab to take your shell first';
    case 'growing': return 'your line must grow into their shells first';
    case 'behind': return 'wait for your line to catch up';
    default: return '';
  }
}

/** Seconds of par time a mission adds: its task takes time on top of growing. */
export function missionPar(m: Mission): number {
  return m.bottles * 8 + (m.marked ? 30 : 0) + (m.giant ? 40 : 0) + m.chain * 15;
}
