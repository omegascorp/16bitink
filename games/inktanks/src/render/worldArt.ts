import { ART_NAME } from '../content/ch1/kinds';
import { WORLD, type StructureArt } from '../art/pixel/world/world';

/**
 * The world agent's art (src/art/pixel/world/manifest.json): structure pieces
 * in the castle projection, sharing one anchor per structure, each sorted
 * among tanks by its own sortY (999 = always over them), with per-state
 * shadows and roof-fade rects. Kinds without art fall back to placeholders.
 */
const pngs = import.meta.glob<string>('../art/pixel/world/**/*.png', { eager: true, query: '?url', import: 'default' });

/** Texture key `world:<path without .png>` → URL. */
export const WORLD_URLS: ReadonlyMap<string, string> = new Map(Object.entries(pngs).map(([p, u]) => [`world:${p.slice(p.indexOf('pixel/world/') + 12, -4)}`, u]));

export const worldKey = (file: string): string => `world:${file.replace(/\.png$/, '')}`;

export function worldStructure(kind: string): { name: string; art: StructureArt } | null {
  const name = ART_NAME[kind];
  const art = name ? WORLD.structures[name] : undefined;
  return name && art ? { name, art } : null;
}

/** The art's state for a logic state (2 whole, 1 cracked, 0 breached), for art drawn only as 1 and 0. */
export function artState(art: StructureArt, state: number): number {
  if (art.states.includes(state)) return state;
  return state === 0 ? Math.min(...art.states) : Math.max(...art.states);
}

export interface PlacedPiece {
  readonly key: string;
  readonly sortY: number;
  readonly roof: boolean;
}

/** The pieces drawn for a state, in draw order: body, front, roof. */
export function piecesFor(name: string, art: StructureArt, state: number): PlacedPiece[] {
  const s = artState(art, state);
  return [`${name}-${s}`, `${name}-${s}-front`, `${name}-${s}-roof`]
    .filter((k) => art.pieces[k])
    .map((k) => ({ key: worldKey(art.pieces[k]!.file), sortY: art.pieces[k]!.sortY, roof: k.endsWith('-roof') }));
}
