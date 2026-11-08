/**
 * The contract for the campaign menu's paintings. Units are menu px, baked
 * at MENU_RES texture px a unit; each drawing paints from its top-left.
 *
 * - The vista: a wide landscape behind the whole menu, scaled to cover the
 *   screen and anchored at its bottom centre (phones crop its sides, wide
 *   screens its top). The title sits over its sky, the map cards over its
 *   middle band (y ≈ 300–620) and the Crown's muster stands on its
 *   foreground rise (y ≈ 720–900), so those bands stay calm enough to read.
 * - The title: the game's name lettered on a painted banner.
 * - A vignette: a small oval-ish painted scene of one map, set into its card.
 */
export const MENU_RES = 2;
export const VISTA = { w: 1600, h: 900 } as const;
export const TITLE = { w: 640, h: 180 } as const;
export const VIGNETTE = { w: 220, h: 110 } as const;

export type VignetteId = 'ashford' | 'thornwood' | 'blackBanner';
export const VIGNETTE_IDS: readonly VignetteId[] = ['ashford', 'thornwood', 'blackBanner'];

export type MenuDrawer = (ctx: CanvasRenderingContext2D, seed: number) => void;
