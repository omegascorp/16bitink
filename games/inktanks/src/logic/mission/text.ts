import type { MissionDef } from './types';

/** The main objective in a line, for the briefing, HUD and results. */
export function mainObjectiveText(def: MissionDef): string {
  const m = def.main;
  switch (m.kind) {
    case 'royale':
      return m.top === 1 ? 'Be the last tank standing' : `Finish in the top ${m.top}`;
    case 'raid':
      return `Destroy ${m.need} fuel stacks`;
    case 'escort':
      return 'Bring the supply truck to the village';
    case 'hold':
      return `Hold the hill for ${m.seconds} s`;
    case 'ace':
      return `Destroy ${m.ace.name} and take the intel`;
    case 'salvage':
      return 'Bring the prototype to the pick-up';
    case 'fortress':
      return `Destroy the ${m.boss.name}`;
  }
}
