/** Secondary skills: ranks 1–3 (basic, advanced, expert). Numbers from docs/inkheroes-design.md. */
export const SKILL_IDS = ['logistics', 'pathfinding', 'offense', 'archery', 'armorer', 'leadership', 'luck', 'wisdom', 'intelligence', 'mysticism', 'sorcery', 'estates', 'scouting', 'learning'] as const;
export type SkillId = (typeof SKILL_IDS)[number];
export type Rank = 1 | 2 | 3;
export type Skills = Readonly<Partial<Record<SkillId, Rank>>>;

export const MAX_SKILLS = 8;
export const RANK_NAMES = ['', 'Basic', 'Advanced', 'Expert'] as const;

interface SkillDef {
  readonly name: string;
  /** The effect at ranks 1, 2, 3. */
  readonly values: readonly [number, number, number];
  /** What a rank does, for the level-up card. */
  readonly says: (v: number) => string;
}

export const SKILLS: Readonly<Record<SkillId, SkillDef>> = {
  logistics: { name: 'Logistics', values: [0.1, 0.2, 0.3], says: (v) => `+${v * 100}% movement on land` },
  pathfinding: { name: 'Pathfinding', values: [0.25, 0.5, 0.75], says: (v) => `rough ground slows ${v * 100}% less` },
  offense: { name: 'Offense', values: [0.1, 0.2, 0.3], says: (v) => `+${v * 100}% melee damage` },
  archery: { name: 'Archery', values: [0.1, 0.25, 0.5], says: (v) => `+${v * 100}% ranged damage` },
  armorer: { name: 'Armorer', values: [0.05, 0.1, 0.15], says: (v) => `${v * 100}% less damage taken` },
  leadership: { name: 'Leadership', values: [1, 2, 3], says: (v) => `+${v} morale` },
  luck: { name: 'Luck', values: [1, 2, 3], says: (v) => `+${v} luck` },
  wisdom: { name: 'Wisdom', values: [3, 4, 5], says: (v) => `learn spells up to level ${v}` },
  intelligence: { name: 'Intelligence', values: [0.25, 0.5, 1], says: (v) => `+${v * 100}% mana` },
  mysticism: { name: 'Mysticism', values: [2, 3, 4], says: (v) => `${v} mana back a day` },
  sorcery: { name: 'Sorcery', values: [0.05, 0.1, 0.15], says: (v) => `+${v * 100}% spell damage` },
  estates: { name: 'Estates', values: [125, 250, 500], says: (v) => `+${v} gold a day` },
  scouting: { name: 'Scouting', values: [1, 2, 3], says: (v) => `see ${v} tile${v > 1 ? 's' : ''} further` },
  learning: { name: 'Learning', values: [0.05, 0.1, 0.15], says: (v) => `+${v * 100}% experience` },
};

/** A skill's effect for a hero (0 when it doesn't have it). */
export function skillValue(skills: Skills, id: SkillId): number {
  const rank = skills[id];
  return rank ? SKILLS[id].values[rank - 1]! : 0;
}

export const isSkillId = (v: unknown): v is SkillId => typeof v === 'string' && (SKILL_IDS as readonly string[]).includes(v);
