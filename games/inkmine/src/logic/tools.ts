import { fitInventories, hasOnHand, printerWorks, spend, type PrintResult, type Profile } from './economy';
import type { Hold } from './hold';
import { hasBeat } from './story';

/**
 * Tools: one-off things the printer makes for the suit from the lander's own
 * designs, no blueprint needed, when the story calls for one. The first is
 * the receiver, a handheld radio for following the call the lander's dish
 * caught (story.ts): it can't say where the call comes from, only how
 * strong it is where you stand.
 *
 * Ids are saved: never rename one.
 */
export const TOOLS = ['receiver'] as const;
export type Tool = (typeof TOOLS)[number];

export interface ToolKind {
  readonly name: string;
  /** What it does, in a few words. */
  readonly about: string;
  readonly recipe: Hold;
}

export const TOOL_KINDS: Readonly<Record<Tool, ToolKind>> = {
  receiver: { name: 'Receiver', about: 'A handheld radio: the stronger the call, the closer you are', recipe: { copper: 4, quartz: 2 } },
};

export const hasTool = (p: Pick<Profile, 'tools'>, t: Tool): boolean => p.tools.includes(t);

/** Why a tool can or can't be printed: 'nothing' while there's no call to follow yet. */
export type ToolCheck = 'ok' | 'have' | 'nothing' | 'offline' | 'materials';

export function canPrintTool(p: Profile, t: Tool): ToolCheck {
  if (hasTool(p, t)) return 'have';
  if (!hasBeat(p, 'called')) return 'nothing';
  if (!printerWorks(p)) return 'offline';
  return hasOnHand(p)(TOOL_KINDS[t].recipe) ? 'ok' : 'materials';
}

export function printTool(p: Profile, t: Tool): PrintResult<ToolCheck> {
  const why = canPrintTool(p, t);
  if (why !== 'ok') return { ok: false, why };
  const spent = spend(p, TOOL_KINDS[t].recipe);
  return { ok: true, profile: fitInventories({ ...spent, tools: [...spent.tools, t] }) };
}
