import type { SpriteArt } from '../types';
import { songbird } from './mountainsCrittersBird';
import type { Bird } from './mountainsCrittersBirdKit';

/**
 * The Mountains' four small birds, each told apart at a glance from above:
 * the crested lark sandy and streaked with its spiky crest; the warbler
 * small, slim and olive-green with a pale brow and a needle bill; the
 * desert finch plump and pinkish-buff with a stout black bill and a black,
 * white and rose wing; the Isabelline shrike big, pale sandy-grey, with a
 * black mask, a hooked bill and a rufous tail.
 */

const LARK: Bird = {
  p: {
    base: '#a68e6c', light: '#d8c6a0', deep: '#5f4b36', streak: '#3f3022', streaks: 0.75, fringe: '#e3d1aa',
    wing: '#97805f', wingCentre: '#4c3b2a', wingEdge: '#dcc59a',
    tail: '#4d3d2e', tailOuter: '#c49b69', tailEdge: '#b89870',
    crown: '#9b8262', brow: '#e2d3b2',
    bill: '#8a7a66', billLit: '#c9bba5', foot: '#c8a98a', eye: '#2a1d14',
  },
  b: { rx: 11, ry: 6.9, hx: 11.2, hr: [5.2, 4.7], bill: [6, 1.9], billShape: 'lark', tail: [12, 4.2], tailTip: 'square', primaries: 5, crest: 11 },
};

const WARBLER: Bird = {
  p: {
    base: '#8a9150', light: '#c4c97e', deep: '#4f5630', streak: '#4f5630', streaks: 0, fringe: '#c9d27a',
    wing: '#7d7f4a', wingCentre: '#4a4a30', wingEdge: '#b9c46a',
    tail: '#646640', tailOuter: '#6c6f43', tailEdge: '#aab45f',
    crown: '#848b4c', brow: '#ece4a2',
    bill: '#5e4f3e', billLit: '#b9a58a', foot: '#8a7660', eye: '#1e160f',
  },
  b: { rx: 10.4, ry: 5.4, hx: 10.6, hr: [4.5, 4.1], bill: [5.2, 1.2], billShape: 'fine', tail: [15, 3.4], tailTip: 'square', primaries: 4 },
};

const FINCH: Bird = {
  p: {
    base: '#c9a68c', light: '#ecd6c2', deep: '#8a6656', streak: '#8a6656', streaks: 0, fringe: '#efdccb',
    wing: '#dc97a0', wingCentre: '#2d2427', wingEdge: '#f1d2d4',
    covert: '#d9a3a2', primary: '#2a2124', primaryEdge: '#f3ece3',
    tail: '#2c2326', tailOuter: '#f0e7dc', tailEdge: '#e6a9b0',
    crown: '#c39f88', face: '#d88d93',
    bill: '#232022', billLit: '#7d7880', foot: '#b08a80', eye: '#1a1314',
  },
  b: { rx: 10.4, ry: 7.4, hx: 10.6, hr: [5.6, 5.4], bill: [4.4, 3.6], billShape: 'cone', tail: [11, 4.4], tailTip: 'notch', primaries: 4 },
};

const SHRIKE: Bird = {
  p: {
    base: '#c5b298', light: '#e7dcc8', deep: '#857258', streak: '#857258', streaks: 0, fringe: '#eadfcb',
    wing: '#8a7560', wingCentre: '#4a3c30', wingEdge: '#dccbb0',
    primary: '#4a3d33', primaryEdge: '#b8a68e', patch: '#f4efe2',
    tail: '#b5602e', tailOuter: '#c2703a', tailEdge: '#e0a06a', rump: '#c47a44',
    crown: '#c9b8a0', brow: '#efe7d6', mask: '#1d1817',
    bill: '#2a2525', billLit: '#7e7676', foot: '#3c3433', eye: '#120d0c',
  },
  b: { rx: 10.6, ry: 6.4, hx: 11, hr: [5.8, 5.3], bill: [4.6, 2.2], billShape: 'hook', tail: [17, 3.8], tailTip: 'round', primaries: 3 },
};

export const LARK_ART: SpriteArt = songbird(LARK, 48, 27, 7101);
export const WARBLER_ART: SpriteArt = songbird(WARBLER, 44, 22, 7202);
export const FINCH_ART: SpriteArt = songbird(FINCH, 46, 25, 7303);
export const SHRIKE_ART: SpriteArt = songbird(SHRIKE, 64, 39, 7404);
