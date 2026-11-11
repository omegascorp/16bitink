import { POND_FROG, type FrogLook } from './frog';

/**
 * The four other kinds of frog the beetles walked out of (Sugiura 2020): the
 * same painted frog (frog.ts) in each one's own skin.
 */

/** Japanese tree frog (Dryophytes japonicus): small, smooth, bright green, a dark band through the eye, sticky discs. */
export const TREE_FROG: FrogLook = {
  ...POND_FROG, backDark: '#3f8a26', back: '#5cae34', side: '#86c84e', sideLight: '#c8e49a', belly: '#f4f2e2', lip: '#e6f0c0', spot: '#2a4a16',
  spots: 'none', spotCount: 0, stripe: false, ridge: false, warts: 0, mask: true, pads: true, bars: false, iris: '#d8b040', seed: 11,
};

/** Wrinkled frog (Glandirana rugosa): warty, grey-brown, darker blotches and barred legs. */
export const WRINKLED_FROG: FrogLook = {
  ...POND_FROG, backDark: '#2e2418', back: '#54432e', side: '#776146', sideLight: '#a48c6a', belly: '#e6dcc0', lip: '#b8a888', spot: '#1c140c',
  spots: 'blotch', spotCount: 18, stripe: false, ridge: false, warts: 1, mask: false, pads: false, bars: true, iris: '#c89a3a', seed: 23,
};

/** Rice frog (Fejervarya kawamurai): slim, olive-brown with dark blotches, a pale stripe down the back. */
export const RICE_FROG: FrogLook = {
  ...POND_FROG, backDark: '#4a3e24', back: '#6e5e3a', side: '#8e7c52', sideLight: '#c2b084', belly: '#efe8d2', lip: '#cbbf96', spot: '#2a2212',
  spots: 'blotch', spotCount: 22, stripe: true, ridge: false, warts: 0.3, mask: false, pads: false, bars: true, iris: '#d6a838', seed: 37,
};

/** Daruma pond frog (Pelophylax porosus brevipodus): green, round black spots, a pale back stripe. */
export const DARUMA_FROG: FrogLook = {
  ...POND_FROG, backDark: '#446a26', back: '#6a9a3c', side: '#94b552', sideLight: '#cad694', belly: '#f2eedc', spots: 'round', spotCount: 34, seed: 53,
};

export const FOUR_KINDS: readonly FrogLook[] = [TREE_FROG, WRINKLED_FROG, RICE_FROG, DARUMA_FROG];
