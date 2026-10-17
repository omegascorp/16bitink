import { fitInventories, hasOnHand, printerWorks, spend, type PrintResult, type Profile } from './economy';
import type { Hold } from './hold';
import { hasBeat } from './story';

/**
 * Tools: one-off things the printer makes for the suit. The first is the
 * receiver, from the lander's own designs, no blueprint needed, once
 * there's a call to follow (story.ts): a handheld radio that can't say
 * where a call comes from, only how strong it is where you stand. The
 * second is the pulse (pulse.ts), your first weapon: its design is learnt
 * from the Aster's broken resonator by their wreck on Mycel, and printed
 * your way from Mycel's ores. The third is the rebreather (Brine): the Aster
 * crew there learnt from the Tidesingers to scrub breath with salt, and
 * draw it for you; with it, how deep the water is stops mattering to the
 * air (water.ts).
 *
 * Ids are saved: never rename one.
 */
export const TOOLS = ['receiver', 'pulse', 'rebreather'] as const;
export type Tool = (typeof TOOLS)[number];

export interface ToolKind {
  readonly name: string;
  /** What it does, in a few words. */
  readonly about: string;
  readonly recipe: Hold;
}

export const TOOL_KINDS: Readonly<Record<Tool, ToolKind>> = {
  receiver: { name: 'Receiver', about: 'A handheld radio: the stronger the call, the closer you are', recipe: { copper: 4, quartz: 2 } },
  pulse: { name: 'Pulse', about: "The Aster's resonator, rebuilt your way: a ring of force that bursts what lives here; rock stops it", recipe: { pyrite: 3, malachite: 2, lignite: 2 } },
  rebreather: { name: 'Rebreather', about: 'Scrubs your breath with salt and breathes it again: under water, depth stops mattering to the air', recipe: { halite: 4, copper: 3 } },
};

/** The design a tool's printed from, when it isn't the lander's own: studied from a broken one (its id, as a wreck's blueprint). */
export const TOOL_DESIGN: Readonly<Partial<Record<Tool, string>>> = { pulse: 'pulse', rebreather: 'rebreather' };

export const isTool = (v: string): v is Tool => (TOOLS as readonly string[]).includes(v);

export const hasTool = (p: Pick<Profile, 'tools'>, t: Tool): boolean => p.tools.includes(t);

/** Why a tool can or can't be printed: 'nothing' while there's no call to follow yet, or its design isn't learnt. */
export type ToolCheck = 'ok' | 'have' | 'nothing' | 'offline' | 'materials';

export function canPrintTool(p: Profile, t: Tool): ToolCheck {
  if (hasTool(p, t)) return 'have';
  const design = TOOL_DESIGN[t];
  if (design ? !p.found.includes(design) : !hasBeat(p, 'called')) return 'nothing';
  if (!printerWorks(p)) return 'offline';
  return hasOnHand(p)(TOOL_KINDS[t].recipe) ? 'ok' : 'materials';
}

export function printTool(p: Profile, t: Tool): PrintResult<ToolCheck> {
  const why = canPrintTool(p, t);
  if (why !== 'ok') return { ok: false, why };
  const spent = spend(p, TOOL_KINDS[t].recipe);
  return { ok: true, profile: fitInventories({ ...spent, tools: [...spent.tools, t] }) };
}
