/** Where a part stands in the chapter. */
export type PartState = 'won' | 'now' | 'ahead';

/**
 * Each part's state in this game: a chapter is one run, so what earlier
 * games won says nothing about this one. With no game in play the chapter
 * shows as won if all of it ever was, else ready to start from its first part.
 */
export function partStates(parts: readonly { readonly id: string }[], playing: string | null, won: Readonly<Record<string, unknown>>): PartState[] {
  if (playing === null && parts.every((p) => p.id in won)) return parts.map(() => 'won');
  const now = Math.max(0, parts.findIndex((p) => p.id === playing));
  return parts.map((_, i) => (i < now ? 'won' : i === now ? 'now' : 'ahead'));
}

/** The room kept above and below the chapter's block, UI pixels. */
const MENU_ROOM = 16;

/** Whether the chapter card spreads into two columns: only where one column runs off the screen and two fit across. */
export const spreadCard = (blockH: number, wideW: number, screen: { readonly w: number; readonly h: number }): boolean =>
  blockH + MENU_ROOM > screen.h && wideW + MENU_ROOM <= screen.w;
